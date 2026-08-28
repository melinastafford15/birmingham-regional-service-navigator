import { NextResponse } from 'next/server'
import { classify } from '@/lib/classify'
import { geocode } from '@/lib/geocode'
import { recordGap } from '@/lib/gaps'
import { officeRepository } from '@/lib/repositories'
import { composeSms, toRecommendation } from '@/lib/respond'
import { parseSms } from '@/lib/sms-parse'
import { sendMessage, sendblueConfigured } from '@/lib/sendblue'

/**
 * Inbound SMS / iMessage webhook (Sendblue).
 *
 * PRIVACY: the sender's phone number is used to address the reply and is never
 * stored, logged, or written to the gap register. Nothing is persisted per person.
 *
 * This never contacts an agency on the resident's behalf. It replies to the person
 * who texted in, with a phone number they can call themselves.
 */

export const runtime = 'nodejs'

interface SendblueInbound {
  from_number?: string
  content?: string
  is_outbound?: boolean
  service?: string
}

const EMERGENCY_REPLY = 'This sounds like an emergency. Call 911 now.'
const HELP_REPLY =
  'Text a right-of-way problem and a location, e.g. "storm drain flooding at 2850 19th St S, Homewood AL". We reply with the office to call. Guidance only; they confirm responsibility.'

async function buildReply(text: string): Promise<string> {
  const { problem, location } = await parseSms(text)

  const classification = await classify(problem)
  if (classification.isEmergency) return EMERGENCY_REPLY

  if (!location) {
    return 'We need a location. Reply with the street address, city, and state, e.g. "2850 19th St S, Homewood AL".'
  }

  const jurisdiction = await geocode(location)
  if (jurisdiction.confidence === 'none') {
    return 'We could not find that address. Reply with a street address including city and state.'
  }

  if (classification.serviceType === 'other') {
    recordGap({
      serviceType: 'other',
      place: jurisdiction.place,
      county: jurisdiction.county,
      reason: 'out_of_coverage',
      message: problem,
    })
    return 'We only cover street, sidewalk, drainage, signal, lighting, dumping, tree debris, and abandoned-vehicle issues right now.'
  }

  const records = await officeRepository.find({
    place: jurisdiction.place,
    county: jurisdiction.county,
    state: jurisdiction.state,
    serviceType: classification.serviceType,
  })

  if (records.length === 0) {
    recordGap({
      serviceType: classification.serviceType,
      place: jurisdiction.place,
      county: jurisdiction.county,
      reason: 'no_match',
      message: problem,
    })
    return `We do not have a listed office for that in ${jurisdiction.place ?? jurisdiction.county ?? 'your area'} yet. We logged it as a coverage gap.`
  }

  const [first, ...rest] = records
  const primary = toRecommendation(first, jurisdiction.matchedAddress)
  if (rest.length > 0) {
    recordGap({
      serviceType: classification.serviceType,
      place: jurisdiction.place,
      county: jurisdiction.county,
      reason: 'ambiguous_ownership',
      message: problem,
    })
  }
  return composeSms(primary, jurisdiction, rest.length)
}

export async function POST(request: Request) {
  let body: SendblueInbound
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ received: true })
  }

  // Acknowledge our own outbound echoes without acting on them.
  if (body.is_outbound === true) return NextResponse.json({ received: true, ignored: 'outbound' })

  const text = (body.content ?? '').trim()
  const from = (body.from_number ?? '').trim()

  if (!text || !from) return NextResponse.json({ received: true, ignored: 'empty' })

  const reply = /^(help|start|info)\b/i.test(text) ? HELP_REPLY : await buildReply(text)

  const result = await sendMessage(from, reply)
  // Log the outcome only — never the number or the resident's text.
  console.log('[sms]', JSON.stringify({ replied: result.ok, detail: result.detail, chars: reply.length }))

  // Always 200 so Sendblue does not retry and duplicate the conversation.
  // Until Sendblue is configured, return the composed reply so the path is testable.
  return NextResponse.json(
    sendblueConfigured()
      ? { received: true, replied: result.ok }
      : { received: true, replied: false, preview: reply },
  )
}

/** Lets you confirm the webhook is reachable and whether credentials are present. */
export async function GET() {
  return NextResponse.json({ ok: true, sendblueConfigured: sendblueConfigured() })
}
