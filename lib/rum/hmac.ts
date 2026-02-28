import { RUM_CONFIG } from './config'

export async function signPayload(body: string): Promise<string> {
  if (!RUM_CONFIG.hmacKey) return ''

  try {
    const encoder = new TextEncoder()
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(RUM_CONFIG.hmacKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(body))
    const hex = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    return `sha256=${hex}`
  } catch {
    return ''
  }
}
