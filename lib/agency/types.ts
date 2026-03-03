/**
 * TypeScript types for agency data.
 * Matches backend serializers from apps/companies/, apps/jobs/, apps/billing/
 */

import type { PaginatedResponse } from '@/lib/company/types'

// Re-export for convenience
export type { PaginatedResponse }

// =============================================================================
// Agency Profile Types
// =============================================================================

export type AgencyStatus = 'verified' | 'pending' | 'unverified'
export type AgencyBillingStatus = 'active' | 'suspended' | 'trial'
export type AgencyBillingModel = 'agency_pays' | 'company_pays'

export interface Agency {
  id: number
  name: string
  slug: string
  logo: string | null
  description: string
  website: string | null
  specializations: string[]
  city: string | null
  state: string | null
  country: string | null
  status: AgencyStatus
  billing_status: AgencyBillingStatus
  billing_model: AgencyBillingModel
  member_count: number
  client_count: number
  created_at: string
}

export interface AgencyProfileUpdate {
  name?: string
  description?: string
  website?: string | null
  specializations?: string[]
  city?: string | null
  state?: string | null
  country?: string | null
}

// =============================================================================
// Agency Client Types
// =============================================================================

export interface AgencyClientCompany {
  id: number
  name: string
  slug: string
  logo: string | null
  website?: string
  industry: string | null
  size: string | null
  headquarters_city: string | null
  headquarters_country: string | null
  status: 'verified' | 'pending' | 'unverified'
}

export interface AgencyClient {
  id: number
  agency: number
  company: number
  company_name: string
  company_slug: string
  company_detail?: AgencyClientCompany
  is_active: boolean
  notes: string
  active_jobs_count?: number
  total_placements?: number
  credits_used?: number
  created_at: string
}

export interface CreateAgencyClientData {
  name: string
  website?: string
  industry?: string
}

export interface UpdateAgencyClientData {
  name?: string
  website?: string
  industry?: string
  is_active?: boolean
  notes?: string
}

// =============================================================================
// Agency Team Member Types
// =============================================================================

export type AgencyMemberRole = 'owner' | 'admin' | 'recruiter' | 'viewer'

export interface AgencyTeamMemberUser {
  id: number
  email: string
  first_name: string
  last_name: string
  full_name: string
  avatar: string | null
}

export interface AgencyTeamMember {
  id: number
  user: number
  user_email: string
  user_name: string
  user_detail?: AgencyTeamMemberUser
  role: AgencyMemberRole
  is_active?: boolean
  jobs_assigned?: number
  placements_count?: number
  created_at: string
  last_active_at?: string | null
}

export interface InviteAgencyMemberData {
  email: string
  role: AgencyMemberRole
}

export interface UpdateAgencyMemberData {
  role?: AgencyMemberRole
  is_active?: boolean
}

// =============================================================================
// Agency Job Types
// =============================================================================

export type AgencyJobStatus = 'draft' | 'pending' | 'published' | 'paused' | 'expired' | 'hidden' | 'filled'

export interface AgencyJobClient {
  id: number
  name: string
  slug: string
  logo: string | null
}

export interface AgencyJob {
  id: number
  job_id: string
  title: string
  slug: string
  company: AgencyJobClient
  client_id?: number
  location_type: 'onsite' | 'remote' | 'hybrid'
  city: string | null
  state: string | null
  country: string
  employment_type: 'full_time' | 'part_time' | 'contract' | 'freelance' | 'internship'
  experience_level: 'entry' | 'mid' | 'senior' | 'lead' | 'executive'
  salary_min: number | null
  salary_max: number | null
  salary_currency: string
  salary_period: 'hour' | 'day' | 'week' | 'month' | 'year'
  status: AgencyJobStatus
  is_featured: boolean
  views: number
  applications_count: number
  posted_at: string | null
  expires_at: string | null
  created_at: string
}

export interface AgencyJobDetail extends AgencyJob {
  description: string
  skills: string[]
  benefits: string[]
  meta_title?: string
  meta_description?: string
  category: {
    id: number
    name: string
    slug: string
  } | null
}

export interface CreateAgencyJobData {
  title: string
  description: string
  company_id: number // Client company ID
  employment_type: string
  experience_level: string
  location_type: string
  city?: string | null
  state?: string | null
  country?: string
  salary_min?: number | null
  salary_max?: number | null
  salary_currency?: string
  salary_period?: string
  skills?: string[]
  benefits?: string[]
  category_id?: number | null
  meta_title?: string
  meta_description?: string
}

export interface UpdateAgencyJobData extends Partial<CreateAgencyJobData> {}

export interface AgencyJobFilters {
  status?: AgencyJobStatus
  company_id?: number
  search?: string
  page?: number
  page_size?: number
}

// =============================================================================
// Agency Applicant Types
// =============================================================================

export type AgencyApplicantStatus =
  | 'new'
  | 'reviewing'
  | 'shortlisted'
  | 'submitted'
  | 'interviewing'
  | 'offered'
  | 'hired'
  | 'rejected'
  | 'withdrawn'

export interface AgencyApplicantCandidate {
  id: number
  email: string
  first_name: string
  last_name: string
  full_name: string
  phone: string | null
  avatar: string | null
  headline: string | null
}

export interface AgencyApplicant {
  id: number
  job: {
    id: number
    title: string
    company: AgencyJobClient
  }
  candidate: AgencyApplicantCandidate
  status: AgencyApplicantStatus
  stage?: string
  rating: number | null
  notes: string | null
  resume_url: string | null
  cover_letter: string | null
  applied_at: string
  status_changed_at?: string
  updated_at: string
}

export interface UpdateAgencyApplicantData {
  status?: AgencyApplicantStatus
  notes?: string
  rating?: number | null
}

export interface AgencyApplicantFilters {
  job_id?: number
  status?: AgencyApplicantStatus
  search?: string
  page?: number
  page_size?: number
}

// =============================================================================
// Agency Package Types
// =============================================================================

export type PackageType = 'job_slots' | 'featured' | 'premium' | 'enterprise'
export type PackageStatus = 'active' | 'expired' | 'exhausted'

/**
 * Available package for purchase (catalog item).
 */
export interface AvailableAgencyPackage {
  id: number
  name: string
  description: string
  price: number
  currency: string
  credits: number
  per_credit: number
  features: string[]
  is_popular: boolean
  is_enterprise: boolean
  listing_duration_days: number
}

/**
 * Credit pack for top-up purchases.
 */
export interface AgencyCreditPack {
  id: number
  credits: number
  price: number
  currency: string
  per_credit: number
  is_popular: boolean
}

/**
 * Purchased/active package with usage tracking.
 */
export interface AgencyPackage {
  id: number
  name: string
  client?: {
    id: number
    name: string
  }
  package_type: PackageType
  total_slots: number
  used_slots: number
  remaining_slots: number
  price: number
  currency: string
  status: PackageStatus
  started_at: string
  expires_at: string
  created_at: string
}

export interface AgencyPackageFilters {
  status?: PackageStatus
  client_id?: number
  page?: number
  page_size?: number
}

/**
 * Agency invoice for billing history.
 */
export interface AgencyInvoice {
  id: string
  number: string
  amount: number
  currency: string
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'
  description: string
  pdf_url: string | null
  pdf_status: 'available' | 'generating' | 'unavailable'
  created_at: string
  paid_at?: string
  refunded_at?: string
}

export interface AgencyInvoiceFilters {
  status?: AgencyInvoice['status']
  page?: number
  page_size?: number
}

// =============================================================================
// Agency Analytics Types
// =============================================================================

export interface AgencyAnalyticsOverview {
  total_jobs: number
  active_jobs: number
  total_applications: number
  total_placements: number
  placement_rate: number
  avg_time_to_fill: number
  total_views: number
  total_credits: number
  used_credits: number
  remaining_credits: number
}

export interface AgencyAnalyticsTrend {
  date: string
  jobs_posted: number
  applications: number
  placements: number
  views: number
}

export interface AgencyAnalyticsByClient {
  client_id: number
  client_name: string
  client_initials: string
  jobs: number
  applications: number
  placements: number
  views: number
  credits_used: number
  color?: string
}

export interface AgencyAnalyticsByRecruiter {
  recruiter_id: number
  recruiter_name: string
  jobs: number
  placements: number
  applications_reviewed: number
}

export interface AgencyAnalytics {
  overview: AgencyAnalyticsOverview
  trends: AgencyAnalyticsTrend[]
  by_client: AgencyAnalyticsByClient[]
  by_recruiter: AgencyAnalyticsByRecruiter[]
}

export interface AnalyticsDateRange {
  start_date?: string
  end_date?: string
  period?: 'week' | 'month' | 'quarter' | 'year'
}

// =============================================================================
// Agency Notification Types
// =============================================================================

export type AgencyNotificationType =
  | 'new_application'
  | 'application_status'
  | 'client_update'
  | 'job_expiring'
  | 'job_expired'
  | 'placement'
  | 'credits_low'
  | 'credits_expiring'
  | 'team_invite'
  | 'team_update'
  | 'payment_success'
  | 'payment_failed'
  | 'system'

export interface AgencyNotification {
  id: number
  type: AgencyNotificationType
  title: string
  message: string
  data: Record<string, unknown>
  link: string | null
  read: boolean
  read_at: string | null
  created_at: string
}

export interface AgencyNotificationFilters {
  read?: boolean
  type?: AgencyNotificationType
  page?: number
  page_size?: number
}

export interface AgencyNotificationPreferences {
  email_application_received: boolean
  email_application_status: boolean
  email_job_alerts: boolean
  email_job_status: boolean
  email_messages: boolean
  email_job_expired: boolean
  email_credits_low: boolean
  email_billing: boolean
  email_weekly_digest: boolean
  email_marketing: boolean
  push_enabled: boolean
}

// =============================================================================
// Agency Context Types
// =============================================================================

export interface AgencyContextValue {
  /** Current agency profile */
  agency: Agency | null
  /** Active client companies */
  clients: AgencyClient[]
  /** Unread notification count */
  unreadNotifications: number
  /** Active jobs count */
  activeJobsCount: number
  /** Pending applications count */
  pendingApplicationsCount: number
  /** Loading state */
  isLoading: boolean
  /** Error state */
  error: Error | null
  /** Refresh agency profile */
  refreshAgency: () => Promise<void>
  /** Refresh clients list */
  refreshClients: () => Promise<void>
  /** Refresh notification count */
  refreshNotifications: () => Promise<void>
  /** Refresh all counts */
  refreshCounts: () => Promise<void>
  /** Total credits from entitlements */
  totalCredits: number
  /** Used credits from entitlements */
  usedCredits: number
  /** Refresh all data */
  refreshAll: () => Promise<void>
}

// =============================================================================
// Dashboard Display Types (for UI convenience)
// =============================================================================

export interface AgencyRecentActivity {
  id: number
  type: 'application' | 'view' | 'company' | 'billing' | 'team' | 'job'
  message: string
  company: string | null
  time: string
  link?: string
}
