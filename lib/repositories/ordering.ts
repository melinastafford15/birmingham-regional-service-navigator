import type { OfficeQuery, OfficeRecord } from '../repository'

/**
 * Shared matching, ordering, and usability rules.
 *
 * Extracted so every OfficeRepository answers a query the same way. A repository
 * decides WHERE records come from; these decide which ones count and in what order.
 */

/** Records missing every contact channel are unusable — the data contract drops them. */
export function isUsable(r: OfficeRecord): boolean {
  return Boolean(r.phone || r.email || r.form_url)
}

/**
 * Does this record answer this query?
 *
 * The jurisdiction join is an EXACT string match against the US Census name the
 * geocoder returned (see data/schema.md and lib/geocode.ts). A near-miss like
 * "City of Birmingham" vs "Birmingham city" is a silent no-match, which is why
 * source data is normalized before it ever reaches here.
 */
export function matchesQuery(r: OfficeRecord, query: OfficeQuery): boolean {
  const { place, county, state, serviceType } = query
  if (r.service_type !== serviceType) return false
  if (r.jurisdiction_type === 'city') return Boolean(place) && r.jurisdiction_name === place
  if (r.jurisdiction_type === 'county') return Boolean(county) && r.jurisdiction_name === county
  return Boolean(state) && r.jurisdiction_name === state
}

const JURISDICTION_RANK: Record<string, number> = { city: 0, county: 1, state: 2 }
const CONFIDENCE_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 }

/** Most specific jurisdiction first (city → county → state), then most confident. */
export function compareRecords(a: OfficeRecord, b: OfficeRecord): number {
  return (
    JURISDICTION_RANK[a.jurisdiction_type] - JURISDICTION_RANK[b.jurisdiction_type] ||
    CONFIDENCE_RANK[a.confidence] - CONFIDENCE_RANK[b.confidence]
  )
}

/** Identity of a "who handles this here" slot. Used to let real data supersede synthetic. */
export function coverageKey(r: OfficeRecord): string {
  return `${r.jurisdiction_type}|${r.jurisdiction_name}|${r.service_type}`
}
