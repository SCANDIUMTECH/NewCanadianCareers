/**
 * Admin Categories & Industries API functions.
 * Endpoints for managing job categories and company industries.
 */

import { apiClient } from './client'
import type { PaginatedResponse } from '@/lib/admin/types'

// =============================================================================
// Types
// =============================================================================

export interface Category {
  id: number
  name: string
  slug: string
  description: string
  icon: string
  is_active: boolean
  sort_order: number
  job_count: number
  created_at: string
  updated_at: string
}

export interface Industry {
  id: number
  name: string
  slug: string
  description: string
  icon: string
  is_active: boolean
  sort_order: number
  company_count: number
  created_at: string
  updated_at: string
}

export interface CreateCategoryData {
  name: string
  description?: string
  icon?: string
  is_active?: boolean
  sort_order?: number
}

export interface CreateIndustryData {
  name: string
  description?: string
  icon?: string
  is_active?: boolean
  sort_order?: number
}

// =============================================================================
// Categories
// =============================================================================

export async function getAdminCategories(
  search?: string,
  isActive?: boolean
): Promise<Category[]> {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (isActive !== undefined) params.set('is_active', String(isActive))

  const query = params.toString()
  const url = `/api/admin/categories/${query ? `?${query}` : ''}`

  const data = await apiClient<Category[] | PaginatedResponse<Category>>(url)
  if (Array.isArray(data)) return data
  return data.results
}

export async function createCategory(data: CreateCategoryData): Promise<Category> {
  return apiClient<Category>('/api/admin/categories/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateCategory(
  id: number,
  data: Partial<CreateCategoryData>
): Promise<Category> {
  return apiClient<Category>(`/api/admin/categories/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteCategory(id: number): Promise<void> {
  await apiClient(`/api/admin/categories/${id}/`, {
    method: 'DELETE',
  })
}

// =============================================================================
// Industries
// =============================================================================

export async function getAdminIndustries(
  search?: string,
  isActive?: boolean
): Promise<Industry[]> {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (isActive !== undefined) params.set('is_active', String(isActive))

  const query = params.toString()
  const url = `/api/admin/industries/${query ? `?${query}` : ''}`

  const data = await apiClient<Industry[] | PaginatedResponse<Industry>>(url)
  if (Array.isArray(data)) return data
  return data.results
}

export async function createIndustry(data: CreateIndustryData): Promise<Industry> {
  return apiClient<Industry>('/api/admin/industries/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateIndustry(
  id: number,
  data: Partial<CreateIndustryData>
): Promise<Industry> {
  return apiClient<Industry>(`/api/admin/industries/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteIndustry(id: number): Promise<void> {
  await apiClient(`/api/admin/industries/${id}/`, {
    method: 'DELETE',
  })
}
