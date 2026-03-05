/**
 * Auth API functions for New Canadian Careers.
 * Wraps backend auth endpoints.
 */

import { apiClient, clearSessionCookie } from './client'
import type {
  User,
  AuthResponse,
  LoginCredentials,
  LoginCodeCredentials,
  EmailCheckResponse,
  RegisterData,
  PasswordResetRequest,
  PasswordResetConfirm,
  EmailVerification,
  Session,
} from '@/lib/auth/types'

/**
 * Log in with email and password.
 * Returns user and tokens on success.
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  return apiClient<AuthResponse>('/api/auth/login/', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

/**
 * Check if an email is associated with an existing account.
 */
export async function checkEmail(data: { email: string; turnstile_token?: string }): Promise<EmailCheckResponse> {
  return apiClient<EmailCheckResponse>('/api/auth/email/check/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Send a one-time login code to the user's email.
 */
export async function sendLoginCode(data: { email: string; turnstile_token?: string }): Promise<void> {
  await apiClient('/api/auth/login/send-code/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Verify a one-time login code and authenticate.
 */
export async function verifyLoginCode(credentials: LoginCodeCredentials): Promise<AuthResponse> {
  return apiClient<AuthResponse>('/api/auth/login/verify-code/', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

/**
 * Register a new user account.
 * Returns user and tokens on success.
 */
export async function register(data: RegisterData): Promise<AuthResponse> {
  return apiClient<AuthResponse>('/api/auth/register/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Log out the current user.
 * Clears tokens locally and notifies backend.
 */
export async function logout(): Promise<void> {
  try {
    await apiClient('/api/auth/logout/', {
      method: 'POST',
    })
  } catch {
    // Logout should succeed even if API call fails
  } finally {
    clearSessionCookie()
  }
}

/**
 * Get the current authenticated user.
 */
export async function getMe(): Promise<User> {
  return apiClient<User>('/api/auth/me/')
}

/**
 * Update the current user's profile.
 */
export async function updateMe(data: Partial<User>): Promise<User> {
  return apiClient<User>('/api/auth/me/', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Request a password reset email.
 */
export async function requestPasswordReset(data: PasswordResetRequest): Promise<void> {
  await apiClient('/api/auth/password/reset/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Confirm password reset with token and new password.
 */
export async function confirmPasswordReset(data: PasswordResetConfirm): Promise<void> {
  await apiClient('/api/auth/password/reset/confirm/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Change password for authenticated user.
 */
export async function changePassword(data: {
  current_password: string
  new_password: string
  new_password_confirm: string
}): Promise<void> {
  await apiClient('/api/auth/password/change/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Verify email with token.
 */
export async function verifyEmail(data: EmailVerification): Promise<void> {
  await apiClient('/api/auth/email/verify/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Resend email verification.
 * Accepts an optional email for unauthenticated resend (e.g. from verify-email page).
 */
export async function resendVerificationEmail(email?: string): Promise<void> {
  await apiClient('/api/auth/email/verify/resend/', {
    method: 'POST',
    body: JSON.stringify(email ? { email } : {}),
  })
}

/**
 * Complete onboarding — updates profile + company address, marks onboarding done.
 */
export interface CompleteOnboardingData {
  first_name: string
  last_name: string
  industry?: string
  headquarters_address?: string
  headquarters_city?: string
  headquarters_state?: string
  headquarters_country?: string
  headquarters_postal_code?: string
}

export async function completeOnboarding(data: CompleteOnboardingData): Promise<User> {
  return apiClient<User>('/api/auth/onboarding/complete/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// =============================================================================
// Sessions
// =============================================================================

/**
 * Get all active sessions for the current user.
 */
export async function getSessions(): Promise<Session[]> {
  const response = await apiClient<{ results: Session[] }>('/api/auth/sessions/')
  return response.results
}

/**
 * Revoke a specific session by ID.
 */
export async function revokeSession(id: number | string): Promise<void> {
  await apiClient(`/api/auth/sessions/${id}/revoke/`, { method: 'POST' })
}

/**
 * Revoke all sessions except the current one.
 */
export async function revokeAllSessions(): Promise<void> {
  await apiClient('/api/auth/sessions/revoke-all/', { method: 'POST' })
}
