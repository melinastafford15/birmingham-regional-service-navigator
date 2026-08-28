import { NextResponse } from 'next/server'
import { classify } from '@/lib/classify'
import { geocode } from '@/lib/geocode'
import { recordGap } from '@/lib/gaps'
import { officeRepository } from '@/lib/repositories'
import { composeSms, emergencyResponse, toRecommendation } from '@/lib/respond'
import { DISCLAIMER, type RouteRequest, type RouteResponse } from '@/lib/types'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  let body: RouteRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const message = (body?.message ?? '').trim()
  if (!message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  // 1. Emergency short-circuits before any lookup.
  const classification = await classify(message)
  if (classification.isEmergency) {
    return NextResponse.json(emergencyResponse())
  }

  // 2. Where is this, actually?
  const jurisdiction = await geocode(body.location)
  const notes: string[] = []

  if (jurisdiction.confidence === 'none') {
    const response: RouteResponse = {
      status: 'needs_location',
      jurisdiction: null,
      serviceType: classification.serviceType,
      primary: null,
      alternates: [],
      notes: [
        body.location
          ? 'We could not find that address. A street address with city and state works best.'
          : 'We need a location to identify the responsible office.',
      ],
      gapLogged: false,
      sms: 'We need a street address to find the right office. Reply with the address, city, and state.',
      disclaimer: DISCLAIMER,
    }
    return NextResponse.json(response)
  }

  // The premise, surfaced: the mailing address is not the jurisdiction.
  if (jurisdiction.isUnincorporated) {
    notes.push(
      `This address is in unincorporated ${jurisdiction.county ?? 'county land'}, not inside any city. County offices handle it.`,
    )
  }

  if (classification.serviceType === 'other') {
    recordGap({
      serviceType: 'other',
      place: jurisdiction.place,
      county: jurisdiction.county,
      reason: 'out_of_coverage',
      message,
    })
    const response: RouteResponse = {
      status: 'not_covered',
      jurisdiction,
      serviceType: 'other',
      primary: null,
      alternates: [],
      notes: [
        ...notes,
        'We only cover streets, sidewalks, storm drains, signals, street lights, dumping, and abandoned vehicles right now.',
      ],
      gapLogged: true,
      sms: 'We only cover street, sidewalk, drainage, signal, lighting, dumping, and abandoned-vehicle issues right now.',
      disclaimer: DISCLAIMER,
    }
    return NextResponse.json(response)
  }

  // 3. Look up, most specific jurisdiction first.
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
      message,
    })
    const response: RouteResponse = {
      status: 'not_covered',
      jurisdiction,
      serviceType: classification.serviceType,
      primary: null,
      alternates: [],
      notes: [
        ...notes,
        `We do not yet have a listed office for this issue in ${jurisdiction.place ?? jurisdiction.county ?? 'this area'}. Logged as a coverage gap.`,
      ],
      gapLogged: true,
      sms: 'We do not have a listed office for that issue in your area yet. We logged it as a gap.',
      disclaimer: DISCLAIMER,
    }
    return NextResponse.json(response)
  }

  const address = jurisdiction.matchedAddress
  const [first, ...rest] = records
  const primary = toRecommendation(first, address)
  const alternates = rest.map((r) => toRecommendation(r, address))

  // 4. More than one claim is a finding, not noise. Name it and log it.
  if (alternates.length > 0) {
    notes.push(
      `More than one office may have a claim here (${[primary, ...alternates].map((r) => r.office).join('; ')}). Start with the first and ask them to confirm.`,
    )
    recordGap({
      serviceType: classification.serviceType,
      place: jurisdiction.place,
      county: jurisdiction.county,
      reason: 'ambiguous_ownership',
      message,
    })
  }

  for (const rec of [primary, ...alternates]) {
    if (rec.notes) notes.push(rec.notes)
  }
  if (primary.isSynthetic) {
    notes.push('Example data — this contact is a placeholder and has not been verified against a public source.')
  }

  const response: RouteResponse = {
    status: 'routed',
    jurisdiction,
    serviceType: classification.serviceType,
    primary,
    alternates,
    notes,
    gapLogged: alternates.length > 0,
    sms: composeSms(primary, jurisdiction, alternates.length),
    disclaimer: DISCLAIMER,
  }
  return NextResponse.json(response)
}
