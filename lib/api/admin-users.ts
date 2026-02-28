/**
 * Admin Users API functions.
 * Endpoints for admin user management, impersonation, and activity logs.
 */

import { apiClient, apiClientBlob } from './client'
import type {
  AdminUser,
  AdminUserDetail,
  AdminUserStats,
  AdminUserFilters,
  CreateUserData,
  UpdateUserData,
  SuspendUserData,
  ReactivateUserData,
  UserActivity,
  UserActivityFilters,
  LoginAttempt,
  StartImpersonationData,
  ImpersonationToken,
  PaginatedResponse,
  MessageResponse,
  PasswordResetResponse,
} from '@/lib/admin/types'

// =============================================================================
// Admin Users List
// =============================================================================

/**
 * Get paginated list of users with filters.
 */
export async function getAdminUsers(
  filters?: AdminUserFilters
): Promise<PaginatedResponse<AdminUser>> {
  const params = new URLSearchParams()

  if (filters?.search) params.set('search', filters.search)
  if (filters?.role && filters.role !== 'all') params.set('role', filters.role)
  if (filters?.status && filters.status !== 'all') params.set('status', filters.status)
  if (filters?.company_id) params.set('company', String(filters.company_id))
  if (filters?.agency_id) params.set('agency', String(filters.agency_id))
  if (filters?.email_verified !== undefined) params.set('email_verified', String(filters.email_verified))
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))
  if (filters?.ordering) params.set('ordering', filters.ordering)

  const query = params.toString()
  const endpoint = query ? `/api/admin/users/?${query}` : '/api/admin/users/'

  return apiClient<PaginatedResponse<AdminUser>>(endpoint)
}

/**
 * Get user statistics summary.
 */
export async function getAdminUserStats(): Promise<AdminUserStats> {
  return apiClient<AdminUserStats>('/api/admin/users/stats/')
}

// =============================================================================
// Single User CRUD
// =============================================================================

/**
 * Get detailed user information.
 */
export async function getAdminUser(userId: number | string): Promise<AdminUserDetail> {
  return apiClient<AdminUserDetail>(`/api/admin/users/${userId}/`)
}

/**
 * Create a new user account.
 */
export async function createAdminUser(data: CreateUserData): Promise<AdminUser> {
  return apiClient<AdminUser>('/api/admin/users/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Update user information.
 */
export async function updateAdminUser(
  userId: number | string,
  data: UpdateUserData
): Promise<AdminUserDetail> {
  return apiClient<AdminUserDetail>(`/api/admin/users/${userId}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Delete a user account.
 */
export async function deleteAdminUser(userId: number | string): Promise<void> {
  await apiClient(`/api/admin/users/${userId}/`, {
    method: 'DELETE',
  })
}

// =============================================================================
// User Status Management
// =============================================================================

/**
 * Suspend a user account.
 */
export async function suspendUser(
  userId: number | string,
  data: SuspendUserData
): Promise<AdminUserDetail> {
  return apiClient<AdminUserDetail>(`/api/admin/users/${userId}/suspend/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Reactivate a suspended user account.
 */
export async function reactivateUser(
  userId: number | string,
  data?: ReactivateUserData
): Promise<AdminUserDetail> {
  return apiClient<AdminUserDetail>(`/api/admin/users/${userId}/reactivate/`, {
    method: 'POST',
    body: JSON.stringify(data || {}),
  })
}

/**
 * Send password reset email to user.
 */
export async function sendPasswordReset(userId: number | string): Promise<PasswordResetResponse> {
  return apiClient<PasswordResetResponse>(`/api/admin/users/${userId}/reset-password/`, {
    method: 'POST',
  })
}

/**
 * Manually verify user's email.
 */
export async function verifyUserEmail(userId: number | string): Promise<AdminUserDetail> {
  return apiClient<AdminUserDetail>(`/api/admin/users/${userId}/verify-email/`, {
    method: 'POST',
  })
}

// =============================================================================
// User Activity
// =============================================================================

/**
 * Get user activity log.
 */
export async function getUserActivity(
  userId: number | string,
  filters?: UserActivityFilters
): Promise<PaginatedResponse<UserActivity>> {
  const params = new URLSearchParams()

  if (filters?.type) params.set('type', filters.type)
  if (filters?.start_date) params.set('start_date', filters.start_date)
  if (filters?.end_date) params.set('end_date', filters.end_date)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))

  const query = params.toString()
  const endpoint = query
    ? `/api/admin/users/${userId}/activity/?${query}`
    : `/api/admin/users/${userId}/activity/`

  return apiClient<PaginatedResponse<UserActivity>>(endpoint)
}

/**
 * Get user login history (login attempts).
 */
export async function getUserLoginHistory(
  userId: number | string,
  filters?: { page?: number; page_size?: number }
): Promise<PaginatedResponse<LoginAttempt>> {
  const params = new URLSearchParams()

  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))

  const query = params.toString()
  const endpoint = query
    ? `/api/admin/users/${userId}/login-history/?${query}`
    : `/api/admin/users/${userId}/login-history/`

  return apiClient<PaginatedResponse<LoginAttempt>>(endpoint)
}

// =============================================================================
// Impersonation
// =============================================================================

/**
 * Start an impersonation session for a user.
 * Returns a token that can be used to log in as the target user.
 */
export async function startImpersonation(
  userId: number | string,
  data?: StartImpersonationData
): Promise<ImpersonationToken> {
  return apiClient<ImpersonationToken>(`/api/admin/users/${userId}/impersonate/`, {
    method: 'POST',
    body: JSON.stringify(data || {}),
  })
}

/**
 * End the current impersonation session.
 * Returns admin back to their own account.
 */
export async function endImpersonation(): Promise<MessageResponse> {
  return apiClient<MessageResponse>('/api/admin/impersonation/end/', {
    method: 'POST',
  })
}

// =============================================================================
// Bulk Operations
// =============================================================================

/**
 * Bulk suspend multiple users.
 */
export async function bulkSuspendUsers(
  userIds: number[],
  data: SuspendUserData
): Promise<MessageResponse> {
  return apiClient<MessageResponse>('/api/admin/users/bulk-suspend/', {
    method: 'POST',
    body: JSON.stringify({ user_ids: userIds, ...data }),
  })
}

/**
 * Bulk delete multiple users.
 */
export async function bulkDeleteUsers(userIds: number[]): Promise<MessageResponse> {
  return apiClient<MessageResponse>('/api/admin/users/bulk-delete/', {
    method: 'POST',
    body: JSON.stringify({ user_ids: userIds }),
  })
}

/**
 * Export users to CSV/Excel.
 */
export async function exportUsers(
  filters?: AdminUserFilters,
  format: 'csv' | 'xlsx' = 'csv'
): Promise<Blob> {
  const params = new URLSearchParams()
  params.set('format', format)

  if (filters?.search) params.set('search', filters.search)
  if (filters?.role && filters.role !== 'all') params.set('role', filters.role)
  if (filters?.status && filters.status !== 'all') params.set('status', filters.status)

  return apiClientBlob(`/api/admin/users/export/?${params.toString()}`)
}
