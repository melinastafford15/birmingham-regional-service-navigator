import type { GapEntry } from './types'

/**
 * The gap register.
 *
 * Every lookup we cannot resolve, and every one where two jurisdictions may both
 * have a claim, is recorded here. This is the institutional byproduct of the
 * resident-facing tool: a running list of the places where ownership between
 * Birmingham-area jurisdictions is genuinely undefined.
 *
 * In-memory for now — resets on redeploy. A durable store is a later change.
 */

const MAX_ENTRIES = 500
const entries: GapEntry[] = []

export function recordGap(entry: Omit<GapEntry, 'at'>): void {
  entries.unshift({ ...entry, at: new Date().toISOString() })
  if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES
  console.log('[gap]', JSON.stringify(entries[0]))
}

export function listGaps(): GapEntry[] {
  return entries
}
