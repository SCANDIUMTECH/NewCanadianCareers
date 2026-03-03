/**
 * Public Affiliate Links API functions.
 * Fetches active affiliate links for public page rendering and records clicks.
 */

import { apiClient } from './client'

// =============================================================================
// Types
// =============================================================================

export type AffiliatePlacement = 'job_detail' | 'search_results' | 'email' | 'footer'

export interface PublicAffiliateLink {
  id: number
  name: string
  company: string
  url: string
  placement: AffiliatePlacement
  disclosure_label: string
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Get active affiliate links filtered by placement.
 */
export async function getAffiliateLinksByPlacement(placement: AffiliatePlacement): Promise<PublicAffiliateLink[]> {
  const data = await apiClient<PublicAffiliateLink[] | { results: PublicAffiliateLink[] }>(
    `/api/affiliate-links/?placement=${placement}`
  )
  if (Array.isArray(data)) return data
  return data.results
}

/**
 * Record an affiliate link click.
 */
export async function recordAffiliateLinkClick(id: number): Promise<void> {
  await apiClient(`/api/affiliate-links/${id}/click/`, {
    method: 'POST',
  })
}
