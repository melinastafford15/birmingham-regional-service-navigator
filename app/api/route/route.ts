import { NextResponse } from 'next/server'
import { classify } from '@/lib/classify'
import { geocode } from '@/lib/geocode'
import { recordGap } from '@/lib/gaps'
import { officeRepository } from '@/lib/repositories/json-repository'
import { toRecommendation } from '@/lib/respond'
import { SERVICE_TYPE_LABELS, type Recommendation, type ServiceType } from '@/lib/types'

/**
 * Adapter for the resident-facing handoff UI.
 *
 * The UI was briefed against a different contract than app/api/route-request
 * (see app/lib/handoff-contract.ts). Rather than force either side to rewrite,
 * this route speaks the UI's shape and translates to the same pipeline.
 * /api/route-request remains the canonical backend contract.
 */

export const runtime = 'nodejs'

const DISCLAIMER =
  'This is a navigation aid, not a legal determination, and it does not submit a service request.'

const HUMAN_CONFIRMATION =
  'A representative at the office listed above must confirm responsibility for this location before any work is scheduled.'

/**
 * Each synthetic demo location maps to a real example address so jurisdiction
 * resolution actually runs. The resident picks from a list and never types an
 * address, so no personal location data is ever collected.
 */
const SYNTHETIC_LOCATION_ADDRESSES: Record<string, string> = {
  'BHM-DEMO-01': '710 20th St N, Birmingham, AL 35203',
  'BHM-DEMO-02': '2850 19th St S, Homewood, AL 35209',
  'BHM-DEMO-03': '6000 Eastern Valley Rd, McCalla, AL 35111',
  'BHM-DEMO-04': '5291 Valleydale Rd, Birmingham, AL 35242',
}

/** Our service types mapped back to the four the UI knows how to label. */
const ISSUE_SUBTYPE: Partial<Record<ServiceType, string>> = {
  pothole_street: 'pothole_road_damage',
  sidewalk: 'sidewalk_damage',
  storm_drain: 'blocked_drainage',
  tree_debris: 'fallen_tree_debris',
}

interface HandoffRequest {
  message?: string
  synthetic_location_id?: string
  jurisdiction_hint?: string
}

function sourcesFor(rec: Recommendation, serviceType: ServiceType) {
  return [
    {
      title: `${SERVICE_TYPE_LABELS[serviceType]} — responsible office`,
      publisher: `${rec.isSynthetic ? '[Synthetic] ' : ''}${rec.jurisdictionName}`,
      url: rec.source.url,
      last_checked: rec.source.checkedOn,
    },
  ]
}

function fallback(entity: string, jurisdiction: string, reason: string, nextAction: string) {
  return {
    service: 'Public right-of-way',
    issue_subtype: null,
    likely_responsible_entity: entity,
    jurisdiction,
    reason,
    confidence: 'low' as const,
    conflict_or_gap: null,
    next_action: nextAction,
    official_contact: null,
    sources: [],
    requires_human_confirmation: true,
    human_confirmation_instruction: HUMAN_CONFIRMATION,
    disclaimer: DISCLAIMER,
  }
}

export async function POST(request: Request) {
  let body: HandoffRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const message = (body.message ?? '').trim()
  if (!message) return NextResponse.json({ error: 'message is required' }, { status: 400 })

  const locationId = body.synthetic_location_id ?? ''
  const address = SYNTHETIC_LOCATION_ADDRESSES[locationId]

  const classification = await classify(message)

  if (classification.isEmergency) {
    return NextResponse.json(
      fallback(
        'Emergency services',
        'Any jurisdiction',
        'This description suggests immediate danger to life or safety, so no routing lookup was performed.',
        'Call 911 now.',
      ),
    )
  }

  if (!address) {
    return NextResponse.json(
      fallback(
        'Not determined',
        'Unknown',
        'That demo location is not recognized, so the jurisdiction could not be resolved.',
        'Choose one of the listed synthetic demo locations and try again.',
      ),
    )
  }

  const jurisdiction = await geocode(address)
  const where = jurisdiction.place ?? jurisdiction.county ?? 'Unknown'

  if (classification.serviceType === 'other') {
    recordGap({ serviceType: 'other', place: jurisdiction.place, county: jurisdiction.county, reason: 'out_of_coverage', message })
    return NextResponse.json(
      fallback(
        'Not determined',
        where,
        'This description does not match a public right-of-way issue this tool covers.',
        'This tool covers potholes and road damage, sidewalk damage, blocked drainage, and fallen tree or debris.',
      ),
    )
  }

  const records = await officeRepository.find({
    place: jurisdiction.place,
    county: jurisdiction.county,
    state: jurisdiction.state,
    serviceType: classification.serviceType,
  })

  if (records.length === 0) {
    recordGap({ serviceType: classification.serviceType, place: jurisdiction.place, county: jurisdiction.county, reason: 'no_match', message })
    return NextResponse.json(
      fallback(
        'No listed office yet',
        where,
        `No office is listed for ${SERVICE_TYPE_LABELS[classification.serviceType].toLowerCase()} in ${where}. This has been recorded as a coverage gap.`,
        `Contact the ${where} main line and ask which office handles this.`,
      ),
    )
  }

  const [firstRecord, ...restRecords] = records
  const primary = toRecommendation(firstRecord, jurisdiction.matchedAddress)
  const alternates = restRecords.map((r) => toRecommendation(r, jurisdiction.matchedAddress))

  const gapParts: string[] = []
  if (alternates.length > 0) {
    gapParts.push(
      `More than one office may have a claim here: ${alternates.map((a) => a.office).join('; ')}. Start with the office above and ask them to confirm.`,
    )
    recordGap({ serviceType: classification.serviceType, place: jurisdiction.place, county: jurisdiction.county, reason: 'ambiguous_ownership', message })
  }
  if (jurisdiction.isUnincorporated) {
    gapParts.push(`This location is in unincorporated ${jurisdiction.county ?? 'county land'}, not inside any city.`)
  }
  if (primary.notes) gapParts.push(primary.notes)
  if (primary.isSynthetic) gapParts.push('Example data — this contact is a placeholder and has not been verified against a public source.')

  const levelWord = primary.level === 'city' ? 'city' : primary.level === 'county' ? 'county' : 'state'

  return NextResponse.json({
    service: 'Public right-of-way',
    issue_subtype: ISSUE_SUBTYPE[classification.serviceType] ?? null,
    likely_responsible_entity: `${primary.isSynthetic ? '[Synthetic] ' : ''}${primary.office}`,
    jurisdiction: where,
    reason: `The address resolved to ${where}${jurisdiction.county && jurisdiction.place ? ` in ${jurisdiction.county}` : ''}. ${SERVICE_TYPE_LABELS[classification.serviceType]} at this location is listed as a ${levelWord} responsibility.`,
    confidence: primary.confidence,
    conflict_or_gap: gapParts.length > 0 ? gapParts.join(' ') : null,
    next_action: primary.whatToSay,
    official_contact: {
      phone: primary.channel.phone,
      email: primary.channel.email,
      form_url: primary.channel.formUrl,
    },
    sources: sourcesFor(primary, classification.serviceType),
    requires_human_confirmation: true,
    human_confirmation_instruction: HUMAN_CONFIRMATION,
    disclaimer: DISCLAIMER,
  })
}
