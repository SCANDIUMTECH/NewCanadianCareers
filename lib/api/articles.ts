/**
 * Public Articles API functions.
 * Read-only endpoints for public article consumption.
 */

import { apiClient } from './client'
import type {
  PublicArticle,
  PublicArticleDetail,
  AdminArticleCategory,
  PaginatedResponse,
} from '@/lib/admin/types'

/**
 * Get paginated list of published articles.
 */
export async function getPublicArticles(
  filters?: {
    search?: string
    category?: string
    tag?: string
    page?: number
    page_size?: number
    ordering?: string
  }
): Promise<PaginatedResponse<PublicArticle>> {
  const params = new URLSearchParams()

  if (filters?.search) params.set('search', filters.search)
  if (filters?.category) params.set('category', filters.category)
  if (filters?.tag) params.set('tag', filters.tag)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))
  if (filters?.ordering) params.set('ordering', filters.ordering)

  const query = params.toString()
  const endpoint = query ? `/api/articles/?${query}` : '/api/articles/'

  return apiClient<PaginatedResponse<PublicArticle>>(endpoint)
}

/**
 * Get a single published article by slug.
 */
export async function getPublicArticle(slug: string): Promise<PublicArticleDetail> {
  return apiClient<PublicArticleDetail>(`/api/articles/${slug}/`)
}

/**
 * Get featured articles.
 */
export async function getFeaturedArticles(): Promise<PublicArticle[]> {
  return apiClient<PublicArticle[]>('/api/articles/featured/')
}

/**
 * Get article categories.
 */
export async function getArticleCategories(): Promise<AdminArticleCategory[]> {
  return apiClient<AdminArticleCategory[]>('/api/articles/categories/')
}
