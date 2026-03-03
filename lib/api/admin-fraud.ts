/**
 * Admin Fraud Detection API functions.
 * Endpoints for fraud alert management and trend analysis.
 */

import { apiClient, apiClientBlob } from './client'
import type {
  FraudAlert,
  FraudTrend,
  FraudStats,
  FraudFilters,
  FraudRule,
  CreateFraudRuleData,
  ResolveFraudAlertData,
  PaginatedResponse,
  MessageResponse,
} from '@/lib/admin/types'

// =============================================================================
// Fraud Alerts List
// =============================================================================

/**
 * Get paginated list of fraud alerts with filters.
 */
export async function getFraudAlerts(
  filters?: FraudFilters
): Promise<PaginatedResponse<FraudAlert>> {
  const params = new URLSearchParams()

  if (filters?.type && filters.type !== 'all') params.set('type', filters.type)
  if (filters?.severity && filters.severity !== 'all') params.set('severity', filters.severity)
  if (filters?.status && filters.status !== 'all') params.set('status', filters.status)
  if (filters?.start_date) params.set('start_date', filters.start_date)
  if (filters?.end_date) params.set('end_date', filters.end_date)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))
  if (filters?.ordering) params.set('ordering', filters.ordering)

  const query = params.toString()
  const endpoint = query ? `/api/admin/fraud/alerts/?${query}` : '/api/admin/fraud/alerts/'

  return apiClient<PaginatedResponse<FraudAlert>>(endpoint)
}

/**
 * Get single fraud alert details.
 */
export async function getFraudAlert(alertId: number | string): Promise<FraudAlert> {
  return apiClient<FraudAlert>(`/api/admin/fraud/alerts/${alertId}/`)
}

// =============================================================================
// Fraud Statistics
// =============================================================================

/**
 * Get fraud statistics summary.
 */
export async function getFraudStats(): Promise<FraudStats> {
  return apiClient<FraudStats>('/api/admin/fraud/stats/')
}

/**
 * Get fraud trend data.
 */
export async function getFraudTrends(
  timeRange: '7d' | '30d' | '90d' = '30d'
): Promise<FraudTrend[]> {
  return apiClient<FraudTrend[]>(`/api/admin/fraud/trends/?range=${timeRange}`)
}

// =============================================================================
// Alert Actions
// =============================================================================

/**
 * Start investigating a fraud alert.
 */
export async function investigateFraudAlert(alertId: number | string): Promise<FraudAlert> {
  return apiClient<FraudAlert>(`/api/admin/fraud/alerts/${alertId}/investigate/`, {
    method: 'POST',
  })
}

/**
 * Resolve a fraud alert.
 */
export async function resolveFraudAlert(
  alertId: number | string,
  data: ResolveFraudAlertData
): Promise<FraudAlert> {
  return apiClient<FraudAlert>(`/api/admin/fraud/alerts/${alertId}/resolve/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Take action on the subject of a fraud alert.
 */
export async function takeFraudAction(
  alertId: number | string,
  action: 'suspend' | 'delete' | 'warn',
  notes?: string
): Promise<MessageResponse> {
  return apiClient<MessageResponse>(`/api/admin/fraud/alerts/${alertId}/action/`, {
    method: 'POST',
    body: JSON.stringify({ action, notes }),
  })
}

// =============================================================================
// Fraud Rules CRUD
// =============================================================================

/**
 * Get all fraud detection rules.
 */
export async function getFraudRules(): Promise<FraudRule[]> {
  const response = await apiClient<FraudRule[] | { results: FraudRule[] }>('/api/admin/fraud/rules/')
  return Array.isArray(response) ? response : response.results
}

/**
 * Get a single fraud rule by ID.
 */
export async function getFraudRule(ruleId: number | string): Promise<FraudRule> {
  return apiClient<FraudRule>(`/api/admin/fraud/rules/${ruleId}/`)
}

/**
 * Create a new fraud detection rule.
 */
export async function createFraudRule(data: CreateFraudRuleData): Promise<FraudRule> {
  return apiClient<FraudRule>('/api/admin/fraud/rules/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Update an existing fraud detection rule.
 */
export async function updateFraudRule(
  ruleId: number | string,
  data: Partial<CreateFraudRuleData>
): Promise<FraudRule> {
  return apiClient<FraudRule>(`/api/admin/fraud/rules/${ruleId}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Delete a fraud detection rule.
 */
export async function deleteFraudRule(ruleId: number | string): Promise<void> {
  await apiClient(`/api/admin/fraud/rules/${ruleId}/`, {
    method: 'DELETE',
  })
}

/**
 * Toggle a fraud detection rule's enabled status.
 */
export async function toggleFraudRule(ruleId: number | string): Promise<FraudRule> {
  return apiClient<FraudRule>(`/api/admin/fraud/rules/${ruleId}/toggle/`, {
    method: 'PATCH',
  })
}

// =============================================================================
// Export
// =============================================================================

/**
 * Export fraud alerts to CSV/Excel.
 */
export async function exportFraudAlerts(
  filters?: FraudFilters,
  format: 'csv' | 'xlsx' = 'csv'
): Promise<Blob> {
  const params = new URLSearchParams()
  params.set('format', format)

  if (filters?.type && filters.type !== 'all') params.set('type', filters.type)
  if (filters?.severity && filters.severity !== 'all') params.set('severity', filters.severity)
  if (filters?.status && filters.status !== 'all') params.set('status', filters.status)

  return apiClientBlob(`/api/admin/fraud/export/?${params.toString()}`)
}
