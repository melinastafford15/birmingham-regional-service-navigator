import type { OfficeRecord } from '../repository'
import { SERVICE_TYPES, type ServiceType } from '../types'
import { isReservedPlaceholderPhone, sourceServicesFor } from './municipal-evidence'
import { SupabaseOfficeRepository, supabaseConfigFromEnv } from './supabase-repository'

/**
 * End-to-end verification of the Supabase office data source.
 *
 * Exposed at GET /api/verify (non-production only). Pure and side-effect free apart
 * from the reads it performs, so it can be called from a test or a script later.
 *
 * The jurisdiction-name check is the important one: the lookup joins on the exact US
 * Census place string, so a near-miss is a silent no-match rather than an error. We
 * check the mapped names against the same TIGERweb layer lib/geocode.ts resolves
 * against, rather than trusting the transform.
 */

const TIGERWEB_PLACES =
  'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/4/query'

export interface Check {
  name: string
  ok: boolean
  detail: string
}

export interface VerifyReport {
  ok: boolean
  configured: boolean
  table: string | null
  counts: { sourceRows: number; mappedRecords: number; dropped: number } | null
  droppedDetail: Record<string, string[]>
  coverage: { fromSupabase: ServiceType[]; fromSeed: ServiceType[] }
  checks: Check[]
}

async function censusAlabamaPlaces(): Promise<Set<string> | null> {
  const url = `${TIGERWEB_PLACES}?where=${encodeURIComponent("STATE='01'")}&outFields=NAME&returnGeometry=false&f=json`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000), cache: 'no-store' })
    if (!res.ok) return null
    const body = (await res.json()) as { features?: Array<{ attributes?: { NAME?: string } }> }
    const names = (body.features ?? [])
      .map((f) => f.attributes?.NAME)
      .filter((n): n is string => Boolean(n))
    return names.length > 0 ? new Set(names) : null
  } catch {
    return null
  }
}

interface Probe {
  label: string
  place: string | null
  county: string | null
  serviceType: ServiceType
  expect: 'records' | 'empty'
}

/** Real jurisdictions from the dataset, plus two that must come back empty. */
const PROBES: Probe[] = [
  { label: 'Birmingham city / pothole_street', place: 'Birmingham city', county: 'Jefferson County', serviceType: 'pothole_street', expect: 'records' },
  { label: 'Homewood city / sidewalk', place: 'Homewood city', county: 'Jefferson County', serviceType: 'sidewalk', expect: 'records' },
  { label: 'Mountain Brook city / pothole_street', place: 'Mountain Brook city', county: 'Jefferson County', serviceType: 'pothole_street', expect: 'records' },
  { label: 'unincorporated Jefferson County / sidewalk', place: null, county: 'Jefferson County', serviceType: 'sidewalk', expect: 'records' },
  { label: 'Birmingham city / storm_drain', place: 'Birmingham city', county: 'Jefferson County', serviceType: 'storm_drain', expect: 'records' },
  { label: 'Birmingham city / abandoned_vehicle', place: 'Birmingham city', county: 'Jefferson County', serviceType: 'abandoned_vehicle', expect: 'records' },
  // No source bucket crosswalks to traffic_signal, so this must short-circuit to empty
  // without a round trip and let the seed answer it via UnionOfficeRepository.
  { label: 'Birmingham city / traffic_signal (no Supabase coverage)', place: 'Birmingham city', county: 'Jefferson County', serviceType: 'traffic_signal', expect: 'empty' },
  // A jurisdiction absent from the dataset, with no county to fall back to.
  { label: 'Hoover city / pothole_street (not in dataset)', place: 'Hoover city', county: null, serviceType: 'pothole_street', expect: 'empty' },
]

function describe(records: OfficeRecord[]): string {
  if (records.length === 0) return '0 records'
  const first = records[0]
  const channel = first.phone ?? first.email ?? first.form_url ?? 'no channel'
  return `${records.length} record(s); first: ${first.office_name} — ${channel}`
}

export async function verifySupabaseSource(): Promise<VerifyReport> {
  const checks: Check[] = []
  const config = supabaseConfigFromEnv()

  if (!config) {
    return {
      ok: false,
      configured: false,
      table: null,
      counts: null,
      droppedDetail: {},
      coverage: { fromSupabase: [], fromSeed: [...SERVICE_TYPES] },
      checks: [
        {
          name: 'configuration',
          ok: false,
          detail: 'SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_OFFICES_TABLE are not all set — the app is on the synthetic seed alone.',
        },
      ],
    }
  }

  checks.push({ name: 'configuration', ok: true, detail: `${config.url} → ${config.table}` })

  const repo = new SupabaseOfficeRepository(config)
  const { records, dropped, sourceRows } = await repo.report()

  checks.push({
    name: 'mapped at least one record',
    ok: records.length > 0,
    detail:
      records.length > 0
        ? `${sourceRows} source rows → ${records.length} records (${dropped.length} dropped)`
        : 'Reachable but zero records mapped. Check the RLS policy for this key, or the jurisdiction/service crosswalk.',
  })

  const droppedDetail: Record<string, string[]> = {}
  for (const d of dropped) {
    droppedDetail[d.reason] ??= []
    droppedDetail[d.reason].push(`row ${d.sourceId}: ${d.detail}`)
  }

  // Jurisdiction names must be exact Census strings or the join silently misses.
  const cityNames = [...new Set(records.filter((r) => r.jurisdiction_type === 'city').map((r) => r.jurisdiction_name))].sort()
  const countyNames = [...new Set(records.filter((r) => r.jurisdiction_type === 'county').map((r) => r.jurisdiction_name))].sort()

  const places = await censusAlabamaPlaces()
  if (!places) {
    checks.push({
      name: 'jurisdiction names vs Census',
      ok: false,
      detail: 'Could not load the TIGERweb place layer — name verification SKIPPED. Re-run before relying on this.',
    })
  } else {
    const missing = cityNames.filter((n) => !places.has(n))
    checks.push({
      name: 'jurisdiction names vs Census',
      ok: missing.length === 0,
      detail:
        missing.length === 0
          ? `all ${cityNames.length} city names are exact Census place names (checked against ${places.size} Alabama places)`
          : `not Census place names, these lookups will silently miss: ${missing.join(', ')}`,
    })
  }

  const badCounty = countyNames.filter((n) => !/ County$/.test(n))
  checks.push({
    name: 'county names in "X County" form',
    ok: badCounty.length === 0,
    detail: badCounty.length === 0 ? countyNames.join(', ') || 'none present' : badCounty.join(', '),
  })

  // data/schema.md rule 2: placeholder numbers must sit in the reserved 555-01xx block.
  // Reported, not corrected — the source data is the data team's to fix.
  const synthetic = records.filter((r) => r.is_synthetic)
  const offRangePlaceholders = [
    ...new Set(
      synthetic
        .filter((r) => r.phone && !isReservedPlaceholderPhone(r.phone))
        .filter((r) => /555/.test(r.phone ?? ''))
        .map((r) => `${r.jurisdiction_name}: ${r.phone}`),
    ),
  ]
  checks.push({
    name: 'placeholder phones use the reserved 555-01xx block (data/schema.md rule 2)',
    ok: offRangePlaceholders.length === 0,
    detail:
      offRangePlaceholders.length === 0
        ? 'no off-range placeholder numbers'
        : `${offRangePlaceholders.length} number(s) are in the 555 exchange but OUTSIDE the reserved 555-01xx range, e.g. ${offRangePlaceholders.slice(0, 3).join(', ')}`,
  })

  checks.push({
    name: 'provenance labelling',
    ok: true,
    detail: `${synthetic.length} of ${records.length} records detected as synthetic and labelled; ${records.length - synthetic.length} look like real published contacts`,
  })

  const fromSupabase = SERVICE_TYPES.filter((s) => sourceServicesFor(s).length > 0)
  const fromSeed = SERVICE_TYPES.filter((s) => sourceServicesFor(s).length === 0)
  checks.push({
    name: 'service coverage',
    ok: fromSupabase.length > 0,
    detail: `Supabase answers: ${fromSupabase.join(', ') || '(none)'} · seed covers the rest: ${fromSeed.join(', ')}`,
  })

  for (const probe of PROBES) {
    const found = await repo.find({
      place: probe.place,
      county: probe.county,
      state: 'Alabama',
      serviceType: probe.serviceType,
    })
    const ok = probe.expect === 'records' ? found.length > 0 : found.length === 0
    checks.push({ name: `find: ${probe.label}`, ok, detail: describe(found) })
  }

  return {
    ok: checks.every((c) => c.ok),
    configured: true,
    table: config.table,
    counts: { sourceRows, mappedRecords: records.length, dropped: dropped.length },
    droppedDetail,
    coverage: { fromSupabase, fromSeed },
    checks,
  }
}
