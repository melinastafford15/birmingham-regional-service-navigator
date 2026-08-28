import type { OfficeQuery, OfficeRecord, OfficeRepository } from '../repository'
import seed from '../../data/offices.seed.json'

/**
 * Fixture-backed repository. Ships today so the whole path works before the
 * real database exists. Replace by writing another OfficeRepository, not by
 * editing this file.
 */

/** Records missing every contact channel are unusable — drop them at load. */
function isUsable(r: OfficeRecord): boolean {
  return Boolean(r.phone || r.email || r.form_url)
}

const RECORDS: OfficeRecord[] = (seed as OfficeRecord[]).filter(isUsable)

const RANK: Record<string, number> = { city: 0, county: 1, state: 2 }
const CONFIDENCE_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 }

export class JsonOfficeRepository implements OfficeRepository {
  private records: OfficeRecord[]

  constructor(records: OfficeRecord[] = RECORDS) {
    this.records = records
  }

  async find(query: OfficeQuery): Promise<OfficeRecord[]> {
    const { place, county, state, serviceType } = query

    const matches = this.records.filter((r) => {
      if (r.service_type !== serviceType) return false
      if (r.jurisdiction_type === 'city') return Boolean(place) && r.jurisdiction_name === place
      if (r.jurisdiction_type === 'county') return Boolean(county) && r.jurisdiction_name === county
      return Boolean(state) && r.jurisdiction_name === state
    })

    // Most specific jurisdiction first, then most confident.
    return matches.sort(
      (a, b) =>
        RANK[a.jurisdiction_type] - RANK[b.jurisdiction_type] ||
        CONFIDENCE_RANK[a.confidence] - CONFIDENCE_RANK[b.confidence],
    )
  }

  async count(): Promise<number> {
    return this.records.length
  }
}

export const officeRepository: OfficeRepository = new JsonOfficeRepository()
