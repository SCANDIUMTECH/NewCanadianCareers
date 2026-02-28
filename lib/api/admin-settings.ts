/**
 * Admin Platform Settings API functions.
 * Endpoints for the singleton platform settings (general, billing, integrations, security).
 * Note: Job posting policies are managed separately via /api/admin/jobs/policy/.
 */

import { apiClient } from './client'

// =============================================================================
// Types
// =============================================================================

export interface PlatformSettings {
  // General
  platform_name: string
  platform_description: string
  support_email: string
  timezone: string
  maintenance_mode: boolean
  maintenance_message: string

  // Billing
  billing_provider: string
  billing_default_currency: string
  billing_invoice_prefix: string
  billing_company_name: string
  billing_company_address: string

  // Integrations
  integration_google_analytics_id: string
  integration_mixpanel_token: string

  // Cloudflare Turnstile
  turnstile_site_key: string
  turnstile_secret_key: string
  turnstile_enabled: boolean
  turnstile_protect_auth: boolean
  turnstile_protect_jobs: boolean
  turnstile_protect_applications: boolean

  // Slack Integration (master toggle — OAuth config is separate)
  slack_enabled: boolean

  // Legacy webhook fields (kept for backward compat, not used by new UI)
  slack_webhook_default: string
  slack_webhook_security: string
  slack_webhook_moderation: string
  slack_webhook_billing: string
  slack_webhook_jobs: string
  slack_webhook_system: string

  // Marketing
  marketing_require_approval: boolean
  marketing_max_emails_per_day: number
  marketing_frequency_cap_days: number
  marketing_double_opt_in: boolean
  marketing_auto_suppress_bounces: boolean
  marketing_auto_suppress_complaints: boolean
  marketing_coupon_default_expiry_days: number
  marketing_coupon_max_per_customer: number

  // Security
  require_2fa: boolean
  session_timeout_minutes: number
  max_login_attempts: number
  enable_ip_allowlist: boolean
  ip_allowlist: string

  // Jobs
  job_default_duration_days?: number

  // Meta
  updated_at: string
}

export type UpdatePlatformSettingsData = Partial<Omit<PlatformSettings, 'updated_at'>>

// Slack OAuth types
export interface SlackInstallation {
  is_active: boolean
  team_id: string
  team_name: string
  bot_user_id: string
  installed_at: string | null
  installed_by: string | null
  client_id_set: boolean
  client_secret_set: boolean
  channel_default: string
  channel_security: string
  channel_moderation: string
  channel_billing: string
  channel_jobs: string
  channel_system: string
}

export interface SlackChannelInfo {
  id: string
  name: string
  is_private: boolean
}

// =============================================================================
// Platform Settings API Functions
// =============================================================================

/**
 * Get current platform settings. Auto-creates with defaults if none exist.
 */
export async function getPlatformSettings(): Promise<PlatformSettings> {
  return apiClient<PlatformSettings>('/api/admin/settings/platform/')
}

/**
 * Update platform settings (partial update).
 */
export async function updatePlatformSettings(
  data: UpdatePlatformSettingsData
): Promise<PlatformSettings> {
  return apiClient<PlatformSettings>('/api/admin/settings/platform/', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

// =============================================================================
// Slack OAuth API Functions
// =============================================================================

/**
 * Get the Slack OAuth authorization URL and CSRF state token.
 */
export async function getSlackOAuthUrl(): Promise<{ url: string; state: string }> {
  return apiClient<{ url: string; state: string }>('/api/admin/settings/slack/oauth/begin/')
}

/**
 * Complete Slack OAuth by exchanging the authorization code for a bot token.
 */
export async function completeSlackOAuth(
  code: string,
  state: string
): Promise<{ connected: boolean; team_name: string; team_id: string }> {
  return apiClient<{ connected: boolean; team_name: string; team_id: string }>(
    '/api/admin/settings/slack/oauth/callback/',
    {
      method: 'POST',
      body: JSON.stringify({ code, state }),
    }
  )
}

/**
 * Get the current Slack installation status and channel mappings.
 */
export async function getSlackInstallation(): Promise<SlackInstallation> {
  return apiClient<SlackInstallation>('/api/admin/settings/slack/installation/')
}

/**
 * Update Slack App credentials (client_id, client_secret).
 */
export async function updateSlackCredentials(
  data: { client_id?: string; client_secret?: string }
): Promise<{ client_id_set: boolean; client_secret_set: boolean }> {
  return apiClient<{ client_id_set: boolean; client_secret_set: boolean }>(
    '/api/admin/settings/slack/installation/',
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    }
  )
}

/**
 * List available Slack channels from the connected workspace.
 */
export async function getSlackChannels(): Promise<{ channels: SlackChannelInfo[] }> {
  return apiClient<{ channels: SlackChannelInfo[] }>('/api/admin/settings/slack/channels/')
}

/**
 * Update Slack channel mappings for notification categories.
 */
export async function updateSlackChannels(
  channels: Partial<Pick<SlackInstallation, 'channel_default' | 'channel_security' | 'channel_moderation' | 'channel_billing' | 'channel_jobs' | 'channel_system'>>
): Promise<Pick<SlackInstallation, 'channel_default' | 'channel_security' | 'channel_moderation' | 'channel_billing' | 'channel_jobs' | 'channel_system'>> {
  return apiClient(
    '/api/admin/settings/slack/channels/',
    {
      method: 'PATCH',
      body: JSON.stringify(channels),
    }
  )
}

/**
 * Disconnect the Slack workspace.
 */
export async function disconnectSlack(): Promise<{ disconnected: boolean }> {
  return apiClient<{ disconnected: boolean }>(
    '/api/admin/settings/slack/disconnect/',
    { method: 'POST' }
  )
}

/**
 * Test a Slack notification by sending a test message to a specific channel.
 */
export async function testSlackNotification(
  channel: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  return apiClient<{ success: boolean; message?: string; error?: string }>(
    '/api/admin/settings/slack/test/',
    {
      method: 'POST',
      body: JSON.stringify({ channel }),
    }
  )
}

// =============================================================================
// Stripe Settings API Functions
// =============================================================================

export interface StripeSettings {
  publishable_key: string
  publishable_key_source: 'database' | 'environment' | 'none'
  secret_key: string
  secret_key_source: 'database' | 'environment' | 'none'
  webhook_secret: string
  webhook_secret_source: 'database' | 'environment' | 'none'
  mode: 'test' | 'live' | 'unconfigured' | 'unknown'
  connected: boolean
  account_name: string
  connection_error: string
  webhook_url: string
}

export interface StripeTestResult {
  connected: boolean
  mode: string
  account_name: string
  error: string
}

/**
 * Get current Stripe settings (masked keys, mode, connectivity).
 */
export async function getStripeSettings(): Promise<StripeSettings> {
  return apiClient<StripeSettings>('/api/admin/settings/stripe/')
}

/**
 * Update Stripe API keys. Keys are encrypted at rest.
 */
export async function updateStripeKeys(
  data: { publishable_key?: string; secret_key?: string; webhook_secret?: string }
): Promise<{ message: string }> {
  return apiClient<{ message: string }>('/api/admin/settings/stripe/', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Test Stripe API connectivity with current or provided keys.
 */
export async function testStripeConnection(
  secretKey?: string
): Promise<StripeTestResult> {
  return apiClient<StripeTestResult>('/api/admin/settings/stripe/test/', {
    method: 'POST',
    body: JSON.stringify(secretKey ? { secret_key: secretKey } : {}),
  })
}

/**
 * Get the Stripe publishable key (public endpoint, no auth).
 */
export async function getStripePublishableKey(): Promise<{ publishable_key: string; mode: string }> {
  return apiClient<{ publishable_key: string; mode: string }>('/api/settings/stripe/publishable-key/')
}
