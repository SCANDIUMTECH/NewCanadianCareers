/**
 * Admin Articles API functions.
 * Endpoints for admin article management.
 */

import { apiClient } from './client'
import type {
  AdminArticle,
  AdminArticleDetail,
  AdminArticleStats,
  AdminArticleFilters,
  AdminArticleCategory,
  CreateArticleData,
  UpdateArticleData,
  PaginatedResponse,
  MessageResponse,
} from '@/lib/admin/types'

// =============================================================================
// Admin Articles List
// =============================================================================

/**
 * Get paginated list of articles with filters.
 */
export async function getAdminArticles(
  filters?: AdminArticleFilters
): Promise<PaginatedResponse<AdminArticle>> {
  const params = new URLSearchParams()

  if (filters?.search) params.set('search', filters.search)
  if (filters?.status && filters.status !== 'all') params.set('status', filters.status)
  if (filters?.category) params.set('category', String(filters.category))
  if (filters?.featured !== undefined) params.set('featured', String(filters.featured))
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))
  if (filters?.ordering) params.set('ordering', filters.ordering)

  const query = params.toString()
  const endpoint = query ? `/api/admin/articles/?${query}` : '/api/admin/articles/'

  return apiClient<PaginatedResponse<AdminArticle>>(endpoint)
}

/**
 * Get article statistics summary.
 */
export async function getAdminArticleStats(): Promise<AdminArticleStats> {
  return apiClient<AdminArticleStats>('/api/admin/articles/stats/')
}

// =============================================================================
// Single Article CRUD
// =============================================================================

/**
 * Get detailed article information.
 */
export async function getAdminArticle(id: number | string): Promise<AdminArticleDetail> {
  return apiClient<AdminArticleDetail>(`/api/admin/articles/${id}/`)
}

/**
 * Create a new article.
 */
export async function createArticle(data: CreateArticleData): Promise<AdminArticleDetail> {
  return apiClient<AdminArticleDetail>('/api/admin/articles/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Update an existing article.
 */
export async function updateArticle(
  id: number | string,
  data: UpdateArticleData
): Promise<AdminArticleDetail> {
  return apiClient<AdminArticleDetail>(`/api/admin/articles/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Delete an article.
 */
export async function deleteArticle(id: number | string): Promise<void> {
  await apiClient(`/api/admin/articles/${id}/`, {
    method: 'DELETE',
  })
}

// =============================================================================
// Article State Transitions
// =============================================================================

/**
 * Publish an article.
 */
export async function publishArticle(id: number | string): Promise<AdminArticleDetail> {
  return apiClient<AdminArticleDetail>(`/api/admin/articles/${id}/publish/`, {
    method: 'POST',
  })
}

/**
 * Unpublish an article (revert to draft).
 */
export async function unpublishArticle(id: number | string): Promise<AdminArticleDetail> {
  return apiClient<AdminArticleDetail>(`/api/admin/articles/${id}/unpublish/`, {
    method: 'POST',
  })
}

/**
 * Schedule an article for future publishing.
 */
export async function scheduleArticle(
  id: number | string,
  publishAt: string
): Promise<AdminArticleDetail> {
  return apiClient<AdminArticleDetail>(`/api/admin/articles/${id}/schedule/`, {
    method: 'POST',
    body: JSON.stringify({ publish_at: publishAt }),
  })
}

/**
 * Archive an article.
 */
export async function archiveArticle(id: number | string): Promise<AdminArticleDetail> {
  return apiClient<AdminArticleDetail>(`/api/admin/articles/${id}/archive/`, {
    method: 'POST',
  })
}

/**
 * Feature an article.
 */
export async function featureArticle(id: number | string): Promise<AdminArticleDetail> {
  return apiClient<AdminArticleDetail>(`/api/admin/articles/${id}/feature/`, {
    method: 'POST',
  })
}

/**
 * Unfeature an article.
 */
export async function unfeatureArticle(id: number | string): Promise<AdminArticleDetail> {
  return apiClient<AdminArticleDetail>(`/api/admin/articles/${id}/unfeature/`, {
    method: 'POST',
  })
}

/**
 * Regenerate preview token for an article.
 */
export async function regeneratePreviewToken(id: number | string): Promise<AdminArticleDetail> {
  return apiClient<AdminArticleDetail>(`/api/admin/articles/${id}/regenerate-preview-token/`, {
    method: 'POST',
  })
}

// =============================================================================
// Article Image Uploads
// =============================================================================

/**
 * Upload an inline body image for article content.
 * Returns the public URL of the uploaded image.
 */
export async function uploadArticleBodyImage(file: File): Promise<{ url: string }> {
  const formData = new FormData()
  formData.append('image', file)

  return apiClient<{ url: string }>('/api/admin/articles/upload-body-image/', {
    method: 'POST',
    body: formData,
  })
}

/**
 * Upload cover image for an article.
 */
export async function uploadArticleCoverImage(
  id: number | string,
  file: File
): Promise<AdminArticleDetail> {
  const formData = new FormData()
  formData.append('cover_image', file)

  return apiClient<AdminArticleDetail>(`/api/admin/articles/${id}/upload-cover-image/`, {
    method: 'POST',
    body: formData,
  })
}

/**
 * Upload OG image for an article.
 */
export async function uploadArticleOgImage(
  id: number | string,
  file: File
): Promise<AdminArticleDetail> {
  const formData = new FormData()
  formData.append('og_image', file)

  return apiClient<AdminArticleDetail>(`/api/admin/articles/${id}/upload-og-image/`, {
    method: 'POST',
    body: formData,
  })
}

// =============================================================================
// Article Categories
// =============================================================================

/**
 * Get all article categories.
 */
export async function getArticleCategories(): Promise<AdminArticleCategory[]> {
  const response = await apiClient<PaginatedResponse<AdminArticleCategory> | AdminArticleCategory[]>('/api/admin/article-categories/')
  // Handle both paginated and non-paginated responses
  if (Array.isArray(response)) return response
  return response.results
}

/**
 * Create an article category.
 */
export async function createArticleCategory(
  data: Omit<AdminArticleCategory, 'id' | 'article_count'>
): Promise<AdminArticleCategory> {
  return apiClient<AdminArticleCategory>('/api/admin/article-categories/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Update an article category.
 */
export async function updateArticleCategory(
  id: number | string,
  data: Partial<Omit<AdminArticleCategory, 'id' | 'article_count'>>
): Promise<AdminArticleCategory> {
  return apiClient<AdminArticleCategory>(`/api/admin/article-categories/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Delete an article category.
 */
export async function deleteArticleCategory(id: number | string): Promise<void> {
  await apiClient(`/api/admin/article-categories/${id}/`, {
    method: 'DELETE',
  })
}
