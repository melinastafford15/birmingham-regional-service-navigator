/**
 * Shared contract types for the Birmingham Regional Service Navigator.
 *
 * The frontend should import from here rather than redefining these shapes.
 * See docs/API.md for the endpoint contract and data/schema.md for the data contract.
 */

/** The service domain we cover: the public right-of-way and adjacent infrastructure. */
export const SERVICE_TYPES = [
  'storm_drain',
  'pothole_street',
  'sidewalk',
  'traffic_signal',
  'street_light',
  'illegal_dumping',
  'abandoned_vehicle',
  'other',
] as const

export type ServiceType = (typeof SERVICE_TYPES)[number]

/** Human-readable labels, safe to show in UI. */
export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  storm_drain: 'Storm drain or drainage',
  pothole_street: 'Pothole or street surface',
  sidewalk: 'Sidewalk',
  traffic_signal: 'Traffic or crosswalk signal',
  street_light: 'Street light',
  illegal_dumping: 'Illegal dumping or debris',
  abandoned_vehicle: 'Abandoned vehicle',
  other: 'Something else',
}

export type Confidence = 'high' | 'medium' | 'low'
export type JurisdictionLevel = 'city' | 'county' | 'state'

/** Where the address actually is — not what the mailing address claims. */
export interface Jurisdiction {
  /** Census incorporated place, e.g. "Homewood city". Null when unincorporated. */
  place: string | null
  /** Census county name, e.g. "Jefferson County". */
  county: string | null
  /** Census state name, e.g. "Alabama". */
  state: string | null
  /** The address as the geocoder normalized it. */
  matchedAddress: string | null
  coordinates: { lat: number; lon: number } | null
  /** "none" means the address could not be resolved at all. */
  confidence: Confidence | 'none'
  /** True when the address resolved to a county but no incorporated place. */
  isUnincorporated: boolean
}

/** How to reach an office. At least one field is always present. */
export interface Channel {
  phone: string | null
  email: string | null
  formUrl: string | null
}

/** Provenance for a contact. Both fields are required on every record. */
export interface SourceRef {
  url: string
  /** ISO date (YYYY-MM-DD) the source was last verified. */
  checkedOn: string
}

/** A routed office recommendation. */
export interface Recommendation {
  office: string
  level: JurisdictionLevel
  jurisdictionName: string
  channel: Channel
  /** One line the resident can read aloud so they aren't re-explaining. */
  whatToSay: string
  source: SourceRef
  confidence: Confidence
  /** True for placeholder rows. Must be surfaced in the UI. */
  isSynthetic: boolean
  notes: string | null
}

export type RouteStatus = 'routed' | 'needs_location' | 'not_covered' | 'emergency'

export interface RouteRequest {
  /** Plain-language description of the problem. */
  message: string
  /** Address, intersection, or place description. */
  location?: string
}

export interface RouteResponse {
  status: RouteStatus
  jurisdiction: Jurisdiction | null
  serviceType: ServiceType | null
  /** Our best routing. Null unless status is "routed". */
  primary: Recommendation | null
  /** Populated when more than one office may have a claim. */
  alternates: Recommendation[]
  /** Named overlaps, gaps, staleness, and caveats. Always safe to render as a list. */
  notes: string[]
  /** True when this request was written to the gap register. */
  gapLogged: boolean
  /** Plain-text reply, <= 320 chars, ready for SMS. */
  sms: string
  /** Names the human review point. Render on every routed response. */
  disclaimer: string
}

/** One unresolved or ambiguous lookup — the institutional byproduct. */
export interface GapEntry {
  serviceType: ServiceType | null
  place: string | null
  county: string | null
  reason: 'no_match' | 'ambiguous_ownership' | 'out_of_coverage'
  message: string
  at: string
}

export const DISCLAIMER =
  'Guidance only, based on published public sources. The office you contact confirms responsibility.'
