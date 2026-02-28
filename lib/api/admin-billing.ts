/**
 * Admin Billing API functions.
 * Endpoints for admin-specific billing operations.
 */

import { apiClient } from './client'

// =============================================================================
// Types
// =============================================================================

export interface AdminPaymentMethod {
  value: string
  label: string
  workflow_type: 'complimentary' | 'package'
  requires_package: boolean
  invoice_status: 'paid' | 'open'
}

export interface AddCreditsPayload {
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

// =============================================================================
// API Functions
// =============================================================================

/**
 * Get available payment methods for admin credit grants.
 */
export async function getAdminPaymentMethods(): Promise<AdminPaymentMethod[]> {
  return apiClient<AdminPaymentMethod[]>('/api/admin/billing/payment-methods/')
}
