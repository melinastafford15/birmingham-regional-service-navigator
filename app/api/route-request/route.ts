import { NextResponse } from 'next/server'
import { validateRouteRequest, type RouteRequestPayload } from '@/lib/contracts'
import { buildHandoff } from '@/lib/handoff'

/**
 * The frozen contract endpoint.
 *
 * Request:  RouteRequestPayload  { message, synthetic_location_id, jurisdiction_hint }
 * Response: RouteApiResult       discriminated by `outcome`
 *
 * All translation between the frozen contract and the backend internals lives in
 * lib/handoff.ts. This route validates, delegates, and serializes — nothing else.
 */

export const runtime = 'nodejs'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const errors = validateRouteRequest(body)
  if (errors.length > 0) {
    return NextResponse.json({ error: 'Invalid request', details: errors }, { status: 400 })
  }

  const result = await buildHandoff(body as RouteRequestPayload)
  return NextResponse.json(result)
}
