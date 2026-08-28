/**
 * CONTRACT STATUS: LOCAL / FROZEN-DRAFT — NOT the shape implemented by app/api/route-request.
 *
 * These types match the "frozen" resident-chat handoff contract this UI was briefed
 * against (POST /api/route, synthetic_location_id + jurisdiction_hint request,
 * official_contact / sources[] / requires_human_confirmation response).
 *
 * The committed backend contract (see ../../docs/API.md and ../../lib/types.ts) is a
 * different shape: POST /api/route-request, free-text `location`, and a
 * status/primary/alternates response. Do not import from lib/types.ts here and do not
 * merge these two shapes without a reconciliation decision from the product lead and
 * the API owner — see contract-risk notes in the PR description.
 *
 * This file exists so the handoff UI has something concrete to render against while
 * that reconciliation happens. Swap it out (or delete it) once a single contract is
 * agreed and generate the client against that instead.
 */

export const SUPPORTED_ISSUE_TYPES = [
  'pothole_road_damage',
  'sidewalk_damage',
  'blocked_drainage',
  'fallen_tree_debris',
] as const

export type IssueType = (typeof SUPPORTED_ISSUE_TYPES)[number]

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  pothole_road_damage: 'Pothole or road damage',
  sidewalk_damage: 'Sidewalk damage',
  blocked_drainage: 'Blocked drainage',
  fallen_tree_debris: 'Fallen tree or debris',
}

export const SUPPORTED_JURISDICTIONS = [
  'birmingham-al',
  'jefferson-county-al',
  'homewood-al',
] as const

export type JurisdictionHint = (typeof SUPPORTED_JURISDICTIONS)[number]

export const JURISDICTION_LABELS: Record<JurisdictionHint, string> = {
  'birmingham-al': 'Birmingham',
  'jefferson-county-al': 'Jefferson County',
  'homewood-al': 'Homewood',
}

/** One of the three prewritten synthetic demo locations. No real address is ever collected. */
export interface SyntheticLocation {
  id: string
  jurisdictionHint: JurisdictionHint
  label: string
  description: string
  exampleMessage: string
}

export interface RouteRequest {
  message: string
  synthetic_location_id: string
  jurisdiction_hint: JurisdictionHint
}

export type Confidence = 'high' | 'medium' | 'low'

export interface OfficialContact {
  phone: string | null
  email: string | null
  form_url: string | null
}

export interface EvidenceSource {
  title: string
  publisher: string
  url: string
  last_checked: string
}

/** The frozen handoff response. Every field is optional at the type level because the
 * UI must render gracefully whether or not a given field is present. */
export interface HandoffResponse {
  service: string
  issue_subtype: IssueType | null
  likely_responsible_entity: string
  jurisdiction: string
  reason: string
  confidence: Confidence
  conflict_or_gap: string | null
  next_action: string
  official_contact: OfficialContact | null
  sources: EvidenceSource[]
  requires_human_confirmation: boolean
  human_confirmation_instruction: string
  disclaimer: string
}

export const REQUIRED_DISCLAIMER =
  'This is a navigation aid, not a legal determination, and it does not submit a service request.'

/** Non-happy-path outcomes the UI must handle without a HandoffResponse. */
export type RouteOutcome =
  | { kind: 'ok'; data: HandoffResponse }
  | { kind: 'out_of_scope'; supportedIssueTypes: IssueType[] }
  | { kind: 'unknown_jurisdiction'; supportedJurisdictions: JurisdictionHint[] }
  | { kind: 'error'; message: string }
