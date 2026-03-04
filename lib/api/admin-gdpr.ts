import { apiClient } from './client'
import type {
  AdminAuditLogEntry,
  ConsentHistoryEntry,
  ConsentLogEntry,
  DataBreachEntry,
  DataRequest,
  GDPRAdminSettings,
  GDPRAnalytics,
  PaginatedResponse,
  ProcessingActivityEntry,
  Service,
  ServiceCategory,
  UserConsentEntry,
} from '@/lib/gdpr/types'

// ─── Settings ───────────────────────────────────────────────────────────────

export async function getGDPRSettings(): Promise<GDPRAdminSettings> {
  return apiClient('/api/gdpr/admin/settings/')
}

export async function updateGDPRSettings(
  data: Partial<GDPRAdminSettings>
): Promise<GDPRAdminSettings> {
  return apiClient('/api/gdpr/admin/settings/', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

// ─── Service Categories ─────────────────────────────────────────────────────

export async function getServiceCategories(): Promise<ServiceCategory[]> {
  const res = await apiClient<PaginatedResponse<ServiceCategory> | ServiceCategory[]>('/api/gdpr/admin/categories/')
  return Array.isArray(res) ? res : res.results
}

export async function createServiceCategory(
  data: Partial<ServiceCategory>
): Promise<ServiceCategory> {
  return apiClient('/api/gdpr/admin/categories/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateServiceCategory(
  id: number,
  data: Partial<ServiceCategory>
): Promise<ServiceCategory> {
  return apiClient(`/api/gdpr/admin/categories/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteServiceCategory(id: number): Promise<void> {
  return apiClient(`/api/gdpr/admin/categories/${id}/`, {
    method: 'DELETE',
  })
}

// ─── Services ───────────────────────────────────────────────────────────────

export async function getServices(): Promise<Service[]> {
  const res = await apiClient<PaginatedResponse<Service> | Service[]>('/api/gdpr/admin/services/')
  return Array.isArray(res) ? res : res.results
}

export async function createService(data: Partial<Service>): Promise<Service> {
  return apiClient('/api/gdpr/admin/services/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateService(
  id: number,
  data: Partial<Service>
): Promise<Service> {
  return apiClient(`/api/gdpr/admin/services/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteService(id: number): Promise<void> {
  return apiClient(`/api/gdpr/admin/services/${id}/`, {
    method: 'DELETE',
  })
}

// ─── Consent Logs ───────────────────────────────────────────────────────────

export async function getConsentLogs(
  params?: string
): Promise<PaginatedResponse<ConsentLogEntry>> {
  const query = params ? `?${params}` : ''
  return apiClient(`/api/gdpr/admin/consent-logs/${query}`)
}

// ─── User Consents ──────────────────────────────────────────────────────────

export async function getUserConsents(
  params?: string
): Promise<PaginatedResponse<UserConsentEntry>> {
  const query = params ? `?${params}` : ''
  return apiClient(`/api/gdpr/admin/user-consents/${query}`)
}

// ─── Consent History ────────────────────────────────────────────────────────

export async function getConsentHistory(
  params?: string
): Promise<PaginatedResponse<ConsentHistoryEntry>> {
  const query = params ? `?${params}` : ''
  return apiClient(`/api/gdpr/admin/consent-history/${query}`)
}

// ─── Data Requests ──────────────────────────────────────────────────────────

export async function getDataRequests(
  params?: string
): Promise<PaginatedResponse<DataRequest>> {
  const query = params ? `?${params}` : ''
  return apiClient(`/api/gdpr/admin/requests/${query}`)
}

export async function getDataRequest(id: string): Promise<DataRequest> {
  return apiClient(`/api/gdpr/admin/requests/${id}/`)
}

export async function processDataRequestAction(
  id: string,
  action: string
): Promise<DataRequest> {
  return apiClient(`/api/gdpr/admin/requests/${id}/action/`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  })
}

export async function extendDataRequestDeadline(
  id: string,
  days: number,
  reason: string
): Promise<DataRequest> {
  return apiClient(`/api/gdpr/admin/requests/${id}/extend-deadline/`, {
    method: 'POST',
    body: JSON.stringify({ days, reason }),
  })
}

// ─── Data Breaches ──────────────────────────────────────────────────────────

export async function getDataBreaches(
  params?: string
): Promise<PaginatedResponse<DataBreachEntry>> {
  const query = params ? `?${params}` : ''
  return apiClient(`/api/gdpr/admin/data-breaches/${query}`)
}

export async function createDataBreach(
  data: Partial<DataBreachEntry>
): Promise<DataBreachEntry> {
  return apiClient('/api/gdpr/admin/data-breaches/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateDataBreach(
  id: string,
  data: Partial<DataBreachEntry>
): Promise<DataBreachEntry> {
  return apiClient(`/api/gdpr/admin/data-breaches/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteDataBreach(id: string): Promise<void> {
  return apiClient(`/api/gdpr/admin/data-breaches/${id}/`, {
    method: 'DELETE',
  })
}

export async function sendBreachNotification(
  breachId?: string
): Promise<{ status: string; count: number }> {
  return apiClient('/api/gdpr/admin/data-breaches/notify/', {
    method: 'POST',
    body: JSON.stringify(breachId ? { breach_id: breachId } : {}),
  })
}

// ─── Policy Update ──────────────────────────────────────────────────────────

export async function sendPolicyUpdateNotification(): Promise<{
  status: string
  count: number
}> {
  return apiClient('/api/gdpr/admin/policy-update/notify/', {
    method: 'POST',
  })
}

// ─── Processing Activities (RoPA) ───────────────────────────────────────────

export async function getProcessingActivities(
  params?: string
): Promise<PaginatedResponse<ProcessingActivityEntry>> {
  const query = params ? `?${params}` : ''
  return apiClient(`/api/gdpr/admin/processing-activities/${query}`)
}

export async function createProcessingActivity(
  data: Partial<ProcessingActivityEntry>
): Promise<ProcessingActivityEntry> {
  return apiClient('/api/gdpr/admin/processing-activities/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateProcessingActivity(
  id: number,
  data: Partial<ProcessingActivityEntry>
): Promise<ProcessingActivityEntry> {
  return apiClient(`/api/gdpr/admin/processing-activities/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteProcessingActivity(id: number): Promise<void> {
  return apiClient(`/api/gdpr/admin/processing-activities/${id}/`, {
    method: 'DELETE',
  })
}

// ─── Admin Audit Logs ───────────────────────────────────────────────────────

export async function getAuditLogs(
  params?: string
): Promise<PaginatedResponse<AdminAuditLogEntry>> {
  const query = params ? `?${params}` : ''
  return apiClient(`/api/gdpr/admin/audit-logs/${query}`)
}

// ─── Consent Analytics ─────────────────────────────────────────────────────

export async function getGDPRAnalytics(): Promise<GDPRAnalytics> {
  return apiClient('/api/gdpr/admin/analytics/')
}
