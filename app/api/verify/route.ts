import { NextResponse } from 'next/server'
import { verifySupabaseSource } from '@/lib/repositories/verify'

export const runtime = 'nodejs'

/**
 * Diagnostic endpoint for the Supabase data source. Not available in production —
 * it reports table names and mapping internals that a public endpoint should not.
 * /api/health is the production-safe summary.
 */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  try {
    const report = await verifySupabaseSource()
    return NextResponse.json(report, { status: report.ok ? 200 : 503 })
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 503 })
  }
}
