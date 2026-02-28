/**
 * Admin Social Distribution API functions.
 * Endpoints for social media provider management, post queue, templates, and settings.
 */

import { apiClient } from './client'
import type { PaginatedResponse } from '@/lib/admin/types'

// =============================================================================
// Types
// =============================================================================

export type SocialProviderId = 'facebook' | 'instagram' | 'linkedin' | 'twitter'

export interface SocialProvider {
  id: SocialProviderId
  name: string
  connected: boolean
  token_expiry: string | null
}

export type QueueStatus = 'queued' | 'posted' | 'failed'

export interface QueueItem {
  id: string
  job_title: string
  provider: SocialProviderId
  status: QueueStatus
  scheduled_for: string
  company: string
  error?: string
}

export interface SocialTemplate {
  id: string
  provider: SocialProviderId
  title_format: string
  include_salary: boolean
  hashtags: string[]
  utm_source: string
  utm_medium: string
  utm_campaign: string
}

export interface CreateTemplateData {
  provider: SocialProviderId
  title_format: string
  include_salary: boolean
  hashtags: string[]
  utm_source: string
  utm_medium: string
  utm_campaign: string
}

export interface UpdateTemplateData extends Partial<CreateTemplateData> {}

export interface RateLimit {
  hourly: number
  daily: number
}

export type PolicyMode = 'user' | 'admin-approved' | 'admin-only'

export interface SocialSettings {
  policy_mode: PolicyMode
  require_verification: boolean
  max_posts_per_day: number
  rate_limits: Record<SocialProviderId, RateLimit>
}

export interface SocialStats {
  posts_today: number
  queued_count: number
  failed_count: number
  success_rate: number
}

export interface ConnectProviderCredentials {
  app_id: string
  app_secret: string
}

// =============================================================================
// Providers
// =============================================================================

/**
 * Get all social providers with connection status.
 */
export async function getSocialProviders(): Promise<SocialProvider[]> {
  return apiClient<SocialProvider[]>('/api/admin/social/providers/')
}

/**
 * Connect a social provider using OAuth credentials.
 */
export async function connectProvider(
  providerId: SocialProviderId,
  credentials: ConnectProviderCredentials
): Promise<SocialProvider> {
  return apiClient<SocialProvider>(`/api/admin/social/providers/${providerId}/connect/`, {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

/**
 * Disconnect a social provider.
 */
export async function disconnectProvider(providerId: SocialProviderId): Promise<void> {
  await apiClient(`/api/admin/social/providers/${providerId}/disconnect/`, {
    method: 'POST',
  })
}

/**
 * Refresh OAuth token for a provider.
 */
export async function refreshProviderToken(providerId: SocialProviderId): Promise<SocialProvider> {
  return apiClient<SocialProvider>(`/api/admin/social/providers/${providerId}/refresh/`, {
    method: 'POST',
  })
}

// =============================================================================
// Queue
// =============================================================================

/**
 * Get social post queue with optional status filter.
 */
export async function getSocialQueue(
  status?: QueueStatus,
  page: number = 1
): Promise<PaginatedResponse<QueueItem>> {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  params.set('page', String(page))

  const query = params.toString()
  return apiClient<PaginatedResponse<QueueItem>>(`/api/admin/social/queue/?${query}`)
}

/**
 * Post immediately instead of waiting for scheduled time.
 */
export async function postNow(queueId: string): Promise<QueueItem> {
  return apiClient<QueueItem>(`/api/admin/social/queue/${queueId}/post/`, {
    method: 'POST',
  })
}

/**
 * Cancel a scheduled post.
 */
export async function cancelPost(queueId: string): Promise<void> {
  await apiClient(`/api/admin/social/queue/${queueId}/`, {
    method: 'DELETE',
  })
}

/**
 * Retry a failed post.
 */
export async function retryPost(queueId: string): Promise<QueueItem> {
  return apiClient<QueueItem>(`/api/admin/social/queue/${queueId}/retry/`, {
    method: 'POST',
  })
}

/**
 * Retry all failed posts.
 */
export async function retryAllFailedPosts(): Promise<{ retried_count: number }> {
  return apiClient<{ retried_count: number }>('/api/admin/social/queue/retry-all/', {
    method: 'POST',
  })
}

/**
 * Sync/refresh queue data from backend.
 */
export async function syncQueue(): Promise<void> {
  await apiClient('/api/admin/social/queue/sync/', {
    method: 'POST',
  })
}

// =============================================================================
// Templates
// =============================================================================

/**
 * Get all social post templates.
 */
export async function getSocialTemplates(): Promise<SocialTemplate[]> {
  const data = await apiClient<SocialTemplate[] | PaginatedResponse<SocialTemplate>>('/api/admin/social/templates/')
  // DRF ViewSet returns paginated response; handle both formats
  if (Array.isArray(data)) return data
  return data.results
}

/**
 * Create a new social post template.
 */
export async function createTemplate(data: CreateTemplateData): Promise<SocialTemplate> {
  return apiClient<SocialTemplate>('/api/admin/social/templates/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Update an existing social post template.
 */
export async function updateTemplate(
  templateId: string,
  data: UpdateTemplateData
): Promise<SocialTemplate> {
  return apiClient<SocialTemplate>(`/api/admin/social/templates/${templateId}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Delete a social post template.
 */
export async function deleteTemplate(templateId: string): Promise<void> {
  await apiClient(`/api/admin/social/templates/${templateId}/`, {
    method: 'DELETE',
  })
}

// =============================================================================
// Settings
// =============================================================================

/**
 * Get social distribution settings.
 */
export async function getSocialSettings(): Promise<SocialSettings> {
  return apiClient<SocialSettings>('/api/admin/social/settings/')
}

/**
 * Update social distribution settings.
 */
export async function updateSocialSettings(
  data: Partial<SocialSettings>
): Promise<SocialSettings> {
  return apiClient<SocialSettings>('/api/admin/social/settings/', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

// =============================================================================
// Stats
// =============================================================================

/**
 * Get social distribution statistics.
 */
export async function getSocialStats(): Promise<SocialStats> {
  return apiClient<SocialStats>('/api/admin/social/stats/')
}
