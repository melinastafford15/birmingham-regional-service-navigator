import type { Jurisdiction } from './types'

/**
 * Resolves a typed location to the jurisdiction it is ACTUALLY in.
 *
 * This is the core of the product: a mailing address does not establish jurisdiction.
 * "5291 Valleydale Rd, Birmingham, AL 35242" resolves to Hoover city, Shelby County.
 *
 * US Census Geocoder — public federal data, no API key, no signup.
 * https://geocoding.geo.census.gov/geocoder/
 */

const ENDPOINT = 'https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress'
const TIMEOUT_MS = 6000

const UNRESOLVED: Jurisdiction = {
  place: null,
  county: null,
  state: null,
  matchedAddress: null,
  coordinates: null,
  confidence: 'none',
  isUnincorporated: false,
}

/** Census returns geography layers keyed by these display names. */
interface CensusGeographies {
  'Incorporated Places'?: Array<{ NAME?: string }>
  Counties?: Array<{ NAME?: string }>
  States?: Array<{ NAME?: string }>
}

interface CensusMatch {
  matchedAddress?: string
  coordinates?: { x: number; y: number }
  geographies?: CensusGeographies
}

const cache = new Map<string, Jurisdiction>()

function normalize(location: string): string {
  return location.trim().replace(/\s+/g, ' ').toLowerCase()
}

export async function geocode(location: string | undefined): Promise<Jurisdiction> {
  if (!location || !location.trim()) return UNRESOLVED

  const key = normalize(location)
  const cached = cache.get(key)
  if (cached) return cached

  const url = new URL(ENDPOINT)
  url.searchParams.set('address', location)
  url.searchParams.set('benchmark', 'Public_AR_Current')
  url.searchParams.set('vintage', 'Current_Current')
  url.searchParams.set('layers', 'Incorporated Places,Counties,States')
  url.searchParams.set('format', 'json')

  let match: CensusMatch | undefined
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: 'application/json' },
    })
    if (!res.ok) return UNRESOLVED
    const body = await res.json()
    match = body?.result?.addressMatches?.[0]
  } catch {
    // Timeout or network failure — degrade to "ask for a better address" rather than hang.
    return UNRESOLVED
  }

  if (!match) return UNRESOLVED

  const g = match.geographies ?? {}
  const place = g['Incorporated Places']?.[0]?.NAME ?? null
  const county = g.Counties?.[0]?.NAME ?? null
  const state = g.States?.[0]?.NAME ?? null

  // A resolved address with no incorporated place is unincorporated county land.
  // That is a real answer, not a failure — and it is one of the harder cases for a resident.
  const isUnincorporated = Boolean(county) && !place

  const result: Jurisdiction = {
    place,
    county,
    state,
    matchedAddress: match.matchedAddress ?? null,
    coordinates: match.coordinates
      ? { lat: match.coordinates.y, lon: match.coordinates.x }
      : null,
    confidence: county ? 'high' : 'low',
    isUnincorporated,
  }

  cache.set(key, result)
  return result
}
