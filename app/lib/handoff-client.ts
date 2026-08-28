import type {
  HandoffResponse,
  RouteApiResult,
  RouteRequestPayload,
  SyntheticLocationId,
} from '@/lib/contracts'
import type { JurisdictionHint, RouteOutcome } from './handoff-contract'

interface SubmitParams {
  message: string
  syntheticLocationId: SyntheticLocationId
  jurisdictionHint: JurisdictionHint
}

function isHandoffResponse(value: unknown): value is HandoffResponse {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>

  return (
    typeof v.likely_responsible_entity === 'string' &&
    typeof v.jurisdiction === 'string' &&
    typeof v.reason === 'string' &&
    (v.confidence === 'high' || v.confidence === 'medium' || v.confidence === 'low') &&
    typeof v.next_action === 'string' &&
    Boolean(v.official_contact) &&
    typeof v.official_contact === 'object' &&
    Array.isArray(v.sources) &&
    v.sources.length > 0 &&
    v.requires_human_confirmation === true &&
    typeof v.human_confirmation_instruction === 'string' &&
    typeof v.disclaimer === 'string'
  )
}

function toOutcome(value: unknown): RouteOutcome | null {
  if (!value || typeof value !== 'object') return null
  const result = value as Partial<RouteApiResult> & Record<string, unknown>

  if (result.outcome === 'handoff' && isHandoffResponse(result)) {
    return { kind: 'ok', data: result }
  }

  if (
    result.outcome === 'emergency' &&
    typeof result.message === 'string' &&
    typeof result.disclaimer === 'string'
  ) {
    return { kind: 'emergency', message: result.message, disclaimer: result.disclaimer }
  }

  if (
    result.outcome === 'not_covered' &&
    typeof result.reason === 'string' &&
    (typeof result.conflict_or_gap === 'string' || result.conflict_or_gap === null) &&
    typeof result.disclaimer === 'string'
  ) {
    return {
      kind: 'not_covered',
      reason: result.reason,
      conflictOrGap: result.conflict_or_gap,
      disclaimer: result.disclaimer,
    }
  }

  return null
}

export async function submitRoute({
  message,
  syntheticLocationId,
  jurisdictionHint,
}: SubmitParams): Promise<RouteOutcome> {
  const payload: RouteRequestPayload = {
    message,
    synthetic_location_id: syntheticLocationId,
    jurisdiction_hint: jurisdictionHint,
  }

  try {
    const response = await fetch('/api/route-request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const body: unknown = await response.json()

    if (!response.ok) {
      return {
        kind: 'error',
        message: `The service could not process that request (status ${response.status}). Your entry was not lost — you can try again.`,
      }
    }

    const outcome = toOutcome(body)
    if (!outcome) {
      return {
        kind: 'error',
        message:
          'The service responded, but not in a shape this page understands. Your entry was not lost — you can try again.',
      }
    }

    return outcome
  } catch {
    return {
      kind: 'error',
      message:
        'We could not reach the service. Check your connection and try again — your entry was not lost.',
    }
  }
}
