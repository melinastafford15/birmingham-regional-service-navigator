import type { Confidence, JurisdictionLevel, ServiceType } from './types'

/**
 * One office record, exactly as delivered by the data team.
 * Field names are snake_case to match data/schema.md — do not rename them here.
 */
export interface OfficeRecord {
  id: string
  jurisdiction_type: JurisdictionLevel
  /** Exact US Census name, e.g. "Homewood city". The join key. */
  jurisdiction_name: string
  service_type: ServiceType
  office_name: string
  phone?: string | null
  email?: string | null
  form_url?: string | null
  what_to_say: string
  source_url: string
  checked_on: string
  confidence: Confidence
  notes?: string | null
  is_synthetic: boolean
}

export interface OfficeQuery {
  place?: string | null
  county?: string | null
  state?: string | null
  serviceType: ServiceType
}

/**
 * The swap point.
 *
 * The backend depends only on this interface. When the real database lands —
 * Postgres, Supabase, Airtable, a published Sheet — it becomes one new file
 * implementing `find`, and nothing else in the codebase changes.
 */
export interface OfficeRepository {
  /** Returns every matching office, most specific jurisdiction first (city → county → state). */
  find(query: OfficeQuery): Promise<OfficeRecord[]>
  /** Total record count, for the health endpoint. */
  count(): Promise<number>
}
