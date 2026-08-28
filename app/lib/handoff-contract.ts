/**
 * Client-facing view of the frozen product contract.
 *
 * The source of truth is lib/contracts.ts. This module only adds UI-specific
 * presentation types, so the browser and API cannot drift into parallel contracts.
 */
import {
  ISSUE_SUBTYPES,
  ISSUE_SUBTYPE_LABELS,
  JURISDICTIONS,
  JURISDICTION_LABELS as CONTRACT_JURISDICTION_LABELS,
  type HandoffResponse,
  type IssueSubtype,
  type JurisdictionId,
  type SyntheticLocationId,
} from '@/lib/contracts'

export const SUPPORTED_ISSUE_TYPES = ISSUE_SUBTYPES
export type IssueType = IssueSubtype
export const ISSUE_TYPE_LABELS = ISSUE_SUBTYPE_LABELS

export const SUPPORTED_JURISDICTIONS = JURISDICTIONS
export type JurisdictionHint = JurisdictionId
export const JURISDICTION_LABELS = CONTRACT_JURISDICTION_LABELS

/** UI copy layered over one of the three frozen synthetic locations. */
export interface SyntheticLocation {
  id: SyntheticLocationId
  jurisdictionHint: JurisdictionHint
  label: string
  description: string
  exampleMessage: string
}

export type Confidence = HandoffResponse['confidence']
export type { HandoffResponse }

/** UI states derived from the API's RouteApiResult discriminator. */
export type RouteOutcome =
  | { kind: 'ok'; data: HandoffResponse }
  | { kind: 'out_of_scope'; supportedIssueTypes: IssueType[] }
  | { kind: 'unknown_jurisdiction'; supportedJurisdictions: JurisdictionHint[] }
  | { kind: 'emergency'; message: string; disclaimer: string }
  | { kind: 'not_covered'; reason: string; conflictOrGap: string | null; disclaimer: string }
  | { kind: 'error'; message: string }
