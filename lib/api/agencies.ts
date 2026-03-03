/**
 * Agency API functions.
 * Endpoints for agency profile, clients, jobs, team, and analytics management.
 */

import { apiClient, apiClientBlob } from './client'
import type {
  Agency,
  AgencyProfileUpdate,
  AgencyClient,
  CreateAgencyClientData,
  UpdateAgencyClientData,
  AgencyTeamMember,
  InviteAgencyMemberData,
  UpdateAgencyMemberData,
  AgencyJob,
  AgencyJobDetail,
  CreateAgencyJobData,
  UpdateAgencyJobData,
  AgencyJobFilters,
  AgencyApplicant,
  UpdateAgencyApplicantData,
  AgencyApplicantFilters,
  AgencyPackage,
  AgencyPackageFilters,
  AvailableAgencyPackage,
  AgencyCreditPack,
  AgencyInvoice,
  AgencyInvoiceFilters,
  AgencyAnalytics,
  AnalyticsDateRange,
  AgencyNotification,
  AgencyNotificationFilters,
  AgencyNotificationPreferences,
  PaginatedResponse,
} from '@/lib/agency/types'

// =============================================================================
// Agency Profile
// =============================================================================

/**
 * Get the current agency profile.
 */
export async function getAgencyProfile(): Promise<Agency> {
  return apiClient<Agency>('/api/companies/agency/profile/')
}

/**
 * Update the current agency profile.
 */
export async function updateAgencyProfile(data: AgencyProfileUpdate): Promise<Agency> {
  return apiClient<Agency>('/api/companies/agency/profile/', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Upload agency logo.
 */
export async function uploadAgencyLogo(file: File): Promise<Agency> {
  const formData = new FormData()
  formData.append('logo', file)

  return apiClient<Agency>('/api/companies/agency/profile/logo/', {
    method: 'POST',
    body: formData,
  })
}

// =============================================================================
// Agency Clients
// =============================================================================

/**
 * Get all agency clients.
 */
export async function getAgencyClients(
  filters?: { is_active?: boolean; page?: number; page_size?: number }
): Promise<PaginatedResponse<AgencyClient>> {
  const params = new URLSearchParams()

  if (filters?.is_active !== undefined) params.set('is_active', String(filters.is_active))
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))

  const query = params.toString()
  const endpoint = query ? `/api/companies/agency/clients/?${query}` : '/api/companies/agency/clients/'

  return apiClient<PaginatedResponse<AgencyClient>>(endpoint)
}

/**
 * Get all agency clients as a simple array (for dropdowns, etc).
 */
export async function getAgencyClientsList(): Promise<AgencyClient[]> {
  const response = await getAgencyClients({ page_size: 100 })
  return response.results
}

/**
 * Get a single agency client.
 */
export async function getAgencyClient(clientId: number): Promise<AgencyClient> {
  return apiClient<AgencyClient>(`/api/companies/agency/clients/${clientId}/`)
}

/**
 * Add a new client to the agency.
 */
export async function addAgencyClient(data: CreateAgencyClientData): Promise<AgencyClient> {
  return apiClient<AgencyClient>('/api/companies/agency/clients/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Update an agency client.
 */
export async function updateAgencyClient(
  clientId: number,
  data: UpdateAgencyClientData
): Promise<AgencyClient> {
  return apiClient<AgencyClient>(`/api/companies/agency/clients/${clientId}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Remove a client from the agency.
 */
export async function removeAgencyClient(clientId: number): Promise<void> {
  await apiClient(`/api/companies/agency/clients/${clientId}/`, {
    method: 'DELETE',
  })
}

/**
 * Get jobs for a specific client.
 */
export async function getClientJobs(
  clientId: number,
  filters?: AgencyJobFilters
): Promise<PaginatedResponse<AgencyJob>> {
  const params = new URLSearchParams()

  if (filters?.status) params.set('status', filters.status)
  if (filters?.search) params.set('search', filters.search)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))

  const query = params.toString()
  const endpoint = query
    ? `/api/companies/agency/clients/${clientId}/jobs/?${query}`
    : `/api/companies/agency/clients/${clientId}/jobs/`

  return apiClient<PaginatedResponse<AgencyJob>>(endpoint)
}

// =============================================================================
// Agency Jobs
// =============================================================================

/**
 * Get all agency jobs.
 */
export async function getAgencyJobs(
  filters?: AgencyJobFilters
): Promise<PaginatedResponse<AgencyJob>> {
  const params = new URLSearchParams()

  if (filters?.status) params.set('status', filters.status)
  if (filters?.company_id) params.set('company', String(filters.company_id))
  if (filters?.search) params.set('search', filters.search)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))

  const query = params.toString()
  const endpoint = query ? `/api/jobs/agency/?${query}` : '/api/jobs/agency/'

  return apiClient<PaginatedResponse<AgencyJob>>(endpoint)
}

export interface AgencyJobStats {
  total_jobs: number
  published_jobs: number
  draft_jobs: number
  pending_jobs: number
  paused_jobs: number
  expired_jobs: number
  total_views: number
  total_applications: number
  /** How long expired jobs are retained before auto-trash (0 = kept indefinitely). */
  expired_retention_days: number
}

/**
 * Get job statistics for the agency.
 */
export async function getAgencyJobStats(): Promise<AgencyJobStats> {
  return apiClient<AgencyJobStats>('/api/jobs/agency/stats/')
}

/**
 * Get a single agency job.
 */
export async function getAgencyJob(jobId: string): Promise<AgencyJobDetail> {
  return apiClient<AgencyJobDetail>(`/api/jobs/agency/${jobId}/`)
}

/**
 * Create a new agency job.
 */
export async function createAgencyJob(data: CreateAgencyJobData): Promise<AgencyJobDetail> {
  return apiClient<AgencyJobDetail>('/api/jobs/agency/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Update an agency job.
 */
export async function updateAgencyJob(
  jobId: string,
  data: UpdateAgencyJobData
): Promise<AgencyJobDetail> {
  return apiClient<AgencyJobDetail>(`/api/jobs/agency/${jobId}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Delete an agency job.
 */
export async function deleteAgencyJob(jobId: string): Promise<void> {
  await apiClient(`/api/jobs/agency/${jobId}/`, {
    method: 'DELETE',
  })
}

/**
 * Publish an agency job.
 */
export async function publishAgencyJob(jobId: string): Promise<AgencyJobDetail> {
  return apiClient<AgencyJobDetail>(`/api/jobs/agency/${jobId}/publish/`, {
    method: 'POST',
  })
}

/**
 * Pause an agency job.
 */
export async function pauseAgencyJob(jobId: string): Promise<AgencyJobDetail> {
  return apiClient<AgencyJobDetail>(`/api/jobs/agency/${jobId}/pause/`, {
    method: 'POST',
  })
}

/**
 * Close an agency job.
 */
export async function closeAgencyJob(jobId: string): Promise<AgencyJobDetail> {
  return apiClient<AgencyJobDetail>(`/api/jobs/agency/${jobId}/close/`, {
    method: 'POST',
  })
}

// =============================================================================
// Agency Job Applicants
// =============================================================================

/**
 * Get applicants for a job.
 */
export async function getJobApplicants(
  jobId: string,
  filters?: AgencyApplicantFilters
): Promise<PaginatedResponse<AgencyApplicant>> {
  const params = new URLSearchParams()

  if (filters?.status) params.set('status', filters.status)
  if (filters?.search) params.set('search', filters.search)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))

  const query = params.toString()
  const endpoint = query
    ? `/api/jobs/agency/${jobId}/applicants/?${query}`
    : `/api/jobs/agency/${jobId}/applicants/`

  return apiClient<PaginatedResponse<AgencyApplicant>>(endpoint)
}

/**
 * Get all applicants across all agency jobs.
 */
export async function getAllAgencyApplicants(
  filters?: AgencyApplicantFilters
): Promise<PaginatedResponse<AgencyApplicant>> {
  const params = new URLSearchParams()

  if (filters?.job_id) params.set('job', String(filters.job_id))
  if (filters?.status) params.set('status', filters.status)
  if (filters?.search) params.set('search', filters.search)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))

  const query = params.toString()
  const endpoint = query ? `/api/applications/agency/?${query}` : '/api/applications/agency/'

  return apiClient<PaginatedResponse<AgencyApplicant>>(endpoint)
}

/**
 * Get a single applicant.
 */
export async function getApplicant(jobId: string, applicantId: number): Promise<AgencyApplicant> {
  return apiClient<AgencyApplicant>(`/api/jobs/agency/${jobId}/applicants/${applicantId}/`)
}

/**
 * Update applicant status.
 */
export async function updateApplicantStatus(
  jobId: string,
  applicantId: number,
  data: UpdateAgencyApplicantData
): Promise<AgencyApplicant> {
  return apiClient<AgencyApplicant>(`/api/jobs/agency/${jobId}/applicants/${applicantId}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Add note to applicant.
 */
export async function addApplicantNote(
  jobId: string,
  applicantId: number,
  note: string
): Promise<AgencyApplicant> {
  return apiClient<AgencyApplicant>(`/api/jobs/agency/${jobId}/applicants/${applicantId}/note/`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  })
}

/**
 * Submit applicant to client.
 */
export async function submitApplicantToClient(
  jobId: string,
  applicantId: number
): Promise<AgencyApplicant> {
  return apiClient<AgencyApplicant>(`/api/jobs/agency/${jobId}/applicants/${applicantId}/submit/`, {
    method: 'POST',
  })
}

// =============================================================================
// Agency Team
// =============================================================================

/**
 * Get all agency team members.
 */
export async function getAgencyTeam(): Promise<AgencyTeamMember[]> {
  const response = await apiClient<PaginatedResponse<AgencyTeamMember>>(
    '/api/companies/agency/members/'
  )
  return response.results
}

/**
 * Invite a new team member.
 */
export async function inviteAgencyMember(data: InviteAgencyMemberData): Promise<{ message: string }> {
  return apiClient<{ message: string }>('/api/companies/agency/members/invite/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Update a team member.
 */
export async function updateAgencyMember(
  memberId: number,
  data: UpdateAgencyMemberData
): Promise<AgencyTeamMember> {
  return apiClient<AgencyTeamMember>(`/api/companies/agency/members/${memberId}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Remove a team member.
 */
export async function removeAgencyMember(memberId: number): Promise<void> {
  await apiClient(`/api/companies/agency/members/${memberId}/`, {
    method: 'DELETE',
  })
}

/**
 * Resend invitation to a pending member.
 */
export async function resendAgencyInvitation(memberId: number): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/api/companies/agency/members/${memberId}/resend/`, {
    method: 'POST',
  })
}

// =============================================================================
// Agency Packages & Entitlements
// =============================================================================

/**
 * Get all agency packages.
 */
export async function getAgencyPackages(
  filters?: AgencyPackageFilters
): Promise<PaginatedResponse<AgencyPackage>> {
  const params = new URLSearchParams()

  if (filters?.status) params.set('status', filters.status)
  if (filters?.client_id) params.set('client', String(filters.client_id))
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))

  const query = params.toString()
  const endpoint = query
    ? `/api/billing/agency/packages/?${query}`
    : '/api/billing/agency/packages/'

  return apiClient<PaginatedResponse<AgencyPackage>>(endpoint)
}

/**
 * Get a single package.
 */
export async function getAgencyPackage(packageId: number): Promise<AgencyPackage> {
  return apiClient<AgencyPackage>(`/api/billing/agency/packages/${packageId}/`)
}

/**
 * Purchase a package.
 */
export async function purchasePackage(data: {
  package_id: number
  quantity?: number
}): Promise<{ checkout_url: string }> {
  return apiClient<{ checkout_url: string }>('/api/billing/agency/packages/purchase/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Assign package credits to a job.
 */
export async function assignPackageToJob(
  packageId: number,
  jobId: number
): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/api/billing/agency/packages/${packageId}/assign/`, {
    method: 'POST',
    body: JSON.stringify({ job_id: jobId }),
  })
}

/**
 * Get agency entitlement summary (credits overview).
 */
export async function getAgencyEntitlements(): Promise<{
  total_credits: number
  used_credits: number
  remaining_credits: number
  total_featured_credits: number
  remaining_featured_credits: number
  expiring_soon: { count: number; days: number }
  post_duration_days: number
}> {
  return apiClient('/api/billing/agency/entitlements/')
}

/**
 * Get available packages for purchase (catalog).
 */
export async function getAvailableAgencyPackages(): Promise<AvailableAgencyPackage[]> {
  const response = await apiClient<PaginatedResponse<AvailableAgencyPackage>>(
    '/api/billing/agency/packages/available/'
  )
  return response.results
}

/**
 * Get available credit packs for top-up purchases.
 */
export async function getAgencyCreditPacks(): Promise<AgencyCreditPack[]> {
  const response = await apiClient<PaginatedResponse<AgencyCreditPack>>(
    '/api/billing/agency/credit-packs/'
  )
  return response.results
}

/**
 * Get agency invoices.
 */
export async function getAgencyInvoices(
  filters?: AgencyInvoiceFilters
): Promise<PaginatedResponse<AgencyInvoice>> {
  const params = new URLSearchParams()

  if (filters?.status) params.set('status', filters.status)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))

  const query = params.toString()
  const endpoint = query
    ? `/api/billing/agency/invoices/?${query}`
    : '/api/billing/agency/invoices/'

  return apiClient<PaginatedResponse<AgencyInvoice>>(endpoint)
}

/**
 * Get a single agency invoice.
 */
export async function getAgencyInvoice(id: string): Promise<AgencyInvoice> {
  return apiClient<AgencyInvoice>(`/api/billing/agency/invoices/${id}/`)
}

/**
 * Download agency invoice PDF.
 */
export async function downloadAgencyInvoicePdf(id: string): Promise<Blob> {
  return apiClientBlob(`/api/billing/agency/invoices/${id}/download/`)
}

// =============================================================================
// Agency Analytics
// =============================================================================

/**
 * Get agency analytics.
 */
export async function getAgencyAnalytics(dateRange?: AnalyticsDateRange): Promise<AgencyAnalytics> {
  const params = new URLSearchParams()

  if (dateRange?.start_date) params.set('start_date', dateRange.start_date)
  if (dateRange?.end_date) params.set('end_date', dateRange.end_date)
  if (dateRange?.period) params.set('period', dateRange.period)

  const query = params.toString()
  const endpoint = query
    ? `/api/companies/agency/analytics/?${query}`
    : '/api/companies/agency/analytics/'

  return apiClient<AgencyAnalytics>(endpoint)
}

/**
 * Get recruiter performance.
 */
export async function getRecruiterPerformance(
  recruiterId: number,
  dateRange?: AnalyticsDateRange
): Promise<{
  recruiter_id: number
  recruiter_name: string
  jobs_posted: number
  placements: number
  applications_reviewed: number
  avg_time_to_fill: number
}> {
  const params = new URLSearchParams()

  if (dateRange?.start_date) params.set('start_date', dateRange.start_date)
  if (dateRange?.end_date) params.set('end_date', dateRange.end_date)

  const query = params.toString()
  const endpoint = query
    ? `/api/companies/agency/analytics/recruiter/${recruiterId}/?${query}`
    : `/api/companies/agency/analytics/recruiter/${recruiterId}/`

  return apiClient(endpoint)
}

/**
 * Export analytics data.
 */
export async function exportAgencyAnalytics(
  format: 'csv' | 'xlsx' | 'pdf',
  dateRange?: AnalyticsDateRange
): Promise<Blob> {
  const params = new URLSearchParams()
  params.set('format', format)

  if (dateRange?.start_date) params.set('start_date', dateRange.start_date)
  if (dateRange?.end_date) params.set('end_date', dateRange.end_date)

  return apiClientBlob(`/api/companies/agency/analytics/export/?${params.toString()}`)
}

// =============================================================================
// Agency Notifications
// =============================================================================

/**
 * Get agency notifications.
 */
export async function getAgencyNotifications(
  filters?: AgencyNotificationFilters
): Promise<PaginatedResponse<AgencyNotification>> {
  const params = new URLSearchParams()

  if (filters?.read !== undefined) params.set('read', String(filters.read))
  if (filters?.type) params.set('type', filters.type)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))

  const query = params.toString()
  const endpoint = query ? `/api/notifications/?${query}` : '/api/notifications/'

  return apiClient<PaginatedResponse<AgencyNotification>>(endpoint)
}

/**
 * Get unread notification count.
 */
export async function getAgencyUnreadCount(): Promise<number> {
  const response = await apiClient<{ count: number }>('/api/notifications/unread-count/')
  return response.count
}

/**
 * Mark notification as read.
 */
export async function markAgencyNotificationAsRead(notificationId: number): Promise<AgencyNotification> {
  return apiClient<AgencyNotification>(`/api/notifications/${notificationId}/read/`, {
    method: 'POST',
  })
}

/**
 * Mark all notifications as read.
 */
export async function markAllAgencyNotificationsAsRead(): Promise<{ marked_count: number }> {
  return apiClient<{ marked_count: number }>('/api/notifications/read-all/', {
    method: 'POST',
  })
}

/**
 * Get notification preferences.
 */
export async function getAgencyNotificationPreferences(): Promise<AgencyNotificationPreferences> {
  return apiClient<AgencyNotificationPreferences>('/api/notifications/preferences/')
}

/**
 * Update notification preferences.
 */
export async function updateAgencyNotificationPreferences(
  data: Partial<AgencyNotificationPreferences>
): Promise<AgencyNotificationPreferences> {
  return apiClient<AgencyNotificationPreferences>('/api/notifications/preferences/', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

// =============================================================================
// Agency Analytics - Traffic Sources & Social
// =============================================================================

/**
 * Traffic source for analytics pie chart.
 */
export interface AgencyTrafficSource {
  name: string
  value: number
  color: string
}

/**
 * Social distribution result per platform.
 */
export interface AgencySocialDistribution {
  platform: string
  posts: number
  impressions: number
  clicks: number
  applies: number
  status: 'connected' | 'not_connected'
}

/**
 * Get traffic sources breakdown for agency analytics.
 */
export async function getAgencyTrafficSources(
  dateRange?: AnalyticsDateRange
): Promise<AgencyTrafficSource[]> {
  const params = new URLSearchParams()
  if (dateRange?.period) params.set('period', dateRange.period)
  if (dateRange?.start_date) params.set('start_date', dateRange.start_date)
  if (dateRange?.end_date) params.set('end_date', dateRange.end_date)

  const query = params.toString()
  const endpoint = query
    ? `/api/companies/agency/analytics/traffic-sources/?${query}`
    : '/api/companies/agency/analytics/traffic-sources/'

  return apiClient<AgencyTrafficSource[]>(endpoint)
}

/**
 * Get social distribution stats for agency analytics.
 */
export async function getAgencySocialDistribution(
  dateRange?: AnalyticsDateRange
): Promise<AgencySocialDistribution[]> {
  const params = new URLSearchParams()
  if (dateRange?.period) params.set('period', dateRange.period)
  if (dateRange?.start_date) params.set('start_date', dateRange.start_date)
  if (dateRange?.end_date) params.set('end_date', dateRange.end_date)

  const query = params.toString()
  const endpoint = query
    ? `/api/companies/agency/analytics/social-distribution/?${query}`
    : '/api/companies/agency/analytics/social-distribution/'

  return apiClient<AgencySocialDistribution[]>(endpoint)
}

// =============================================================================
// Agency Dashboard Helpers
// =============================================================================

/**
 * Get dashboard counts (active jobs, pending applications).
 */
export async function getAgencyDashboardCounts(): Promise<{
  active_jobs: number
  pending_applications: number
  active_clients: number
  total_views: number
}> {
  return apiClient('/api/companies/agency/dashboard/counts/')
}

/**
 * Get recent activity.
 */
export async function getAgencyRecentActivity(limit: number = 10): Promise<
  Array<{
    id: number
    type: string
    message: string
    company: string | null
    time: string
    link?: string
  }>
> {
  return apiClient(`/api/companies/agency/dashboard/activity/?limit=${limit}`)
}
