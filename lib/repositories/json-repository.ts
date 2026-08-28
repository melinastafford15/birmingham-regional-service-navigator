import type { OfficeQuery, OfficeRecord, OfficeRepository } from '../repository'
import seed from '../../data/offices.seed.json'
import { compareRecords, isUsable, matchesQuery } from './ordering'

/**
 * Fixture-backed repository. Every row is `is_synthetic: true` with a reserved
 * 555-01xx placeholder number, so anything it returns must be labeled in the UI.
 *
 * It remains in play under UnionOfficeRepository to cover the service types the
 * verified dataset does not yet reach. Replace by writing another OfficeRepository,
 * not by editing this file.
 */

const RECORDS: OfficeRecord[] = (seed as OfficeRecord[]).filter(isUsable)

export class JsonOfficeRepository implements OfficeRepository {
  private records: OfficeRecord[]

  constructor(records: OfficeRecord[] = RECORDS) {
    this.records = records
  }

  async find(query: OfficeQuery): Promise<OfficeRecord[]> {
    return this.records.filter((r) => matchesQuery(r, query)).sort(compareRecords)
  }

  async count(): Promise<number> {
    return this.records.length
  }
}
