/**
 * TypeScript types for company data.
 * Matches backend serializers from apps/companies/, apps/jobs/, apps/billing/
 */

// =============================================================================
// Company Types
// =============================================================================

export interface CompanyBasic {
  id: number
  entity_id: string
  name: string
  slug: string
  logo: string | null
}

export interface Company {
  id: number
  entity_id: string
  name: string
  slug: string
  logo: string | null
  banner: string | null
  description: string
  tagline: string | null
  website: string | null
  industry: string | null
  size: string | null
  founded_year: number | null
  headquarters_address: string | null
  headquarters_city: string | null
  headquarters_state: string | null
  headquarters_country: string | null
  headquarters_postal_code: string | null
  linkedin_url: string | null
  twitter_url: string | null
  facebook_url: string | null
  instagram_url: string | null
  is_verified: boolean
  status: string
  member_count: number
  job_count: number
}

export interface CompanyProfileUpdate {
  name?: string
  description?: string | null
  tagline?: string | null
  website?: string | null
  industry?: string | null
  size?: string | null
  founded_year?: number | null
  headquarters_address?: string | null
  headquarters_city?: string | null
  headquarters_state?: string | null
  headquarters_country?: string | null
  headquarters_postal_code?: string | null
  linkedin_url?: string | null
  twitter_url?: string | null
  facebook_url?: string | null
  instagram_url?: string | null
}

// =============================================================================
// Team Member Types
// =============================================================================

export type MemberRole = 'owner' | 'admin' | 'recruiter' | 'viewer'

export interface TeamMemberUser {
  id: number
  email: string
  first_name: string
  last_name: string
  full_name: string
  avatar: string | null
}

export interface TeamMember {
  id: number
  user: TeamMemberUser
  role: MemberRole
  joined_at: string
  is_active: boolean
}

export interface PendingInvite {
  id: number
  email: string
  role: MemberRole
  invited_at: string
  expires_at: string
}

export interface InviteMemberData {
  email: string
  role: MemberRole
}

export interface UpdateMemberData {
  role?: MemberRole
  is_active?: boolean
}

// =============================================================================
// Job Types
// =============================================================================

export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'freelance' | 'internship'
export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead' | 'executive'
export type LocationType = 'onsite' | 'remote' | 'hybrid'
export type JobStatus = 'draft' | 'pending' | 'pending_payment' | 'scheduled' | 'published' | 'paused' | 'expired' | 'filled' | 'hidden'
export type SalaryPeriod = 'hour' | 'day' | 'week' | 'month' | 'year'

export interface Category {
  id: number
  name: string
  slug: string
}

export interface CategoryOption {
  value: string
  label: string
  count: number
}

export interface Job {
  id: number
  job_id: string
  title: string
  slug: string
  description: string
  employment_type: EmploymentType
  experience_level: ExperienceLevel
  location_type: LocationType
  address: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string
  salary_min: number | null
  salary_max: number | null
  salary_currency: string
  salary_period: SalaryPeriod
  responsibilities: string[]
  requirements: string[]
  nice_to_have: string[]
  skills: string[]
  benefits: string[]
  apply_method: 'internal' | 'email' | 'external'
  apply_email: string | null
  apply_url: string | null
  apply_instructions: string | null
  status: JobStatus
  is_featured: boolean
  posted_at: string | null
  expires_at: string | null
  scheduled_publish_at: string | null
  closed_at: string | null
  deleted_at: string | null
  views: number
  applications_count: number
  last_refreshed_at: string | null
  spam_score?: number
  meta_title?: string
  meta_description?: string
  company: CompanyBasic
  category: string
}

export interface JobListItem {
  id: number
  job_id: string
  title: string
  slug: string
  location_type: LocationType
  city: string | null
  state: string | null
  country: string
  employment_type: EmploymentType
  status: JobStatus
  is_featured: boolean
  posted_at: string | null
  expires_at: string | null
  scheduled_publish_at: string | null
  closed_at: string | null
  deleted_at: string | null
  views: number
  applications_count: number
  last_refreshed_at: string | null
  created_at?: string
  updated_at?: string
  category: string
}

export interface CreateJobData {
  title: string
  description: string
  employment_type: EmploymentType
  experience_level: ExperienceLevel
  location_type: LocationType
  address?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
  country?: string
  salary_min?: number | null
  salary_max?: number | null
  salary_currency?: string
  salary_period?: SalaryPeriod
  show_salary?: boolean
  skills?: string[]
  benefits?: string[]
  responsibilities?: string[]
  requirements?: string[]
  nice_to_have?: string[]
  apply_method?: 'internal' | 'email' | 'external'
  apply_email?: string
  apply_url?: string
  apply_instructions?: string
  category?: string
  meta_title?: string
  meta_description?: string
  turnstile_token?: string
}

export interface UpdateJobData extends Partial<CreateJobData> {}

export interface JobFilters {
  status?: JobStatus
  search?: string
  page?: number
  page_size?: number
  ordering?: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

// =============================================================================
// Billing Types
// =============================================================================

export interface Package {
  id: number
  name: string
  slug: string
  description: string
  package_type?: 'one_time' | 'bundle' | 'subscription'
  price: number
  currency: string
  billing_period: string
  credits: number
  /** Alias for credits — returned by the serializer for convenience */
  job_credits: number
  post_duration_days: number
  featured_credits: number
  social_credits: number
  priority_support?: boolean
  team_management: boolean
  features: string[]
  is_popular: boolean
  is_active: boolean
  sort_order?: number
}

export interface Entitlement {
  id: number
  type: 'job_post' | 'featured' | 'social'
  total: number
  used: number
  remaining: number
  expires_at: string | null
  source: string
  created_at: string
}

export interface EntitlementSummary {
  total_credits: number
  used_credits: number
  remaining_credits: number
  total_featured_credits: number
  remaining_featured_credits: number
  total_social_credits: number
  remaining_social_credits: number
  active_entitlements: number
  expiring_soon: {
    count: number
    days: number
  }
  has_team_management: boolean
  post_duration_days: number
}

export type PaymentMethodType = 'visa' | 'mastercard' | 'amex' | 'discover' | 'unknown'

export interface PaymentMethod {
  id: string
  type: PaymentMethodType
  last4: string
  exp_month: number
  exp_year: number
  is_default: boolean
  cardholder_name: string | null
}

export interface Invoice {
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

export interface Subscription {
  id: string
  status: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing'
  plan: Package
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
}

export interface CheckoutSession {
  id: string
  url: string
  client_secret: string
}

export interface CheckoutItem {
  package_id?: number
  credit_pack_id?: number
  quantity?: number
}

export interface CheckoutSessionResult {
  id: string
  status: 'complete' | 'expired' | 'open'
  payment_status: 'paid' | 'unpaid' | 'no_payment_required'
  order_id: string
  customer_email: string
  amount_total: number
  credits_added: number
  items: {
    name: string
    quantity: number
    credits: number
    amount: number
  }[]
}

// =============================================================================
// Application Types
// =============================================================================

export type ApplicationStatus = 'pending' | 'reviewing' | 'shortlisted' | 'interviewed' | 'offered' | 'hired' | 'rejected' | 'withdrawn'

export interface ApplicationCandidate {
  id: number
  email: string
  first_name: string
  last_name: string
  full_name: string
  avatar: string | null
  phone: string | null
}

export interface Application {
  id: number
  job: JobListItem
  candidate: ApplicationCandidate
  status: ApplicationStatus
  rating: number | null
  notes: string | null
  resume: string | null
  cover_letter: string | null
  created_at: string
  status_changed_at: string
  last_contact_at: string | null
  timeline: Array<{ event: string; created_at: string }>
}

export interface ApplicationListItem {
  id: number
  job: number
  job_title: string
  candidate: number
  candidate_name: string
  candidate_email: string
  status: ApplicationStatus
  rating: number | null
  created_at: string
  status_changed_at: string
}

export interface ApplicationFilters {
  job_id?: number
  status?: ApplicationStatus
  search?: string
  page?: number
  page_size?: number
}

export interface UpdateApplicationData {
  status?: ApplicationStatus
  notes?: string
  rating?: number | null
}

export interface ApplicationMessage {
  id: number
  sender: number
  sender_name: string
  sender_role: string
  content: string
  is_read: boolean
  read_at: string | null
  created_at: string
}

// =============================================================================
// Notification Types
// =============================================================================

export type NotificationType =
  | 'application_received'
  | 'application_status'
  | 'job_expired'
  | 'job_expiring'
  | 'credits_low'
  | 'credits_expiring'
  | 'team_invite'
  | 'payment_success'
  | 'payment_failed'
  | 'system'

export interface Notification {
  id: number
  type: NotificationType
  title: string
  message: string
  read: boolean
  created_at: string
  data: Record<string, unknown>
}

export interface NotificationFilters {
  read?: boolean
  type?: NotificationType
  page?: number
  page_size?: number
}

export interface NotificationPreferences {
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
// Social Types
// =============================================================================

export type SocialPlatform = 'linkedin' | 'twitter' | 'facebook'

export interface SocialAccount {
  id: number
  platform: SocialPlatform
  account_name: string
  account_id: string
  is_connected: boolean
  connected_at: string
}

export interface SocialPost {
  id: number
  job_id: number
  platform: SocialPlatform
  content: string
  status: 'pending' | 'posted' | 'failed'
  posted_at: string | null
  error_message: string | null
}

export interface CreateSocialPostData {
  job_id: number
  platform: SocialPlatform
  content: string
}

export interface ConnectSocialData {
  platform: SocialPlatform
  oauth_code: string
  redirect_uri: string
}
