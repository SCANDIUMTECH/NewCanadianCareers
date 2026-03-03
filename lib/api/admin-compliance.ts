/**
 * Admin Compliance API functions.
 * Endpoints for GDPR/CCPA data request management.
 */

import { apiClient, apiClientBlob } from './client'
import type {
  ComplianceRequest,
  ComplianceStats,
  ComplianceFilters,
  ProcessComplianceRequestData,
  PaginatedResponse,
  MessageResponse,
  RetentionRule,
  CreateRetentionRuleData,
  UpdateRetentionRuleData,
  LegalDocument,
  CreateLegalDocumentData,
  UpdateLegalDocumentData,
} from '@/lib/admin/types'

// =============================================================================
// Compliance Requests List
// =============================================================================

/**
 * Get paginated list of compliance requests with filters.
 */
export async function getComplianceRequests(
  filters?: ComplianceFilters
): Promise<PaginatedResponse<ComplianceRequest>> {
  const params = new URLSearchParams()

  if (filters?.type && filters.type !== 'all') params.set('type', filters.type)
  if (filters?.status && filters.status !== 'all') params.set('status', filters.status)
  if (filters?.start_date) params.set('start_date', filters.start_date)
  if (filters?.end_date) params.set('end_date', filters.end_date)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))
  if (filters?.ordering) params.set('ordering', filters.ordering)

  const query = params.toString()
  const endpoint = query ? `/api/admin/compliance/requests/?${query}` : '/api/admin/compliance/requests/'

  return apiClient<PaginatedResponse<ComplianceRequest>>(endpoint)
}

/**
 * Get single compliance request details.
 */
export async function getComplianceRequest(requestId: number | string): Promise<ComplianceRequest> {
  return apiClient<ComplianceRequest>(`/api/admin/compliance/requests/${requestId}/`)
}

// =============================================================================
// Compliance Statistics
// =============================================================================

/**
 * Get compliance statistics summary.
 */
export async function getComplianceStats(): Promise<ComplianceStats> {
  return apiClient<ComplianceStats>('/api/admin/compliance/stats/')
}

// =============================================================================
// Request Actions
// =============================================================================

/**
 * Start processing a compliance request.
 */
export async function startProcessingRequest(requestId: number | string): Promise<ComplianceRequest> {
  return apiClient<ComplianceRequest>(`/api/admin/compliance/requests/${requestId}/start/`, {
    method: 'POST',
  })
}

/**
 * Complete/process a compliance request.
 */
export async function processComplianceRequest(
  requestId: number | string,
  data: ProcessComplianceRequestData
): Promise<ComplianceRequest> {
  return apiClient<ComplianceRequest>(`/api/admin/compliance/requests/${requestId}/process/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Request additional verification from the requester.
 */
export async function requestVerification(
  requestId: number | string,
  message: string
): Promise<MessageResponse> {
  return apiClient<MessageResponse>(`/api/admin/compliance/requests/${requestId}/verify/`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  })
}

// =============================================================================
// Data Export (for Data Access/Portability requests)
// =============================================================================

/**
 * Generate data export for a compliance request.
 */
export async function generateDataExport(requestId: number | string): Promise<{
  download_url: string
  expires_at: string
}> {
  return apiClient(`/api/admin/compliance/requests/${requestId}/export/`, {
    method: 'POST',
  })
}

/**
 * Download generated data export.
 */
export async function downloadDataExport(requestId: number | string): Promise<Blob> {
  return apiClientBlob(`/api/admin/compliance/requests/${requestId}/download/`)
}

// =============================================================================
// Data Deletion (for Deletion requests)
// =============================================================================

/**
 * Preview data that will be deleted for a deletion request.
 */
export async function previewDeletion(requestId: number | string): Promise<{
  user_data: { type: string; count: number }[]
  total_records: number
  warnings: string[]
}> {
  return apiClient(`/api/admin/compliance/requests/${requestId}/deletion-preview/`)
}

/**
 * Execute data deletion for a compliance request.
 */
export async function executeDeletion(
  requestId: number | string,
  confirm: boolean = true
): Promise<MessageResponse> {
  return apiClient<MessageResponse>(`/api/admin/compliance/requests/${requestId}/delete/`, {
    method: 'POST',
    body: JSON.stringify({ confirm }),
  })
}

// =============================================================================
// Compliance Reports
// =============================================================================

/**
 * Generate a compliance report.
 */
export async function generateComplianceReport(
  type: 'monthly' | 'quarterly' | 'annual',
  period?: string
): Promise<{ report_url: string }> {
  const params = new URLSearchParams()
  params.set('type', type)
  if (period) params.set('period', period)

  return apiClient(`/api/admin/compliance/reports/?${params.toString()}`, {
    method: 'POST',
  })
}

// =============================================================================
// Export Request History
// =============================================================================

/**
 * Export compliance requests to CSV/Excel.
 */
export async function exportComplianceRequests(
  filters?: ComplianceFilters,
  format: 'csv' | 'xlsx' = 'csv'
): Promise<Blob> {
  const params = new URLSearchParams()
  params.set('format', format)

  if (filters?.type && filters.type !== 'all') params.set('type', filters.type)
  if (filters?.status && filters.status !== 'all') params.set('status', filters.status)
  if (filters?.start_date) params.set('start_date', filters.start_date)
  if (filters?.end_date) params.set('end_date', filters.end_date)

  return apiClientBlob(`/api/admin/compliance/export/?${params.toString()}`)
}

// =============================================================================
// Retention Rules CRUD
// =============================================================================

export async function getRetentionRules(): Promise<RetentionRule[]> {
  return apiClient<RetentionRule[]>('/api/admin/compliance/retention-rules/')
}

export async function createRetentionRule(data: CreateRetentionRuleData): Promise<RetentionRule> {
  return apiClient<RetentionRule>('/api/admin/compliance/retention-rules/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateRetentionRule(id: number, data: UpdateRetentionRuleData): Promise<RetentionRule> {
  return apiClient<RetentionRule>(`/api/admin/compliance/retention-rules/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteRetentionRule(id: number): Promise<void> {
  await apiClient(`/api/admin/compliance/retention-rules/${id}/`, {
    method: 'DELETE',
  })
}

// =============================================================================
// Legal Documents CRUD
// =============================================================================

export async function getLegalDocuments(): Promise<LegalDocument[]> {
  return apiClient<LegalDocument[]>('/api/admin/compliance/legal-documents/')
}

export async function getLegalDocument(id: number | string): Promise<LegalDocument> {
  return apiClient<LegalDocument>(`/api/admin/compliance/legal-documents/${id}/`)
}

export async function createLegalDocument(data: CreateLegalDocumentData): Promise<LegalDocument> {
  return apiClient<LegalDocument>('/api/admin/compliance/legal-documents/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateLegalDocument(id: number, data: UpdateLegalDocumentData): Promise<LegalDocument> {
  return apiClient<LegalDocument>(`/api/admin/compliance/legal-documents/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteLegalDocument(id: number): Promise<void> {
  await apiClient(`/api/admin/compliance/legal-documents/${id}/`, {
    method: 'DELETE',
  })
}

export async function publishLegalDocument(id: number): Promise<LegalDocument> {
  return apiClient<LegalDocument>(`/api/admin/compliance/legal-documents/${id}/publish/`, {
    method: 'POST',
  })
}

export async function archiveLegalDocument(id: number): Promise<LegalDocument> {
  return apiClient<LegalDocument>(`/api/admin/compliance/legal-documents/${id}/archive/`, {
    method: 'POST',
  })
}
