/**
 * Admin Affiliate Links API functions.
 * Endpoints for affiliate link management.
 */

import { apiClient } from './client'
import type { PaginatedResponse } from '@/lib/admin/types'

// =============================================================================
// Types
// =============================================================================

export type AffiliatePlacement = 'job_detail' | 'search_results' | 'email' | 'footer'

export interface AffiliateLink {
  id: number
  name: string
  company: string
  url: string
  placement: AffiliatePlacement
  disclosure_label: string
  is_active: boolean
  clicks: number
  conversions: number
  revenue: number
  conversion_rate: number
  created_at: string
  updated_at: string
}

export interface CreateAffiliateLinkData {
  name: string
  company?: string
  url: string
  placement: AffiliatePlacement
  disclosure_label?: string
  is_active?: boolean
}

export interface UpdateAffiliateLinkData extends Partial<CreateAffiliateLinkData> {}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Get all affiliate links.
 */
export async function getAdminAffiliateLinks(
  placement?: AffiliatePlacement,
  isActive?: boolean
): Promise<AffiliateLink[]> {
  const params = new URLSearchParams()
  if (placement) params.set('placement', placement)
  if (isActive !== undefined) params.set('is_active', String(isActive))

  const query = params.toString()
  const url = `/api/admin/affiliate-links/${query ? `?${query}` : ''}`

  const data = await apiClient<AffiliateLink[] | PaginatedResponse<AffiliateLink>>(url)

  // Handle both paginated and non-paginated responses
  if (Array.isArray(data)) return data
  return data.results
}

/**
 * Get a single affiliate link by ID.
 */
export async function getAdminAffiliateLink(id: number): Promise<AffiliateLink> {
  return apiClient<AffiliateLink>(`/api/admin/affiliate-links/${id}/`)
}

/**
 * Create a new affiliate link.
 */
export async function createAffiliateLink(data: CreateAffiliateLinkData): Promise<AffiliateLink> {
  return apiClient<AffiliateLink>('/api/admin/affiliate-links/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Update an existing affiliate link.
 */
export async function updateAffiliateLink(
  id: number,
  data: UpdateAffiliateLinkData
): Promise<AffiliateLink> {
  return apiClient<AffiliateLink>(`/api/admin/affiliate-links/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Delete an affiliate link.
 */
export async function deleteAffiliateLink(id: number): Promise<void> {
  await apiClient(`/api/admin/affiliate-links/${id}/`, {
    method: 'DELETE',
  })
}

/**
 * Toggle affiliate link active status.
 */
export async function toggleAffiliateLinkStatus(id: number): Promise<AffiliateLink> {
  return apiClient<AffiliateLink>(`/api/admin/affiliate-links/${id}/toggle-status/`, {
    method: 'PATCH',
  })
}
