import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'

/**
 * A text message arrives as one blob: "storm drain flooding at 2850 19th St S,
 * Homewood AL". Split it into the problem and the location so the existing
 * pipeline can handle each.
 */

export interface ParsedSms {
  problem: string
  location: string | null
}

const ParsedSchema = z.object({
  problem: z.string(),
  location: z.string().nullable(),
})

const SYSTEM = `Split a resident's text message into the problem description and the location.

"location" is any street address, intersection, block, or place name in the message. Return null if the message contains no location at all. Copy the location text as written; do not correct, complete, or invent one.

"problem" is the rest of the message describing what is wrong, with the location removed.

Do not include names, phone numbers, or any other personal detail in either field.`

/** Heuristic fallback: a comma-separated tail that contains a digit is probably an address. */
function parseByHeuristic(text: string): ParsedSms {
  const parts = text.split(/\s+(?:at|on|near)\s+/i)
  if (parts.length > 1) {
    const tail = parts.slice(1).join(' ').trim()
    if (/\d/.test(tail)) return { problem: parts[0].trim(), location: tail }
  }
  return { problem: text.trim(), location: null }
}

export async function parseSms(text: string): Promise<ParsedSms> {
  if (!process.env.ANTHROPIC_API_KEY) return parseByHeuristic(text)

  try {
    const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID
    const client = new Anthropic(
      workspaceId ? { defaultHeaders: { 'anthropic-workspace-id': workspaceId } } : {},
    )
    const response = await client.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 2000,
      system: SYSTEM,
      output_config: { format: zodOutputFormat(ParsedSchema), effort: 'low' },
      messages: [{ role: 'user', content: text }],
    })
    const parsed = response.parsed_output
    if (!parsed) return parseByHeuristic(text)
    return { problem: parsed.problem || text, location: parsed.location }
  } catch (err) {
    console.error('[sms-parse] failed, using heuristic:', (err as Error).message)
    return parseByHeuristic(text)
  }
}
