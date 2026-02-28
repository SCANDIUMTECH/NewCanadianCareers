/**
 * Applications API functions.
 * Endpoints for managing job applications.
 */

import { apiClient, apiClientBlob } from './client'
import type {
  Application,
  ApplicationListItem,
  ApplicationFilters,
  UpdateApplicationData,
  ApplicationMessage,
  ApplicationStatus,
  PaginatedResponse,
} from '@/lib/company/types'

// =============================================================================
// Application Queries
// =============================================================================

/**
 * Get paginated list of applications for the company.
 */
export async function getCompanyApplications(
  filters?: ApplicationFilters
): Promise<PaginatedResponse<ApplicationListItem>> {
  const params = new URLSearchParams()

  if (filters?.job_id) params.set('job_id', String(filters.job_id))
  if (filters?.status) params.set('status', filters.status)
  if (filters?.search) params.set('search', filters.search)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))

  const query = params.toString()
  const endpoint = query ? `/api/applications/company/?${query}` : '/api/applications/company/'

  return apiClient<PaginatedResponse<ApplicationListItem>>(endpoint)
}

/**
 * Get a single application with full details.
 */
export async function getApplication(id: number): Promise<Application> {
  return apiClient<Application>(`/api/applications/company/${id}/`)
}

// =============================================================================
// Application Actions
// =============================================================================

/**
 * Update application status.
 */
export async function updateApplicationStatus(
  id: number,
  status: ApplicationStatus,
  notes?: string
): Promise<Application> {
  return apiClient<Application>(`/api/applications/company/${id}/update_status/`, {
    method: 'POST',
    body: JSON.stringify({ status, notes }),
  })
}

/**
 * Add notes to an application via the dedicated action endpoint.
 */
export async function addApplicationNote(id: number, notes: string): Promise<Application> {
  return apiClient<Application>(`/api/applications/company/${id}/add_note/`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  })
}

/**
 * Rate an application (1-5 stars) via the dedicated action endpoint.
 */
export async function rateApplication(id: number, rating: number | null): Promise<Application> {
  return apiClient<Application>(`/api/applications/company/${id}/rate/`, {
    method: 'POST',
    body: JSON.stringify({ rating }),
  })
}

/**
 * Update multiple fields on an application.
 */
export async function updateApplication(id: number, data: UpdateApplicationData): Promise<Application> {
  return apiClient<Application>(`/api/applications/company/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

// =============================================================================
// Bulk Actions
// =============================================================================

export interface BulkActionResult {
  updated: number
  failed: number
  errors: Array<{ id: number; error: string }>
}

/**
 * Update status for multiple applications.
 */
export async function bulkUpdateStatus(
  ids: number[],
  status: ApplicationStatus
): Promise<BulkActionResult> {
  return apiClient<BulkActionResult>('/api/applications/company/bulk-status/', {
    method: 'POST',
    body: JSON.stringify({ ids, status }),
  })
}

// =============================================================================
// Messaging
// =============================================================================

/**
 * Get messages for an application.
 * Messages endpoint is at /api/applications/<id>/messages/ (not under company/).
 */
export async function getApplicationMessages(id: number): Promise<ApplicationMessage[]> {
  const response = await apiClient<PaginatedResponse<ApplicationMessage>>(
    `/api/applications/${id}/messages/`
  )
  return response.results
}

/**
 * Send a message to an applicant.
 */
export async function sendApplicationMessage(id: number, content: string): Promise<ApplicationMessage> {
  return apiClient<ApplicationMessage>(`/api/applications/${id}/messages/`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}

// =============================================================================
// Statistics
// =============================================================================

export interface ApplicationStats {
  total: number
  pending: number
  reviewing: number
  shortlisted: number
  interviewed: number
  offered: number
  hired: number
  rejected: number
}

/**
 * Raw response shape from the backend stats endpoint.
 */
interface ApplicationStatsRaw {
  total: number
  recent_30_days: number
  by_status: Record<string, number>
}

/**
 * Get application statistics.
 * Transforms backend response into flat status counts.
 */
export async function getApplicationStats(jobId?: number): Promise<ApplicationStats> {
  const endpoint = jobId
    ? `/api/applications/company/stats/?job_id=${jobId}`
    : '/api/applications/company/stats/'

  const raw = await apiClient<ApplicationStatsRaw>(endpoint)

  return {
    total: raw.total,
    pending: raw.by_status.pending ?? 0,
    reviewing: raw.by_status.reviewing ?? 0,
    shortlisted: raw.by_status.shortlisted ?? 0,
    interviewed: raw.by_status.interviewed ?? 0,
    offered: raw.by_status.offered ?? 0,
    hired: raw.by_status.hired ?? 0,
    rejected: raw.by_status.rejected ?? 0,
  }
}

// =============================================================================
// Export
// =============================================================================

/**
 * Export applications as CSV.
 * Returns raw CSV text from the backend.
 */
export async function exportApplicationsCsv(
  filters?: ApplicationFilters
): Promise<string> {
  const params = new URLSearchParams()

  if (filters?.job_id) params.set('job_id', String(filters.job_id))
  if (filters?.status) params.set('status', filters.status)
  if (filters?.search) params.set('search', filters.search)

  const query = params.toString()
  const endpoint = query
    ? `/api/applications/company/export/?${query}`
    : '/api/applications/company/export/'

  const blob = await apiClientBlob(endpoint, {
    headers: { Accept: 'text/csv' },
  })
  return blob.text()
}
