/**
 * Admin Job Packages API functions.
 * Endpoints for job package management.
 */

import { apiClient } from './client'
import type { PaginatedResponse } from '@/lib/admin/types'

// =============================================================================
// Types
// =============================================================================

export type PaymentType = 'one_time' | 'subscription' | 'bundle'

export interface JobPackage {
  id: number
  name: string
  slug: string
  description: string
  credits: number
  validity_days: number
  package_validity_days: number | null
  price: number
  sale_price: number | null
  monthly_price: number | null
  yearly_price: number | null
  tax_rate: number
  currency: string
  effective_price: number
  tax_amount: number
  total_price: number
  yearly_monthly_equivalent: number | null
  yearly_savings_percent: number
  yearly_savings_amount: number
  payment_type: PaymentType
  features: string[]
  is_active: boolean
  is_popular: boolean
  disable_repeat_purchase: boolean
  sort_order: number
  stripe_product_id: string | null
  stripe_price_id: string | null
  created_at: string
  updated_at: string
}

export interface CreateJobPackageData {
  name: string
  description?: string
  credits: number
  validity_days: number
  package_validity_days?: number | null
  price: number
  sale_price?: number | null
  monthly_price?: number | null
  yearly_price?: number | null
  tax_rate?: number
  currency?: string
  payment_type: PaymentType
  features?: string[]
  is_active?: boolean
  is_popular?: boolean
  disable_repeat_purchase?: boolean
  sort_order?: number
}

export interface UpdateJobPackageData extends Partial<CreateJobPackageData> {}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Get all job packages.
 */
export async function getAdminJobPackages(
  paymentType?: PaymentType,
  isActive?: boolean
): Promise<JobPackage[]> {
  const params = new URLSearchParams()
  if (paymentType) params.set('payment_type', paymentType)
  if (isActive !== undefined) params.set('is_active', String(isActive))

  const query = params.toString()
  const url = `/api/admin/job-packages/${query ? `?${query}` : ''}`

  const data = await apiClient<JobPackage[] | PaginatedResponse<JobPackage>>(url)

  // Handle both paginated and non-paginated responses
  if (Array.isArray(data)) return data
  return data.results
}

/**
 * Get a single job package by ID.
 */
export async function getAdminJobPackage(id: number): Promise<JobPackage> {
  return apiClient<JobPackage>(`/api/admin/job-packages/${id}/`)
}

/**
 * Create a new job package.
 */
export async function createJobPackage(data: CreateJobPackageData): Promise<JobPackage> {
  return apiClient<JobPackage>('/api/admin/job-packages/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Update an existing job package.
 */
export async function updateJobPackage(
  id: number,
  data: UpdateJobPackageData
): Promise<JobPackage> {
  return apiClient<JobPackage>(`/api/admin/job-packages/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Delete a job package.
 */
export async function deleteJobPackage(id: number): Promise<void> {
  await apiClient(`/api/admin/job-packages/${id}/`, {
    method: 'DELETE',
  })
}

/**
 * Toggle job package active status.
 */
export async function toggleJobPackageStatus(id: number): Promise<JobPackage> {
  return apiClient<JobPackage>(`/api/admin/job-packages/${id}/toggle-status/`, {
    method: 'PATCH',
  })
}

/**
 * Duplicate a job package.
 */
export async function duplicateJobPackage(id: number): Promise<JobPackage> {
  return apiClient<JobPackage>(`/api/admin/job-packages/${id}/duplicate/`, {
    method: 'POST',
  })
}

/**
 * Sync a job package to Stripe (create/update Stripe product and price).
 */
export async function syncPackageToStripe(id: number): Promise<JobPackage> {
  return apiClient<JobPackage>(`/api/admin/job-packages/${id}/sync-stripe/`, {
    method: 'POST',
  })
}
