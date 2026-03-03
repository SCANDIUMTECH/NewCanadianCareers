/**
 * API client for Orion backend.
 * Handles base URL, cookie-based auth, token refresh, and typed errors.
 * Authentication is managed via HTTP-only cookies set by the backend.
 * The browser automatically sends orion_access and orion_refresh cookies.
 */

import type { ApiError } from '@/lib/auth/types'

// Browser: use NEXT_PUBLIC_API_URL (empty = same origin when behind Traefik)
// SSR: use INTERNAL_API_URL to reach Django directly inside Docker network
const API_BASE_URL = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL ?? '')
  : (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || '')

// Session expired event for global handling
export const SESSION_EXPIRED_EVENT = 'orion:session_expired'

// Track whether session expired event has been emitted to prevent duplicates
let sessionExpiredEmitted = false

export function emitSessionExpired(): void {
  if (typeof window !== 'undefined' && !sessionExpiredEmitted) {
    sessionExpiredEmitted = true
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
  }
}

export function resetSessionExpiredFlag(): void {
  sessionExpiredEmitted = false
}

/**
 * Check whether the user has an active session by reading the
 * JS-readable presence flag cookie set by the backend.
 */
export function hasSession(): boolean {
  if (typeof window === 'undefined') return false
  return document.cookie.split(';').some(c => c.trim().startsWith('orion_has_session='))
}

/**
 * Clear the orion_has_session presence flag cookie (client-side).
 * The HTTP-only auth cookies are cleared by the backend on logout.
 */
export function clearSessionCookie(): void {
  if (typeof window === 'undefined') return
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `orion_has_session=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax${secure}`
}

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null

/**
 * Attempt to refresh the access token using the refresh cookie.
 * The browser sends orion_refresh automatically via credentials: 'include'.
 * Returns true if successful (backend sets new cookies), false otherwise.
 */
async function refreshAccessToken(): Promise<boolean> {
  if (isRefreshing && refreshPromise) return refreshPromise

  isRefreshing = true
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/token/refresh/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!response.ok) return false
      return true
    } catch {
      return false
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  })()

  return refreshPromise
}

/**
 * API client with automatic cookie-based auth and token refresh.
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  // Build headers — omit Content-Type for FormData so the browser sets multipart/form-data with boundary
  const isFormData = options.body instanceof FormData
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string> || {}),
  }

  // Make the request — credentials: 'include' sends auth cookies cross-origin
  let response: Response
  try {
    response = await fetch(url, { ...options, headers, credentials: 'include' })
  } catch (networkError) {
    console.error('Network error fetching', url, networkError)
    throw { message: 'Network error: Unable to connect to server. Please check your connection.', status: 0 } as ApiError
  }

  // On 401, try to refresh (browser sends orion_refresh cookie) and retry once
  if (response.status === 401 && hasSession()) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      try {
        response = await fetch(url, { ...options, headers, credentials: 'include' })
      } catch (networkError) {
        console.error('Network error refetching', url, networkError)
        throw { message: 'Network error: Unable to connect to server. Please check your connection.', status: 0 } as ApiError
      }
    } else {
      clearSessionCookie()
      emitSessionExpired()
      throw {
        message: 'Your session has expired. Please sign in again.',
        status: 401,
        isSessionExpired: true,
      } as ApiError
    }
  }

  // Handle non-2xx responses
  if (!response.ok) {
    let errorData: { detail?: string; [key: string]: unknown } = {}
    try {
      errorData = await response.json()
    } catch {
      // Response might not be JSON
    }

    const error: ApiError = {
      message: errorData.detail
        || extractNonFieldErrors(errorData)
        || (typeof errorData.error === 'string' ? errorData.error : undefined)
        || getErrorMessage(response.status),
      errors: extractFieldErrors(errorData),
      status: response.status,
    }

    throw error
  }

  // Handle empty responses (204 No Content)
  if (response.status === 204) {
    return {} as T
  }

  return response.json()
}

/**
 * API client variant that returns a Blob (for file downloads/exports).
 * Shares the same cookie auth, token refresh, and error handling as apiClient.
 */
export async function apiClientBlob(
  endpoint: string,
  options: RequestInit = {}
): Promise<Blob> {
  const url = `${API_BASE_URL}${endpoint}`

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  }

  let response: Response
  try {
    response = await fetch(url, { ...options, headers, credentials: 'include' })
  } catch (networkError) {
    console.error('Network error fetching blob', url, networkError)
    throw { message: 'Network error: Unable to connect to server. Please check your connection.', status: 0 } as ApiError
  }

  // On 401, try to refresh and retry once
  if (response.status === 401 && hasSession()) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      try {
        response = await fetch(url, { ...options, headers, credentials: 'include' })
      } catch (networkError) {
        console.error('Network error refetching blob', url, networkError)
        throw { message: 'Network error: Unable to connect to server. Please check your connection.', status: 0 } as ApiError
      }
    } else {
      clearSessionCookie()
      emitSessionExpired()
      throw {
        message: 'Your session has expired. Please sign in again.',
        status: 401,
        isSessionExpired: true,
      } as ApiError
    }
  }

  if (!response.ok) {
    const error: ApiError = {
      message: getErrorMessage(response.status),
      status: response.status,
    }
    throw error
  }

  return response.blob()
}

/**
 * Helper to get a user-friendly error message from status code
 */
function getErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Invalid request. Please check your input.'
    case 401:
      return 'Please sign in to continue.'
    case 403:
      return 'You do not have permission to perform this action.'
    case 404:
      return 'The requested resource was not found.'
    case 409:
      return 'This action conflicts with existing data.'
    case 422:
      return 'The provided data is invalid.'
    case 429:
      return 'Too many requests. Please try again later.'
    case 500:
      return 'An unexpected error occurred. Please try again.'
    default:
      return 'Something went wrong. Please try again.'
  }
}

/**
 * Extract non_field_errors from DRF ValidationError responses.
 * Returns the first error as a string, or undefined.
 */
function extractNonFieldErrors(data: Record<string, unknown>): string | undefined {
  const nfe = data.non_field_errors
  if (Array.isArray(nfe) && nfe.length > 0) return String(nfe[0])
  return undefined
}

/**
 * Extract field-level errors from API response
 */
function extractFieldErrors(data: Record<string, unknown>): Record<string, string[]> | undefined {
  const errors: Record<string, string[]> = {}
  let hasErrors = false

  for (const [key, value] of Object.entries(data)) {
    if (key === 'detail' || key === 'non_field_errors') continue
    if (Array.isArray(value)) {
      errors[key] = value.map(String)
      hasErrors = true
    } else if (typeof value === 'string') {
      errors[key] = [value]
      hasErrors = true
    }
  }

  return hasErrors ? errors : undefined
}
