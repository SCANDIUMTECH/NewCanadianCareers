// ─── Service & Category Types ───────────────────────────────────────────────

export interface ServiceCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  order: number;
}

export interface Service {
  id: number;
  name: string;
  slug: string;
  description: string;
  category: number;
  category_name: string;
  category_slug: string;
  is_deactivatable: boolean;
  default_enabled: boolean;
  legal_basis: string;
  is_active: boolean;
}

export interface ServiceConsentState {
  allowed: boolean;
  name: string;
  category: string;
  cookies?: string[];
  head_script?: string;
  body_script?: string;
}

// ─── Settings ───────────────────────────────────────────────────────────────

export interface GDPRPublicSettings {
  is_enabled: boolean;
  cookie_lifetime_days: number;
  cookie_domain: string;
  consent_mode_v2: boolean;
  consent_version: string;
  consent_expiry_days: number;
  privacy_policy_url: string;
  popup_enabled: boolean;
  popup_text: string;
  popup_agree_text: string;
  popup_decline_text: string;
  popup_preferences_text: string;
  popup_style: "full_width" | "full_width_right" | "small" | "overlay";
  popup_position: "top" | "bottom";
  popup_bg_color: string;
  popup_text_color: string;
  agree_btn_bg_color: string;
  agree_btn_text_color: string;
  decline_btn_bg_color: string;
  decline_btn_text_color: string;
  preferences_btn_bg_color: string;
  preferences_btn_text_color: string;
  privacy_settings_trigger_enabled: boolean;
  privacy_settings_trigger_position: "bottom_left" | "bottom_right" | "top_left" | "top_right";
  privacy_settings_backdrop_close: boolean;
  first_visit_allow_all: boolean;
  returning_visitor_allow_all: boolean;
  geo_ip_eu_only: boolean;
  forget_me_enabled: boolean;
  request_data_enabled: boolean;
  contact_dpo_enabled: boolean;
  data_rectification_enabled: boolean;
  privacy_policy_acceptance_enabled: boolean;
  terms_acceptance_enabled: boolean;
  gtm_id: string;
  custom_css: string;
}

// ─── Consent ────────────────────────────────────────────────────────────────

export interface ConsentCheckResponse {
  services: Record<string, ServiceConsentState>;
  settings: GDPRPublicSettings;
}

export interface BulkConsentResponse {
  status: string;
  allowed_services?: number[];
  services?: Record<string, ServiceConsentState>;
}

// ─── Data Requests ──────────────────────────────────────────────────────────

export type RequestType = "forget_me" | "request_data" | "rectification" | "dpo_contact";
export type RequestStatus = "pending" | "confirmed" | "processing" | "done" | "rejected";

export interface DataRequest {
  id: string;
  request_type: RequestType;
  status: RequestStatus;
  first_name: string;
  last_name: string;
  email: string;
  message: string;
  is_email_confirmed: boolean;
  deadline: string | null;
  deadline_extended: boolean;
  deadline_extension_reason: string;
  is_overdue: boolean;
  days_until_deadline: number | null;
  created_at: string;
  updated_at: string;
}

export interface DataRequestFormData {
  request_type: RequestType;
  first_name: string;
  last_name: string;
  email: string;
  message?: string;
}

// ─── GDPR Context ───────────────────────────────────────────────────────────

export interface GDPRContextValue {
  settings: GDPRPublicSettings | null;
  services: Service[];
  categories: ServiceCategory[];
  consents: Record<string, ServiceConsentState>;
  isLoading: boolean;
  isBannerVisible: boolean;
  isPreferencesOpen: boolean;
  consentVersion: string | null;
  allowAll: () => Promise<void>;
  declineAll: () => Promise<void>;
  updateConsent: (serviceId: number, allowed: boolean) => Promise<void>;
  updateCategoryConsent: (categorySlug: string, allowed: boolean) => Promise<void>;
  openPreferences: () => void;
  closePreferences: () => void;
  closeBanner: () => void;
}
