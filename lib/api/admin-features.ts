/**
 * Admin Feature Flags API functions.
 * Endpoints for feature flag management.
 */

import { apiClient } from './client'
import type { PaginatedResponse } from '@/lib/admin/types'

// =============================================================================
// Types
// =============================================================================

export type FeatureEnvironment = 'all' | 'production' | 'staging' | 'development'

export interface FeatureFlag {
  id: number
  name: string
  key: string
  description: string
  enabled: boolean
  environment: FeatureEnvironment
  rollout_percentage: number
  created_at: string
  updated_at: string
}

export interface CreateFeatureFlagData {
  name: string
  key: string
  description?: string
  enabled?: boolean
  environment?: FeatureEnvironment
  rollout_percentage?: number
}

export interface UpdateFeatureFlagData extends Partial<CreateFeatureFlagData> {}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Get all feature flags.
 */
export async function getAdminFeatureFlags(
  environment?: FeatureEnvironment,
  enabled?: boolean
): Promise<FeatureFlag[]> {
  const params = new URLSearchParams()
  if (environment) params.set('environment', environment)
  if (enabled !== undefined) params.set('enabled', String(enabled))

  const query = params.toString()
  const url = `/api/admin/feature-flags/${query ? `?${query}` : ''}`

  const data = await apiClient<FeatureFlag[] | PaginatedResponse<FeatureFlag>>(url)

  // Handle both paginated and non-paginated responses
  if (Array.isArray(data)) return data
  return data.results
}

/**
 * Get a single feature flag by ID.
 */
export async function getAdminFeatureFlag(id: number): Promise<FeatureFlag> {
  return apiClient<FeatureFlag>(`/api/admin/feature-flags/${id}/`)
}

/**
 * Create a new feature flag.
 */
export async function createFeatureFlag(data: CreateFeatureFlagData): Promise<FeatureFlag> {
  return apiClient<FeatureFlag>('/api/admin/feature-flags/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Update an existing feature flag.
 */
export async function updateFeatureFlag(
  id: number,
  data: UpdateFeatureFlagData
): Promise<FeatureFlag> {
  return apiClient<FeatureFlag>(`/api/admin/feature-flags/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Delete a feature flag.
 */
export async function deleteFeatureFlag(id: number): Promise<void> {
  await apiClient(`/api/admin/feature-flags/${id}/`, {
    method: 'DELETE',
  })
}

/**
 * Toggle feature flag enabled status.
 */
export async function toggleFeatureFlag(id: number): Promise<FeatureFlag> {
  return apiClient<FeatureFlag>(`/api/admin/feature-flags/${id}/toggle/`, {
    method: 'PATCH',
  })
}
