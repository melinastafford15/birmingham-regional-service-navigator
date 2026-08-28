/**
 * Sendblue outbound messaging.
 * https://docs.sendblue.com — POST https://api.sendblue.com/api/send-message
 */

const BASE_URL = 'https://api.sendblue.com'

export interface SendResult {
  ok: boolean
  detail: string
}

export function sendblueConfigured(): boolean {
  return Boolean(
    process.env.SENDBLUE_API_KEY_ID &&
      process.env.SENDBLUE_API_SECRET_KEY &&
      process.env.SENDBLUE_FROM_NUMBER,
  )
}

/** Sends one reply. `toNumber` is used for delivery only and is never stored or logged. */
export async function sendMessage(toNumber: string, content: string): Promise<SendResult> {
  if (!sendblueConfigured()) {
    return { ok: false, detail: 'Sendblue credentials not configured' }
  }

  try {
    const res = await fetch(`${BASE_URL}/api/send-message`, {
      method: 'POST',
      signal: AbortSignal.timeout(8000),
      headers: {
        'content-type': 'application/json',
        'sb-api-key-id': process.env.SENDBLUE_API_KEY_ID!,
        'sb-api-secret-key': process.env.SENDBLUE_API_SECRET_KEY!,
      },
      body: JSON.stringify({
        number: toNumber,
        from_number: process.env.SENDBLUE_FROM_NUMBER!,
        content,
      }),
    })

    if (!res.ok) {
      // Never echo the body — it contains the recipient number.
      return { ok: false, detail: `Sendblue responded ${res.status}` }
    }
    return { ok: true, detail: 'sent' }
  } catch (err) {
    return { ok: false, detail: `Sendblue request failed: ${(err as Error).name}` }
  }
}
