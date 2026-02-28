/**
 * Admin Audit Logs API functions.
 * Endpoints for viewing immutable audit trail of admin actions.
 */

import { apiClient, apiClientBlob } from './client'
import type {
  AuditLog,
  AuditLogFilters,
  PaginatedResponse,
} from '@/lib/admin/types'

// =============================================================================
// Audit Logs
// =============================================================================

/**
 * Get paginated list of audit logs with filters.
 * GET /api/admin/audit-logs/
 */
export async function getAuditLogs(
  filters?: AuditLogFilters
): Promise<PaginatedResponse<AuditLog>> {
  const params = new URLSearchParams()

  if (filters?.search) params.set('search', filters.search)
  if (filters?.action && filters.action !== 'all') params.set('action', filters.action)
  if (filters?.target_type && filters.target_type !== 'all') params.set('target_type', filters.target_type)
  if (filters?.actor !== undefined) params.set('actor', String(filters.actor))
  if (filters?.start_date) params.set('start_date', filters.start_date)
  if (filters?.end_date) params.set('end_date', filters.end_date)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))
  if (filters?.ordering) params.set('ordering', filters.ordering)

  const query = params.toString()
  const endpoint = query ? `/api/admin/audit-logs/?${query}` : '/api/admin/audit-logs/'

  return apiClient<PaginatedResponse<AuditLog>>(endpoint)
}

/**
 * Export audit logs as CSV.
 * GET /api/admin/audit-logs/?format=csv
 */
export async function exportAuditLogs(
  filters?: AuditLogFilters,
  format: 'csv' | 'xlsx' = 'csv'
): Promise<Blob> {
  const params = new URLSearchParams()
  params.set('format', format)

  if (filters?.search) params.set('search', filters.search)
  if (filters?.action && filters.action !== 'all') params.set('action', filters.action)
  if (filters?.target_type && filters.target_type !== 'all') params.set('target_type', filters.target_type)

  return apiClientBlob(`/api/admin/audit-logs/?${params.toString()}`)
}
