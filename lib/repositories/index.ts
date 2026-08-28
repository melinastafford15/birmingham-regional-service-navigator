import type { OfficeRepository } from '../repository'
import { JsonOfficeRepository } from './json-repository'
import { SupabaseOfficeRepository, supabaseConfigFromEnv } from './supabase-repository'
import { UnionOfficeRepository } from './union-repository'

/**
 * The single place the app resolves its office data source.
 *
 * Import `officeRepository` from here, never from a concrete implementation.
 *
 *   all three SUPABASE_* env vars set → Supabase over the synthetic seed
 *   otherwise                        → the synthetic seed alone
 *
 * So local dev and the deployed demo work with no configuration, and adding
 * credentials upgrades the data without a code change.
 */

export type RepositorySource = 'supabase+seed' | 'seed'

const supabaseConfig = supabaseConfigFromEnv()

export const seedRepository = new JsonOfficeRepository()

export const supabaseRepository = supabaseConfig
  ? new SupabaseOfficeRepository(supabaseConfig)
  : null

export const repositorySource: RepositorySource = supabaseRepository ? 'supabase+seed' : 'seed'

export const officeRepository: OfficeRepository = supabaseRepository
  ? new UnionOfficeRepository(supabaseRepository, seedRepository)
  : seedRepository
