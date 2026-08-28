import { z } from 'zod'
import type { OfficeRecord } from '../repository'
import type { Confidence, JurisdictionLevel, ServiceType } from '../types'
import { isUsable } from './ordering'

/**
 * Adapter for the `municipal_evidence` Supabase table.
 *
 * That table does NOT match data/schema.md. It is a different, coarser shape produced
 * by the data team, and every difference is reconciled here so that the rest of the
 * codebase keeps seeing plain OfficeRecords. This file is the only place that knows
 * the source schema; if the table changes, this is what changes.
 *
 * Derivations are deliberate and each one is called out below. Two of them invent
 * information the source does not carry (`what_to_say`, `is_synthetic`) — see the
 * comments on those constants before trusting them.
 */

/** Columns we read. Explicit so new source columns cannot surprise the parser. */
export const MUNICIPAL_EVIDENCE_COLUMNS = [
  'id',
  'service',
  'issue_subtype',
  'jurisdiction_id',
  'jurisdiction_name',
  'responsible_entity',
  'reason_text',
  'phone',
  'email',
  'form_url',
  'source_title',
  'source_publisher',
  'source_url',
  'last_checked',
  'confidence',
  'conflict_or_gap',
  'is_active',
].join(',')

/** Validated at the boundary so column drift throws a named error, not `undefined` in a UI. */
export const municipalEvidenceRowSchema = z.object({
  id: z.union([z.number(), z.string()]),
  service: z.string(),
  issue_subtype: z.string().nullish(),
  jurisdiction_id: z.string().nullish(),
  jurisdiction_name: z.string(),
  responsible_entity: z.string(),
  reason_text: z.string().nullish(),
  phone: z.string().nullish(),
  email: z.string().nullish(),
  form_url: z.string().nullish(),
  source_title: z.string().nullish(),
  source_publisher: z.string().nullish(),
  source_url: z.string(),
  last_checked: z.string(),
  confidence: z.string(),
  conflict_or_gap: z.string().nullish(),
  is_active: z.boolean(),
})

export type MunicipalEvidenceRow = z.infer<typeof municipalEvidenceRowSchema>

/* ---------------------------------------------------------------------------
 * 1. Jurisdiction names
 *
 * The source stores "City of Birmingham". The Census geocoder returns
 * "Birmingham city", and the lookup joins on that exact string. Without this
 * transform every single lookup misses silently and residents get "not covered".
 * ------------------------------------------------------------------------- */

const CITY_OF = /^(?:City|Town) of (.+)$/
const UNINCORPORATED_COUNTY = /^(.+ County) \(unincorporated\)$/

export interface MappedJurisdiction {
  type: JurisdictionLevel
  name: string
}

/** Returns null for any pattern we do not recognize. Never guesses. */
export function mapJurisdiction(sourceName: string): MappedJurisdiction | null {
  const raw = sourceName.trim()

  const unincorporated = UNINCORPORATED_COUNTY.exec(raw)
  if (unincorporated) return { type: 'county', name: unincorporated[1] }

  const cityOf = CITY_OF.exec(raw)
  if (cityOf) return { type: 'city', name: `${cityOf[1]} city` }

  // Already-correct Census forms, in case the source is fixed upstream later.
  if (/ city$/.test(raw)) return { type: 'city', name: raw }
  if (/ County$/.test(raw)) return { type: 'county', name: raw }
  if (raw === 'Alabama') return { type: 'state', name: raw }

  return null
}

/* ---------------------------------------------------------------------------
 * 2. Service taxonomy
 *
 * The source uses one coarse bucket per department remit; we use the resident-facing
 * enum in lib/types.ts. One source row therefore becomes several OfficeRecords.
 *
 * An unrecognized source value is DROPPED, not mapped to `other`. Answering a
 * storm-drain question with a roads department is worse than an honest miss.
 * ------------------------------------------------------------------------- */

const SERVICE_CROSSWALK: Record<string, ServiceType[]> = {
  road_sidewalk_maintenance: ['pothole_street', 'sidewalk'],
  storm_drain_blockage: ['storm_drain'],
  abandoned_vehicle: ['abandoned_vehicle'],
}

/** Source bucket → the contract service types it legitimately answers. */
export function crosswalkService(sourceService: string): ServiceType[] {
  return SERVICE_CROSSWALK[sourceService.trim()] ?? []
}

/** Which source buckets could answer this contract service type. Used to filter server-side. */
export function sourceServicesFor(serviceType: ServiceType): string[] {
  return Object.entries(SERVICE_CROSSWALK)
    .filter(([, mapped]) => mapped.includes(serviceType))
    .map(([source]) => source)
}

/* ---------------------------------------------------------------------------
 * 3. what_to_say — GENERATED, not authored
 *
 * The contract requires a line the resident reads aloud, and lib/respond.ts calls
 * .replace() on it. The source has no such column; `reason_text` describes a
 * department's remit, not what a resident should say. These templates are ours,
 * phrased to match data/offices.seed.json. If the data team adds a real
 * `what_to_say` column, prefer it and delete this map.
 * ------------------------------------------------------------------------- */

const WHAT_TO_SAY: Record<ServiceType, string> = {
  storm_drain: 'Report a blocked or flooding storm drain at <address>.',
  pothole_street: 'Report a pothole on the roadway at <address>.',
  sidewalk: 'Ask whether the sidewalk at <address> is maintained by this office, and report the damage.',
  traffic_signal: 'Report a malfunctioning traffic or crosswalk signal at <address>.',
  street_light: 'Report a street light that is out at <address>.',
  illegal_dumping: 'Report illegal dumping or debris in the right-of-way at <address>.',
  abandoned_vehicle: 'Report an apparently abandoned vehicle at <address>.',
  tree_debris: 'Report a fallen tree or storm debris blocking the right-of-way at <address>.',
  other: 'Ask who is responsible for the right-of-way issue at <address>.',
}

/* ---------------------------------------------------------------------------
 * 4. Confidence
 * ------------------------------------------------------------------------- */

const CONFIDENCE_MAP: Record<string, Confidence> = {
  high: 'high',
  medium: 'medium',
  med: 'medium',
  low: 'low',
}

/** Unrecognized confidence degrades to `low` rather than being trusted. */
export function mapConfidence(source: string): Confidence {
  return CONFIDENCE_MAP[source.trim().toLowerCase()] ?? 'low'
}

/* ---------------------------------------------------------------------------
 * 5. is_synthetic — DETECTED FROM EVIDENCE
 *
 * The source has no such column, and `is_active` is a different concept (true on
 * every row). data/schema.md treats a wrong value here as a rule violation, and the
 * source data has already flipped once from real published contacts to placeholders
 * mid-build — so this is derived per row rather than asserted as a constant. It
 * self-corrects when the data changes, and it errs toward "synthetic", because
 * mislabeling a placeholder as verified is the harmful direction.
 *
 * Delete all of this the day the source grows a real `is_synthetic` column.
 * ------------------------------------------------------------------------- */

/** TLDs reserved by RFC 6761/2606 for documentation and testing. Never real contacts. */
const RESERVED_TLDS = new Set(['test', 'example', 'invalid', 'localhost'])

function hostIsPlaceholder(value: string | null): boolean {
  if (!value) return false
  let host = value.trim().toLowerCase()

  if (host.includes('@')) host = host.slice(host.lastIndexOf('@') + 1)
  else {
    try {
      host = new URL(host.includes('://') ? host : `https://${host}`).hostname
    } catch {
      return false
    }
  }

  const labels = host.split('.').filter(Boolean)
  if (labels.length === 0) return false
  if (RESERVED_TLDS.has(labels[labels.length - 1])) return true
  // Catches "birmingham-test.example.org" style stand-ins too.
  return labels.some((l) => l === 'example' || l.endsWith('-test') || l.startsWith('test-'))
}

/**
 * The 555 exchange. data/schema.md requires placeholders to sit in the reserved
 * 555-01xx block specifically; anything else in the 555 exchange is still clearly
 * not a real office line, so it counts as synthetic here and is reported separately
 * as a rule violation by lib/repositories/verify.ts.
 */
const FIVE_FIVE_FIVE = /^(?:\+?1[\s.-]*)?\(?\d{3}\)?[\s.-]*555[\s.-]*\d{4}$/

function phoneIsPlaceholder(phone: string | null): boolean {
  return Boolean(phone && FIVE_FIVE_FIVE.test(phone.trim()))
}

/** Reserved-for-fiction block that data/schema.md mandates for placeholders. */
export function isReservedPlaceholderPhone(phone: string | null): boolean {
  if (!phone) return false
  const digits = phone.replace(/\D/g, '')
  const local = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
  return local.length === 10 && local.slice(3, 6) === '555' && local.slice(6).startsWith('01')
}

/** Why a row was judged synthetic. Empty means it looks like real published data. */
export function syntheticSignals(row: MunicipalEvidenceRow): string[] {
  const signals: string[] = []
  if (phoneIsPlaceholder(row.phone ?? null)) signals.push(`phone in the 555 exchange (${row.phone})`)
  if (hostIsPlaceholder(row.source_url)) signals.push('source_url on a reserved test/example domain')
  if (hostIsPlaceholder(row.form_url ?? null)) signals.push('form_url on a reserved test/example domain')
  if (hostIsPlaceholder(row.email ?? null)) signals.push('email on a reserved test/example domain')
  return signals
}

export interface DroppedRow {
  sourceId: string
  reason: 'inactive' | 'unmapped_jurisdiction' | 'unmapped_service' | 'no_contact_channel'
  detail: string
}

export interface MappingResult {
  records: OfficeRecord[]
  dropped: DroppedRow[]
}

function nullify(v: string | null | undefined): string | null {
  const trimmed = v?.trim()
  return trimmed ? trimmed : null
}

/** One source row fans out to one OfficeRecord per crosswalked service type. */
export function mapRow(row: MunicipalEvidenceRow): MappingResult {
  const sourceId = String(row.id)
  const dropped: DroppedRow[] = []

  if (row.is_active !== true) {
    return { records: [], dropped: [{ sourceId, reason: 'inactive', detail: 'is_active is not true' }] }
  }

  const jurisdiction = mapJurisdiction(row.jurisdiction_name)
  if (!jurisdiction) {
    return {
      records: [],
      dropped: [
        { sourceId, reason: 'unmapped_jurisdiction', detail: `unrecognized jurisdiction_name "${row.jurisdiction_name}"` },
      ],
    }
  }

  const serviceTypes = crosswalkService(row.service)
  if (serviceTypes.length === 0) {
    return {
      records: [],
      dropped: [{ sourceId, reason: 'unmapped_service', detail: `no crosswalk for service "${row.service}"` }],
    }
  }

  // Judged once per source row: the signals do not vary by service type.
  const signals = syntheticSignals(row)

  const records: OfficeRecord[] = []
  for (const serviceType of serviceTypes) {
    const record: OfficeRecord = {
      // Unique after fan-out: one source row yields several records.
      id: `me:${sourceId}:${serviceType}`,
      jurisdiction_type: jurisdiction.type,
      jurisdiction_name: jurisdiction.name,
      service_type: serviceType,
      office_name: row.responsible_entity.trim(),
      phone: nullify(row.phone),
      email: nullify(row.email),
      form_url: nullify(row.form_url),
      what_to_say: WHAT_TO_SAY[serviceType],
      source_url: row.source_url.trim(),
      checked_on: row.last_checked.trim(),
      confidence: mapConfidence(row.confidence),
      notes: nullify(row.conflict_or_gap),
      is_synthetic: signals.length > 0,
    }

    if (!isUsable(record)) {
      dropped.push({
        sourceId,
        reason: 'no_contact_channel',
        detail: 'no phone, email, or form_url',
      })
      continue
    }
    records.push(record)
  }

  return { records, dropped }
}

/** Maps a whole result set, accumulating drop reasons for the health and verify reports. */
export function mapRows(rows: MunicipalEvidenceRow[]): MappingResult {
  const records: OfficeRecord[] = []
  const dropped: DroppedRow[] = []
  for (const row of rows) {
    const result = mapRow(row)
    records.push(...result.records)
    dropped.push(...result.dropped)
  }
  return { records, dropped }
}
