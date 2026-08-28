/**
 * The frozen-contract boundary.
 *
 * Turns a `RouteRequestPayload` into a `RouteApiResult`, reusing the existing
 * classifier, office repository, and gap register without modifying any of them.
 * Everything below `lib/contracts.ts` keeps its own internal vocabulary; this module
 * is the single place the two are translated.
 *
 * Two properties this file is responsible for preserving:
 *   1. The model never selects the responsible entity and never emits a contact.
 *      Entities and contacts come only from the repository.
 *   2. Nothing is invented when evidence is missing. A miss returns `not_covered`
 *      and writes a gap-register entry.
 */

import { classify } from './classify'
import { recordGap } from './gaps'
import type { OfficeRecord, OfficeQuery, OfficeRepository } from './repository'
import { officeRepository } from './repositories/json-repository'
import type { ServiceType } from './types'
import {
  CENSUS_NAME_TO_JURISDICTION,
  DISCLAIMER,
  EMERGENCY_MESSAGE,
  HUMAN_CONFIRMATION_INSTRUCTION,
  INTERNAL_SERVICE_TYPE_TO_SUBTYPE,
  JURISDICTION_LABELS,
  SERVICE_FAMILY,
  SUBTYPE_TO_INTERNAL_SERVICE_TYPE,
  findSyntheticLocation,
  type Confidence,
  type HandoffResponse,
  type IssueSubtype,
  type JurisdictionId,
  type OfficialContact,
  type RouteApiResult,
  type RouteRequestPayload,
  type Source,
  type SyntheticLocation,
} from './contracts'

/**
 * Which Census names a frozen jurisdiction should search.
 *
 * A city location also searches its county, because the county may hold a competing
 * claim — surfacing that overlap is the product. `state` is deliberately null: ALDOT
 * rows exist in the data but sit outside the frozen three-jurisdiction scope.
 */
const JURISDICTION_QUERY: Record<JurisdictionId, Omit<OfficeQuery, 'serviceType'>> = {
  'birmingham-al': { place: 'Birmingham city', county: 'Jefferson County', state: null },
  'homewood-al': { place: 'Homewood city', county: 'Jefferson County', state: null },
  'jefferson-county-al': { place: null, county: 'Jefferson County', state: null },
}

function notCovered(reason: string, conflictOrGap: string | null): RouteApiResult {
  return { outcome: 'not_covered', reason, conflict_or_gap: conflictOrGap, disclaimer: DISCLAIMER }
}

function toOfficialContact(r: OfficeRecord): OfficialContact {
  return { phone: r.phone ?? null, email: r.email ?? null, form_url: r.form_url ?? null }
}

/**
 * The repository stores a source URL and a checked date, not a full citation.
 * Title and publisher are derived from the record so the UI always has a labelled
 * link rather than a bare URL. Nothing here is invented beyond that formatting.
 */
function toSource(r: OfficeRecord, jurisdiction: JurisdictionId): Source {
  return {
    title: r.is_synthetic
      ? `${r.office_name} contact information (placeholder pending verification)`
      : `${r.office_name} contact information`,
    publisher: JURISDICTION_LABELS[jurisdiction],
    url: r.source_url,
    last_checked: r.checked_on,
  }
}

/**
 * Whether competing claims amount to genuine contention.
 *
 * Nearly every city location has a county record sitting behind it, so the mere
 * existence of an alternate is not news. Treating it as news would fire on every
 * single request and make both the confidence signal and the gap register worthless.
 * Contention means the published record is actually shaky: a primary that is not
 * high-confidence, or an alternate carrying a low-confidence documented disagreement.
 */
function isContested(primary: OfficeRecord, alternates: OfficeRecord[]): boolean {
  if (alternates.length === 0) return false
  if (primary.confidence !== 'high') return true
  return alternates.some((r) => r.confidence === 'low')
}

/** Contested overlap is never more certain than its weakest claim. */
function combineConfidence(primary: Confidence, contested: boolean): Confidence {
  if (!contested) return primary
  return primary === 'high' ? 'medium' : primary
}

/**
 * Assembles the named conflict or gap. Non-null whenever more than one office may
 * have a claim, or the primary record carries a caveat. The ambiguity is surfaced,
 * never resolved on the resident's behalf.
 */
function buildConflict(primary: OfficeRecord, alternates: OfficeRecord[]): string | null {
  const parts: string[] = []

  if (alternates.length > 0) {
    const names = [primary, ...alternates].map((r) => r.office_name).join('; ')
    parts.push(
      `More than one office may have a claim here (${names}). Start with the first and ask them to confirm.`,
    )
  }
  for (const r of [primary, ...alternates]) {
    if (r.notes) parts.push(r.notes)
  }
  if (primary.is_synthetic) {
    parts.push(
      'Example data — this contact is a placeholder and has not been verified against a public source.',
    )
  }

  return parts.length > 0 ? parts.join(' ') : null
}

function buildReason(
  location: SyntheticLocation,
  jurisdiction: JurisdictionId,
  record: OfficeRecord,
): string {
  const where =
    record.jurisdiction_type === 'county'
      ? `is handled at the county level in ${JURISDICTION_LABELS[jurisdiction]}`
      : `sits inside ${JURISDICTION_LABELS[jurisdiction]}`

  return `Synthetic demo location ${location.id} ${where}, and ${record.office_name} is the published starting point for this kind of right-of-way request.`
}

function buildNextAction(record: OfficeRecord, location: SyntheticLocation): string {
  const ask = record.what_to_say.replace('<address>', `demo location ${location.id}`)
  const channel = record.phone
    ? `Call ${record.office_name} at ${record.phone}`
    : record.email
      ? `Email ${record.office_name} at ${record.email}`
      : `Use the ${record.office_name} online form at ${record.form_url}`

  return `${channel}. ${ask}`
}

export interface HandoffDeps {
  repository?: OfficeRepository
  classifier?: typeof classify
}

/**
 * The single entry point the API route calls.
 *
 * Assumes the payload has already passed `validateRouteRequest`.
 */
export async function buildHandoff(
  payload: RouteRequestPayload,
  deps: HandoffDeps = {},
): Promise<RouteApiResult> {
  const repository = deps.repository ?? officeRepository
  const classifier = deps.classifier ?? classify

  // 1. Life safety short-circuits before any classification or lookup.
  const classification = await classifier(payload.message)
  if (classification.isEmergency) {
    return { outcome: 'emergency', message: EMERGENCY_MESSAGE, disclaimer: DISCLAIMER }
  }

  // 2. The synthetic location table is authoritative. The UI's hint is advisory.
  const location = findSyntheticLocation(payload.synthetic_location_id)
  if (!location) {
    return notCovered(
      'That demo location is not one we recognize.',
      'This build accepts only the three frozen synthetic demo locations.',
    )
  }
  const jurisdiction = location.jurisdiction

  // 3. Only the four frozen subtypes are in scope. Anything else is a coverage gap.
  const subtype = INTERNAL_SERVICE_TYPE_TO_SUBTYPE[classification.serviceType] ?? null
  if (!subtype) {
    recordGap({
      serviceType: classification.serviceType,
      place: JURISDICTION_QUERY[jurisdiction].place ?? null,
      county: JURISDICTION_QUERY[jurisdiction].county ?? null,
      reason: 'out_of_coverage',
      message: payload.message,
    })
    return notCovered(
      'We only cover potholes and road damage, sidewalk damage, blocked drainage, and fallen trees or debris right now.',
      'Logged as a coverage gap.',
    )
  }

  // 4. Look up, most specific jurisdiction first. Contacts come only from here.
  const serviceType = SUBTYPE_TO_INTERNAL_SERVICE_TYPE[subtype] as ServiceType
  const records = await repository.find({ ...JURISDICTION_QUERY[jurisdiction], serviceType })

  if (records.length === 0) {
    recordGap({
      serviceType,
      place: JURISDICTION_QUERY[jurisdiction].place ?? null,
      county: JURISDICTION_QUERY[jurisdiction].county ?? null,
      reason: 'no_match',
      message: payload.message,
    })
    return notCovered(
      `We do not yet have a listed office for this issue in ${JURISDICTION_LABELS[jurisdiction]}.`,
      'Logged as a coverage gap so it can be researched and added.',
    )
  }

  const [primary, ...alternates] = records
  const contested = isContested(primary, alternates)

  // 5. Genuinely contested ownership is a finding. Log it — but only when it is one.
  if (contested) {
    recordGap({
      serviceType,
      place: JURISDICTION_QUERY[jurisdiction].place ?? null,
      county: JURISDICTION_QUERY[jurisdiction].county ?? null,
      reason: 'ambiguous_ownership',
      message: payload.message,
    })
  }

  // The record's own jurisdiction wins — a county record routes to the county,
  // even when the resident's location is inside a city.
  const answeringJurisdiction =
    CENSUS_NAME_TO_JURISDICTION[primary.jurisdiction_name] ?? jurisdiction

  const response: HandoffResponse = {
    service: SERVICE_FAMILY,
    issue_subtype: subtype as IssueSubtype,
    likely_responsible_entity: primary.office_name,
    jurisdiction: answeringJurisdiction,
    reason: buildReason(location, answeringJurisdiction, primary),
    confidence: combineConfidence(primary.confidence, contested),
    conflict_or_gap: buildConflict(primary, alternates),
    next_action: buildNextAction(primary, location),
    official_contact: toOfficialContact(primary),
    sources: [primary, ...alternates].map((r) =>
      toSource(r, CENSUS_NAME_TO_JURISDICTION[r.jurisdiction_name] ?? answeringJurisdiction),
    ),
    requires_human_confirmation: true,
    human_confirmation_instruction: HUMAN_CONFIRMATION_INSTRUCTION,
    disclaimer: DISCLAIMER,
  }

  return { outcome: 'handoff', ...response }
}
