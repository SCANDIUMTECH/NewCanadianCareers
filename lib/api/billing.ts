/**
 * Billing API functions.
 * Endpoints for packages, entitlements, payments, and invoices.
 */

import { apiClient, apiClientBlob } from './client'
import type {
  Package,
  Entitlement,
  EntitlementSummary,
  PaymentMethod,
  Invoice,
  Subscription,
  CheckoutSession,
  CheckoutItem,
  CheckoutSessionResult,
  PaginatedResponse,
} from '@/lib/company/types'

// =============================================================================
// Packages
// =============================================================================

/**
 * Get all available packages.
 */
export async function getPackages(): Promise<Package[]> {
  const response = await apiClient<PaginatedResponse<Package>>('/api/billing/packages/')
  return response.results
}

/**
 * Get a single package by ID.
 */
export async function getPackage(id: number): Promise<Package> {
  return apiClient<Package>(`/api/billing/packages/${id}/`)
}

// =============================================================================
// Entitlements
// =============================================================================

/**
 * Get all entitlements for the current company.
 */
export async function getEntitlements(): Promise<Entitlement[]> {
  const response = await apiClient<PaginatedResponse<Entitlement>>('/api/billing/entitlements/')
  return response.results
}

/**
 * Get entitlement summary (aggregated credits).
 */
export async function getEntitlementSummary(): Promise<EntitlementSummary> {
  return apiClient<EntitlementSummary>('/api/billing/entitlements/summary/')
}

// =============================================================================
// Payment Methods
// =============================================================================

/**
 * Get all payment methods.
 */
export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  const response = await apiClient<PaginatedResponse<PaymentMethod>>('/api/billing/payment-methods/')
  return response.results
}

/**
 * Add a new payment method (returns Stripe setup intent).
 */
export async function createSetupIntent(): Promise<{ client_secret: string }> {
  return apiClient<{ client_secret: string }>('/api/billing/payment-methods/setup/', {
    method: 'POST',
  })
}

/**
 * Confirm a payment method after Stripe setup.
 */
export async function confirmPaymentMethod(paymentMethodId: string): Promise<PaymentMethod> {
  return apiClient<PaymentMethod>('/api/billing/payment-methods/confirm/', {
    method: 'POST',
    body: JSON.stringify({ payment_method_id: paymentMethodId }),
  })
}

/**
 * Set a payment method as default.
 */
export async function setDefaultPaymentMethod(id: string): Promise<PaymentMethod> {
  return apiClient<PaymentMethod>(`/api/billing/payment-methods/${id}/set_default/`, {
    method: 'POST',
  })
}

/**
 * Delete a payment method.
 */
export async function deletePaymentMethod(id: string): Promise<void> {
  await apiClient(`/api/billing/payment-methods/${id}/`, {
    method: 'DELETE',
  })
}

// =============================================================================
// Invoices
// =============================================================================

export interface InvoiceFilters {
  status?: Invoice['status']
  page?: number
  page_size?: number
}

/**
 * Get paginated list of invoices.
 */
export async function getInvoices(filters?: InvoiceFilters): Promise<PaginatedResponse<Invoice>> {
  const params = new URLSearchParams()

  if (filters?.status) params.set('status', filters.status)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))

  const query = params.toString()
  const endpoint = query ? `/api/billing/invoices/?${query}` : '/api/billing/invoices/'

  return apiClient<PaginatedResponse<Invoice>>(endpoint)
}

/**
 * Get a single invoice.
 */
export async function getInvoice(id: string): Promise<Invoice> {
  return apiClient<Invoice>(`/api/billing/invoices/${id}/`)
}

// =============================================================================
// Promo Codes
// =============================================================================

export interface PromoValidation {
  valid: boolean
  source: 'coupon' | 'promo_code'
  code: string
  discount_type: 'percentage' | 'fixed' | 'credits' | 'free_trial'
  discount_value: number
  max_discount_amount?: number | null
  calculated_discount?: number
  message?: string
}

/**
 * Validate a promo/coupon code server-side.
 * Tries marketing coupons first, falls back to legacy promo codes.
 */
export async function validatePromoCode(
  code: string,
  options?: { cart_total?: number; package_ids?: number[] }
): Promise<PromoValidation> {
  const response = await apiClient<Record<string, unknown>>('/api/billing/promo-code/validate/', {
    method: 'POST',
    body: JSON.stringify({
      code,
      cart_total: options?.cart_total,
      package_ids: options?.package_ids,
    }),
  })

  // Normalize both coupon and promo_code responses to PromoValidation shape
  const source = (response.source as string) || 'promo_code'
  return {
    valid: Boolean(response.valid ?? false),
    source: source as 'coupon' | 'promo_code',
    code: (response.code as string) || code,
    discount_type: (response.discount_type as PromoValidation['discount_type']) || 'percentage',
    discount_value: Number(response.discount_value || 0),
    max_discount_amount: response.max_discount_amount != null ? Number(response.max_discount_amount) : null,
    calculated_discount: response.calculated_discount != null ? Number(response.calculated_discount) : undefined,
  }
}

// =============================================================================
// Checkout
// =============================================================================

/**
 * Create a checkout session for purchasing packages or credit packs.
 */
export async function createCheckoutSession(
  items: CheckoutItem[],
  promoCode?: string
): Promise<CheckoutSession> {
  return apiClient<CheckoutSession>('/api/billing/checkout/session/', {
    method: 'POST',
    body: JSON.stringify({ items, promo_code: promoCode || undefined }),
  })
}

/**
 * Get checkout session result after payment completion.
 */
export async function getCheckoutSessionResult(sessionId: string): Promise<CheckoutSessionResult> {
  return apiClient<CheckoutSessionResult>(`/api/billing/checkout/session/${sessionId}/`)
}

// =============================================================================
// Subscription
// =============================================================================

/**
 * Get current subscription.
 */
export async function getSubscription(): Promise<Subscription | null> {
  try {
    return await apiClient<Subscription>('/api/billing/subscription/')
  } catch (error) {
    // 404 means no active subscription
    if ((error as { status?: number }).status === 404) {
      return null
    }
    throw error
  }
}

/**
 * Cancel subscription at end of billing period.
 */
export async function cancelSubscription(): Promise<Subscription> {
  return apiClient<Subscription>('/api/billing/subscription/cancel/', {
    method: 'POST',
  })
}

/**
 * Reactivate a canceled subscription.
 */
export async function reactivateSubscription(): Promise<Subscription> {
  return apiClient<Subscription>('/api/billing/subscription/reactivate/', {
    method: 'POST',
  })
}

/**
 * Download invoice PDF.
 */
export async function downloadInvoicePdf(id: string): Promise<Blob> {
  return apiClientBlob(`/api/billing/invoices/${id}/download/`)
}

/**
 * Regenerate invoice PDF (re-queue PDF generation).
 */
export async function regenerateInvoicePdf(id: string): Promise<void> {
  await apiClient(`/api/billing/invoices/${id}/regenerate/`, {
    method: 'POST',
  })
}

/**
 * Change subscription plan.
 */
export async function changeSubscriptionPlan(packageId: number): Promise<Subscription> {
  return apiClient<Subscription>('/api/billing/subscription/change-plan/', {
    method: 'POST',
    body: JSON.stringify({ package_id: packageId }),
  })
}
