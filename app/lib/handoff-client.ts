import { getMockRouteOutcome } from './handoff-fixtures'
import type { JurisdictionHint, RouteOutcome } from './handoff-contract'

export type ApiMode = 'mock' | 'live'

/**
 * Defaults to the live backend (POST /api/route). Append `?api=mock` to fall back to
 * the local fixture responses — useful for UI work without a running API or API key.
 */
export function getApiMode(): ApiMode {
  if (typeof window === 'undefined') return 'live'
  return new URLSearchParams(window.location.search).get('api') === 'mock' ? 'mock' : 'live'
}

interface SubmitParams {
  message: string
  syntheticLocationId: string
  jurisdictionHint: JurisdictionHint
  mode: ApiMode
}

function isStructurallyUsable(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.likely_responsible_entity === 'string' &&
    typeof v.jurisdiction === 'string' &&
    typeof v.confidence === 'string' &&
    typeof v.next_action === 'string' &&
    typeof v.disclaimer === 'string' &&
    Array.isArray(v.sources)
  )
}

const MOCK_LATENCY_MS = 500

export async function submitRoute({ message, syntheticLocationId, jurisdictionHint, mode }: SubmitParams): Promise<RouteOutcome> {
  if (mode === 'mock') {
    await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS))
    return getMockRouteOutcome(message, syntheticLocationId)
  }

  try {
    const response = await fetch('/api/route', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message,
        synthetic_location_id: syntheticLocationId,
        jurisdiction_hint: jurisdictionHint,
      }),
    })

    if (!response.ok) {
      return { kind: 'error', message: `The service could not process that request (status ${response.status}). Your entry was not lost — you can try again.` }
    }

    const body: unknown = await response.json()
    if (!isStructurallyUsable(body)) {
      return { kind: 'error', message: 'The service responded, but not in a shape this page understands yet. Your entry was not lost — you can try again.' }
    }

    return { kind: 'ok', data: body as import('./handoff-contract').HandoffResponse }
  } catch {
    return { kind: 'error', message: 'We could not reach the service. Check your connection and try again — your entry was not lost.' }
  }
}
