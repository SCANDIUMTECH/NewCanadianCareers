/**
 * TypeScript types for admin user management.
 * Matches backend serializers from apps/users/
 */

import type { UserRole, UserStatus } from '@/lib/auth/types'
import type { PaginatedResponse } from '@/lib/company/types'

// Re-export for convenience
export type { PaginatedResponse }

// =============================================================================
// Admin User Types
// =============================================================================

/**
 * Admin user list item - returned from GET /api/admin/users/
 */
export interface AdminUser {
  id: number
  email: string
  first_name: string
  last_name: string
  full_name: string
  role: UserRole
  status: UserStatus
  avatar: string | null
  company_id: number | null
  company_name: string | null
  agency_id: number | null
  agency_name: string | null
  email_verified: boolean
  mfa_enabled: boolean
  is_marketing_admin: boolean
  is_marketing_analyst: boolean
  last_login: string | null
  created_at: string
}

/**
 * Admin user detail - returned from GET /api/admin/users/{id}/
 * Extended with activity counts and additional info
 */
export interface AdminUserDetail extends AdminUser {
  phone: string | null
  bio: string | null
  // Activity counts
  applications_count: number
  saved_jobs_count: number
  alerts_count: number
  jobs_posted_count: number
  // Suspension info (if suspended)
  suspension_reason: string | null
  suspension_ends_at: string | null
  suspended_by: string | null
  // Company/agency details (if applicable)
  company_detail: {
    id: number
    name: string
    slug: string
    logo: string | null
  } | null
  agency_detail: {
    id: number
    name: string
    slug: string
    logo: string | null
  } | null
}

// =============================================================================
// Admin User Stats
// =============================================================================

/**
 * User statistics - returned from GET /api/admin/users/stats/
 */
export interface AdminUserStats {
  total: number
  active: number
  pending: number
  suspended: number
  by_role: {
    admin: number
    employer: number
    agency: number
    candidate: number
  }
}

// =============================================================================
// Admin User Filters & Pagination
// =============================================================================

export interface AdminUserFilters {
  search?: string
  role?: UserRole | 'all'
  status?: UserStatus | 'all'
  company_id?: number
  agency_id?: number
  email_verified?: boolean
  page?: number
  page_size?: number
  ordering?: string
}

// =============================================================================
// Create / Update User Data
// =============================================================================

export interface CreateUserData {
  email: string
  first_name: string
  last_name: string
  role: UserRole
  status?: UserStatus
  password?: string
  company?: number | null
  agency?: number | null
  is_staff?: boolean
}

export interface UpdateUserData {
  email?: string
  first_name?: string
  last_name?: string
  role?: UserRole
  status?: UserStatus
  company_id?: number | null
  agency_id?: number | null
  email_verified?: boolean
  is_marketing_admin?: boolean
  is_marketing_analyst?: boolean
  phone?: string | null
  bio?: string | null
}

// =============================================================================
// Suspend / Reactivate User
// =============================================================================

export interface SuspendUserData {
  reason: string
  duration?: 'indefinite' | '7' | '30' | '90'
  notify_user?: boolean
}

export interface ReactivateUserData {
  reason?: string
  notify_user?: boolean
}

// =============================================================================
// User Activity Types
// =============================================================================

export type UserActivityType =
  | 'login'
  | 'logout'
  | 'profile_update'
  | 'password_change'
  | 'password_reset'
  | 'job_view'
  | 'job_apply'
  | 'job_save'
  | 'job_unsave'
  | 'alert_create'
  | 'alert_delete'
  | 'job_create'
  | 'job_update'
  | 'job_publish'
  | 'job_close'
  | 'application_status_update'
  | 'team_invite'
  | 'team_remove'
  | 'suspension'
  | 'reactivation'

export interface UserActivity {
  id: number
  user_id: number
  type: UserActivityType
  action: string
  target: string | null
  metadata: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
  location: string | null
  status: 'success' | 'failed' | 'locked' | null
  created_at: string
}

// =============================================================================
// Login Attempt Types (Security Tracking)
// =============================================================================

export type LoginAttemptStatus = 'success' | 'failed' | 'locked'
export type LoginAttemptFailureReason = 'invalid_credentials' | 'account_suspended' | 'account_locked' | null

export interface LoginAttempt {
  id: number
  email: string
  status: LoginAttemptStatus
  failure_reason: LoginAttemptFailureReason
  ip_address: string
  location: string
  location_city: string | null
  location_country: string | null
  user_agent: string
  created_at: string
}

export interface UserActivityFilters {
  type?: UserActivityType
  start_date?: string
  end_date?: string
  page?: number
  page_size?: number
}

// =============================================================================
// Impersonation Types
// =============================================================================

export interface StartImpersonationData {
  reason?: string
}

export interface ImpersonationToken {
  token: string
  redirect_url: string
  expires_at: string
}

// =============================================================================
// API Response Types
// =============================================================================

export interface MessageResponse {
  message: string
}

export interface PasswordResetResponse {
  message: string
  email_sent: boolean
}

// =============================================================================
// Admin Job Types
// =============================================================================

export type AdminJobStatus = 'draft' | 'pending' | 'pending_payment' | 'scheduled' | 'published' | 'paused' | 'expired' | 'filled' | 'hidden'
export type AdminJobLocationType = 'remote' | 'onsite' | 'hybrid'
export type AdminJobApplyMode = 'direct' | 'external'

export interface AdminJob {
  id: number
  job_id: string
  title: string
  company: {
    id: number
    name: string
    logo: string | null
    verified: boolean
  }
  agency: {
    id: number
    name: string
    logo: string | null
    allow_backdate_posting?: boolean
  } | null
  status: AdminJobStatus
  location_type: AdminJobLocationType
  location: string
  salary_min: number | null
  salary_max: number | null
  salary_currency: string | null
  apply_mode: AdminJobApplyMode
  external_url: string | null
  created_at: string
  posted_at: string | null
  expires_at: string
  scheduled_publish_at: string | null
  closed_at: string | null
  deleted_at: string | null
  views: number
  applications: number
  report_count: number
  featured: boolean
  category: string
  spam_score: number
  last_refreshed_at: string | null
  meta_title?: string
  meta_description?: string
}

export interface AdminJobDetail extends AdminJob {
  description: string
  responsibilities: string[]
  requirements: string[]
  nice_to_have: string[]
  skills: string[]
  benefits: string[]
  department: string
  employment_type: string
  experience_level: string
  salary_period: string | null
  show_salary: boolean
  equity: boolean
  equity_min: number | null
  equity_max: number | null
  apply_method: string
  apply_email: string
  apply_url: string
  apply_instructions: string
  updated_at: string
  created_by: {
    id: number
    full_name: string
    email: string
  } | null
  applicants: AdminJobApplicant[]
  reports: AdminJobReport[]
  activity: AdminJobActivity[]
}

export interface AdminJobApplicant {
  id: number
  candidate: {
    id: number
    full_name: string
    email: string
    avatar: string | null
  }
  status: string
  applied_at: string
  resume_url: string | null
}

export interface AdminJobReport {
  id: number
  reason: string
  reporter: string
  reported_at: string
  status: 'pending' | 'dismissed' | 'actioned'
  notes: string | null
}

export interface AdminJobActivity {
  id: number
  action: string
  actor: string
  timestamp: string
  details: string | null
}

export interface AdminJobStats {
  total: number
  draft: number
  pending: number
  pending_payment: number
  scheduled: number
  published: number
  paused: number
  flagged: number
  expired: number
  filled: number
  featured: number
  trashed: number
}

export interface AdminJobFilters {
  search?: string
  status?: AdminJobStatus | 'all'
  location_type?: AdminJobLocationType | 'all'
  company_id?: number
  agency_id?: number
  category?: string
  featured?: boolean
  has_reports?: boolean
  include_trashed?: boolean
  page?: number
  page_size?: number
  ordering?: string
}

export interface AdminJobPolicySettings {
  default_post_duration: number
  max_duration_days: number
  max_active_jobs_per_company: number
  salary_required: boolean
  prohibited_keywords: string[]
  allowed_categories: string[]
  default_apply_mode: 'direct' | 'external' | 'both'
  external_url_validation: boolean
  auto_approve_verified: boolean
  require_approval_for_new_companies: boolean
  require_approval_for_unverified: boolean
  auto_expire_enabled: boolean
  require_reapproval_on_edit: boolean
  lock_editing_after_publish: boolean
  expired_retention_days: number
  trash_retention_days: number
  // Refresh / Bump
  job_enable_refresh: boolean
  refresh_cooldown_days: number
  // Spam Detection
  job_enable_spam_detection: boolean
  spam_detection_threshold: number
  // Duplicate Blocking
  job_block_duplicates: boolean
}

export interface ApproveJobData {
  reason?: string
  posted_at?: string
}

export interface RejectJobData {
  reason: string
  notify_poster?: boolean
}

export interface ExtendJobData {
  expires_at: string
  reason?: string
}

export interface BulkJobActionData {
  job_ids: number[]
  action: 'approve' | 'reject' | 'pause' | 'resume' | 'hide' | 'delete' | 'feature' | 'unfeature'
  reason?: string
}

export interface BulkJobActionResponse extends MessageResponse {
  approved_count?: number
  total_requested?: number
  skipped_no_credits?: Array<{
    id: number
    title: string
    entity_name: string
  }>
}

// Pre-approve credit check
export interface PreApproveCheckEntity {
  entity_type: 'company' | 'agency'
  entity_id: number
  entity_name: string
  credits_remaining: number
  credits_total: number
  credits_needed: number
  sufficient: boolean
  deficit: number
  post_duration_days: number
  jobs_needing_credit: Array<{ id: number; title: string; status: string }>
  jobs_already_paid: Array<{ id: number; title: string; status: string }>
}

export interface PreApproveCheckResponse {
  can_approve_all: boolean
  total_jobs: number
  total_credits_needed: number
  entities: PreApproveCheckEntity[]
}

// =============================================================================
// Job Import Types
// =============================================================================

/** A single job row in an import file (pre-validation). */
export interface ImportJobRow {
  title: string
  description: string
  employment_type: string
  experience_level: string
  category?: string
  city: string
  country: string
  location_type: string
  department?: string
  state?: string
  timezone?: string
  responsibilities?: string[]
  requirements?: string[]
  nice_to_have?: string[]
  skills?: string[]
  benefits?: string[]
  salary_min?: number | null
  salary_max?: number | null
  salary_currency?: string
  salary_period?: string
  show_salary?: boolean
  equity?: boolean
  equity_min?: number | null
  equity_max?: number | null
  apply_method?: string
  apply_email?: string
  apply_url?: string
  apply_instructions?: string
  meta_title?: string
  meta_description?: string
  // Agency mode fields
  company_name?: string
  company_email?: string
}

/** Request payload for bulk job import. */
export interface BulkJobImportPayload {
  company_id?: number
  agency_id?: number
  jobs: ImportJobRow[]
  default_status?: "draft" | "pending"
}

/** Per-job error from the backend. */
export interface ImportJobError {
  index: number
  title: string
  errors: Record<string, string[]>
}

/** Response from the bulk-import endpoint. */
export interface BulkJobImportResponse {
  total: number
  created: number
  failed: number
  duplicates_skipped: number
  companies_created: number
  errors: ImportJobError[]
}

// =============================================================================
// Admin Company Types
// =============================================================================

export type AdminCompanyStatus = 'verified' | 'pending' | 'unverified'
export type AdminCompanyBillingStatus = 'active' | 'suspended' | 'trial'
export type AdminCompanyRiskLevel = 'low' | 'medium' | 'high'

export interface AdminCompanyOwner {
  id: number
  email: string
  full_name: string
}

export interface AdminCompany {
  id: number
  name: string
  domain: string
  logo: string | null
  status: AdminCompanyStatus
  billing_status: AdminCompanyBillingStatus
  risk_level: AdminCompanyRiskLevel
  users_count: number
  active_jobs_count: number
  job_count?: number
  job_credits_remaining?: number
  job_credits_total?: number
  created_at: string
  industry: string | null
  size: string | null
  owner: AdminCompanyOwner | null
  team_management_enabled: boolean
}

export interface AdminCompanyDetail extends AdminCompany {
  description: string | null
  website: string | null
  contact_email: string | null
  phone: string | null
  address: string | null
  users: AdminCompanyUser[]
  jobs: AdminCompanyJob[]
  invoices: AdminCompanyInvoice[]
  subscription: {
    plan: string
    monthly_spend: number
    next_billing_date: string | null
  } | null
  entitlements_list?: AdminCompanyEntitlement[]
}

export interface AdminCompanyUser {
  id: number
  full_name: string
  email: string
  role: string
  status: string
  last_login: string | null
}

export interface AdminCompanyJob {
  id: number
  title: string
  status: AdminJobStatus
  posted_at: string
  views: number
  applications: number
}

export interface AdminCompanyInvoice {
  id: number
  number: string
  amount: number
  status: 'paid' | 'pending' | 'overdue' | 'cancelled'
  issued_at: string
  due_at: string
  paid_at: string | null
}

export interface AdminCompanyEntitlement {
  id: number
  credit_type: 'job' | 'featured' | 'social'
  credits_added: number
  credits_used: number
  credits_remaining: number
  source: string
  payment_method: string
  admin_email: string
  reason: string
  expires_at: string | null
  created_at: string
}

export interface AdminCompanyStats {
  total: number
  verified: number
  pending: number
  high_risk: number
  low_credits: number
}

export interface AdminCompanyFilters {
  search?: string
  status?: AdminCompanyStatus | 'all'
  billing_status?: AdminCompanyBillingStatus | 'all'
  risk_level?: AdminCompanyRiskLevel | 'all'
  industry?: string
  agency?: string
  page?: number
  page_size?: number
  ordering?: string
}

export interface CreateCompanyData {
  name: string
  domain?: string
  contact_email: string
  industry: string
  size?: string
  owner_id?: number | null
  send_invite?: boolean
}

export interface UpdateCompanyData {
  name?: string
  domain?: string
  contact_email?: string
  industry?: string
  size?: string
  status?: AdminCompanyStatus
  risk_level?: AdminCompanyRiskLevel
  owner_id?: number | null
}

export interface SuspendCompanyData {
  reason: string
  suspend_users?: boolean
  suspend_jobs?: boolean
  notify?: boolean
}

// =============================================================================
// Admin Agency Types
// =============================================================================

export type AdminAgencyStatus = 'verified' | 'pending' | 'unverified'
export type AdminAgencyBillingStatus = 'active' | 'suspended' | 'trial'
export type AdminAgencyBillingModel = 'agency_pays' | 'company_pays'
export type AdminAgencyRiskLevel = 'low' | 'medium' | 'high'

export interface AdminAgency {
  id: number
  name: string
  logo: string | null
  status: AdminAgencyStatus
  billing_status?: AdminAgencyBillingStatus
  billing_model: AdminAgencyBillingModel
  risk_level: AdminAgencyRiskLevel
  client_companies_count?: number
  client_count?: number
  member_count?: number
  job_count?: number
  active_jobs_count?: number
  job_credits_remaining?: number
  job_credits_total?: number
  monthly_volume?: number
  owner: AdminCompanyOwner | null
  created_at: string
}

export interface AdminAgencyDetail extends AdminAgency {
  slug?: string
  description?: string | null
  size?: string | null
  featured?: boolean
  team_management_enabled?: boolean
  allow_backdate_posting?: boolean
  website: string | null
  contact_email: string | null
  phone: string | null
  location: string | null
  industry: string | null
  total_jobs_count?: number
  total_placements?: number
  entitlements_remaining?: number
  team_members: AdminAgencyTeamMember[]
  clients: AdminAgencyClient[]
  jobs: AdminAgencyJob[]
}

export interface AdminAgencyTeamMember {
  id: number
  full_name: string
  email: string
  role: string
  status: string
  jobs_count: number
}

export interface AdminAgencyClient {
  id: number
  name?: string
  logo?: string | null
  industry?: string | null
  active_jobs?: number
  total_placements?: number
  company_name?: string
  company_id?: number
  status?: 'active' | 'paused' | 'ended'
  jobs_count?: number
  added_at?: string
}

export interface AdminAgencyJob {
  id: number
  title: string
  client_company: string
  status: AdminJobStatus
  posted_at: string
}

export interface AdminAgencyEntitlement {
  id: number
  credit_type: 'job' | 'featured' | 'social'
  credits_added: number
  credits_used: number
  credits_remaining: number
  source: string
  payment_method: string
  admin_email: string
  reason: string
  expires_at: string | null
  created_at: string
}

export interface AdminAgencyStats {
  total_agencies: number
  verified_agencies: number
  high_risk_agencies: number
  low_credits: number
  monthly_volume: number
}

export interface AdminAgencyFilters {
  search?: string
  status?: AdminAgencyStatus | 'all'
  billing_status?: AdminAgencyBillingStatus | 'all'
  billing_model?: AdminAgencyBillingModel | 'all'
  risk_level?: AdminAgencyRiskLevel | 'all'
  page?: number
  page_size?: number
  ordering?: string
}

export interface CreateAgencyData {
  name: string
  contact_email: string
  website?: string
  location?: string
  industry?: string
  billing_model?: AdminAgencyBillingModel
  owner_id?: number | null
  send_invite?: boolean
}

export interface UpdateAgencyData {
  name?: string
  contact_email?: string
  website?: string
  location?: string
  industry?: string
  description?: string
  featured?: boolean
  allow_backdate_posting?: boolean
  billing_model?: AdminAgencyBillingModel
  status?: AdminAgencyStatus
  risk_level?: AdminAgencyRiskLevel
  owner_id?: number | null
}

export interface SuspendAgencyData {
  reason: string
  suspend_team?: boolean
  suspend_jobs?: boolean
  notify?: boolean
}

// =============================================================================
// Admin Dashboard Types
// =============================================================================

export interface AdminDashboardStats {
  jobs_posted: number
  jobs_change: string
  active_companies: number
  companies_change: string
  revenue_mtd: number
  revenue_change: string
  pending_reviews: number
  reviews_change: string
}

export interface AdminDashboardTrendPoint {
  date: string
  jobs: number
  applications: number
  revenue?: number
}

export interface AdminDashboardModerationItem {
  name: string
  value: number
  color: string
}

export interface AdminActivity {
  id: number
  type: 'job' | 'user' | 'moderation' | 'payment'
  action: string
  company: string
  entity_name?: string
  time: string
}

export interface AdminAlert {
  id: number
  severity: 'info' | 'warning' | 'error'
  message: string
  time: string
  resolved: boolean
}

// =============================================================================
// Admin Payment Types
// =============================================================================

export type AdminTransactionStatus = 'completed' | 'pending' | 'failed' | 'refunded'
export type AdminTransactionType = 'subscription' | 'package' | 'credit' | 'refund'

export interface AdminTransaction {
  id: number
  invoice_number: string
  company: {
    id: number
    name: string
  } | null
  agency: {
    id: number
    name: string
  } | null
  type: AdminTransactionType
  amount: number
  currency: string
  status: AdminTransactionStatus
  description: string
  payment_method: string | null
  created_at: string
  completed_at: string | null
}

export interface AdminPaymentStats {
  total_revenue: number
  revenue_change: number
  transactions_count: number
  average_transaction: number
  by_type: {
    subscription: number
    package: number
    credit: number
  }
}

export interface AdminRevenueTrend {
  date: string
  revenue: number
  transactions: number
}

export type AdminPaymentMethod =
  | 'stripe_card'
  | 'e_transfer'
  | 'invoice'
  | 'manual_card'
  | 'complimentary'

export interface AdminPaymentFilters {
  search?: string
  type?: AdminTransactionType | 'all'
  status?: AdminTransactionStatus | 'all'
  payment_method?: AdminPaymentMethod | 'all'
  company_id?: number
  agency_id?: number
  start_date?: string
  end_date?: string
  page?: number
  page_size?: number
  ordering?: string
}

// =============================================================================
// Admin Fraud Types
// =============================================================================

export type FraudAlertSeverity = 'low' | 'medium' | 'high' | 'critical'
export type FraudAlertStatus = 'open' | 'investigating' | 'resolved' | 'false_positive' | 'blocked'
export type FraudAlertType = 'suspicious_activity' | 'payment_fraud' | 'fake_job' | 'spam' | 'identity_fraud' | 'multiple_accounts' | 'credential_stuffing' | 'fake_listings' | 'disposable_email'

export interface FraudAlert {
  id: number
  type: FraudAlertType
  severity: FraudAlertSeverity
  status: FraudAlertStatus
  subject: {
    type: 'user' | 'company' | 'agency' | 'job'
    id: number
    name: string
  }
  description: string
  indicators: string[]
  ip_address: string | null
  affected_accounts: string[]
  detected_at: string
  resolved_at: string | null
  resolved_by: string | null
  resolution_notes: string | null
  created_at: string
}

export interface FraudTrend {
  date: string
  alerts: number
  blocked?: number
  by_type?: Record<FraudAlertType, number>
}

export interface FraudStats {
  total_alerts: number
  critical_count: number
  open_count: number
  blocked_count: number
  open_alerts: number
  resolved_today: number
  avg_resolution_time_hours: number
  by_severity: Record<FraudAlertSeverity, number>
}

export interface FraudFilters {
  type?: FraudAlertType | 'all'
  severity?: FraudAlertSeverity | 'all'
  status?: FraudAlertStatus | 'all'
  start_date?: string
  end_date?: string
  page?: number
  page_size?: number
  ordering?: string
}

export interface ResolveFraudAlertData {
  resolution: string
  notes?: string
}

// =============================================================================
// Admin Fraud Rule Types
// =============================================================================

export interface FraudRuleConditions {
  check_type?: FraudAlertType
  threshold?: number
  time_window_hours?: number
  time_window_minutes?: number
  failed_login_attempts?: number
  velocity_threshold?: number
  amount_threshold?: number
  blocked_keywords?: string[]
  blocked_domains?: string[]
  match_threshold?: number
  max_accounts_per_ip?: number
  [key: string]: unknown
}

export interface FraudRule {
  id: number
  name: string
  description: string
  enabled: boolean
  severity: FraudAlertSeverity
  conditions: FraudRuleConditions
  triggers_count: number
  false_positives_count: number
  created_at: string
  updated_at: string
}

export interface CreateFraudRuleData {
  name: string
  description: string
  severity: FraudAlertSeverity
  enabled: boolean
  conditions: FraudRuleConditions
}

// =============================================================================
// Admin Compliance Types
// =============================================================================

export type ComplianceRequestType = 'gdpr_access' | 'gdpr_delete' | 'gdpr_portability' | 'ccpa_access' | 'ccpa_delete' | 'ccpa_opt_out' | 'export' | 'deletion'
export type ComplianceRequestStatus = 'pending' | 'in_progress' | 'processing' | 'completed' | 'rejected'

export interface ComplianceRequest {
  id: number
  type: ComplianceRequestType
  status: ComplianceRequestStatus
  requester: {
    id: number
    email: string
    full_name: string
  }
  requester_name: string
  requester_email: string
  requester_type: string
  submitted_at: string
  created_at: string
  due_at: string
  completed_at: string | null
  processed_by: string | null
  notes: string | null
}

export interface ComplianceStats {
  pending_requests: number
  due_soon: number
  completed_this_month: number
  average_completion_days: number
  pending_count: number
  processing_count: number
  completed_count: number
  total_count: number
}

export interface ComplianceFilters {
  type?: ComplianceRequestType | 'all'
  status?: ComplianceRequestStatus | 'all'
  start_date?: string
  end_date?: string
  page?: number
  page_size?: number
  ordering?: string
}

export interface ProcessComplianceRequestData {
  status?: 'completed' | 'rejected'
  resolution?: string
  notes?: string
}

// =============================================================================
// Admin Retention Rule Types
// =============================================================================

export type RetentionEnforcement = 'manual' | 'automated' | 'legal_hold'

export interface RetentionRule {
  id: number
  category: string
  description: string
  retention_days: number
  is_deletable: boolean
  is_active: boolean
  enforcement: RetentionEnforcement
  legal_basis: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CreateRetentionRuleData {
  category: string
  description: string
  retention_days: number
  is_deletable?: boolean
  is_active?: boolean
  enforcement?: RetentionEnforcement
  legal_basis?: string
  sort_order?: number
}

export interface UpdateRetentionRuleData {
  category?: string
  description?: string
  retention_days?: number
  is_deletable?: boolean
  is_active?: boolean
  enforcement?: RetentionEnforcement
  legal_basis?: string
  sort_order?: number
}

// =============================================================================
// Admin Legal Document Types
// =============================================================================

export type LegalDocumentType = 'privacy_policy' | 'terms_of_service' | 'cookie_policy' | 'dpa' | 'acceptable_use' | 'other'
export type LegalDocumentStatus = 'draft' | 'published' | 'archived'

export interface LegalDocument {
  id: number
  title: string
  slug: string
  document_type: LegalDocumentType
  content: string
  status: LegalDocumentStatus
  version: string
  published_at: string | null
  effective_date: string | null
  last_reviewed_at: string | null
  reviewed_by: number | null
  reviewed_by_name: string | null
  public_url: string
  created_at: string
  updated_at: string
}

export interface CreateLegalDocumentData {
  title: string
  document_type: LegalDocumentType
  content?: string
  status?: LegalDocumentStatus
  version?: string
  effective_date?: string | null
  public_url?: string
}

export interface UpdateLegalDocumentData {
  title?: string
  document_type?: LegalDocumentType
  content?: string
  version?: string
  effective_date?: string | null
  public_url?: string
}

// =============================================================================
// Admin Audit Log Types
// =============================================================================

export type AuditLogAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'suspend'
  | 'activate'
  | 'verify'
  | 'approve'
  | 'reject'
  | 'grant'
  | 'revoke'
  | 'login'
  | 'logout'
  | 'impersonate'

export type AuditLogTargetType =
  | 'user'
  | 'company'
  | 'agency'
  | 'job'
  | 'entitlement'
  | 'package'
  | 'featureflag'
  | 'banner'
  | 'announcement'
  | 'affiliate'

export interface AuditLog {
  id: number
  actor: number | null
  actor_email: string | null
  actor_name: string | null
  action: AuditLogAction
  target_type: string
  target_id: string
  target_repr: string
  changes: Record<string, { old: unknown; new: unknown }> | Record<string, never>
  reason: string
  ip_address: string | null
  created_at: string
}

export interface AuditLogFilters {
  search?: string
  action?: AuditLogAction | 'all'
  target_type?: string | 'all'
  actor?: number
  start_date?: string
  end_date?: string
  page?: number
  page_size?: number
  ordering?: string
}

// =============================================================================
// Admin Entitlements
// =============================================================================

export interface AdminEntitlement {
  id: number
  company: number | null
  company_name: string | null
  agency: number | null
  agency_name: string | null
  package: number | null
  credits_total: number
  credits_used: number
  featured_credits_total: number
  featured_credits_used: number
  social_credits_total: number
  social_credits_used: number
  post_duration_days: number
  expires_at: string | null
  source: 'package_purchase' | 'admin_grant' | 'subscription' | 'promotion' | 'refund'
  source_reference: string
  created_at: string
  updated_at: string
}

export interface AdminEntitlementFilters {
  search?: string
  company?: number
  agency?: number
  source?: string
  page?: number
  page_size?: number
  ordering?: string
}

export interface CreateEntitlementData {
  company?: number
  agency?: number
  credits_total: number
  featured_credits_total?: number
  social_credits_total?: number
  post_duration_days?: number
  expires_at?: string | null
}

// =============================================================================
// Admin Article Types
// =============================================================================

export type ArticleStatus = 'draft' | 'scheduled' | 'published' | 'archived'

export type ArticleTemplate =
  | 'editorial_hero'
  | 'split_magazine'
  | 'minimal_luxury'
  | 'bold_typography'
  | 'image_led'
  | 'modern_grid'

export interface AdminArticle {
  id: number
  article_id: string
  title: string
  slug: string
  excerpt: string
  cover_image: string | null
  author_name: string | null
  author_email: string | null
  category_name: string | null
  category_slug: string | null
  tags: string[]
  status: ArticleStatus
  featured: boolean
  selected_template: ArticleTemplate
  published_at: string | null
  scheduled_publish_at: string | null
  reading_time: number
  views: number
  unique_views: number
  created_at: string
  deleted_at: string | null
}

export interface AdminArticleDetail extends AdminArticle {
  content: string
  og_image: string | null
  meta_title: string
  meta_description: string
  canonical_url: string
  allow_inline_banners: boolean
  affiliate_disclosure: 'auto' | 'manual' | 'none'
  sponsored_by: string
  preview_token: string
  preview_expires_at: string | null
  updated_at: string
  category: AdminArticleCategory | null
}

export interface AdminArticleCategory {
  id: number
  name: string
  slug: string
  description: string
  sort_order: number
  is_active: boolean
  article_count: number
}

export interface AdminArticleStats {
  total: number
  draft: number
  scheduled: number
  published: number
  archived: number
  total_views: number
}

export interface AdminArticleFilters {
  search?: string
  status?: ArticleStatus | 'all'
  category?: number
  featured?: boolean
  page?: number
  page_size?: number
  ordering?: string
}

export interface CreateArticleData {
  title: string
  slug?: string
  excerpt?: string
  content?: string
  category?: number | null
  tags?: string[]
  featured?: boolean
  selected_template?: ArticleTemplate
  scheduled_publish_at?: string | null
  meta_title?: string
  meta_description?: string
  canonical_url?: string
  allow_inline_banners?: boolean
  affiliate_disclosure?: 'auto' | 'manual' | 'none'
  sponsored_by?: string
}

export interface UpdateArticleData {
  title?: string
  slug?: string
  excerpt?: string
  content?: string
  category?: number | null
  tags?: string[]
  featured?: boolean
  selected_template?: ArticleTemplate
  scheduled_publish_at?: string | null
  meta_title?: string
  meta_description?: string
  canonical_url?: string
  allow_inline_banners?: boolean
  affiliate_disclosure?: 'auto' | 'manual' | 'none'
  sponsored_by?: string
}

// =============================================================================
// Public Article Types
// =============================================================================

export interface PublicArticle {
  id: number
  article_id: string
  title: string
  slug: string
  excerpt: string
  cover_image: string | null
  author_name: string | null
  category_name: string | null
  category_slug: string | null
  tags: string[]
  status: ArticleStatus
  published_at: string | null
  reading_time: number
  views: number
  selected_template: ArticleTemplate
  featured: boolean
}

export interface PublicArticleDetail extends PublicArticle {
  content: string
  category: AdminArticleCategory | null
  og_image: string | null
  meta_title: string
  meta_description: string
  canonical_url: string
  allow_inline_banners: boolean
  affiliate_disclosure: 'auto' | 'manual' | 'none'
  sponsored_by: string
  updated_at: string
}
