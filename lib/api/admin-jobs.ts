/**
 * Admin Jobs API functions.
 * Endpoints for admin job management, moderation, and policy configuration.
 */

import { apiClient, apiClientBlob } from './client'
import type {
  AdminJob,
  AdminJobDetail,
  AdminJobStats,
  AdminJobFilters,
  AdminJobPolicySettings,
  AdminJobReport,
  ApproveJobData,
  RejectJobData,
  ExtendJobData,
  BulkJobActionData,
  BulkJobActionResponse,
  BulkJobImportPayload,
  BulkJobImportResponse,
  PreApproveCheckResponse,
  PaginatedResponse,
  MessageResponse,
} from '@/lib/admin/types'

// =============================================================================
// Admin Jobs List
// =============================================================================

/**
 * Get paginated list of jobs with filters.
 */
export async function getAdminJobs(
  filters?: AdminJobFilters
): Promise<PaginatedResponse<AdminJob>> {
  const params = new URLSearchParams()

  if (filters?.search) params.set('search', filters.search)
  if (filters?.status && filters.status !== 'all') params.set('status', filters.status)
  if (filters?.location_type && filters.location_type !== 'all') params.set('location_type', filters.location_type)
  if (filters?.company_id) params.set('company', String(filters.company_id))
  if (filters?.agency_id) params.set('agency', String(filters.agency_id))
  if (filters?.category) params.set('category', filters.category)
  if (filters?.featured !== undefined) params.set('featured', String(filters.featured))
  if (filters?.has_reports !== undefined) params.set('has_reports', String(filters.has_reports))
  if (filters?.include_trashed) params.set('include_trashed', 'true')
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))
  if (filters?.ordering) params.set('ordering', filters.ordering)

  const query = params.toString()
  const endpoint = query ? `/api/admin/jobs/?${query}` : '/api/admin/jobs/'

  return apiClient<PaginatedResponse<AdminJob>>(endpoint)
}

/**
 * Get job statistics summary.
 */
export async function getAdminJobStats(): Promise<AdminJobStats> {
  return apiClient<AdminJobStats>('/api/admin/jobs/stats/')
}

// =============================================================================
// Single Job CRUD
// =============================================================================

/**
 * Get detailed job information.
 */
export async function getAdminJob(jobId: number | string): Promise<AdminJobDetail> {
  return apiClient<AdminJobDetail>(`/api/admin/jobs/${jobId}/`)
}

/**
 * Update job information.
 */
export async function updateAdminJob(
  jobId: number | string,
  data: Partial<AdminJob>
): Promise<AdminJobDetail> {
  return apiClient<AdminJobDetail>(`/api/admin/jobs/${jobId}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Delete a job.
 */
export async function deleteAdminJob(jobId: number | string): Promise<void> {
  await apiClient(`/api/admin/jobs/${jobId}/`, {
    method: 'DELETE',
  })
}

// =============================================================================
// Job Moderation Actions
// =============================================================================

/**
 * Approve a pending job.
 */
export async function approveJob(
  jobId: number | string,
  data?: ApproveJobData
): Promise<AdminJobDetail> {
  return apiClient<AdminJobDetail>(`/api/admin/jobs/${jobId}/approve/`, {
    method: 'POST',
    body: JSON.stringify(data || {}),
  })
}

/**
 * Reject a pending job.
 */
export async function rejectJob(
  jobId: number | string,
  data: RejectJobData
): Promise<AdminJobDetail> {
  return apiClient<AdminJobDetail>(`/api/admin/jobs/${jobId}/reject/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Pause a published job.
 */
export async function pauseJob(jobId: number | string): Promise<AdminJobDetail> {
  return apiClient<AdminJobDetail>(`/api/admin/jobs/${jobId}/pause/`, {
    method: 'POST',
  })
}

/**
 * Resume a paused job.
 */
export async function resumeJob(jobId: number | string): Promise<AdminJobDetail> {
  return apiClient<AdminJobDetail>(`/api/admin/jobs/${jobId}/resume/`, {
    method: 'POST',
  })
}

/**
 * Hide a job from public view.
 */
export async function hideJob(
  jobId: number | string,
  reason: string
): Promise<AdminJobDetail> {
  return apiClient<AdminJobDetail>(`/api/admin/jobs/${jobId}/hide/`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

/**
 * Toggle featured status for a job.
 */
export async function toggleJobFeatured(jobId: number | string): Promise<AdminJobDetail> {
  return apiClient<AdminJobDetail>(`/api/admin/jobs/${jobId}/feature/`, {
    method: 'POST',
  })
}

/**
 * Extend job expiration date.
 */
export async function extendJobExpiration(
  jobId: number | string,
  data: ExtendJobData
): Promise<AdminJobDetail> {
  return apiClient<AdminJobDetail>(`/api/admin/jobs/${jobId}/extend/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Mark a job as filled.
 */
export async function markJobFilled(jobId: number | string): Promise<AdminJobDetail> {
  return apiClient<AdminJobDetail>(`/api/admin/jobs/${jobId}/mark_filled/`, {
    method: 'POST',
  })
}

/**
 * Move a job to trash (soft delete).
 */
export async function trashJob(jobId: number | string): Promise<MessageResponse> {
  return apiClient<MessageResponse>(`/api/admin/jobs/${jobId}/trash/`, {
    method: 'POST',
  })
}

/**
 * Restore a job from trash.
 */
export async function restoreJob(jobId: number | string): Promise<AdminJobDetail> {
  return apiClient<AdminJobDetail>(`/api/admin/jobs/${jobId}/restore/`, {
    method: 'POST',
  })
}

/**
 * Get trashed jobs list.
 */
export async function getTrashedJobs(): Promise<PaginatedResponse<AdminJob>> {
  return apiClient<PaginatedResponse<AdminJob>>('/api/admin/jobs/trash/')
}

/**
 * Permanently delete ALL trashed jobs (empty trash).
 */
export async function emptyTrash(): Promise<MessageResponse & { count: number }> {
  return apiClient<MessageResponse & { count: number }>('/api/admin/jobs/empty-trash/', {
    method: 'POST',
  })
}

/**
 * Permanently delete a single trashed job.
 */
export async function permanentDeleteJob(jobId: number | string): Promise<void> {
  await apiClient(`/api/admin/jobs/${jobId}/permanent-delete/`, {
    method: 'DELETE',
  })
}

// =============================================================================
// Job Reports
// =============================================================================

/**
 * Get reports for a specific job.
 */
export async function getJobReports(
  jobId: number | string
): Promise<AdminJobReport[]> {
  return apiClient<AdminJobReport[]>(`/api/admin/job-reports/?job=${jobId}`)
}

/**
 * Dismiss a job report.
 */
export async function dismissJobReport(
  jobId: number | string,
  reportId: number | string
): Promise<MessageResponse> {
  return apiClient<MessageResponse>(`/api/admin/job-reports/${reportId}/review/`, {
    method: 'POST',
    body: JSON.stringify({ action: 'dismiss' }),
  })
}

/**
 * Take action on a job report.
 */
export async function actionJobReport(
  jobId: number | string,
  reportId: number | string,
  action: 'hide' | 'delete',
  notes?: string
): Promise<MessageResponse> {
  return apiClient<MessageResponse>(`/api/admin/job-reports/${reportId}/review/`, {
    method: 'POST',
    body: JSON.stringify({ action, notes }),
  })
}

// =============================================================================
// Credit Pre-flight Check
// =============================================================================

/**
 * Pre-approve credit check — verifies credit availability before approving jobs.
 * Returns per-entity credit summaries and identifies which jobs need credit
 * consumption vs. which already had credits consumed during publish flow.
 */
export async function preApproveCheck(jobIds: number[]): Promise<PreApproveCheckResponse> {
  return apiClient<PreApproveCheckResponse>('/api/admin/jobs/pre-approve-check/', {
    method: 'POST',
    body: JSON.stringify({ job_ids: jobIds }),
  })
}

// =============================================================================
// Bulk Operations
// =============================================================================

/**
 * Perform bulk action on multiple jobs.
 * For approve actions, returns extended response with credit skip info.
 */
export async function bulkJobAction(data: BulkJobActionData): Promise<BulkJobActionResponse> {
  return apiClient<BulkJobActionResponse>('/api/admin/jobs/bulk-action/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// =============================================================================
// Job Import
// =============================================================================

/**
 * Bulk import jobs as drafts.
 * Company mode: provide company_id, all jobs go to that company.
 * Agency mode: provide agency_id, each job row has company_name + company_email.
 */
export async function importBulkJobs(
  data: BulkJobImportPayload
): Promise<BulkJobImportResponse> {
  return apiClient<BulkJobImportResponse>('/api/admin/jobs/bulk-import/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// =============================================================================
// Job Policy Settings
// =============================================================================

/**
 * Get current job policy settings.
 */
export async function getJobPolicySettings(): Promise<AdminJobPolicySettings> {
  return apiClient<AdminJobPolicySettings>('/api/admin/jobs/policy/')
}

/**
 * Update job policy settings.
 */
export async function updateJobPolicySettings(
  data: Partial<AdminJobPolicySettings>
): Promise<AdminJobPolicySettings> {
  return apiClient<AdminJobPolicySettings>('/api/admin/jobs/policy/', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

// =============================================================================
// Export
// =============================================================================

/**
 * Export jobs to CSV/Excel.
 */
export async function exportAdminJobs(
  filters?: AdminJobFilters,
  format: 'csv' | 'xlsx' = 'csv'
): Promise<Blob> {
  const params = new URLSearchParams()
  params.set('format', format)

  if (filters?.search) params.set('search', filters.search)
  if (filters?.status && filters.status !== 'all') params.set('status', filters.status)
  if (filters?.company_id) params.set('company', String(filters.company_id))

  return apiClientBlob(`/api/admin/jobs/export/?${params.toString()}`)
}

// =============================================================================
// Contact Poster
// =============================================================================

/**
 * Send a message to the job poster.
 */
export async function contactJobPoster(
  jobId: number | string,
  data: { subject: string; message: string; template?: string }
): Promise<MessageResponse> {
  return apiClient<MessageResponse>(`/api/admin/jobs/${jobId}/contact/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
