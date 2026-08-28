import { NextResponse } from 'next/server'
import { officeRepository, repositorySource, seedRepository, supabaseRepository } from '@/lib/repositories'

export const runtime = 'nodejs'

/**
 * Reports which data source is live and whether it is actually returning records.
 *
 * A configured Supabase source that maps to zero records is reported UNHEALTHY, not
 * as a valid empty table: PostgREST answers a blocked read with `200 []`, so an RLS
 * policy that excludes our key looks identical to "no data" from the client side.
 */
export async function GET() {
  const seedCount = await seedRepository.count()

  if (!supabaseRepository) {
    return NextResponse.json({
      ok: true,
      source: repositorySource,
      officeCount: seedCount,
      seed: { records: seedCount, synthetic: true },
      supabase: null,
      hasApiKey: Boolean(process.env.ANTHROPIC_API_KEY),
    })
  }

  try {
    const { records, dropped } = await supabaseRepository.report()

    const droppedByReason = dropped.reduce<Record<string, number>>((acc, d) => {
      acc[d.reason] = (acc[d.reason] ?? 0) + 1
      return acc
    }, {})

    const supabaseHealthy = records.length > 0

    return NextResponse.json(
      {
        ok: supabaseHealthy,
        source: repositorySource,
        officeCount: await officeRepository.count(),
        seed: { records: seedCount, synthetic: true },
        supabase: {
          reachable: true,
          records: records.length,
          dropped: dropped.length,
          droppedByReason,
          ...(supabaseHealthy
            ? {}
            : {
                error:
                  'Reachable but mapped to zero records. Check RLS policy for this key, or a jurisdiction/service mapping mismatch.',
              }),
        },
        hasApiKey: Boolean(process.env.ANTHROPIC_API_KEY),
      },
      { status: supabaseHealthy ? 200 : 503 },
    )
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        source: repositorySource,
        officeCount: null,
        seed: { records: seedCount, synthetic: true },
        supabase: { reachable: false, error: (error as Error).message },
        hasApiKey: Boolean(process.env.ANTHROPIC_API_KEY),
      },
      { status: 503 },
    )
  }
}
