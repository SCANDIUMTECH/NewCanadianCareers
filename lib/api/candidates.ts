/**
 * Candidate API functions.
 * Endpoints for candidate dashboard operations.
 */

import { apiClient } from './client'
import type {
  CandidateProfile,
  CandidateProfileUpdate,
  Resume,
  CandidateApplication,
  CandidateApplicationListItem,
  CandidateApplicationFilters,
  CandidateApplicationMessage,
  SavedJob,
  SavedJobFilters,
  SaveJobData,
  JobAlert,
  JobAlertCreate,
  JobAlertUpdate,
  CandidateNotification,
  CandidateNotificationFilters,
  CandidateNotificationPreferences,
  PrivacySettings,
  Session,
  DashboardStats,
  ProfileCompletion,
  PaginatedResponse,
} from '@/lib/candidate/types'

// =============================================================================
// Profile
// =============================================================================

/**
 * Get the current candidate's profile.
 */
export async function getCandidateProfile(): Promise<CandidateProfile> {
  return apiClient<CandidateProfile>('/api/auth/me/')
}

/**
 * Update the current candidate's profile.
 */
export async function updateCandidateProfile(
  data: CandidateProfileUpdate
): Promise<CandidateProfile> {
  return apiClient<CandidateProfile>('/api/auth/me/', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Upload a resume file.
 */
export async function uploadResume(file: File): Promise<Resume> {
  const formData = new FormData()
  formData.append('file', file)

  return apiClient<Resume>('/api/auth/me/resume/', {
    method: 'POST',
    body: formData,
  })
}

/**
 * Delete the current resume.
 */
export async function deleteResume(): Promise<void> {
  await apiClient('/api/auth/me/resume/delete/', {
    method: 'DELETE',
  })
}

/**
 * Upload an avatar image.
 */
export async function uploadAvatar(file: File): Promise<{ avatar: string }> {
  const formData = new FormData()
  formData.append('avatar', file)

  return apiClient<{ avatar: string }>('/api/auth/me/avatar/', {
    method: 'POST',
    body: formData,
  })
}

// =============================================================================
// Applications
// =============================================================================

/**
 * Apply to a job.
 */
export async function applyToJob(data: {
  job: number
  cover_letter?: string
  resume?: File
  portfolio_url?: string
  linkedin_url?: string
  turnstile_token?: string
}): Promise<CandidateApplicationListItem> {
  const formData = new FormData()
  formData.append('job', String(data.job))
  if (data.cover_letter) formData.append('cover_letter', data.cover_letter)
  if (data.resume) formData.append('resume', data.resume)
  if (data.portfolio_url) formData.append('portfolio_url', data.portfolio_url)
  if (data.linkedin_url) formData.append('linkedin_url', data.linkedin_url)
  if (data.turnstile_token) formData.append('turnstile_token', data.turnstile_token)

  return apiClient<CandidateApplicationListItem>('/api/applications/apply/', {
    method: 'POST',
    body: formData,
  })
}

/**
 * Get paginated list of candidate's applications.
 */
export async function getMyApplications(
  filters?: CandidateApplicationFilters
): Promise<PaginatedResponse<CandidateApplicationListItem>> {
  const params = new URLSearchParams()

  if (filters?.status) params.set('status', filters.status)
  if (filters?.search) params.set('search', filters.search)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))

  const query = params.toString()
  const endpoint = query ? `/api/applications/my/?${query}` : '/api/applications/my/'

  return apiClient<PaginatedResponse<CandidateApplicationListItem>>(endpoint)
}

/**
 * Get a single application with full details.
 */
export async function getApplication(id: number): Promise<CandidateApplication> {
  return apiClient<CandidateApplication>(`/api/applications/my/${id}/`)
}

/**
 * Withdraw an application.
 */
export async function withdrawApplication(id: number): Promise<CandidateApplication> {
  return apiClient<CandidateApplication>(`/api/applications/my/${id}/withdraw/`, {
    method: 'POST',
  })
}

/**
 * Get messages for an application.
 */
export async function getApplicationMessages(
  id: number
): Promise<CandidateApplicationMessage[]> {
  const response = await apiClient<PaginatedResponse<CandidateApplicationMessage>>(
    `/api/applications/${id}/messages/`
  )
  return response.results
}

/**
 * Send a message on an application.
 */
export async function sendApplicationMessage(
  id: number,
  content: string
): Promise<CandidateApplicationMessage> {
  return apiClient<CandidateApplicationMessage>(`/api/applications/${id}/messages/`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}

/**
 * Mark all messages on an application as read.
 */
export async function markMessagesAsRead(id: number): Promise<void> {
  await apiClient(`/api/applications/${id}/messages/read/`, {
    method: 'POST',
  })
}

// =============================================================================
// Saved Jobs
// =============================================================================

/**
 * Get paginated list of saved jobs.
 */
export async function getSavedJobs(
  filters?: SavedJobFilters
): Promise<PaginatedResponse<SavedJob>> {
  const params = new URLSearchParams()

  if (filters?.search) params.set('search', filters.search)
  if (filters?.sort) params.set('sort', filters.sort)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))

  const query = params.toString()
  const endpoint = query ? `/api/applications/saved-jobs/?${query}` : '/api/applications/saved-jobs/'

  return apiClient<PaginatedResponse<SavedJob>>(endpoint)
}

/**
 * Save a job.
 */
export async function saveJob(data: SaveJobData): Promise<SavedJob> {
  return apiClient<SavedJob>('/api/applications/saved-jobs/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Unsave a job.
 */
export async function unsaveJob(savedJobId: number): Promise<void> {
  await apiClient(`/api/applications/saved-jobs/${savedJobId}/`, {
    method: 'DELETE',
  })
}

/**
 * Update saved job notes.
 */
export async function updateSavedJobNotes(
  savedJobId: number,
  notes: string
): Promise<SavedJob> {
  return apiClient<SavedJob>(`/api/applications/saved-jobs/${savedJobId}/`, {
    method: 'PATCH',
    body: JSON.stringify({ notes }),
  })
}

// =============================================================================
// Job Alerts
// =============================================================================

/**
 * Get paginated job alerts.
 */
export async function getJobAlerts(
  filters?: { page?: number; page_size?: number }
): Promise<PaginatedResponse<JobAlert>> {
  const params = new URLSearchParams()
  if (filters?.page) params.set('page', String(filters.page))
  params.set('page_size', String(filters?.page_size ?? 50))

  return apiClient<PaginatedResponse<JobAlert>>(`/api/applications/alerts/?${params.toString()}`)
}

/**
 * Create a new job alert.
 */
export async function createJobAlert(data: JobAlertCreate): Promise<JobAlert> {
  return apiClient<JobAlert>('/api/applications/alerts/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Update a job alert.
 */
export async function updateJobAlert(id: number, data: JobAlertUpdate): Promise<JobAlert> {
  return apiClient<JobAlert>(`/api/applications/alerts/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Delete a job alert.
 */
export async function deleteJobAlert(id: number): Promise<void> {
  await apiClient(`/api/applications/alerts/${id}/`, {
    method: 'DELETE',
  })
}

/**
 * Toggle job alert enabled/disabled.
 */
export async function toggleJobAlert(id: number, enabled: boolean): Promise<JobAlert> {
  return updateJobAlert(id, { enabled })
}

// =============================================================================
// Privacy Settings
// =============================================================================

/**
 * Get privacy settings.
 */
export async function getPrivacySettings(): Promise<PrivacySettings> {
  return apiClient<PrivacySettings>('/api/auth/me/privacy/')
}

/**
 * Update privacy settings.
 */
export async function updatePrivacySettings(
  data: Partial<PrivacySettings>
): Promise<PrivacySettings> {
  return apiClient<PrivacySettings>('/api/auth/me/privacy/', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

// =============================================================================
// Settings
// =============================================================================

/**
 * Get notification preferences.
 */
export async function getNotificationPreferences(): Promise<CandidateNotificationPreferences> {
  return apiClient<CandidateNotificationPreferences>('/api/notifications/preferences/')
}

/**
 * Update notification preferences.
 */
export async function updateNotificationPreferences(
  data: Partial<CandidateNotificationPreferences>
): Promise<CandidateNotificationPreferences> {
  return apiClient<CandidateNotificationPreferences>('/api/notifications/preferences/', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Change password.
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
 * Get active sessions.
 */
export async function getSessions(): Promise<Session[]> {
  const response = await apiClient<{ results: Session[] }>('/api/auth/sessions/')
  return response.results
}

/**
 * Revoke a session.
 */
export async function revokeSession(id: number | string): Promise<void> {
  await apiClient(`/api/auth/sessions/${id}/revoke/`, {
    method: 'POST',
  })
}

/**
 * Revoke all sessions except current.
 */
export async function revokeAllSessions(): Promise<void> {
  await apiClient('/api/auth/sessions/revoke-all/', {
    method: 'POST',
  })
}

/**
 * Export user data (GDPR).
 */
export async function exportData(): Promise<{ download_url: string }> {
  return apiClient<{ download_url: string }>('/api/auth/export-data/', {
    method: 'POST',
  })
}

/**
 * Delete account.
 */
export async function deleteAccount(password: string): Promise<void> {
  await apiClient('/api/auth/delete-account/', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
}

// =============================================================================
// Notifications
// =============================================================================

/**
 * Get paginated notifications.
 */
export async function getCandidateNotifications(
  filters?: CandidateNotificationFilters
): Promise<PaginatedResponse<CandidateNotification>> {
  const params = new URLSearchParams()

  if (filters?.is_read !== undefined) params.set('is_read', String(filters.is_read))
  if (filters?.notification_type) params.set('type', filters.notification_type)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))

  const query = params.toString()
  const endpoint = query ? `/api/notifications/?${query}` : '/api/notifications/'

  return apiClient<PaginatedResponse<CandidateNotification>>(endpoint)
}

/**
 * Mark notification as read.
 */
export async function markNotificationAsRead(id: number): Promise<CandidateNotification> {
  return apiClient<CandidateNotification>(`/api/notifications/${id}/read/`, {
    method: 'POST',
  })
}

/**
 * Mark all notifications as read.
 */
export async function markAllNotificationsAsRead(): Promise<{ marked_count: number }> {
  return apiClient<{ marked_count: number }>('/api/notifications/read-all/', {
    method: 'POST',
  })
}

/**
 * Delete a notification.
 */
export async function deleteNotification(id: number): Promise<void> {
  await apiClient(`/api/notifications/${id}/`, {
    method: 'DELETE',
  })
}

/**
 * Clear all notifications.
 */
export async function clearAllNotifications(): Promise<void> {
  await apiClient('/api/notifications/clear/', {
    method: 'POST',
  })
}

/**
 * Get unread notification count.
 */
export async function getUnreadNotificationCount(): Promise<number> {
  const response = await apiClient<{ count: number }>('/api/notifications/unread-count/')
  return response.count
}

// =============================================================================
// Dashboard
// =============================================================================

/**
 * Get dashboard statistics.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  return apiClient<DashboardStats>('/api/candidates/dashboard/stats/')
}

/**
 * Get profile completion status.
 */
export async function getProfileCompletion(): Promise<ProfileCompletion> {
  return apiClient<ProfileCompletion>('/api/candidates/profile/completion/')
}

/**
 * Get application counts by status.
 */
export async function getApplicationCounts(): Promise<Record<string, number>> {
  return apiClient<Record<string, number>>('/api/applications/my/counts/')
}
