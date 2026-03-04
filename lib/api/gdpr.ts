import { apiClient } from './client'
import type {
  BulkConsentResponse,
  ConsentCheckResponse,
  DataRequest,
  DataRequestFormData,
  GDPRPublicSettings,
  Service,
  ServiceCategory,
} from '@/lib/gdpr/types'

// ─── Public API ─────────────────────────────────────────────────────────────

export async function fetchGDPRPublicSettings(): Promise<{
  settings: GDPRPublicSettings
  services: Service[]
  categories: ServiceCategory[]
}> {
  return apiClient('/api/gdpr/settings/')
}

export async function checkConsent(): Promise<ConsentCheckResponse> {
  return apiClient('/api/gdpr/consent/check/', { method: 'POST' })
}

export async function updateConsent(
  serviceId: number,
  allowed: boolean
): Promise<{ status: string; service_id: number; allowed: boolean }> {
  return apiClient('/api/gdpr/consent/update/', {
    method: 'POST',
    body: JSON.stringify({ service_id: serviceId, allowed }),
  })
}

export async function bulkConsent(
  action: 'allow_all' | 'decline_all'
): Promise<BulkConsentResponse> {
  return apiClient('/api/gdpr/consent/bulk/', {
    method: 'POST',
    body: JSON.stringify({ action }),
  })
}

export async function acceptPolicy(
  policyType: 'privacy_policy' | 'terms_conditions'
): Promise<{ status: string }> {
  return apiClient('/api/gdpr/policy/accept/', {
    method: 'POST',
    body: JSON.stringify({ policy_type: policyType }),
  })
}

export async function submitDataRequest(
  data: DataRequestFormData
): Promise<DataRequest> {
  return apiClient('/api/gdpr/requests/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// ─── GeoIP (server-side) ───────────────────────────────────────────────────

export async function isEUVisitor(): Promise<boolean> {
  try {
    const data = await apiClient<{ is_eu: boolean }>('/api/gdpr/geo-ip/')
    return data.is_eu
  } catch {
    return true
  }
}

// ─── Cookie Cleanup ────────────────────────────────────────────────────────

export function deleteCookies(
  cookieNames: string[],
  domain?: string
): void {
  if (typeof document === 'undefined') return

  for (const name of cookieNames) {
    const trimmed = name.trim()
    if (!trimmed) continue

    const paths = ['/', window.location.pathname]
    const domains = domain ? ['', domain, `.${domain}`] : ['']

    for (const p of paths) {
      for (const d of domains) {
        const domainPart = d ? `; domain=${d}` : ''
        document.cookie = `${trimmed}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${p}${domainPart}`
      }
    }
  }
}

// ─── Bot Detection ──────────────────────────────────────────────────────────

const BOT_PATTERNS = [
  /googlebot/i, /bingbot/i, /slurp/i, /duckduckbot/i,
  /baiduspider/i, /yandexbot/i, /facebot/i, /ia_archiver/i,
]

export function isBot(): boolean {
  if (typeof navigator === 'undefined') return false
  return BOT_PATTERNS.some((pattern) => pattern.test(navigator.userAgent))
}
