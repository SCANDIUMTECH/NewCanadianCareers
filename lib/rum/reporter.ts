import { RUM_CONFIG } from './config'
import { getSessionId } from './session'
import { signPayload } from './hmac'

interface VitalPayload {
  metric_name: string
  metric_value: number
  rating: string
  session_id: string
  page_url: string
  navigation_type: string
  device_type: string
  connection_type: string
  release: string
}

let buffer: VitalPayload[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

function getDeviceType(): string {
  if (typeof navigator === 'undefined') return ''
  const ua = navigator.userAgent
  if (/Mobi|Android/i.test(ua)) return 'mobile'
  if (/Tablet|iPad/i.test(ua)) return 'tablet'
  return 'desktop'
}

function getConnectionType(): string {
  if (typeof navigator === 'undefined') return ''
  const nav = navigator as Navigator & { connection?: { effectiveType?: string } }
  return nav.connection?.effectiveType || ''
}

function shouldSampleClient(sessionId: string): boolean {
  const rate = RUM_CONFIG.sampleRate
  if (rate >= 100) return true
  if (rate <= 0) return false

  let hash = 0
  for (let i = 0; i < sessionId.length; i++) {
    const char = sessionId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return (Math.abs(hash) % 100) < rate
}

export function reportVital(vital: {
  name: string
  value: number
  rating: string
  navigationType?: string
  id?: string
}): void {
  if (!RUM_CONFIG.enabled) return
  if (typeof window === 'undefined') return

  const sessionId = getSessionId()
  if (!sessionId) return
  if (!shouldSampleClient(sessionId)) return

  buffer.push({
    metric_name: vital.name,
    metric_value: vital.value,
    rating: vital.rating,
    session_id: sessionId,
    page_url: window.location.href,
    navigation_type: vital.navigationType || '',
    device_type: getDeviceType(),
    connection_type: getConnectionType(),
    release: RUM_CONFIG.release,
  })

  if (buffer.length >= RUM_CONFIG.batchSize) {
    flush()
    return
  }

  if (!flushTimer) {
    flushTimer = setTimeout(flush, RUM_CONFIG.flushInterval)
  }
}

export async function flush(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }

  if (buffer.length === 0) return

  const vitals = [...buffer]
  buffer = []

  const body = JSON.stringify({ vitals })
  const signature = await signPayload(body)

  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    try {
      const url = signature
        ? `${RUM_CONFIG.endpoint}?sig=${encodeURIComponent(signature)}`
        : RUM_CONFIG.endpoint

      const blob = new Blob([body], { type: 'application/json' })
      const sent = navigator.sendBeacon(url, blob)
      if (sent) return
    } catch {
      // sendBeacon failed, fall through to fetch
    }
  }

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (signature) {
      headers['X-RUM-Signature'] = signature
    }

    await fetch(RUM_CONFIG.endpoint, {
      method: 'POST',
      headers,
      body,
      keepalive: true,
    })
  } catch {
    // Silently fail — RUM should never break the user experience
  }
}

if (typeof document !== 'undefined' && !(globalThis as Record<string, unknown>).__rumVisibilityListenerAttached) {
  (globalThis as Record<string, unknown>).__rumVisibilityListenerAttached = true
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flush()
    }
  })
}
