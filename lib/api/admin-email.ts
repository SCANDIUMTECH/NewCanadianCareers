/**
 * Admin Email API functions.
 * Endpoints for email providers, triggers, templates, logs, and settings.
 */

import { apiClient, apiClientBlob } from './client'
import type { PaginatedResponse } from '@/lib/admin/types'

// =============================================================================
// Types
// =============================================================================

export type DnsStatus = 'verified' | 'warning' | 'missing'
export type ProviderStatus = 'active' | 'disconnected' | 'error'
export type EmailLogStatus = 'Queued' | 'Sent' | 'Delivered' | 'Bounced' | 'Failed'
export type TemplateStatus = 'Published' | 'Draft' | 'Archived'
export type TemplateType = 'Transactional' | 'Marketing' | 'System'
export type TemplateSubcategory =
  // Transactional
  | 'Authentication' | 'Jobs' | 'Applications' | 'Billing' | 'Alerts'
  // Marketing
  | 'Campaign' | 'Promotional' | 'Newsletter' | 'Coupon' | 'Announcement'
  // System
  | 'Default' | 'Internal'
export type SuggestionType = 'warning' | 'error' | 'info'
export type ResendDomainRegion = 'us-east-1' | 'eu-west-1' | 'sa-east-1' | 'ap-northeast-1'
export type ResendTlsMode = 'enforced' | 'opportunistic'

export interface EmailProvider {
  id: string
  name: string
  logo: string
  connected: boolean
  apiKey: string  // masked
  status: ProviderStatus
  lastSync: string | null
  spf: DnsStatus
  dkim: DnsStatus
  dmarc: DnsStatus
  webhookEnabled: boolean
  rateLimit: string
  region: string
  sendingDomain: string
  webhookSecret: string   // masked, per-provider
  webhookUrl: string      // per-provider
  smtpHost: string
  smtpPort: number
  smtpUsername: string    // masked
  smtpUseTls: boolean
  smtpUseSsl: boolean
}

export interface EmailTrigger {
  id: number
  name: string
  category: string
  eventKey: string
  status: boolean
  audience: string
  provider: string
  template: string
  lastUpdated: string
  lastSent: string | null
  sends7d: number
  errors7d: number
}

export interface EmailTemplate {
  id: number
  name: string
  slug: string
  type: TemplateType
  subcategory: TemplateSubcategory | null
  lastUpdated: string
  usedBy: number
  status: TemplateStatus
}

export interface EmailTemplateDetail extends EmailTemplate {
  html: string
  subject: string
  preheader: string
  variables: string[]
  version: number
  createdAt: string
}

export interface EmailTemplateVersion {
  id: number
  version: number
  html: string
  subject: string
  preheader: string
  savedAt: string
  savedBy: string
}

export interface EmailLog {
  id: number
  timestamp: string
  recipient: string
  trigger: string
  template: string
  provider: string
  status: EmailLogStatus
  errorCode: string | null
  traceId: string
  userId: number | null
  userName: string | null
}

export interface SmartSuggestion {
  type: SuggestionType
  title: string
  description: string
  action: string
}

export interface EmailSettings {
  defaultFromName: string
  defaultFromEmail: string
  replyToAddress: string
  sendingDomain: string
  unsubscribeText: string
  includeUnsubscribe: boolean
  maxEmailsPerSecond: number
  maxEmailsPerMinute: number
  maxRetries: number
  initialBackoff: number
  backoffMultiplier: number
  productionMode: boolean
  killSwitchEnabled: boolean
  logRetentionDays: number
  complianceRetentionDays: number
  lastCleanupAt: string | null
  lastCleanupCount: number
}

export interface EmailOverviewStats {
  providerStatus: {
    name: string
    status: ProviderStatus
    lastSync: string | null
  }
  deliverability: {
    deliveryRate: number
    bounceRate: number
    complaintRate: number
  }
  volume: {
    last24h: number
    last7d: number
    last30d: number
  }
  topTriggers: Array<{
    name: string
    count: number
  }>
}

// =============================================================================
// Filter Types
// =============================================================================

export interface TriggerFilters {
  status?: 'enabled' | 'disabled'
  category?: string
  audience?: string
  search?: string
  ordering?: string
  page?: number
  page_size?: number
}

export interface CreateTriggerPayload {
  name: string
  eventKey: string
  category: string
  audience: string
  status: boolean
  provider_id?: string | null
  template_id?: number | null
}

export interface UpdateTriggerPayload {
  name?: string
  category?: string
  audience?: string
  status?: boolean
  provider_id?: string | null
  template_id?: number | null
}

export interface LogFilters {
  status?: EmailLogStatus
  provider?: string
  search?: string
  start_date?: string
  end_date?: string
  page?: number
  page_size?: number
}

// =============================================================================
// Provider API
// =============================================================================

/**
 * Get all email providers.
 */
export async function getEmailProviders(): Promise<EmailProvider[]> {
  return apiClient<EmailProvider[]>('/api/admin/email/providers/')
}

/**
 * Connect a provider with API key.
 */
export async function connectProvider(
  id: string,
  config: {
    apiKey?: string; sendingDomain?: string;
    webhookSecret?: string; webhookUrl?: string;
    smtpHost?: string; smtpPort?: number;
    smtpUsername?: string; smtpPassword?: string;
    smtpUseTls?: boolean; smtpUseSsl?: boolean;
  }
): Promise<EmailProvider> {
  return apiClient<EmailProvider>(`/api/admin/email/providers/${id}/connect/`, {
    method: 'POST',
    body: JSON.stringify(config),
  })
}

/**
 * Disconnect a provider.
 */
export async function disconnectProvider(id: string): Promise<void> {
  await apiClient(`/api/admin/email/providers/${id}/disconnect/`, {
    method: 'POST',
  })
}

/**
 * Test provider connection.
 */
export async function testProvider(
  id: string,
  options: { templateSlug?: string; recipientEmail: string }
): Promise<{ success: boolean; message: string }> {
  return apiClient<{ success: boolean; message: string }>(
    `/api/admin/email/providers/${id}/test/`,
    {
      method: 'POST',
      body: JSON.stringify(options),
    }
  )
}

/**
 * Set active provider.
 */
export async function setActiveProvider(id: string): Promise<void> {
  await apiClient(`/api/admin/email/providers/${id}/set-active/`, {
    method: 'POST',
  })
}

// =============================================================================
// Trigger API
// =============================================================================

/**
 * Get paginated list of email triggers.
 */
export async function getEmailTriggers(
  filters?: TriggerFilters
): Promise<PaginatedResponse<EmailTrigger>> {
  const params = new URLSearchParams()

  if (filters?.status) params.set('status', filters.status)
  if (filters?.category) params.set('category', filters.category)
  if (filters?.audience) params.set('audience', filters.audience)
  if (filters?.search) params.set('search', filters.search)
  if (filters?.ordering) params.set('ordering', filters.ordering)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))

  const query = params.toString()
  const endpoint = query
    ? `/api/admin/email/triggers/?${query}`
    : '/api/admin/email/triggers/'

  return apiClient<PaginatedResponse<EmailTrigger>>(endpoint)
}

/**
 * Get a single trigger by ID.
 */
export async function getEmailTrigger(id: number): Promise<EmailTrigger> {
  return apiClient<EmailTrigger>(`/api/admin/email/triggers/${id}/`)
}

/**
 * Update a trigger.
 */
export async function updateTrigger(
  id: number,
  data: UpdateTriggerPayload
): Promise<EmailTrigger> {
  return apiClient<EmailTrigger>(`/api/admin/email/triggers/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Send a test email for a trigger using its linked template and provider.
 */
export async function testTrigger(
  id: number,
  recipientEmail: string
): Promise<{ success: boolean; message: string }> {
  return apiClient<{ success: boolean; message: string }>(
    `/api/admin/email/triggers/${id}/test/`,
    {
      method: 'POST',
      body: JSON.stringify({ recipientEmail }),
    }
  )
}

/**
 * Toggle trigger enabled/disabled.
 */
export async function toggleTrigger(
  id: number,
  enabled: boolean
): Promise<EmailTrigger> {
  return apiClient<EmailTrigger>(`/api/admin/email/triggers/${id}/toggle/`, {
    method: 'POST',
    body: JSON.stringify({ enabled }),
  })
}

/**
 * Bulk update triggers.
 */
export async function bulkUpdateTriggers(
  ids: number[],
  action: 'enable' | 'disable' | 'move_category' | 'assign_template',
  data?: { category?: string; template?: string }
): Promise<{ updated: number }> {
  return apiClient<{ updated: number }>('/api/admin/email/triggers/bulk/', {
    method: 'POST',
    body: JSON.stringify({ ids, action, ...data }),
  })
}

/**
 * Create a new trigger.
 */
export async function createTrigger(
  data: CreateTriggerPayload
): Promise<EmailTrigger> {
  return apiClient<EmailTrigger>('/api/admin/email/triggers/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// =============================================================================
// Template API
// =============================================================================

/**
 * Get all email templates.
 */
export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const response = await apiClient<PaginatedResponse<EmailTemplate>>(
    '/api/admin/email/templates/'
  )
  return response.results
}

/**
 * Get a single template with full details.
 */
export async function getEmailTemplate(id: number): Promise<EmailTemplateDetail> {
  return apiClient<EmailTemplateDetail>(`/api/admin/email/templates/${id}/`)
}

/**
 * Create a new template.
 */
export async function createEmailTemplate(
  data: Omit<EmailTemplateDetail, 'id' | 'lastUpdated' | 'usedBy'>
): Promise<EmailTemplate> {
  return apiClient<EmailTemplate>('/api/admin/email/templates/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Update a template.
 */
export async function updateEmailTemplate(
  id: number,
  data: Partial<Omit<EmailTemplateDetail, 'id' | 'lastUpdated' | 'usedBy'>>
): Promise<EmailTemplate> {
  return apiClient<EmailTemplate>(`/api/admin/email/templates/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Delete a template.
 */
export async function deleteEmailTemplate(id: number): Promise<void> {
  await apiClient(`/api/admin/email/templates/${id}/`, {
    method: 'DELETE',
  })
}

/**
 * Duplicate a template.
 */
export async function duplicateEmailTemplate(id: number): Promise<EmailTemplate> {
  return apiClient<EmailTemplate>(`/api/admin/email/templates/${id}/duplicate/`, {
    method: 'POST',
  })
}

/**
 * Publish a template.
 */
export async function publishEmailTemplate(id: number): Promise<EmailTemplate> {
  return apiClient<EmailTemplate>(`/api/admin/email/templates/${id}/publish/`, {
    method: 'POST',
  })
}

/**
 * Unpublish a template (revert Published → Draft).
 */
export async function unpublishEmailTemplate(id: number): Promise<EmailTemplate> {
  return apiClient<EmailTemplate>(`/api/admin/email/templates/${id}/unpublish/`, {
    method: 'POST',
  })
}

/**
 * Archive a template (removes from active use).
 */
export async function archiveEmailTemplate(id: number): Promise<EmailTemplate> {
  return apiClient<EmailTemplate>(`/api/admin/email/templates/${id}/archive/`, {
    method: 'POST',
  })
}

/**
 * Get version history for a template.
 */
export async function getEmailTemplateVersions(
  id: number
): Promise<EmailTemplateVersion[]> {
  return apiClient<EmailTemplateVersion[]>(
    `/api/admin/email/templates/${id}/versions/`
  )
}

/**
 * Get templates with filtering support.
 */
export interface TemplateFilters {
  type?: TemplateType
  subcategory?: TemplateSubcategory
  status?: TemplateStatus
  search?: string
  page?: number
  page_size?: number
}

export async function getEmailTemplatesFiltered(
  filters?: TemplateFilters
): Promise<PaginatedResponse<EmailTemplate>> {
  const params = new URLSearchParams()
  if (filters?.type) params.set('type', filters.type)
  if (filters?.subcategory) params.set('subcategory', filters.subcategory)
  if (filters?.status) params.set('status', filters.status)
  if (filters?.search) params.set('search', filters.search)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))
  const query = params.toString()
  return apiClient<PaginatedResponse<EmailTemplate>>(
    query ? `/api/admin/email/templates/?${query}` : '/api/admin/email/templates/'
  )
}

// =============================================================================
// Log API
// =============================================================================

/**
 * Get paginated list of email logs.
 */
export async function getEmailLogs(
  filters?: LogFilters
): Promise<PaginatedResponse<EmailLog>> {
  const params = new URLSearchParams()

  if (filters?.status) params.set('status', filters.status)
  if (filters?.provider) params.set('provider', filters.provider)
  if (filters?.search) params.set('search', filters.search)
  if (filters?.start_date) params.set('start_date', filters.start_date)
  if (filters?.end_date) params.set('end_date', filters.end_date)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))

  const query = params.toString()
  const endpoint = query
    ? `/api/admin/email/logs/?${query}`
    : '/api/admin/email/logs/'

  return apiClient<PaginatedResponse<EmailLog>>(endpoint)
}

/**
 * Get a single log entry.
 */
export async function getEmailLog(id: number): Promise<EmailLog & {
  payload: Record<string, unknown>
  renderedHtml: string
  providerResponse: Record<string, unknown>
}> {
  return apiClient(`/api/admin/email/logs/${id}/`)
}

/**
 * Resend a failed email.
 */
export async function resendEmail(logId: number): Promise<{ success: boolean; message: string }> {
  return apiClient<{ success: boolean; message: string }>(
    `/api/admin/email/logs/${logId}/resend/`,
    {
      method: 'POST',
    }
  )
}

/**
 * Export email logs as CSV or JSON.
 */
export async function exportEmailLogs(filters?: LogFilters, format: 'csv' | 'json' = 'csv'): Promise<Blob> {
  const params = new URLSearchParams()
  params.set('export_format', format)
  if (filters?.status) params.set('status', filters.status)
  if (filters?.provider) params.set('provider', filters.provider)
  if (filters?.search) params.set('search', filters.search)
  if (filters?.start_date) params.set('start_date', filters.start_date)
  if (filters?.end_date) params.set('end_date', filters.end_date)
  return apiClientBlob(`/api/admin/email/logs/export/?${params.toString()}`)
}

// =============================================================================
// Suggestions API
// =============================================================================

/**
 * Get smart suggestions for email configuration.
 */
export async function getSmartSuggestions(): Promise<SmartSuggestion[]> {
  return apiClient<SmartSuggestion[]>('/api/admin/email/suggestions/')
}

/**
 * Dismiss a suggestion.
 */
export async function dismissSuggestion(
  suggestionId: string
): Promise<void> {
  await apiClient(`/api/admin/email/suggestions/${suggestionId}/dismiss/`, {
    method: 'POST',
  })
}

// =============================================================================
// Settings API
// =============================================================================

/**
 * Get email settings.
 */
export async function getEmailSettings(): Promise<EmailSettings> {
  return apiClient<EmailSettings>('/api/admin/email/settings/')
}

/**
 * Update email settings.
 */
export async function updateEmailSettings(
  data: Partial<EmailSettings>
): Promise<EmailSettings> {
  return apiClient<EmailSettings>('/api/admin/email/settings/', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Toggle kill switch (disable/enable all emails).
 */
export async function toggleKillSwitch(enabled: boolean): Promise<{ killSwitchEnabled: boolean }> {
  return apiClient<{ killSwitchEnabled: boolean }>(
    '/api/admin/email/settings/kill-switch/',
    {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    }
  )
}

/**
 * Rotate API keys for all providers.
 */
export async function rotateApiKeys(): Promise<{ rotated: string[] }> {
  return apiClient<{ rotated: string[] }>('/api/admin/email/settings/rotate-keys/', {
    method: 'POST',
  })
}

// =============================================================================
// Overview API
// =============================================================================

/**
 * Get email overview stats for dashboard.
 */
export async function getEmailOverviewStats(): Promise<EmailOverviewStats> {
  return apiClient<EmailOverviewStats>('/api/admin/email/overview/')
}

/**
 * Get trigger categories.
 */
export async function getTriggerCategories(): Promise<string[]> {
  return apiClient<string[]>('/api/admin/email/triggers/categories/')
}

/**
 * Get audience types.
 */
export async function getAudienceTypes(): Promise<string[]> {
  return apiClient<string[]>('/api/admin/email/triggers/audiences/')
}

/**
 * Known event key with metadata and availability.
 */
export interface EventKeyInfo {
  event_key: string
  name: string
  category: string
  audience: string
  in_use: boolean
}

/**
 * Get known event keys with availability info.
 */
export async function getEventKeys(): Promise<EventKeyInfo[]> {
  return apiClient<EventKeyInfo[]>('/api/admin/email/triggers/event-keys/')
}

// =============================================================================
// Resend SDK v2 — Domain Management Types
// =============================================================================

export interface ResendDnsRecord {
  record: string
  name: string
  type: string
  ttl: string
  status: string
  value: string
  priority?: number
}

export interface ResendDomain {
  id: string
  name: string
  status: string
  created_at: string
  region: ResendDomainRegion
  records?: ResendDnsRecord[]
}

export interface ResendApiKey {
  id: string
  name: string
  created_at: string
}

export interface ResendAudience {
  id: string
  name: string
  created_at: string
}

export interface ResendContact {
  id: string
  email: string
  first_name?: string
  last_name?: string
  unsubscribed: boolean
  created_at: string
}

// =============================================================================
// Resend SDK v2 — Domain Management API
// =============================================================================

/**
 * List all sending domains from Resend.
 */
export async function listResendDomains(): Promise<{ data: ResendDomain[] }> {
  return apiClient<{ data: ResendDomain[] }>('/api/admin/email/domains/')
}

/**
 * Create a new sending domain in Resend.
 */
export async function createResendDomain(
  name: string,
  region: ResendDomainRegion = 'us-east-1'
): Promise<ResendDomain> {
  return apiClient<ResendDomain>('/api/admin/email/domains/create/', {
    method: 'POST',
    body: JSON.stringify({ name, region }),
  })
}

/**
 * Get domain details including DNS records.
 */
export async function getResendDomain(domainId: string): Promise<ResendDomain> {
  return apiClient<ResendDomain>(`/api/admin/email/domains/${domainId}/`)
}

/**
 * Delete a sending domain.
 */
export async function deleteResendDomain(domainId: string): Promise<void> {
  await apiClient(`/api/admin/email/domains/${domainId}/`, {
    method: 'DELETE',
  })
}

/**
 * Trigger DNS verification for a domain.
 */
export async function verifyResendDomain(
  domainId: string
): Promise<{ success: boolean; result: unknown }> {
  return apiClient<{ success: boolean; result: unknown }>(
    `/api/admin/email/domains/${domainId}/verify/`,
    { method: 'POST' }
  )
}

/**
 * Update domain tracking and TLS settings.
 */
export async function updateResendDomain(
  domainId: string,
  settings: {
    open_tracking?: boolean
    click_tracking?: boolean
    tls?: ResendTlsMode
  }
): Promise<{ success: boolean; result: unknown }> {
  return apiClient<{ success: boolean; result: unknown }>(
    `/api/admin/email/domains/${domainId}/update/`,
    {
      method: 'PATCH',
      body: JSON.stringify(settings),
    }
  )
}

/**
 * Sync DNS verification status from Resend for a provider.
 */
export async function syncProviderDns(
  providerId: string
): Promise<{ provider: EmailProvider; dnsRecords: ResendDnsRecord[] }> {
  return apiClient<{ provider: EmailProvider; dnsRecords: ResendDnsRecord[] }>(
    `/api/admin/email/providers/${providerId}/sync-dns/`,
    { method: 'POST' }
  )
}

// =============================================================================
// Resend SDK v2 — API Key Management
// =============================================================================

/**
 * List all API keys in the Resend account.
 */
export async function listResendApiKeys(): Promise<{ data: ResendApiKey[] }> {
  return apiClient<{ data: ResendApiKey[] }>('/api/admin/email/api-keys/')
}

/**
 * Create a new API key in Resend.
 */
export async function createResendApiKey(
  name: string,
  permission: 'full_access' | 'sending_access' = 'full_access',
  domainId?: string
): Promise<ResendApiKey & { token: string }> {
  return apiClient<ResendApiKey & { token: string }>('/api/admin/email/api-keys/', {
    method: 'POST',
    body: JSON.stringify({ name, permission, domain_id: domainId }),
  })
}

/**
 * Delete an API key from Resend.
 */
export async function deleteResendApiKey(keyId: string): Promise<void> {
  await apiClient(`/api/admin/email/api-keys/${keyId}/`, {
    method: 'DELETE',
  })
}

// =============================================================================
// Resend SDK v2 — Email Log Extended Actions
// =============================================================================

/**
 * Refresh email status from Resend (uses Emails.get()).
 */
export async function refreshEmailStatus(
  logId: number
): Promise<{ status: string; lastEvent: string; email: Record<string, unknown> }> {
  return apiClient<{ status: string; lastEvent: string; email: Record<string, unknown> }>(
    `/api/admin/email/logs/${logId}/refresh-status/`,
    { method: 'POST' }
  )
}

/**
 * Cancel a scheduled email (uses Emails.cancel()).
 */
export async function cancelScheduledEmail(
  logId: number
): Promise<{ success: boolean; message: string }> {
  return apiClient<{ success: boolean; message: string }>(
    `/api/admin/email/logs/${logId}/cancel/`,
    { method: 'POST' }
  )
}
