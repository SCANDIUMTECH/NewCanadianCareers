/**
 * Admin Entitlements API functions.
 * Endpoints for credit entitlement management across companies and agencies.
 */

import { apiClient } from './client'
import type {
  AdminEntitlement,
  AdminEntitlementFilters,
  CreateEntitlementData,
  PaginatedResponse,
} from '@/lib/admin/types'

// =============================================================================
// Entitlements List
// =============================================================================

/**
 * Get paginated list of entitlements with filters.
 */
export async function getAdminEntitlements(
  filters?: AdminEntitlementFilters
): Promise<PaginatedResponse<AdminEntitlement>> {
  const params = new URLSearchParams()

  if (filters?.search) params.set('search', filters.search)
  if (filters?.company) params.set('company', String(filters.company))
  if (filters?.agency) params.set('agency', String(filters.agency))
  if (filters?.source && filters.source !== 'all') params.set('source', filters.source)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))
  if (filters?.ordering) params.set('ordering', filters.ordering)

  const query = params.toString()
  const endpoint = query ? `/api/admin/entitlements/?${query}` : '/api/admin/entitlements/'

  return apiClient<PaginatedResponse<AdminEntitlement>>(endpoint)
}

/**
 * Get single entitlement details.
 */
export async function getAdminEntitlement(
  entitlementId: number | string
): Promise<AdminEntitlement> {
  return apiClient<AdminEntitlement>(`/api/admin/entitlements/${entitlementId}/`)
}

// =============================================================================
// Create / Grant Entitlements
// =============================================================================

/**
 * Create/grant a new entitlement to a company or agency.
 */
export async function createAdminEntitlement(
  data: CreateEntitlementData
): Promise<AdminEntitlement> {
  return apiClient<AdminEntitlement>('/api/admin/entitlements/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// =============================================================================
// Update / Delete
// =============================================================================

/**
 * Update an existing entitlement.
 */
export async function updateAdminEntitlement(
  entitlementId: number | string,
  data: Partial<CreateEntitlementData>
): Promise<AdminEntitlement> {
  return apiClient<AdminEntitlement>(`/api/admin/entitlements/${entitlementId}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Delete an entitlement.
 */
export async function deleteAdminEntitlement(
  entitlementId: number | string
): Promise<void> {
  await apiClient(`/api/admin/entitlements/${entitlementId}/`, {
    method: 'DELETE',
  })
}
