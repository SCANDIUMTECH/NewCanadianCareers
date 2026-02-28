/**
 * Public platform settings API.
 * Fetches unauthenticated settings like Turnstile configuration.
 */

const API_BASE_URL = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL ?? '')
  : (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || '')

// =============================================================================
// Types
// =============================================================================

export interface PublicSettings {
  turnstile_site_key: string
  turnstile_enabled: boolean
  turnstile_protect_auth: boolean
  turnstile_protect_jobs: boolean
  turnstile_protect_applications: boolean
}

// =============================================================================
// Cache
// =============================================================================

let cachedSettings: PublicSettings | null = null
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// =============================================================================
// API Functions
// =============================================================================

/**
 * Fetch public platform settings (no auth required).
 * Cached for 5 minutes to avoid unnecessary requests.
 */
export async function getPublicSettings(): Promise<PublicSettings> {
  const now = Date.now()
  if (cachedSettings && now - cacheTimestamp < CACHE_TTL) {
    return cachedSettings
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/settings/public/`)
    if (!response.ok) {
      throw new Error('Failed to fetch public settings')
    }
    cachedSettings = await response.json()
    cacheTimestamp = now
    return cachedSettings!
  } catch (networkError) {
    console.error('Network error fetching public settings', `${API_BASE_URL}/api/settings/public/`, networkError)
    // Return safe defaults on failure — Turnstile won't render
    return {
      turnstile_site_key: '',
      turnstile_enabled: false,
      turnstile_protect_auth: false,
      turnstile_protect_jobs: false,
      turnstile_protect_applications: false,
    }
  }
}

/**
 * Invalidate the settings cache (e.g. after admin saves).
 */
export function invalidatePublicSettingsCache(): void {
  cachedSettings = null
  cacheTimestamp = 0
}
