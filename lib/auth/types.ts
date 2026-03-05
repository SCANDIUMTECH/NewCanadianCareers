/**
 * Auth types for New Canadian Careers frontend-backend integration.
 * Matches backend User model from apps/users/serializers.py
 */

export type UserRole = 'admin' | 'employer' | 'agency' | 'candidate'
export type UserStatus = 'active' | 'suspended' | 'pending'

export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  full_name: string
  role: UserRole
  status: UserStatus
  phone: string | null
  avatar: string | null
  bio: string | null
  company: number | null
  agency: number | null
  email_verified: boolean
  mfa_enabled: boolean
  onboarding_completed: boolean
  created_at: string
  last_login: string | null
}

export interface AuthTokens {
  access: string
  refresh: string
}

export interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

export interface LoginCredentials {
  email: string
  password: string
  turnstile_token?: string
}

export interface RegisterData {
  email: string
  password: string
  password_confirm: string
  first_name: string
  last_name: string
  role: UserRole
  company_name?: string
  turnstile_token?: string
}

export interface PasswordResetRequest {
  email: string
  turnstile_token?: string
}

export interface PasswordResetConfirm {
  token: string
  password: string
  password_confirm: string
  turnstile_token?: string
}

export interface PasswordChange {
  current_password: string
  new_password: string
  new_password_confirm: string
}

export interface EmailVerification {
  token: string
}

export interface AuthResponse {
  user: User
  tokens?: AuthTokens  // Optional — cookies are the primary auth mechanism; only present for backward-compat API consumers
  message?: string
}

export interface EmailCheckResponse {
  exists: boolean
}

export interface LoginCodeCredentials {
  email: string
  code: string
  turnstile_token?: string
}

export interface ApiError {
  message: string
  errors?: Record<string, string[]>
  status: number
  isSessionExpired?: boolean
}

export interface Session {
  id: number
  device: string
  browser: string
  ip_address: string
  location: string | null
  last_active: string
  is_current: boolean
}

// Role to dashboard redirect mapping
export const ROLE_REDIRECTS: Record<UserRole, string> = {
  admin: '/admin',
  employer: '/company',
  agency: '/agency',
  candidate: '/candidate',
}
