import type { OfficeQuery, OfficeRecord, OfficeRepository } from '../repository'
import {
  MUNICIPAL_EVIDENCE_COLUMNS,
  mapRows,
  municipalEvidenceRowSchema,
  sourceServicesFor,
  type MappingResult,
} from './municipal-evidence'
import { compareRecords, matchesQuery } from './ordering'

/**
 * Reads office/contact records from Supabase (PostgREST) over plain fetch.
 *
 * No client library: this needs one filtered read, and the repo keeps a small
 * dependency surface. Everything schema-specific lives in ./municipal-evidence.
 *
 * Failures THROW. They are never swallowed into an empty result, because an empty
 * result is indistinguishable from "no office covers this" and would quietly tell a
 * resident they are on their own during a database outage.
 */

const TIMEOUT_MS = 8000

export class SupabaseRepositoryError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message)
    this.name = 'SupabaseRepositoryError'
  }
}

export interface SupabaseConfig {
  url: string
  key: string
  table: string
}

/** Reads config from the environment. Returns null unless all three are set. */
export function supabaseConfigFromEnv(env: NodeJS.ProcessEnv = process.env): SupabaseConfig | null {
  const url = env.SUPABASE_URL?.trim()
  const key = env.SUPABASE_ANON_KEY?.trim()
  const table = env.SUPABASE_OFFICES_TABLE?.trim()
  if (!url || !key || !table) return null
  return { url: url.replace(/\/+$/, ''), key, table }
}

/** PostgREST `in.(...)` list. Values are quoted so separators inside them stay safe. */
function inList(values: string[]): string {
  const quoted = values.map((v) => `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
  return `in.(${quoted.join(',')})`
}

export class SupabaseOfficeRepository implements OfficeRepository {
  constructor(private readonly config: SupabaseConfig) {}

  private async request(params: URLSearchParams): Promise<unknown> {
    const url = `${this.config.url}/rest/v1/${this.config.table}?${params.toString()}`

    let res: Response
    try {
      res = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          apikey: this.config.key,
          Authorization: `Bearer ${this.config.key}`,
          accept: 'application/json',
        },
        cache: 'no-store',
      })
    } catch (cause) {
      throw new SupabaseRepositoryError(
        `Supabase request failed (network or ${TIMEOUT_MS}ms timeout): ${(cause as Error).message}`,
      )
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new SupabaseRepositoryError(
        `Supabase returned ${res.status} for table "${this.config.table}": ${body.slice(0, 300)}`,
        res.status,
      )
    }

    return res.json()
  }

  /** Fetches and maps rows for the given source service buckets (all active rows if omitted). */
  private async load(sourceServices?: string[]): Promise<MappingResult & { sourceRows: number }> {
    const params = new URLSearchParams({
      select: MUNICIPAL_EVIDENCE_COLUMNS,
      is_active: 'eq.true',
    })
    if (sourceServices?.length) params.set('service', inList(sourceServices))

    const payload = await this.request(params)

    const parsed = municipalEvidenceRowSchema.array().safeParse(payload)
    if (!parsed.success) {
      // Column drift in the source table: name it loudly rather than render undefined.
      throw new SupabaseRepositoryError(
        `Rows from "${this.config.table}" do not match the expected schema: ${parsed.error.issues
          .slice(0, 5)
          .map((i) => `${i.path.join('.')} ${i.message}`)
          .join('; ')}`,
      )
    }

    return { ...mapRows(parsed.data), sourceRows: parsed.data.length }
  }

  async find(query: OfficeQuery): Promise<OfficeRecord[]> {
    // No source bucket answers this service type — skip the round trip entirely.
    const sourceServices = sourceServicesFor(query.serviceType)
    if (sourceServices.length === 0) return []

    const { records } = await this.load(sourceServices)

    // Jurisdiction is matched here, not in the query, so we never have to invert the
    // "City of X" → "X city" transform. Records are already in Census form.
    return records.filter((r) => matchesQuery(r, query)).sort(compareRecords)
  }

  /**
   * Usable records after mapping — not raw source rows. Consistent with the JSON
   * repository, and it means a mapping failure shows up as a low count.
   */
  async count(): Promise<number> {
    const { records } = await this.load()
    return records.length
  }

  /** Full mapping report, for /api/health and scripts/verify-supabase.ts. */
  async report(): Promise<MappingResult & { sourceRows: number }> {
    return this.load()
  }
}
