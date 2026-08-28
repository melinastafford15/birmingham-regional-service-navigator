import type { OfficeQuery, OfficeRecord, OfficeRepository } from '../repository'
import { compareRecords, coverageKey } from './ordering'

/**
 * Composes two repositories: verified data wins, fallback data fills the gaps.
 *
 * Precedence is per coverage slot (jurisdiction + service type), not global. If the
 * primary answers "Birmingham city / pothole_street", the fallback's row for that slot
 * is suppressed entirely. Slots the primary does not cover — the service types absent
 * from the real dataset — still get answered by the fallback.
 *
 * This is coverage composition on a SUCCESSFUL read, not error recovery. A primary
 * failure propagates: substituting synthetic placeholders during an outage would
 * present unverified contacts as real.
 */
export class UnionOfficeRepository implements OfficeRepository {
  constructor(
    private readonly primary: OfficeRepository,
    private readonly fallback: OfficeRepository,
  ) {}

  async find(query: OfficeQuery): Promise<OfficeRecord[]> {
    const primaryRecords = await this.primary.find(query)
    const fallbackRecords = await this.fallback.find(query)

    const covered = new Set(primaryRecords.map(coverageKey))
    const filler = fallbackRecords.filter((r) => !covered.has(coverageKey(r)))

    return [...primaryRecords, ...filler].sort(compareRecords)
  }

  async count(): Promise<number> {
    const [primary, fallback] = await Promise.all([this.primary.count(), this.fallback.count()])
    return primary + fallback
  }
}
