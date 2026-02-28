/**
 * Admin Agencies API functions.
 * Endpoints for admin agency management, verification, and billing model configuration.
 */

import { apiClient, apiClientBlob } from './client'
import type {
  AdminAgency,
  AdminAgencyDetail,
  AdminAgencyEntitlement,
  AdminAgencyStats,
  AdminAgencyFilters,
  CreateAgencyData,
  UpdateAgencyData,
  SuspendAgencyData,
  AdminAgencyBillingModel,
  PaginatedResponse,
  MessageResponse,
} from '@/lib/admin/types'
import type { Invoice } from '@/lib/company/types'

// =============================================================================
// Admin Agencies List
// =============================================================================

/**
 * Get paginated list of agencies with filters.
 */
export async function getAdminAgencies(
  filters?: AdminAgencyFilters
): Promise<PaginatedResponse<AdminAgency>> {
  const params = new URLSearchParams()

  if (filters?.search) params.set('search', filters.search)
  if (filters?.status && filters.status !== 'all') params.set('status', filters.status)
  if (filters?.billing_status && filters.billing_status !== 'all') params.set('billing_status', filters.billing_status)
  if (filters?.billing_model && filters.billing_model !== 'all') params.set('billing_model', filters.billing_model)
  if (filters?.risk_level && filters.risk_level !== 'all') params.set('risk_level', filters.risk_level)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))
  if (filters?.ordering) params.set('ordering', filters.ordering)

  const query = params.toString()
  const endpoint = query ? `/api/admin/agencies/?${query}` : '/api/admin/agencies/'

  return apiClient<PaginatedResponse<AdminAgency>>(endpoint)
}

/**
 * Get agency statistics summary.
 */
export async function getAdminAgencyStats(): Promise<AdminAgencyStats> {
  return apiClient<AdminAgencyStats>('/api/admin/agencies/stats/')
}

// =============================================================================
// Single Agency CRUD
// =============================================================================

/**
 * Get detailed agency information.
 */
export async function getAdminAgency(agencyId: number | string): Promise<AdminAgencyDetail> {
  return apiClient<AdminAgencyDetail>(`/api/admin/agencies/${agencyId}/`)
}

/**
 * Create a new agency account.
 */
export async function createAdminAgency(data: CreateAgencyData): Promise<AdminAgency> {
  return apiClient<AdminAgency>('/api/admin/agencies/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Update agency information.
 */
export async function updateAdminAgency(
  agencyId: number | string,
  data: UpdateAgencyData
): Promise<AdminAgencyDetail> {
  return apiClient<AdminAgencyDetail>(`/api/admin/agencies/${agencyId}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Delete an agency account.
 */
export async function deleteAdminAgency(agencyId: number | string): Promise<void> {
  await apiClient(`/api/admin/agencies/${agencyId}/`, {
    method: 'DELETE',
  })
}

// =============================================================================
// Agency Status Management
// =============================================================================

/**
 * Verify an agency.
 */
export async function verifyAgency(agencyId: number | string): Promise<AdminAgencyDetail> {
  return apiClient<AdminAgencyDetail>(`/api/admin/agencies/${agencyId}/verify/`, {
    method: 'POST',
  })
}

/**
 * Suspend an agency account.
 */
export async function suspendAgency(
  agencyId: number | string,
  data: SuspendAgencyData
): Promise<AdminAgencyDetail> {
  return apiClient<AdminAgencyDetail>(`/api/admin/agencies/${agencyId}/suspend/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Reactivate a suspended agency.
 */
export async function reactivateAgency(
  agencyId: number | string,
  reason?: string
): Promise<AdminAgencyDetail> {
  return apiClient<AdminAgencyDetail>(`/api/admin/agencies/${agencyId}/reactivate/`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

/**
 * Update agency risk level.
 */
export async function updateAgencyRiskLevel(
  agencyId: number | string,
  riskLevel: 'low' | 'medium' | 'high',
  reason?: string
): Promise<AdminAgencyDetail> {
  return apiClient<AdminAgencyDetail>(`/api/admin/agencies/${agencyId}/risk-level/`, {
    method: 'POST',
    body: JSON.stringify({ risk_level: riskLevel, reason }),
  })
}

// =============================================================================
// Agency Billing Model
// =============================================================================

/**
 * Change agency billing model.
 */
export async function changeAgencyBillingModel(
  agencyId: number | string,
  billingModel: AdminAgencyBillingModel
): Promise<AdminAgencyDetail> {
  return apiClient<AdminAgencyDetail>(`/api/admin/agencies/${agencyId}/billing-model/`, {
    method: 'POST',
    body: JSON.stringify({ billing_model: billingModel }),
  })
}

// =============================================================================
// Agency Contact
// =============================================================================

/**
 * Send an email to the agency.
 */
export async function contactAgency(
  agencyId: number | string,
  data: { subject: string; message: string; template?: string }
): Promise<MessageResponse> {
  return apiClient<MessageResponse>(`/api/admin/agencies/${agencyId}/contact/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// =============================================================================
// Agency Billing Management
// =============================================================================

/**
 * Change agency subscription plan.
 */
export async function changeAgencyPlan(
  agencyId: number | string,
  data: { plan_id: string; payment_method?: string; notes?: string }
): Promise<MessageResponse> {
  return apiClient<MessageResponse>(`/api/admin/agencies/${agencyId}/billing/plan/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Add credits to an agency account.
 * Supports complimentary (free) and package-based (paid) workflows.
 */
export async function addAgencyCredits(
  agencyId: number | string,
  data: {
    credit_type: 'job' | 'featured' | 'social'
    payment_method: string
    reason: string
    expires_at?: string
    // Complimentary workflow
    credits?: number
    post_duration_days?: number
    // Package workflow
    package_id?: number
    coupon_code?: string
  }
): Promise<MessageResponse> {
  return apiClient<MessageResponse>(`/api/admin/agencies/${agencyId}/billing/credits/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Adjust (remove) credits from an agency entitlement.
 */
export async function adjustAgencyCredits(
  agencyId: number | string,
  data: {
    entitlement_id: number | string
    adjustment: number
    credit_type: 'job' | 'featured' | 'social'
    reason: string
  }
): Promise<MessageResponse> {
  return apiClient<MessageResponse>(
    `/api/admin/agencies/${agencyId}/billing/credits/adjust/`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  )
}

/**
 * Get agency entitlements (credit history).
 */
export async function getAgencyEntitlements(
  agencyId: number | string
): Promise<AdminAgencyEntitlement[]> {
  return apiClient<AdminAgencyEntitlement[]>(
    `/api/admin/agencies/${agencyId}/entitlements/`
  )
}

// =============================================================================
// Feature Overrides
// =============================================================================

/**
 * Toggle team management override for an agency.
 */
export async function toggleAgencyTeamManagement(
  agencyId: number | string,
  enabled: boolean
): Promise<{ team_management_enabled: boolean; message: string }> {
  return apiClient(`/api/admin/agencies/${agencyId}/team-management/`, {
    method: 'POST',
    body: JSON.stringify({ enabled }),
  })
}

export async function getAgencyBilling(agencyId: number | string): Promise<{
  plan: string
  monthly_spend: number
  next_billing_date: string | null
  payment_method: string | null
}> {
  return apiClient(`/api/admin/agencies/${agencyId}/billing/`)
}

export async function getAgencyInvoices(agencyId: number | string): Promise<Invoice[]> {
  const response = await apiClient<PaginatedResponse<Invoice>>(
    `/api/admin/invoices/?agency=${agencyId}`
  )
  return response.results
}

export async function downloadAgencyInvoice(invoiceId: number | string): Promise<Blob> {
  return apiClientBlob(`/api/admin/payments/${invoiceId}/invoice/download/`)
}

export async function regenerateAdminInvoicePdf(invoiceId: number | string): Promise<void> {
  await apiClient(`/api/admin/invoices/${invoiceId}/regenerate/`, {
    method: 'POST',
  })
}

// =============================================================================
// Export
// =============================================================================

/**
 * Export agencies to CSV/Excel.
 */
export async function exportAdminAgencies(
  filters?: AdminAgencyFilters,
  format: 'csv' | 'xlsx' = 'csv'
): Promise<Blob> {
  const params = new URLSearchParams()
  params.set('format', format)

  if (filters?.search) params.set('search', filters.search)
  if (filters?.status && filters.status !== 'all') params.set('status', filters.status)
  if (filters?.risk_level && filters.risk_level !== 'all') params.set('risk_level', filters.risk_level)

  return apiClientBlob(`/api/admin/agencies/export/?${params.toString()}`)
}
