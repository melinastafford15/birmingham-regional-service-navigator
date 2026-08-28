import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { SERVICE_TYPES, type Confidence, type ServiceType } from './types'

/**
 * Turns a resident's plain-language description into a ServiceType — and nothing else.
 *
 * The model NEVER selects an office and NEVER produces a phone number. Contacts come
 * only from the cited office repository. That is what makes a hallucinated contact
 * structurally impossible rather than merely unlikely.
 */

export interface Classification {
  serviceType: ServiceType
  isEmergency: boolean
  confidence: Confidence
  /** Short restatement of the problem, used to build "what to say". */
  restated: string
  /** How the classification was produced — surfaced for transparency. */
  method: 'model' | 'keyword_fallback' | 'emergency_shortcut'
}

/**
 * Life-safety language short-circuits before any model call: no latency, no cost,
 * no dependency on an API key for the one path where delay actually matters.
 */
const EMERGENCY_PATTERNS = [
  /\b(hit by|struck by)\b/i,
  /\bunconscious\b/i,
  /\bnot breathing\b/i,
  /\bbleeding\b/i,
  /\b(someone|somebody|person|child|kid)\b[^.]{0,40}\b(hurt|injured|trapped|drowning|dying)\b/i,
  /\b(gas leak|live wire|downed power line|power line down)\b/i,
  /\bfire\b/i,
  /\bemergency\b/i,
  /\b911\b/,
]

export function isEmergencyText(text: string): boolean {
  return EMERGENCY_PATTERNS.some((p) => p.test(text))
}

/** Ordered most-specific-first; first hit wins. */
const KEYWORD_RULES: Array<[ServiceType, RegExp]> = [
  ['storm_drain', /\b(storm ?drain|drain|drainage|flood|flooding|culvert|ditch|standing water|sewer grate)\b/i],
  ['traffic_signal', /\b(traffic (light|signal)|crosswalk|walk signal|stop ?light|signal (is )?out)\b/i],
  ['street_light', /\b(street ?light|lamp ?post|light pole|dark street)\b/i],
  ['abandoned_vehicle', /\b(abandoned (car|vehicle)|junk car|derelict vehicle|car has been parked)\b/i],
  ['illegal_dumping', /\b(dumping|dumped|trash pile|debris|litter|mattress|tires? (dumped|left))\b/i],
  ['sidewalk', /\b(side ?walk|curb|curb ramp|walkway)\b/i],
  ['pothole_street', /\b(pot ?hole|road surface|pavement|street (is )?(broken|crumbling)|asphalt)\b/i],
]

export function classifyByKeyword(message: string): Classification {
  for (const [serviceType, pattern] of KEYWORD_RULES) {
    if (pattern.test(message)) {
      return {
        serviceType,
        isEmergency: false,
        confidence: 'medium',
        restated: message.trim().slice(0, 140),
        method: 'keyword_fallback',
      }
    }
  }
  return {
    serviceType: 'other',
    isEmergency: false,
    confidence: 'low',
    restated: message.trim().slice(0, 140),
    method: 'keyword_fallback',
  }
}

const ClassificationSchema = z.object({
  service_type: z.enum(SERVICE_TYPES),
  is_emergency: z.boolean(),
  confidence: z.enum(['high', 'medium', 'low']),
  restated: z.string(),
})

const SYSTEM = `You classify a resident's description of a public infrastructure problem in the Birmingham, Alabama region.

Return only a service_type from the allowed list. Choose "other" when the description does not clearly fit any category — do not force a match.

Set is_emergency true only for immediate danger to life or safety (injury, fire, gas leak, downed live power line, someone trapped). A flooded street or a dark intersection is not an emergency.

"restated" is one short neutral phrase describing the problem, suitable to read aloud to a government office. Do not include names, phone numbers, or any personal detail.

You are not deciding who is responsible. Do not name any agency, office, or phone number.`

export async function classify(message: string): Promise<Classification> {
  if (isEmergencyText(message)) {
    return {
      serviceType: 'other',
      isEmergency: true,
      confidence: 'high',
      restated: message.trim().slice(0, 140),
      method: 'emergency_shortcut',
    }
  }

  // No key configured (e.g. a teammate running locally) — degrade to keywords, don't fail.
  if (!process.env.ANTHROPIC_API_KEY) return classifyByKeyword(message)

  try {
    // Identity-linked API keys must name the workspace the request acts in.
    // Harmless to omit for ordinary keys.
    const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID
    const client = new Anthropic(
      workspaceId ? { defaultHeaders: { 'anthropic-workspace-id': workspaceId } } : {},
    )
    const response = await client.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 4000,
      system: SYSTEM,
      output_config: {
        format: zodOutputFormat(ClassificationSchema),
        effort: 'low',
      },
      messages: [{ role: 'user', content: message }],
    })

    const parsed = response.parsed_output
    if (!parsed) return classifyByKeyword(message)

    return {
      serviceType: parsed.service_type,
      isEmergency: parsed.is_emergency,
      confidence: parsed.confidence,
      restated: parsed.restated,
      method: 'model',
    }
  } catch (err) {
    console.error('[classify] model call failed, falling back to keywords:', err)
    return classifyByKeyword(message)
  }
}
