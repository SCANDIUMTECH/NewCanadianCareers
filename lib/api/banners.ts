/**
 * Public Banners API functions.
 * Fetches active banners for public page rendering and records tracking events.
 */

import { apiClient } from './client'

// =============================================================================
// Types
// =============================================================================

export type BannerPlacement = 'search_top' | 'search_sidebar' | 'job_detail' | 'homepage'

export interface PublicBanner {
  id: number
  title: string
  image_url: string
  target_url: string
  placement: BannerPlacement
  sponsor: string
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Get active banners filtered by placement.
 */
export async function getBannersByPlacement(placement: BannerPlacement): Promise<PublicBanner[]> {
  const data = await apiClient<PublicBanner[] | { results: PublicBanner[] }>(
    `/api/banners/?placement=${placement}`
  )
  if (Array.isArray(data)) return data
  return data.results
}

/**
 * Record a banner impression (24h dedup per visitor).
 */
export async function recordBannerImpression(id: number): Promise<void> {
  await apiClient(`/api/banners/${id}/impression/`, {
    method: 'POST',
  })
}

/**
 * Record a banner click.
 */
export async function recordBannerClick(id: number): Promise<void> {
  await apiClient(`/api/banners/${id}/click/`, {
    method: 'POST',
  })
}
