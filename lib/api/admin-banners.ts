/**
 * Admin Sponsored Banners API functions.
 * Endpoints for sponsored banner management.
 */

import { apiClient } from './client'
import type { PaginatedResponse } from '@/lib/admin/types'

// =============================================================================
// Types
// =============================================================================

export type BannerPlacement = 'search_top' | 'search_sidebar' | 'job_detail' | 'homepage'

export interface SponsoredBanner {
  id: number
  title: string
  image_url: string
  target_url: string
  placement: BannerPlacement
  sponsor: string
  is_active: boolean
  start_date: string | null
  end_date: string | null
  impressions: number
  clicks: number
  ctr: number
  created_at: string
  updated_at: string
}

export interface CreateBannerData {
  title: string
  image_url?: string
  target_url: string
  placement: BannerPlacement
  sponsor?: string
  is_active?: boolean
  start_date?: string
  end_date?: string
}

export interface UpdateBannerData extends Partial<CreateBannerData> {}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Get all sponsored banners.
 */
export async function getAdminBanners(
  placement?: BannerPlacement,
  isActive?: boolean
): Promise<SponsoredBanner[]> {
  const params = new URLSearchParams()
  if (placement) params.set('placement', placement)
  if (isActive !== undefined) params.set('is_active', String(isActive))

  const query = params.toString()
  const url = `/api/admin/sponsored-banners/${query ? `?${query}` : ''}`

  const data = await apiClient<SponsoredBanner[] | PaginatedResponse<SponsoredBanner>>(url)

  // Handle both paginated and non-paginated responses
  if (Array.isArray(data)) return data
  return data.results
}

/**
 * Get a single sponsored banner by ID.
 */
export async function getAdminBanner(id: number): Promise<SponsoredBanner> {
  return apiClient<SponsoredBanner>(`/api/admin/sponsored-banners/${id}/`)
}

/**
 * Create a new sponsored banner.
 */
export async function createBanner(data: CreateBannerData): Promise<SponsoredBanner> {
  return apiClient<SponsoredBanner>('/api/admin/sponsored-banners/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Update an existing sponsored banner.
 */
export async function updateBanner(
  id: number,
  data: UpdateBannerData
): Promise<SponsoredBanner> {
  return apiClient<SponsoredBanner>(`/api/admin/sponsored-banners/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Delete a sponsored banner.
 */
export async function deleteBanner(id: number): Promise<void> {
  await apiClient(`/api/admin/sponsored-banners/${id}/`, {
    method: 'DELETE',
  })
}

/**
 * Toggle banner active status.
 */
export async function toggleBannerStatus(id: number): Promise<SponsoredBanner> {
  return apiClient<SponsoredBanner>(`/api/admin/sponsored-banners/${id}/toggle-status/`, {
    method: 'PATCH',
  })
}
