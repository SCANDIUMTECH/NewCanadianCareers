/**
 * Admin Payments API functions.
 * Endpoints for transaction management, revenue tracking, and billing operations.
 */

import { apiClient, apiClientBlob } from './client'
import type {
  AdminTransaction,
  AdminPaymentStats,
  AdminRevenueTrend,
  AdminPaymentFilters,
  PaginatedResponse,
  MessageResponse,
} from '@/lib/admin/types'

// =============================================================================
// Transactions List
// =============================================================================

/**
 * Get paginated list of transactions with filters.
 */
export async function getAdminTransactions(
  filters?: AdminPaymentFilters
): Promise<PaginatedResponse<AdminTransaction>> {
  const params = new URLSearchParams()

  if (filters?.search) params.set('search', filters.search)
  if (filters?.type && filters.type !== 'all') params.set('type', filters.type)
  if (filters?.status && filters.status !== 'all') params.set('status', filters.status)
  if (filters?.payment_method && filters.payment_method !== 'all') params.set('payment_method', filters.payment_method)
  if (filters?.company_id) params.set('company', String(filters.company_id))
  if (filters?.agency_id) params.set('agency', String(filters.agency_id))
  if (filters?.start_date) params.set('start_date', filters.start_date)
  if (filters?.end_date) params.set('end_date', filters.end_date)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))
  if (filters?.ordering) params.set('ordering', filters.ordering)

  const query = params.toString()
  const endpoint = query ? `/api/admin/payments/?${query}` : '/api/admin/payments/'

  return apiClient<PaginatedResponse<AdminTransaction>>(endpoint)
}

/**
 * Get single transaction details.
 */
export async function getAdminTransaction(transactionId: number | string): Promise<AdminTransaction> {
  return apiClient<AdminTransaction>(`/api/admin/payments/${transactionId}/`)
}

// =============================================================================
// Payment Statistics
// =============================================================================

/**
 * Get payment statistics summary.
 */
export async function getAdminPaymentStats(
  timeRange: '24h' | '7d' | '30d' | '90d' = '30d'
): Promise<AdminPaymentStats> {
  return apiClient<AdminPaymentStats>(`/api/admin/payments/stats/?range=${timeRange}`)
}

/**
 * Get revenue trend data.
 */
export async function getRevenueTrends(
  timeRange: '7d' | '30d' | '90d' | '12m' = '30d'
): Promise<AdminRevenueTrend[]> {
  return apiClient<AdminRevenueTrend[]>(`/api/admin/payments/trends/?range=${timeRange}`)
}

// =============================================================================
// Transaction Actions
// =============================================================================

/**
 * Issue a refund for a transaction.
 */
export async function refundTransaction(
  transactionId: number | string,
  data: { amount?: number; reason: string }
): Promise<AdminTransaction> {
  return apiClient<AdminTransaction>(`/api/admin/payments/${transactionId}/refund/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Retry a failed transaction.
 */
export async function retryTransaction(transactionId: number | string): Promise<AdminTransaction> {
  return apiClient<AdminTransaction>(`/api/admin/payments/${transactionId}/retry/`, {
    method: 'POST',
  })
}

// =============================================================================
// Manual Billing
// =============================================================================

/**
 * Create a manual invoice for a company.
 */
export async function createManualInvoice(
  data: {
    company_id: number
    amount: number
    description: string
    due_date: string
  }
): Promise<AdminTransaction> {
  return apiClient<AdminTransaction>('/api/admin/payments/invoice/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Apply a credit adjustment.
 */
export async function applyCreditAdjustment(
  data: {
    company_id?: number
    agency_id?: number
    amount: number
    reason: string
    type: 'credit' | 'debit'
  }
): Promise<MessageResponse> {
  return apiClient<MessageResponse>('/api/admin/payments/adjustment/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// =============================================================================
// Invoice Download
// =============================================================================

/**
 * Download invoice PDF for a transaction.
 */
export async function downloadInvoice(transactionId: number | string): Promise<Blob> {
  return apiClientBlob(`/api/admin/payments/${transactionId}/invoice/download/`)
}

// =============================================================================
// Export
// =============================================================================

/**
 * Export transactions to CSV/Excel.
 */
export async function exportAdminTransactions(
  filters?: AdminPaymentFilters,
  format: 'csv' | 'xlsx' = 'csv'
): Promise<Blob> {
  const params = new URLSearchParams()
  params.set('format', format)

  if (filters?.type && filters.type !== 'all') params.set('type', filters.type)
  if (filters?.status && filters.status !== 'all') params.set('status', filters.status)
  if (filters?.payment_method && filters.payment_method !== 'all') params.set('payment_method', filters.payment_method)
  if (filters?.start_date) params.set('start_date', filters.start_date)
  if (filters?.end_date) params.set('end_date', filters.end_date)

  return apiClientBlob(`/api/admin/payments/export/?${params.toString()}`)
}
