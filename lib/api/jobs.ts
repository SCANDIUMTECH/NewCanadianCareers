/**
 * Jobs API functions.
 * Endpoints for company job management.
 */

import { apiClient } from './client'
import type {
  Job,
  JobListItem,
  CreateJobData,
  UpdateJobData,
  JobFilters,
  CategoryOption,
  PaginatedResponse,
} from '@/lib/company/types'

// =============================================================================
// Job CRUD
// =============================================================================

/**
 * Get paginated list of company jobs.
 */
export async function getCompanyJobs(filters?: JobFilters): Promise<PaginatedResponse<JobListItem>> {
  const params = new URLSearchParams()

  if (filters?.status) params.set('status', filters.status)
  if (filters?.search) params.set('search', filters.search)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))
  if (filters?.ordering) params.set('ordering', filters.ordering)

  const query = params.toString()
  const endpoint = query ? `/api/jobs/company/?${query}` : '/api/jobs/company/'

  return apiClient<PaginatedResponse<JobListItem>>(endpoint)
}

/**
 * Get a single job by job_id (e.g. "9ONCMVVY").
 */
export async function getJob(jobId: string): Promise<Job> {
  return apiClient<Job>(`/api/jobs/company/${jobId}/`)
}

/**
 * Create a new job.
 */
export async function createJob(data: CreateJobData): Promise<Job> {
  return apiClient<Job>('/api/jobs/company/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Update an existing job.
 */
export async function updateJob(jobId: string, data: UpdateJobData): Promise<Job> {
  return apiClient<Job>(`/api/jobs/company/${jobId}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Delete a job.
 */
export async function deleteJob(jobId: string): Promise<void> {
  await apiClient(`/api/jobs/company/${jobId}/`, {
    method: 'DELETE',
  })
}

// =============================================================================
// Job Actions
// =============================================================================

/**
 * Publish a draft job immediately or schedule for a future date.
 * Consumes 1 job credit.
 */
export async function publishJob(
  jobId: string,
  options?: { social_platforms?: string[], scheduled_publish_at?: string, turnstile_token?: string }
): Promise<Job> {
  return apiClient<Job>(`/api/jobs/company/${jobId}/publish/`, {
    method: 'POST',
    body: JSON.stringify(options || {}),
  })
}

/**
 * Pause a published job.
 */
export async function pauseJob(jobId: string): Promise<Job> {
  return apiClient<Job>(`/api/jobs/company/${jobId}/pause/`, {
    method: 'POST',
  })
}

/**
 * Resume a paused job.
 */
export async function resumeJob(jobId: string): Promise<Job> {
  return apiClient<Job>(`/api/jobs/company/${jobId}/resume/`, {
    method: 'POST',
  })
}

/**
 * Extend a job's expiration date.
 */
export async function extendJob(jobId: string, days: number): Promise<Job> {
  return apiClient<Job>(`/api/jobs/company/${jobId}/extend/`, {
    method: 'POST',
    body: JSON.stringify({ days }),
  })
}

/**
 * Toggle featured status for a job.
 * Consumes 1 featured credit when enabling.
 */
export async function toggleFeatured(jobId: string): Promise<Job> {
  return apiClient<Job>(`/api/jobs/company/${jobId}/feature/`, {
    method: 'POST',
  })
}

/**
 * Duplicate a job (creates a new draft).
 */
export async function duplicateJob(jobId: string): Promise<Job> {
  return apiClient<Job>(`/api/jobs/company/${jobId}/duplicate/`, {
    method: 'POST',
  })
}

/**
 * Mark a job as filled (position closed).
 */
export async function markJobFilled(jobId: string): Promise<Job> {
  return apiClient<Job>(`/api/jobs/company/${jobId}/mark_filled/`, {
    method: 'POST',
  })
}

/**
 * Refresh (bump) a published job to the top of search results.
 * Consumes 1 job credit. Subject to cooldown period.
 */
export async function refreshJob(jobId: string): Promise<Job> {
  return apiClient<Job>(`/api/jobs/company/${jobId}/refresh/`, {
    method: 'POST',
  })
}

/**
 * Move a job to trash (soft delete).
 */
export async function trashJob(jobId: string): Promise<void> {
  await apiClient(`/api/jobs/company/${jobId}/trash/`, {
    method: 'POST',
  })
}

/**
 * Restore a job from trash.
 */
export async function restoreJob(jobId: string): Promise<Job> {
  return apiClient<Job>(`/api/jobs/company/${jobId}/restore/`, {
    method: 'POST',
  })
}

/**
 * Get trashed jobs.
 */
export async function getTrashedJobs(): Promise<JobListItem[]> {
  return apiClient<JobListItem[]>('/api/jobs/company/trash/')
}

// =============================================================================
// Job Statistics
// =============================================================================

export interface JobStats {
  total_jobs: number
  published_jobs: number
  draft_jobs: number
  pending_jobs: number
  paused_jobs: number
  expired_jobs: number
  filled_jobs: number
  total_views: number
  total_applications: number
  /** How long expired jobs are retained before auto-trash (0 = kept indefinitely). */
  expired_retention_days: number
}

/**
 * Get job statistics summary.
 */
export async function getJobStats(): Promise<JobStats> {
  return apiClient<JobStats>('/api/jobs/company/stats/')
}

// =============================================================================
// Analytics
// =============================================================================

export interface AnalyticsTimeSeries {
  date: string
  views: number
  unique_views: number
  applications: number
}

export interface AnalyticsSource {
  source: string
  count: number
}

export interface AnalyticsSummary {
  total_views: number
  total_unique_views: number
  total_applications: number
  conversion_rate: number
  avg_views_per_day: number
}

export interface CompanyAnalytics {
  timeseries: AnalyticsTimeSeries[]
  sources: AnalyticsSource[]
  summary: AnalyticsSummary
}

/**
 * Get time-series analytics for company jobs.
 */
export async function getCompanyAnalytics(params?: {
  period?: '7d' | '30d' | '90d'
  job_id?: number
}): Promise<CompanyAnalytics> {
  const searchParams = new URLSearchParams()
  if (params?.period) searchParams.set('period', params.period)
  if (params?.job_id) searchParams.set('job_id', String(params.job_id))
  const query = searchParams.toString()
  const endpoint = query ? `/api/jobs/company/analytics/?${query}` : '/api/jobs/company/analytics/'
  return apiClient<CompanyAnalytics>(endpoint)
}

// =============================================================================
// Categories
// =============================================================================

/**
 * Get all job categories.
 * Backend returns [{value, label, count}].
 */
export async function getCategories(): Promise<CategoryOption[]> {
  return apiClient<CategoryOption[]>('/api/jobs/categories/')
}
