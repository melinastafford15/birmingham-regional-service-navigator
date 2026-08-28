/**
 * FROZEN INTEGRATION CONTRACTS — CivicRoute BHM
 *
 * Owner: Melina Stafford (product lead / integrator).
 * Nobody changes the shapes in this file without her explicit approval.
 *
 * This module is ADDITIVE. It does not replace `lib/types.ts`, which describes the
 * current backend's internal shapes. `lib/types.ts` is the implementation's vocabulary;
 * this file is the vocabulary the four lanes agreed to hand each other. Where the two
 * differ, the mapping tables in section 5 are the bridge, and the divergences are
 * tracked in docs/integration-checklist.md.
 *
 * Lane boundaries these types sit on:
 *   UI (JJ)             --RouteRequestPayload-->   API (Upendar)
 *   Retrieval (Andrew)  --EvidenceBundle-->        API (Upendar)
 *   API (Upendar)       --HandoffResponse-->       UI (JJ)
 */

/* ------------------------------------------------------------------ *
 * 1. Frozen scope
 * ------------------------------------------------------------------ */

/** The one service family in the frozen MVP. */
export const SERVICE_FAMILY = 'public-right-of-way-maintenance' as const
export type ServiceFamily = typeof SERVICE_FAMILY

/** The four supported issue subtypes. Adding a fifth is a scope change. */
export const ISSUE_SUBTYPES = [
  'pothole-road-damage',
  'sidewalk-damage',
  'blocked-drainage',
  'fallen-tree-debris',
] as const

export type IssueSubtype = (typeof ISSUE_SUBTYPES)[number]

/** Resident-facing labels. Safe to render directly. */
export const ISSUE_SUBTYPE_LABELS: Record<IssueSubtype, string> = {
  'pothole-road-damage': 'Pothole or road damage',
  'sidewalk-damage': 'Sidewalk damage',
  'blocked-drainage': 'Blocked drainage',
  'fallen-tree-debris': 'Fallen tree or debris',
}

/** The three jurisdictions in the frozen MVP. */
export const JURISDICTIONS = ['birmingham-al', 'jefferson-county-al', 'homewood-al'] as const

export type JurisdictionId = (typeof JURISDICTIONS)[number]

export const JURISDICTION_LABELS: Record<JurisdictionId, string> = {
  'birmingham-al': 'City of Birmingham',
  'jefferson-county-al': 'Jefferson County',
  'homewood-al': 'City of Homewood',
}

/**
 * Census place names, for joining against `data/offices.seed.json`.
 * The warehouse joins on the exact Census string — see data/schema.md.
 */
export const JURISDICTION_CENSUS_NAMES: Record<JurisdictionId, string> = {
  'birmingham-al': 'Birmingham city',
  'jefferson-county-al': 'Jefferson County',
  'homewood-al': 'Homewood city',
}

export type Confidence = 'high' | 'medium' | 'low'

/* ------------------------------------------------------------------ *
 * 2. UI -> API : the request
 * ------------------------------------------------------------------ */

/**
 * Synthetic demo locations. The MVP never accepts a real resident address:
 * the UI sends an opaque id and the backend resolves it from a fixed table.
 * Every id is prefixed "BHM-DEMO-" so it is visibly synthetic in logs and screenshots.
 */
export type SyntheticLocationId = `BHM-DEMO-${string}`

export interface RouteRequestPayload {
  /** The resident's plain-language description. */
  message: string
  /** Opaque id of a clearly synthetic demo location. Never a real address. */
  synthetic_location_id: SyntheticLocationId
  /** The UI's guess at jurisdiction. Advisory only — retrieval may override it. */
  jurisdiction_hint: JurisdictionId
}

/** A fabricated location used for demos. No such address exists. */
export interface SyntheticLocation {
  id: SyntheticLocationId
  /** Fabricated street label. Shown to the demo audience, never geocoded. */
  label: string
  jurisdiction: JurisdictionId
  /** Why this case is in the demo set — the routing lesson it illustrates. */
  demonstrates: string
}

/**
 * The frozen demo set. Three cases, one per jurisdiction.
 *
 * These are the ONLY locations the MVP accepts. Street names are fabricated and do
 * not correspond to real addresses; the backend resolves an id to a jurisdiction from
 * this table rather than geocoding resident-typed text. Adding a fourth demo location
 * is a scope decision.
 */
export const SYNTHETIC_LOCATIONS: readonly SyntheticLocation[] = [
  {
    id: 'BHM-DEMO-01',
    label: 'Demo Location 01 — 100 Example Ave, City of Birmingham (synthetic)',
    jurisdiction: 'birmingham-al',
    demonstrates:
      'The baseline city case, where responsibility may still be shared with the adjoining property owner.',
  },
  {
    id: 'BHM-DEMO-02',
    label: 'Demo Location 02 — 200 Example Rd, unincorporated Jefferson County (synthetic)',
    jurisdiction: 'jefferson-county-al',
    demonstrates:
      'A location with a Birmingham-style mailing address that is not inside any city, so county offices handle it.',
  },
  {
    id: 'BHM-DEMO-03',
    label: 'Demo Location 03 — 300 Example Ln, City of Homewood (synthetic)',
    jurisdiction: 'homewood-al',
    demonstrates:
      'A separate municipality with its own public works intake, where city and county claims can overlap on annexed streets.',
  },
] as const

/** Looks up a frozen demo location. Returns null for anything not in the table. */
export function findSyntheticLocation(id: string): SyntheticLocation | null {
  return SYNTHETIC_LOCATIONS.find((l) => l.id === id) ?? null
}

/* ------------------------------------------------------------------ *
 * 3. Retrieval (Andrew) -> API (Upendar) : the evidence bundle
 * ------------------------------------------------------------------ */

/** One retrieved record of official evidence. Provenance is never optional. */
export interface EvidenceRecord {
  /** Stable id from the warehouse. */
  id: string
  /** The entity this record describes, e.g. "Birmingham Department of Transportation". */
  entity: string
  jurisdiction: JurisdictionId
  /** Verbatim or closely paraphrased text from the official source. */
  excerpt: string
  title: string
  publisher: string
  url: string
  /** ISO date (YYYY-MM-DD) the source was last verified. */
  last_checked: string
  /** Retrieval score, 0–1. Higher is a better match. */
  relevance: number
  /** True for placeholder rows. The UI MUST surface this. */
  is_synthetic: boolean
}

/**
 * What `retrieveEvidence(message, jurisdictionHint)` returns.
 * Retrieval classifies and gathers evidence; it never names the responsible entity.
 */
export interface EvidenceBundle {
  service: ServiceFamily
  issue_subtype: IssueSubtype
  /** Every jurisdiction with a plausible claim, most likely first. */
  candidate_jurisdictions: JurisdictionId[]
  evidence_records: EvidenceRecord[]
  retrieval_confidence: Confidence
  /** Named conflict, overlap, or coverage gap. Null when the evidence is clean. */
  conflict_or_gap: string | null
}

export type RetrieveEvidence = (
  message: string,
  jurisdictionHint: JurisdictionId,
) => Promise<EvidenceBundle>

/* ------------------------------------------------------------------ *
 * 4. API (Upendar) -> UI (JJ) : the handoff response
 * ------------------------------------------------------------------ */

/** An official contact channel. At least one field is non-null. */
export interface OfficialContact {
  phone: string | null
  email: string | null
  form_url: string | null
}

/** Provenance shown beside every routed answer. */
export interface Source {
  title: string
  publisher: string
  url: string
  /** ISO date (YYYY-MM-DD). */
  last_checked: string
}

/** The exact disclaimer text. Render it verbatim on every routed response. */
export const DISCLAIMER =
  'This is a navigation aid, not a legal determination, and it does not submit a service request.'

/** The exact human-confirmation instruction shown on every routed response. */
export const HUMAN_CONFIRMATION_INSTRUCTION =
  'Call or contact the office listed above and ask them to confirm they are responsible before you rely on this result.'

export interface HandoffResponse {
  service: ServiceFamily
  issue_subtype: IssueSubtype
  /** The office we believe is the starting point — NOT a determination of legal responsibility. */
  likely_responsible_entity: string
  jurisdiction: JurisdictionId
  /** Why this entity, in one or two plain sentences a resident can read. */
  reason: string
  confidence: Confidence
  /** Named conflict, overlap, or gap. Null when there is none. Render whenever present. */
  conflict_or_gap: string | null
  /** The single concrete next step, e.g. "Call ... at ... and ask about ...". */
  next_action: string
  official_contact: OfficialContact
  /** Never empty on a routed response. */
  sources: Source[]
  /** Always true in the frozen MVP. */
  requires_human_confirmation: boolean
  human_confirmation_instruction: string
  disclaimer: string
}

/* ------------------------------------------------------------------ *
 * 4b. The two non-handoff outcomes
 * ------------------------------------------------------------------ */

/**
 * `HandoffResponse` describes a routed answer. Two real cases are not routed answers:
 * a life-safety emergency, and a request we have no evidence for. Neither can be
 * expressed by inventing a `likely_responsible_entity`.
 *
 * So the API wraps its result in an `outcome` discriminator. A handoff carries every
 * frozen `HandoffResponse` field unchanged — this is a superset of the frozen shape,
 * not a change to it. The UI branches on `outcome` before reading anything else.
 */
export interface EmergencyResult {
  outcome: 'emergency'
  message: string
  disclaimer: string
}

export interface NotCoveredResult {
  outcome: 'not_covered'
  /** Plain-language explanation. Never a guess at an office. */
  reason: string
  /** What we would need in order to answer, when that is knowable. */
  conflict_or_gap: string | null
  disclaimer: string
}

export type HandoffResult = { outcome: 'handoff' } & HandoffResponse

export type RouteApiResult = HandoffResult | EmergencyResult | NotCoveredResult

/** Shown when life-safety language is detected. No lookup runs. */
export const EMERGENCY_MESSAGE =
  'This sounds like an emergency. Call 911 now. We did not look up a routing office.'

export function isHandoff(result: RouteApiResult): result is HandoffResult {
  return result.outcome === 'handoff'
}

/* ------------------------------------------------------------------ *
 * 5. Mock — one complete synthetic case so the UI can build standalone
 * ------------------------------------------------------------------ */

/** The canonical demo request: Birmingham sidewalk, synthetic location. */
export const MOCK_BIRMINGHAM_SIDEWALK_REQUEST: RouteRequestPayload = {
  message: 'The sidewalk is broken near my location',
  synthetic_location_id: 'BHM-DEMO-01',
  jurisdiction_hint: 'birmingham-al',
}

/**
 * A complete, frozen-shape response for the Birmingham sidewalk case.
 *
 * JJ builds the handoff card against this without waiting for the API.
 * Every field the UI gate requires is populated, including a non-null
 * `conflict_or_gap`, because the ambiguity is the product.
 *
 * SYNTHETIC: the contact below uses the reserved 555-01xx example range and a
 * non-resolving placeholder URL. It must render with a visible "example data" badge.
 */
export const MOCK_BIRMINGHAM_SIDEWALK_RESPONSE: HandoffResponse = {
  service: SERVICE_FAMILY,
  issue_subtype: 'sidewalk-damage',
  likely_responsible_entity: 'Birmingham Department of Transportation',
  jurisdiction: 'birmingham-al',
  reason:
    'Synthetic demo location BHM-DEMO-01 sits inside Birmingham city limits, and the city transportation department is the published starting point for sidewalk repair requests on city right-of-way.',
  confidence: 'medium',
  conflict_or_gap:
    'Sidewalk repair may fall to the adjoining property owner rather than the city in some cases. Ask the office which applies at this location.',
  next_action:
    'Call Birmingham Department of Transportation at 205-555-0102 and ask about sidewalk repair responsibility at this location.',
  official_contact: {
    phone: '205-555-0102',
    email: null,
    form_url: null,
  },
  sources: [
    {
      title: 'Sidewalk repair requests (placeholder pending verification)',
      publisher: 'City of Birmingham',
      url: 'https://example.invalid/placeholder-pending-verification',
      last_checked: '2026-08-28',
    },
  ],
  requires_human_confirmation: true,
  human_confirmation_instruction: HUMAN_CONFIRMATION_INSTRUCTION,
  disclaimer: DISCLAIMER,
}

/* ------------------------------------------------------------------ *
 * 6. Bridge to the current backend internals (lib/types.ts)
 * ------------------------------------------------------------------ */

/**
 * Maps a frozen subtype to the internal ServiceType used by the existing
 * classifier and JSON repository.
 *
 * `fallen_tree_debris` was added to lib/types.ts and data/offices.seed.json so that
 * all four frozen subtypes have real coverage in all three jurisdictions. Before that
 * it had no internal equivalent and zero data rows.
 */
export const SUBTYPE_TO_INTERNAL_SERVICE_TYPE: Record<IssueSubtype, string> = {
  'pothole-road-damage': 'pothole_street',
  'sidewalk-damage': 'sidewalk',
  'blocked-drainage': 'storm_drain',
  'fallen-tree-debris': 'fallen_tree_debris',
}

/** Reverse bridge. Internal types outside the frozen four map to null. */
export const INTERNAL_SERVICE_TYPE_TO_SUBTYPE: Record<string, IssueSubtype | null> = {
  pothole_street: 'pothole-road-damage',
  sidewalk: 'sidewalk-damage',
  storm_drain: 'blocked-drainage',
  fallen_tree_debris: 'fallen-tree-debris',
  illegal_dumping: null,
  traffic_signal: null,
  street_light: null,
  abandoned_vehicle: null,
  other: null,
}

/** Census place name -> frozen jurisdiction id. Anything else is out of frozen scope. */
export const CENSUS_NAME_TO_JURISDICTION: Record<string, JurisdictionId> = {
  'Birmingham city': 'birmingham-al',
  'Jefferson County': 'jefferson-county-al',
  'Homewood city': 'homewood-al',
}

/* ------------------------------------------------------------------ *
 * 7. Guards — cheap runtime checks for gate enforcement
 * ------------------------------------------------------------------ */

export function isIssueSubtype(value: unknown): value is IssueSubtype {
  return typeof value === 'string' && (ISSUE_SUBTYPES as readonly string[]).includes(value)
}

export function isJurisdictionId(value: unknown): value is JurisdictionId {
  return typeof value === 'string' && (JURISDICTIONS as readonly string[]).includes(value)
}

export function isSyntheticLocationId(value: unknown): value is SyntheticLocationId {
  return typeof value === 'string' && value.startsWith('BHM-DEMO-')
}

/** Validates a UI request against the frozen shape. Returns the reasons it failed. */
export function validateRouteRequest(payload: unknown): string[] {
  const errors: string[] = []
  const p = payload as Partial<RouteRequestPayload> | null

  if (!p || typeof p !== 'object') return ['payload must be a JSON object']
  if (typeof p.message !== 'string' || !p.message.trim())
    errors.push('message must be a non-empty string')
  if (!isSyntheticLocationId(p.synthetic_location_id))
    errors.push('synthetic_location_id must be a synthetic id beginning with "BHM-DEMO-"')
  else if (!findSyntheticLocation(p.synthetic_location_id))
    errors.push(
      `synthetic_location_id must be one of the frozen demo locations: ${SYNTHETIC_LOCATIONS.map((l) => l.id).join(', ')}`,
    )
  if (!isJurisdictionId(p.jurisdiction_hint))
    errors.push(`jurisdiction_hint must be one of: ${JURISDICTIONS.join(', ')}`)

  return errors
}
