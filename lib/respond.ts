import type { OfficeRecord } from './repository'
import { DISCLAIMER, type Recommendation, type RouteResponse, type Jurisdiction } from './types'

const SMS_LIMIT = 320

export function toRecommendation(r: OfficeRecord, address: string | null): Recommendation {
  return {
    office: r.office_name,
    level: r.jurisdiction_type,
    jurisdictionName: r.jurisdiction_name,
    channel: { phone: r.phone ?? null, email: r.email ?? null, formUrl: r.form_url ?? null },
    whatToSay: r.what_to_say.replace('<address>', address ?? 'this location'),
    source: { url: r.source_url, checkedOn: r.checked_on },
    confidence: r.confidence,
    isSynthetic: r.is_synthetic,
    notes: r.notes ?? null,
  }
}

function bestChannel(rec: Recommendation): string {
  return rec.channel.phone ?? rec.channel.email ?? rec.channel.formUrl ?? 'see source'
}

/** Plain-text reply, SMS-length. Truncated on a word boundary. */
export function composeSms(
  primary: Recommendation | null,
  jurisdiction: Jurisdiction | null,
  alternateCount: number,
): string {
  if (!primary) return 'We could not identify the responsible office. Reply with a street address and we will try again.'

  const where = jurisdiction?.place ?? jurisdiction?.county ?? null
  const parts = [
    where ? `${where}:` : '',
    `${primary.office} — ${bestChannel(primary)}.`,
    `Say: ${primary.whatToSay}`,
    alternateCount > 0 ? `${alternateCount} other office may also have a claim.` : '',
    primary.isSynthetic ? '[EXAMPLE DATA]' : '',
  ].filter(Boolean)

  const text = parts.join(' ')
  if (text.length <= SMS_LIMIT) return text
  return text.slice(0, SMS_LIMIT - 1).replace(/\s+\S*$/, '') + '…'
}

export function emergencyResponse(): RouteResponse {
  return {
    status: 'emergency',
    jurisdiction: null,
    serviceType: null,
    primary: null,
    alternates: [],
    notes: ['This looks like an emergency. Call 911 now. We did not look up a routing office.'],
    gapLogged: false,
    sms: 'This sounds like an emergency. Call 911 now.',
    disclaimer: DISCLAIMER,
  }
}
