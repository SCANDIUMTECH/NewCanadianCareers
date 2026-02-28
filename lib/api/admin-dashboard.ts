/**
 * Admin Dashboard API functions.
 * Endpoints for dashboard statistics, trends, and activity feeds.
 */

import { apiClient } from './client'
import type {
  AdminDashboardStats,
  AdminDashboardTrendPoint,
  AdminDashboardModerationItem,
  AdminActivity,
  AdminAlert,
  PaginatedResponse,
  MessageResponse,
} from '@/lib/admin/types'

// =============================================================================
// Dashboard Stats
// =============================================================================

/**
 * Get dashboard overview statistics.
 */
export async function getDashboardStats(
  timeRange: '24h' | '7d' | '30d' | '90d' = '7d'
): Promise<AdminDashboardStats> {
  return apiClient<AdminDashboardStats>(`/api/admin/dashboard/stats/?range=${timeRange}`)
}

// =============================================================================
// Dashboard Trends
// =============================================================================

/**
 * Get jobs and applications trend data.
 */
export async function getJobsTrend(
  timeRange: '24h' | '7d' | '30d' | '90d' = '7d'
): Promise<AdminDashboardTrendPoint[]> {
  return apiClient<AdminDashboardTrendPoint[]>(`/api/admin/dashboard/trends/jobs/?range=${timeRange}`)
}

/**
 * Get revenue trend data.
 */
export async function getRevenueTrend(
  timeRange: '24h' | '7d' | '30d' | '90d' = '7d'
): Promise<AdminDashboardTrendPoint[]> {
  return apiClient<AdminDashboardTrendPoint[]>(`/api/admin/dashboard/trends/revenue/?range=${timeRange}`)
}

// =============================================================================
// Moderation Queue
// =============================================================================

/**
 * Get moderation queue summary.
 */
export async function getModerationSummary(): Promise<AdminDashboardModerationItem[]> {
  return apiClient<AdminDashboardModerationItem[]>('/api/admin/dashboard/moderation/')
}

// =============================================================================
// Recent Activity
// =============================================================================

/**
 * Get recent platform activity.
 */
export async function getRecentActivity(
  limit: number = 10
): Promise<AdminActivity[]> {
  return apiClient<AdminActivity[]>(`/api/admin/dashboard/activity/?limit=${limit}`)
}

/**
 * Get paginated activity log.
 */
export async function getActivityLog(
  filters?: {
    type?: 'job' | 'user' | 'moderation' | 'payment' | 'all'
    start_date?: string
    end_date?: string
    page?: number
    page_size?: number
  }
): Promise<PaginatedResponse<AdminActivity>> {
  const params = new URLSearchParams()

  if (filters?.type && filters.type !== 'all') params.set('type', filters.type)
  if (filters?.start_date) params.set('start_date', filters.start_date)
  if (filters?.end_date) params.set('end_date', filters.end_date)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))

  const query = params.toString()
  const endpoint = query ? `/api/admin/dashboard/activity/log/?${query}` : '/api/admin/dashboard/activity/log/'

  return apiClient<PaginatedResponse<AdminActivity>>(endpoint)
}

// =============================================================================
// System Alerts
// =============================================================================

/**
 * Get active system alerts.
 */
export async function getSystemAlerts(): Promise<AdminAlert[]> {
  return apiClient<AdminAlert[]>('/api/admin/dashboard/alerts/')
}

/**
 * Acknowledge/dismiss an alert.
 */
export async function dismissAlert(alertId: number | string): Promise<MessageResponse> {
  return apiClient<MessageResponse>(`/api/admin/dashboard/alerts/${alertId}/dismiss/`, {
    method: 'POST',
  })
}

/**
 * Mark an alert as resolved.
 */
export async function resolveAlert(
  alertId: number | string,
  notes?: string
): Promise<MessageResponse> {
  return apiClient<MessageResponse>(`/api/admin/dashboard/alerts/${alertId}/resolve/`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  })
}

// =============================================================================
// Quick Stats (for widgets)
// =============================================================================

/**
 * Get quick counts for various entities.
 */
export async function getQuickCounts(): Promise<{
  pending_jobs: number
  pending_companies: number
  pending_agencies: number
  open_fraud_alerts: number
  compliance_due_soon: number
}> {
  return apiClient('/api/admin/dashboard/counts/')
}
