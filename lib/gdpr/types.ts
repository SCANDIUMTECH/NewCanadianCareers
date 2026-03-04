// ─── Service & Category Types ───────────────────────────────────────────────

export interface ServiceCategory {
  id: number
  name: string
  slug: string
  description: string
  order: number
}

export interface Service {
  id: number
  name: string
  slug: string
  description: string
  category: number
  category_name: string
  category_slug: string
  is_deactivatable: boolean
  default_enabled: boolean
  legal_basis: string
  cookies: string
  head_script: string
  body_script: string
  is_analytics: boolean
  is_advertising: boolean
  is_active: boolean
}

export interface ServiceConsentState {
  allowed: boolean
  name: string
  category: string
  cookies?: string[]
  head_script?: string
  body_script?: string
}

// ─── Settings ───────────────────────────────────────────────────────────────

export interface GDPRPublicSettings {
  is_enabled: boolean
  cookie_lifetime_days: number
  cookie_domain: string
  consent_mode_v2: boolean
  consent_version: string
  consent_expiry_days: number
  privacy_policy_url: string
  popup_enabled: boolean
  popup_text: string
  popup_agree_text: string
  popup_decline_text: string
  popup_preferences_text: string
  popup_style: "full_width" | "full_width_right" | "small" | "overlay"
  popup_position: "top" | "bottom"
  popup_bg_color: string
  popup_text_color: string
  agree_btn_bg_color: string
  agree_btn_text_color: string
  decline_btn_bg_color: string
  decline_btn_text_color: string
  preferences_btn_bg_color: string
  preferences_btn_text_color: string
  privacy_settings_trigger_enabled: boolean
  privacy_settings_trigger_position: "bottom_left" | "bottom_right" | "top_left" | "top_right"
  privacy_settings_backdrop_close: boolean
  first_visit_allow_all: boolean
  returning_visitor_allow_all: boolean
  geo_ip_eu_only: boolean
  forget_me_enabled: boolean
  request_data_enabled: boolean
  contact_dpo_enabled: boolean
  data_rectification_enabled: boolean
  privacy_policy_acceptance_enabled: boolean
  terms_acceptance_enabled: boolean
  gtm_id: string
  custom_css: string
}

// ─── Admin Settings (full settings, extends public) ─────────────────────────

export interface GDPRAdminSettings extends GDPRPublicSettings {
  consent_logging_enabled: boolean
  data_breach_notification_enabled: boolean
  data_retention_enabled: boolean
  data_retention_days: number
  dpo_email: string
  data_breach_subject: string
  data_breach_body: string
  policy_update_subject: string
  policy_update_body: string
}

// ─── Consent ────────────────────────────────────────────────────────────────

export interface ConsentCheckResponse {
  services: Record<string, ServiceConsentState>
  settings: GDPRPublicSettings
}

export interface BulkConsentResponse {
  status: string
  allowed_services?: number[]
  services?: Record<string, ServiceConsentState>
}

// ─── Consent Logs (Admin) ───────────────────────────────────────────────────

export interface ConsentLogEntry {
  id: number
  ip_address: string
  consents: Record<string, boolean>
  consent_version: string
  consent_given_at: string
  created_at: string
  updated_at: string
}

export interface UserConsentEntry {
  id: number
  email: string
  full_name: string
  consent_version: string
  consent_given_at: string | null
  privacy_policy_accepted: boolean
  privacy_policy_accepted_at: string | null
  terms_accepted: boolean
  terms_accepted_at: string | null
  last_login_recorded: string | null
  consents: Record<string, boolean>
  created_at: string
  updated_at: string
}

export interface ConsentHistoryEntry {
  id: number
  timestamp: string
  user: number | null
  ip_address: string
  service_id: string
  service_name: string
  action: string
  consent_version: string
  user_agent: string
  consents_snapshot: Record<string, boolean> | null
}

// ─── Data Requests ──────────────────────────────────────────────────────────

export type RequestType = "forget_me" | "request_data" | "rectification" | "dpo_contact"
export type RequestStatus = "pending" | "confirmed" | "processing" | "done" | "rejected"

export interface DataRequest {
  id: string
  request_type: RequestType
  status: RequestStatus
  first_name: string
  last_name: string
  email: string
  message: string
  is_email_confirmed: boolean
  user: number | null
  deadline: string | null
  deadline_extended: boolean
  deadline_extension_reason: string
  is_overdue: boolean
  days_until_deadline: number | null
  processed_at: string | null
  created_at: string
  updated_at: string
}

export interface DataRequestFormData {
  request_type: RequestType
  first_name: string
  last_name: string
  email: string
  message?: string
}

// ─── Data Breach (Admin) ────────────────────────────────────────────────────

export interface DataBreachEntry {
  id: string
  title: string
  nature_of_breach: string
  severity: "low" | "medium" | "high" | "critical"
  categories_of_data: string
  approximate_records_affected: number | null
  consequences: string
  measures_taken: string
  discovered_at: string
  dpa_notification_deadline: string
  dpa_notified_at: string | null
  users_notified_at: string | null
  users_notified_count: number
  is_resolved: boolean
  resolved_at: string | null
  reported_by: number | null
  created_at: string
  updated_at: string
}

// ─── Processing Activities / RoPA (Admin) ───────────────────────────────────

export interface ProcessingActivityEntry {
  id: number
  name: string
  purpose: string
  legal_basis: string
  categories_of_data_subjects: string
  categories_of_personal_data: string
  recipients: string
  third_country_transfers: string
  retention_period: string
  security_measures: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// ─── Admin Audit Log ────────────────────────────────────────────────────────

export interface AdminAuditLogEntry {
  id: number
  timestamp: string
  user: number | null
  action_type: string
  description: string
  target_model: string
  target_id: string
  metadata: Record<string, unknown> | null
  ip_address: string
}

// ─── GDPR Context ───────────────────────────────────────────────────────────

export interface GDPRContextValue {
  settings: GDPRPublicSettings | null
  services: Service[]
  categories: ServiceCategory[]
  consents: Record<string, ServiceConsentState>
  isLoading: boolean
  isBannerVisible: boolean
  isPreferencesOpen: boolean
  consentVersion: string | null
  allowAll: () => Promise<void>
  declineAll: () => Promise<void>
  updateConsent: (serviceId: number, allowed: boolean) => Promise<void>
  updateCategoryConsent: (categorySlug: string, allowed: boolean) => Promise<void>
  openPreferences: () => void
  closePreferences: () => void
  closeBanner: () => void
}

// ─── Consent Analytics ─────────────────────────────────────────────────────

export interface ServiceOptInRate {
  id: number
  name: string
  category: string
  opted_in: number
  opted_out: number
  opt_in_rate: number
}

export interface GDPRAnalytics {
  consent_rate: number
  total_consent_records: number
  total_with_consent: number
  authenticated_users: number
  anonymous_visitors: number
  accept_rate_30d: number
  actions_30d: {
    allow_all: number
    decline_all: number
    grant: number
    revoke: number
    total: number
  }
  service_opt_in_rates: ServiceOptInRate[]
  dsars: {
    open: number
    overdue: number
    last_30d: number
  }
  breaches: {
    active: number
    overdue_dpa: number
  }
  history: {
    total: number
    last_30d: number
  }
}

// ─── Paginated Response ─────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
