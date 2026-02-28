/**
 * Social API functions.
 * Endpoints for social media account connections and posts.
 */

import { apiClient } from './client'
import type {
  SocialAccount,
  SocialPost,
  CreateSocialPostData,
  ConnectSocialData,
  SocialPlatform,
  PaginatedResponse,
} from '@/lib/company/types'

// =============================================================================
// Social Accounts
// =============================================================================

/**
 * Get all connected social accounts.
 */
export async function getSocialAccounts(): Promise<SocialAccount[]> {
  const response = await apiClient<PaginatedResponse<SocialAccount>>('/api/social/accounts/')
  return response.results
}

/**
 * Get OAuth URL to connect a social account.
 */
export async function getConnectUrl(platform: SocialPlatform, redirectUri: string): Promise<{ url: string }> {
  return apiClient<{ url: string }>('/api/social/accounts/connect-url/', {
    method: 'POST',
    body: JSON.stringify({ platform, redirect_uri: redirectUri }),
  })
}

/**
 * Complete OAuth connection with code.
 */
export async function connectAccount(data: ConnectSocialData): Promise<SocialAccount> {
  return apiClient<SocialAccount>('/api/social/accounts/connect/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Disconnect a social account.
 */
export async function disconnectAccount(id: number): Promise<void> {
  await apiClient(`/api/social/accounts/${id}/`, {
    method: 'DELETE',
  })
}

/**
 * Refresh a social account connection.
 */
export async function refreshAccount(id: number): Promise<SocialAccount> {
  return apiClient<SocialAccount>(`/api/social/accounts/${id}/refresh_token/`, {
    method: 'POST',
  })
}

// =============================================================================
// Social Posts
// =============================================================================

export interface SocialPostFilters {
  job_id?: number
  platform?: SocialPlatform
  status?: SocialPost['status']
  page?: number
  page_size?: number
}

/**
 * Get paginated list of social posts.
 */
export async function getSocialPosts(filters?: SocialPostFilters): Promise<PaginatedResponse<SocialPost>> {
  const params = new URLSearchParams()

  if (filters?.job_id) params.set('job_id', String(filters.job_id))
  if (filters?.platform) params.set('platform', filters.platform)
  if (filters?.status) params.set('status', filters.status)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))

  const query = params.toString()
  const endpoint = query ? `/api/social/posts/?${query}` : '/api/social/posts/'

  return apiClient<PaginatedResponse<SocialPost>>(endpoint)
}

/**
 * Create a new social post.
 * Consumes 1 social credit per platform.
 */
export async function createSocialPost(data: CreateSocialPostData): Promise<SocialPost> {
  return apiClient<SocialPost>('/api/social/posts/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Retry a failed social post.
 */
export async function retrySocialPost(id: number): Promise<SocialPost> {
  return apiClient<SocialPost>(`/api/social/posts/${id}/retry/`, {
    method: 'POST',
  })
}

/**
 * Delete a pending social post.
 */
export async function deleteSocialPost(id: number): Promise<void> {
  await apiClient(`/api/social/posts/${id}/`, {
    method: 'DELETE',
  })
}
