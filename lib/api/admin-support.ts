/**
 * Admin Support API functions.
 * Endpoints for user/company lookup, impersonation, timelines, and data export.
 */

import { apiClient } from './client'
import type { PaginatedResponse } from '@/lib/admin/types'

// =============================================================================
// Types
// =============================================================================

export type UserType = 'candidate' | 'employer' | 'agency_member' | 'admin'
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'banned'
export type CompanyStatus = 'verified' | 'pending' | 'unverified' | 'suspended'

export interface SupportUserResult {
  id: number
  name: string
  email: string
  type: UserType
  status: UserStatus
  company?: string
  company_id?: number
  last_active: string
  created_at: string
  avatar: string | null
}

export interface SupportCompanyResult {
  id: number
  name: string
  slug: string
  domain: string | null
  status: CompanyStatus
  job_count: number
  employee_count: number
  created_at: string
  logo: string | null
}

export type TimelineEventType =
  | 'login'
  | 'logout'
  | 'profile_update'
  | 'application'
  | 'job_view'
  | 'job_save'
  | 'search'
  | 'job_posted'
  | 'job_updated'
  | 'job_closed'
  | 'candidate_viewed'
  | 'candidate_contacted'
  | 'package_purchased'
  | 'payment_failed'
  | 'team_member_added'
  | 'team_member_removed'
  | 'settings_changed'
  | 'password_reset'
  | 'email_verified'

export interface TimelineEvent {
  id: string
  type: TimelineEventType
  description: string
  timestamp: string
  ip?: string
  user_agent?: string
  user?: string
  metadata?: Record<string, unknown>
}

export interface ImpersonationSession {
  token: string
  expires_at: string
  target_user_id: number
  target_user_email: string
  admin_user_id: number
  reason: string
}

export interface DataExportRequest {
  user_id?: number
  company_id?: number
  format: 'csv' | 'json' | 'xlsx'
  date_range?: {
    start: string
    end: string
  }
  include_pii?: boolean
  sections?: string[]
}

export interface DataExportJob {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  download_url: string | null
  expires_at: string | null
  created_at: string
  completed_at: string | null
  error: string | null
}

export interface SupportSearchFilters {
  query: string
  type?: UserType
  status?: UserStatus
  page?: number
  page_size?: number
}

export interface CompanySearchFilters {
  query: string
  status?: CompanyStatus
  page?: number
  page_size?: number
}

export interface TimelineFilters {
  event_type?: TimelineEventType
  start_date?: string
  end_date?: string
  page?: number
  page_size?: number
}

// =============================================================================
// User Lookup
// =============================================================================

/**
 * Search users by name or email.
 */
export async function searchSupportUsers(
  filters: SupportSearchFilters
): Promise<PaginatedResponse<SupportUserResult>> {
  const params = new URLSearchParams()

  params.set('q', filters.query)
  if (filters.type) params.set('type', filters.type)
  if (filters.status) params.set('status', filters.status)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.page_size) params.set('page_size', String(filters.page_size))

  const query = params.toString()
  return apiClient<PaginatedResponse<SupportUserResult>>(
    `/api/admin/support/users/?${query}`
  )
}

/**
 * Get detailed user information for support.
 */
export async function getSupportUser(userId: number): Promise<SupportUserResult & {
  phone: string | null
  email_verified: boolean
  two_factor_enabled: boolean
  login_count: number
  application_count: number
  saved_jobs_count: number
  notification_preferences: Record<string, boolean>
}> {
  return apiClient(`/api/admin/support/users/${userId}/`)
}

// =============================================================================
// Company Lookup
// =============================================================================

/**
 * Search companies by name or domain.
 */
export async function searchSupportCompanies(
  filters: CompanySearchFilters
): Promise<PaginatedResponse<SupportCompanyResult>> {
  const params = new URLSearchParams()

  params.set('q', filters.query)
  if (filters.status) params.set('status', filters.status)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.page_size) params.set('page_size', String(filters.page_size))

  const query = params.toString()
  return apiClient<PaginatedResponse<SupportCompanyResult>>(
    `/api/admin/support/companies/?${query}`
  )
}

/**
 * Get detailed company information for support.
 */
export async function getSupportCompany(companyId: number): Promise<SupportCompanyResult & {
  website: string | null
  industry: string | null
  size: string | null
  billing_status: string
  subscription: string | null
  total_payments: number
  active_jobs_count: number
  total_applications: number
  team_members: Array<{ id: number; name: string; email: string; role: string }>
}> {
  return apiClient(`/api/admin/support/companies/${companyId}/`)
}

// =============================================================================
// Timeline
// =============================================================================

/**
 * Get user activity timeline.
 */
export async function getUserTimeline(
  userId: number,
  filters?: TimelineFilters
): Promise<PaginatedResponse<TimelineEvent>> {
  const params = new URLSearchParams()

  if (filters?.event_type) params.set('event_type', filters.event_type)
  if (filters?.start_date) params.set('start_date', filters.start_date)
  if (filters?.end_date) params.set('end_date', filters.end_date)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))

  const query = params.toString()
  const endpoint = query
    ? `/api/admin/support/users/${userId}/timeline/?${query}`
    : `/api/admin/support/users/${userId}/timeline/`

  return apiClient<PaginatedResponse<TimelineEvent>>(endpoint)
}

/**
 * Get company activity timeline.
 */
export async function getCompanyTimeline(
  companyId: number,
  filters?: TimelineFilters
): Promise<PaginatedResponse<TimelineEvent>> {
  const params = new URLSearchParams()

  if (filters?.event_type) params.set('event_type', filters.event_type)
  if (filters?.start_date) params.set('start_date', filters.start_date)
  if (filters?.end_date) params.set('end_date', filters.end_date)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))

  const query = params.toString()
  const endpoint = query
    ? `/api/admin/support/companies/${companyId}/timeline/?${query}`
    : `/api/admin/support/companies/${companyId}/timeline/`

  return apiClient<PaginatedResponse<TimelineEvent>>(endpoint)
}

// =============================================================================
// Data Export
// =============================================================================

/**
 * Request a data export for a user (GDPR compliance).
 */
export async function exportUserData(
  userId: number,
  options: Omit<DataExportRequest, 'user_id' | 'company_id'>
): Promise<DataExportJob> {
  return apiClient<DataExportJob>('/api/admin/support/export/user/', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, ...options }),
  })
}

/**
 * Request a data export for a company.
 */
export async function exportCompanyData(
  companyId: number,
  options: Omit<DataExportRequest, 'user_id' | 'company_id'>
): Promise<DataExportJob> {
  return apiClient<DataExportJob>('/api/admin/support/export/company/', {
    method: 'POST',
    body: JSON.stringify({ company_id: companyId, ...options }),
  })
}

/**
 * Get status of a data export job.
 */
export async function getExportJobStatus(jobId: string): Promise<DataExportJob> {
  return apiClient<DataExportJob>(`/api/admin/support/export/${jobId}/`)
}

/**
 * List all export jobs for the current admin.
 */
export async function listExportJobs(page: number = 1): Promise<PaginatedResponse<DataExportJob>> {
  return apiClient<PaginatedResponse<DataExportJob>>(
    `/api/admin/support/export/?page=${page}`
  )
}

// =============================================================================
// Quick Actions
// =============================================================================

/**
 * Reset a user's password and send them a reset email.
 */
export async function adminResetPassword(userId: number): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/api/admin/support/users/${userId}/reset-password/`, {
    method: 'POST',
  })
}

/**
 * Verify a user's email manually.
 */
export async function adminVerifyEmail(userId: number): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/api/admin/support/users/${userId}/verify-email/`, {
    method: 'POST',
  })
}

/**
 * Update a user's status (active, suspended, banned).
 */
export async function updateUserStatus(
  userId: number,
  status: UserStatus,
  reason?: string
): Promise<SupportUserResult> {
  return apiClient<SupportUserResult>(`/api/admin/support/users/${userId}/status/`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason }),
  })
}

/**
 * Update a company's status (verified, suspended).
 */
export async function updateCompanyStatus(
  companyId: number,
  status: CompanyStatus,
  reason?: string
): Promise<SupportCompanyResult> {
  return apiClient<SupportCompanyResult>(`/api/admin/support/companies/${companyId}/status/`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason }),
  })
}
