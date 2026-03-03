/**
 * Admin Companies API functions.
 * Endpoints for admin company management, verification, and billing.
 */

import { apiClient, apiClientBlob } from './client'
import type {
  AdminCompany,
  AdminCompanyDetail,
  AdminCompanyEntitlement,
  AdminCompanyStats,
  AdminCompanyFilters,
  CreateCompanyData,
  UpdateCompanyData,
  SuspendCompanyData,
  PaginatedResponse,
  MessageResponse,
} from '@/lib/admin/types'
import type { Invoice } from '@/lib/company/types'

// =============================================================================
// Admin Companies List
// =============================================================================

/**
 * Get paginated list of companies with filters.
 */
export async function getAdminCompanies(
  filters?: AdminCompanyFilters
): Promise<PaginatedResponse<AdminCompany>> {
  const params = new URLSearchParams()

  if (filters?.search) params.set('search', filters.search)
  if (filters?.status && filters.status !== 'all') params.set('status', filters.status)
  if (filters?.billing_status && filters.billing_status !== 'all') params.set('billing_status', filters.billing_status)
  if (filters?.risk_level && filters.risk_level !== 'all') params.set('risk_level', filters.risk_level)
  if (filters?.industry) params.set('industry', filters.industry)
  if (filters?.agency) params.set('agency', filters.agency)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))
  if (filters?.ordering) params.set('ordering', filters.ordering)

  const query = params.toString()
  const endpoint = query ? `/api/admin/companies/?${query}` : '/api/admin/companies/'

  return apiClient<PaginatedResponse<AdminCompany>>(endpoint)
}

/**
 * Get company statistics summary.
 */
export async function getAdminCompanyStats(): Promise<AdminCompanyStats> {
  return apiClient<AdminCompanyStats>('/api/admin/companies/stats/')
}

// =============================================================================
// Single Company CRUD
// =============================================================================

/**
 * Get detailed company information.
 */
export async function getAdminCompany(companyId: number | string): Promise<AdminCompanyDetail> {
  return apiClient<AdminCompanyDetail>(`/api/admin/companies/${companyId}/`)
}

/**
 * Create a new company account.
 */
export async function createAdminCompany(
  data: CreateCompanyData,
  logo?: File
): Promise<AdminCompany> {
  if (logo) {
    const formData = new FormData()
    formData.append('name', data.name)
    if (data.domain) formData.append('domain', data.domain)
    formData.append('contact_email', data.contact_email)
    formData.append('industry', data.industry)
    if (data.size) formData.append('size', data.size)
    if (data.owner_id) formData.append('owner_id', String(data.owner_id))
    if (data.send_invite) formData.append('send_invite', 'true')
    formData.append('logo', logo)

    return apiClient<AdminCompany>('/api/admin/companies/', {
      method: 'POST',
      body: formData,
    })
  }

  return apiClient<AdminCompany>('/api/admin/companies/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Update company information.
 */
export async function updateAdminCompany(
  companyId: number | string,
  data: UpdateCompanyData
): Promise<AdminCompanyDetail> {
  return apiClient<AdminCompanyDetail>(`/api/admin/companies/${companyId}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Delete a company account.
 */
export async function deleteAdminCompany(companyId: number | string): Promise<void> {
  await apiClient(`/api/admin/companies/${companyId}/`, {
    method: 'DELETE',
  })
}

// =============================================================================
// Company Status Management
// =============================================================================

/**
 * Verify a company.
 */
export async function verifyCompany(companyId: number | string): Promise<AdminCompanyDetail> {
  return apiClient<AdminCompanyDetail>(`/api/admin/companies/${companyId}/verify/`, {
    method: 'POST',
  })
}

/**
 * Suspend a company account.
 */
export async function suspendCompany(
  companyId: number | string,
  data: SuspendCompanyData
): Promise<AdminCompanyDetail> {
  return apiClient<AdminCompanyDetail>(`/api/admin/companies/${companyId}/suspend/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Reactivate a suspended company.
 */
export async function reactivateCompany(
  companyId: number | string,
  reason?: string
): Promise<AdminCompanyDetail> {
  return apiClient<AdminCompanyDetail>(`/api/admin/companies/${companyId}/reactivate/`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

/**
 * Update company risk level.
 */
export async function updateCompanyRiskLevel(
  companyId: number | string,
  riskLevel: 'low' | 'medium' | 'high',
  reason?: string
): Promise<AdminCompanyDetail> {
  return apiClient<AdminCompanyDetail>(`/api/admin/companies/${companyId}/risk-level/`, {
    method: 'POST',
    body: JSON.stringify({ risk_level: riskLevel, reason }),
  })
}

// =============================================================================
// Company Billing Management
// =============================================================================

/**
 * Get company billing details.
 */
export async function getCompanyBilling(companyId: number | string): Promise<{
  plan: string
  monthly_spend: number
  next_billing_date: string | null
  payment_method: string | null
}> {
  return apiClient(`/api/admin/companies/${companyId}/billing/`)
}

/**
 * Change company subscription plan.
 */
export async function changeCompanyPlan(
  companyId: number | string,
  data: { plan_id: string; payment_method?: string; notes?: string }
): Promise<MessageResponse> {
  return apiClient<MessageResponse>(`/api/admin/companies/${companyId}/billing/plan/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Add credits to a company account.
 * Supports complimentary (free) and package-based (paid) workflows.
 */
export async function addCompanyCredits(
  companyId: number | string,
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
  return apiClient<MessageResponse>(`/api/admin/companies/${companyId}/billing/credits/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Adjust (remove) credits from a company entitlement.
 */
export async function adjustCompanyCredits(
  companyId: number | string,
  data: {
    entitlement_id: number | string
    adjustment: number
    credit_type: 'job' | 'featured' | 'social'
    reason: string
  }
): Promise<MessageResponse> {
  return apiClient<MessageResponse>(
    `/api/admin/companies/${companyId}/billing/credits/adjust/`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  )
}

/**
 * Get company entitlements (credit history).
 */
export async function getCompanyEntitlements(
  companyId: number | string
): Promise<AdminCompanyEntitlement[]> {
  return apiClient<AdminCompanyEntitlement[]>(
    `/api/admin/companies/${companyId}/entitlements/`
  )
}

// =============================================================================
// Feature Overrides
// =============================================================================

/**
 * Toggle team management override for a company.
 */
export async function toggleTeamManagement(
  companyId: number | string,
  enabled: boolean
): Promise<{ team_management_enabled: boolean; message: string }> {
  return apiClient(`/api/admin/companies/${companyId}/team-management/`, {
    method: 'POST',
    body: JSON.stringify({ enabled }),
  })
}

// =============================================================================
// Company Contact
// =============================================================================

/**
 * Send an email to the company.
 */
export async function contactCompany(
  companyId: number | string,
  data: { subject: string; message: string; template?: string }
): Promise<MessageResponse> {
  return apiClient<MessageResponse>(`/api/admin/companies/${companyId}/contact/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Get company invoices.
 */
export async function getCompanyInvoices(
  companyId: number | string
): Promise<Invoice[]> {
  const response = await apiClient<PaginatedResponse<Invoice>>(
    `/api/admin/invoices/?company=${companyId}`
  )
  return response.results
}

/**
 * Download company invoice PDF.
 */
export async function downloadCompanyInvoice(
  invoiceId: number | string
): Promise<Blob> {
  return apiClientBlob(`/api/admin/payments/${invoiceId}/invoice/download/`)
}

/**
 * Regenerate invoice PDF as admin.
 */
export async function regenerateAdminInvoicePdf(
  invoiceId: number | string
): Promise<void> {
  await apiClient(`/api/admin/invoices/${invoiceId}/regenerate/`, {
    method: 'POST',
  })
}

// =============================================================================
// Export
// =============================================================================

/**
 * Export companies to CSV/Excel.
 */
export async function exportAdminCompanies(
  filters?: AdminCompanyFilters,
  format: 'csv' | 'xlsx' = 'csv'
): Promise<Blob> {
  const params = new URLSearchParams()
  params.set('format', format)

  if (filters?.search) params.set('search', filters.search)
  if (filters?.status && filters.status !== 'all') params.set('status', filters.status)
  if (filters?.risk_level && filters.risk_level !== 'all') params.set('risk_level', filters.risk_level)

  return apiClientBlob(`/api/admin/companies/export/?${params.toString()}`)
}
