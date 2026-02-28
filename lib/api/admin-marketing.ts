/**
 * Admin Marketing API module.
 * Handles audience management, segmentation, consent tracking, and campaigns.
 */
import { apiClient } from './client'
import type { PaginatedResponse } from '@/lib/admin/types'

// ─── Types ────────────────────────────────────────────────────────

export interface MarketingConsent {
  id: number
  user: number
  user_email: string
  user_name: string
  status: ConsentStatus
  source: string
  consented_at: string | null
  withdrawn_at: string | null
  ip_address: string | null
  express_consent: boolean
  consent_proof: string
  created_at: string
  updated_at: string
}

export type ConsentStatus = 'opted_in' | 'opted_out' | 'unsubscribed' | 'bounced' | 'complained'

export interface SuppressionEntry {
  id: number
  email: string
  user: number | null
  user_email: string | null
  reason: SuppressionReason
  source: string
  notes: string
  created_at: string
}

export type SuppressionReason = 'bounce_hard' | 'bounce_soft' | 'complaint' | 'unsubscribe' | 'admin' | 'compliance'

export interface Segment {
  id: number
  name: string
  slug: string
  description: string
  segment_type: 'static' | 'dynamic'
  filter_rules: SegmentFilterRules
  estimated_size: number
  last_computed_at: string | null
  member_count: number
  created_by: number | null
  created_by_email: string | null
  created_at: string
  updated_at: string
}

export interface SegmentFilterRules {
  rules: SegmentRule[]
  logic: 'AND' | 'OR'
}

export interface SegmentRule {
  field: string
  op: 'eq' | 'neq' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'exists' | 'is_null'
  value: string | string[] | number | boolean
}

export interface SegmentPreview {
  estimated_count: number
  sample_users: Array<{
    id: number
    email: string
    first_name: string
    last_name: string
    role: string
    status: string
  }>
}

export interface AudienceOverview {
  total_contacts: number
  opted_in: number
  opted_out: number
  suppressed_count: number
  segment_count: number
  consent_rate: number
}

export interface SuppressionImportResult {
  created: number
  skipped: number
  total: number
}

export interface ConsentFilters {
  status?: ConsentStatus
  source?: string
  search?: string
  page?: number
}

export interface SuppressionFilters {
  reason?: SuppressionReason
  search?: string
  page?: number
}

export interface SegmentFilters {
  segment_type?: 'static' | 'dynamic'
  search?: string
  page?: number
}

// ─── Audience Overview ────────────────────────────────────────────

export async function getAudienceOverview(): Promise<AudienceOverview> {
  return apiClient<AudienceOverview>('/api/admin/marketing/audiences/overview/')
}

// ─── Consents ─────────────────────────────────────────────────────

export async function getConsents(filters?: ConsentFilters): Promise<PaginatedResponse<MarketingConsent>> {
  const params = new URLSearchParams()
  if (filters?.status) params.set('status', filters.status)
  if (filters?.source) params.set('source', filters.source)
  if (filters?.search) params.set('search', filters.search)
  if (filters?.page) params.set('page', String(filters.page))
  const query = params.toString()
  return apiClient<PaginatedResponse<MarketingConsent>>(`/api/admin/marketing/audiences/consents/${query ? `?${query}` : ''}`)
}

export async function updateConsent(id: number, data: { status: ConsentStatus; source?: string }): Promise<MarketingConsent> {
  return apiClient<MarketingConsent>(`/api/admin/marketing/audiences/consents/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

// ─── Suppression List ─────────────────────────────────────────────

export async function getSuppressionList(filters?: SuppressionFilters): Promise<PaginatedResponse<SuppressionEntry>> {
  const params = new URLSearchParams()
  if (filters?.reason) params.set('reason', filters.reason)
  if (filters?.search) params.set('search', filters.search)
  if (filters?.page) params.set('page', String(filters.page))
  const query = params.toString()
  return apiClient<PaginatedResponse<SuppressionEntry>>(`/api/admin/marketing/audiences/suppression/${query ? `?${query}` : ''}`)
}

export async function addSuppression(data: { email: string; reason: SuppressionReason; source?: string; notes?: string }): Promise<SuppressionEntry> {
  return apiClient<SuppressionEntry>('/api/admin/marketing/audiences/suppression/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function removeSuppression(id: number): Promise<void> {
  await apiClient(`/api/admin/marketing/audiences/suppression/${id}/`, {
    method: 'DELETE',
  })
}

export async function importSuppressions(data: { emails: string[]; reason: SuppressionReason; source?: string }): Promise<SuppressionImportResult> {
  return apiClient<SuppressionImportResult>('/api/admin/marketing/audiences/suppression/import/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// ─── Segments ─────────────────────────────────────────────────────

export async function getSegments(filters?: SegmentFilters): Promise<PaginatedResponse<Segment>> {
  const params = new URLSearchParams()
  if (filters?.segment_type) params.set('segment_type', filters.segment_type)
  if (filters?.search) params.set('search', filters.search)
  if (filters?.page) params.set('page', String(filters.page))
  const query = params.toString()
  return apiClient<PaginatedResponse<Segment>>(`/api/admin/marketing/audiences/segments/${query ? `?${query}` : ''}`)
}

export async function getSegment(id: number): Promise<Segment> {
  return apiClient<Segment>(`/api/admin/marketing/audiences/segments/${id}/`)
}

export async function createSegment(data: {
  name: string
  description?: string
  segment_type: 'static' | 'dynamic'
  filter_rules?: SegmentFilterRules
}): Promise<Segment> {
  return apiClient<Segment>('/api/admin/marketing/audiences/segments/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateSegment(id: number, data: Partial<{
  name: string
  description: string
  filter_rules: SegmentFilterRules
}>): Promise<Segment> {
  return apiClient<Segment>(`/api/admin/marketing/audiences/segments/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteSegment(id: number): Promise<void> {
  await apiClient(`/api/admin/marketing/audiences/segments/${id}/`, {
    method: 'DELETE',
  })
}

export async function previewSegment(id: number): Promise<SegmentPreview> {
  return apiClient<SegmentPreview>(`/api/admin/marketing/audiences/segments/${id}/preview/`, {
    method: 'POST',
  })
}

export async function refreshSegment(id: number): Promise<{ estimated_size: number; last_computed_at: string }> {
  return apiClient<{ estimated_size: number; last_computed_at: string }>(`/api/admin/marketing/audiences/segments/${id}/refresh/`, {
    method: 'POST',
  })
}

// ─── Campaign Types ──────────────────────────────────────────────────

export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'pending_approval'
  | 'approved'
  | 'sending'
  | 'sent'
  | 'paused'
  | 'canceled'
  | 'failed'

export interface CampaignVariant {
  id: number
  name: string
  subject_line: string
  preheader: string
  template: number | null
  template_name: string | null
  weight: number
  is_winner: boolean
  sent_count: number
  delivered_count: number
  opened_count: number
  clicked_count: number
  bounced_count: number
  created_at: string
}

export interface Campaign {
  id: number
  name: string
  slug: string
  status: CampaignStatus
  segment: number | null
  segment_name: string | null
  template: number | null
  template_name: string | null
  subject_line: string
  preheader: string
  from_name: string
  from_email: string
  reply_to: string
  personalization_schema: Record<string, unknown>
  scheduled_at: string | null
  started_at: string | null
  completed_at: string | null
  is_ab_test: boolean
  requires_approval: boolean
  approved_by: number | null
  approved_by_email: string | null
  approved_at: string | null
  total_recipients: number
  sent_count: number
  delivered_count: number
  opened_count: number
  clicked_count: number
  bounced_count: number
  complained_count: number
  unsubscribed_count: number
  failed_count: number
  open_rate: number
  click_rate: number
  bounce_rate: number
  variants: CampaignVariant[]
  created_by: number | null
  created_by_email: string | null
  created_at: string
  updated_at: string
}

export interface CampaignRecipient {
  id: number
  user: number
  user_email: string
  user_name: string
  variant: number | null
  status: string
  sent_at: string | null
  delivered_at: string | null
  opened_at: string | null
  clicked_at: string | null
  created_at: string
}

export interface CampaignStats {
  total_recipients: number
  sent_count: number
  delivered_count: number
  opened_count: number
  clicked_count: number
  bounced_count: number
  complained_count: number
  unsubscribed_count: number
  failed_count: number
  open_rate: number
  click_rate: number
  bounce_rate: number
}

export interface CampaignFilters {
  status?: CampaignStatus
  is_ab_test?: boolean
  search?: string
  page?: number
}

export interface CampaignCreateData {
  name: string
  segment?: number | null
  template?: number | null
  subject_line?: string
  preheader?: string
  from_name?: string
  from_email?: string
  reply_to?: string
  personalization_schema?: Record<string, unknown>
  scheduled_at?: string | null
  is_ab_test?: boolean
  requires_approval?: boolean
}

// ─── Campaign API ────────────────────────────────────────────────────

export async function getCampaigns(filters?: CampaignFilters): Promise<PaginatedResponse<Campaign>> {
  const params = new URLSearchParams()
  if (filters?.status) params.set('status', filters.status)
  if (filters?.is_ab_test !== undefined) params.set('is_ab_test', String(filters.is_ab_test))
  if (filters?.search) params.set('search', filters.search)
  if (filters?.page) params.set('page', String(filters.page))
  const query = params.toString()
  return apiClient<PaginatedResponse<Campaign>>(`/api/admin/marketing/campaigns/${query ? `?${query}` : ''}`)
}

export async function getCampaign(id: number): Promise<Campaign> {
  return apiClient<Campaign>(`/api/admin/marketing/campaigns/${id}/`)
}

export async function createCampaign(data: CampaignCreateData): Promise<Campaign> {
  return apiClient<Campaign>('/api/admin/marketing/campaigns/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateCampaign(id: number, data: Partial<CampaignCreateData>): Promise<Campaign> {
  return apiClient<Campaign>(`/api/admin/marketing/campaigns/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteCampaign(id: number): Promise<void> {
  await apiClient(`/api/admin/marketing/campaigns/${id}/`, {
    method: 'DELETE',
  })
}

export async function scheduleCampaign(id: number, scheduled_at: string): Promise<Campaign> {
  return apiClient<Campaign>(`/api/admin/marketing/campaigns/${id}/schedule/`, {
    method: 'POST',
    body: JSON.stringify({ scheduled_at }),
  })
}

export async function sendCampaign(id: number): Promise<Campaign> {
  return apiClient<Campaign>(`/api/admin/marketing/campaigns/${id}/send/`, {
    method: 'POST',
  })
}

export async function pauseCampaign(id: number): Promise<Campaign> {
  return apiClient<Campaign>(`/api/admin/marketing/campaigns/${id}/pause/`, {
    method: 'POST',
  })
}

export async function cancelCampaign(id: number): Promise<Campaign> {
  return apiClient<Campaign>(`/api/admin/marketing/campaigns/${id}/cancel/`, {
    method: 'POST',
  })
}

export async function duplicateCampaign(id: number): Promise<Campaign> {
  return apiClient<Campaign>(`/api/admin/marketing/campaigns/${id}/duplicate/`, {
    method: 'POST',
  })
}

export async function approveCampaign(id: number): Promise<Campaign> {
  return apiClient<Campaign>(`/api/admin/marketing/campaigns/${id}/approve/`, {
    method: 'POST',
  })
}

export async function getCampaignRecipients(id: number, filters?: { status?: string; page?: number }): Promise<PaginatedResponse<CampaignRecipient>> {
  const params = new URLSearchParams()
  if (filters?.status) params.set('status', filters.status)
  if (filters?.page) params.set('page', String(filters.page))
  const query = params.toString()
  return apiClient<PaginatedResponse<CampaignRecipient>>(`/api/admin/marketing/campaigns/${id}/recipients/${query ? `?${query}` : ''}`)
}

export async function getCampaignStats(id: number): Promise<CampaignStats> {
  return apiClient<CampaignStats>(`/api/admin/marketing/campaigns/${id}/stats/`)
}

export async function testSendCampaign(id: number, email: string): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/api/admin/marketing/campaigns/${id}/test-send/`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function selectABWinner(campaignId: number, variantId: number): Promise<CampaignVariant> {
  return apiClient<CampaignVariant>(`/api/admin/marketing/campaigns/${campaignId}/ab-winner/`, {
    method: 'POST',
    body: JSON.stringify({ variant_id: variantId }),
  })
}

// ─── Coupon Types ───────────────────────────────────────────────────

export type CouponDiscountType = 'percentage' | 'fixed' | 'credits' | 'free_trial'
export type CouponDistribution = 'public' | 'private' | 'url' | 'campaign'
export type CouponStatus = 'active' | 'paused' | 'expired' | 'exhausted'

export interface Coupon {
  id: number
  name: string
  code: string
  description: string
  discount_type: CouponDiscountType
  discount_value: number
  max_discount_amount: number | null
  distribution: CouponDistribution
  status: CouponStatus
  min_purchase: number | null
  max_uses_total: number | null
  max_uses_per_customer: number
  uses_count: number
  applicable_package_ids: number[]
  eligibility_rules: Record<string, unknown>
  starts_at: string | null
  expires_at: string | null
  campaign: number | null
  one_per_ip: boolean
  require_verified_email: boolean
  legacy_promo_code: number | null
  redemption_count: number
  created_by: number | null
  created_by_email: string | null
  created_at: string
  updated_at: string
}

export interface CouponCreateData {
  name: string
  code: string
  description?: string
  discount_type: CouponDiscountType
  discount_value: number
  max_discount_amount?: number | null
  distribution?: CouponDistribution
  status?: CouponStatus
  min_purchase?: number | null
  max_uses_total?: number | null
  max_uses_per_customer?: number
  applicable_package_ids?: number[]
  eligibility_rules?: Record<string, unknown>
  starts_at?: string | null
  expires_at?: string | null
  campaign?: number | null
  one_per_ip?: boolean
  require_verified_email?: boolean
}

export interface CouponRedemption {
  id: number
  coupon: number
  coupon_code: string
  user: number
  user_email: string
  user_name: string
  company: number | null
  agency: number | null
  invoice: number | null
  discount_amount: number
  credits_granted: number
  ip_address: string | null
  created_at: string
}

export interface CouponStats {
  total_redemptions: number
  unique_users: number
  total_discount_given: number
  total_credits_granted: number
  remaining_uses: number | null
  conversion_rate: number
}

export interface CouponFilters {
  status?: CouponStatus
  distribution?: CouponDistribution
  discount_type?: CouponDiscountType
  search?: string
  page?: number
}

// ─── Store Credit Types ─────────────────────────────────────────────

export interface StoreCreditWallet {
  id: number
  company: number | null
  company_name: string | null
  agency: number | null
  agency_name: string | null
  owner_type: 'company' | 'agency'
  owner_name: string | null
  balance: number
  created_at: string
  updated_at: string
}

export interface StoreCreditTransaction {
  id: number
  wallet: number
  transaction_type: 'credit' | 'debit' | 'refund' | 'expired'
  amount: number
  balance_after: number
  description: string
  coupon: number | null
  invoice: number | null
  admin: number | null
  admin_email: string | null
  expires_at: string | null
  created_at: string
}

export interface WalletFilters {
  search?: string
  page?: number
}

// ─── Coupon API ─────────────────────────────────────────────────────

export async function getCoupons(filters?: CouponFilters): Promise<PaginatedResponse<Coupon>> {
  const params = new URLSearchParams()
  if (filters?.status) params.set('status', filters.status)
  if (filters?.distribution) params.set('distribution', filters.distribution)
  if (filters?.discount_type) params.set('discount_type', filters.discount_type)
  if (filters?.search) params.set('search', filters.search)
  if (filters?.page) params.set('page', String(filters.page))
  const query = params.toString()
  return apiClient<PaginatedResponse<Coupon>>(`/api/admin/marketing/coupons/${query ? `?${query}` : ''}`)
}

export async function getCoupon(id: number): Promise<Coupon> {
  return apiClient<Coupon>(`/api/admin/marketing/coupons/${id}/`)
}

export async function createCoupon(data: CouponCreateData): Promise<Coupon> {
  return apiClient<Coupon>('/api/admin/marketing/coupons/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateCoupon(id: number, data: Partial<CouponCreateData>): Promise<Coupon> {
  return apiClient<Coupon>(`/api/admin/marketing/coupons/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteCoupon(id: number): Promise<void> {
  await apiClient(`/api/admin/marketing/coupons/${id}/`, {
    method: 'DELETE',
  })
}

export async function pauseCoupon(id: number): Promise<Coupon> {
  return apiClient<Coupon>(`/api/admin/marketing/coupons/${id}/pause/`, {
    method: 'POST',
  })
}

export async function activateCoupon(id: number): Promise<Coupon> {
  return apiClient<Coupon>(`/api/admin/marketing/coupons/${id}/activate/`, {
    method: 'POST',
  })
}

export async function duplicateCoupon(id: number): Promise<Coupon> {
  return apiClient<Coupon>(`/api/admin/marketing/coupons/${id}/duplicate/`, {
    method: 'POST',
  })
}

export async function getCouponRedemptions(id: number, page?: number): Promise<PaginatedResponse<CouponRedemption>> {
  const params = new URLSearchParams()
  if (page) params.set('page', String(page))
  const query = params.toString()
  return apiClient<PaginatedResponse<CouponRedemption>>(`/api/admin/marketing/coupons/${id}/redemptions/${query ? `?${query}` : ''}`)
}

export async function getCouponStats(id: number): Promise<CouponStats> {
  return apiClient<CouponStats>(`/api/admin/marketing/coupons/${id}/stats/`)
}

// ─── Store Credit API ───────────────────────────────────────────────

export async function getWallets(filters?: WalletFilters): Promise<PaginatedResponse<StoreCreditWallet>> {
  const params = new URLSearchParams()
  if (filters?.search) params.set('search', filters.search)
  if (filters?.page) params.set('page', String(filters.page))
  const query = params.toString()
  return apiClient<PaginatedResponse<StoreCreditWallet>>(`/api/admin/marketing/credits/wallets/${query ? `?${query}` : ''}`)
}

export async function getWallet(id: number): Promise<StoreCreditWallet> {
  return apiClient<StoreCreditWallet>(`/api/admin/marketing/credits/wallets/${id}/`)
}

export async function getWalletTransactions(id: number, page?: number): Promise<PaginatedResponse<StoreCreditTransaction>> {
  const params = new URLSearchParams()
  if (page) params.set('page', String(page))
  const query = params.toString()
  return apiClient<PaginatedResponse<StoreCreditTransaction>>(`/api/admin/marketing/credits/wallets/${id}/transactions/${query ? `?${query}` : ''}`)
}

export async function issueCredit(walletId: number, data: { amount: number; description: string }): Promise<StoreCreditTransaction> {
  return apiClient<StoreCreditTransaction>(`/api/admin/marketing/credits/wallets/${walletId}/issue/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// ─── Journey Types ────────────────────────────────────────────────

export type JourneyStatus = 'draft' | 'active' | 'paused' | 'archived'
export type JourneyTriggerType = 'user_signup' | 'package_purchase' | 'job_published' | 'manual' | 'segment_entry'
export type JourneyStepType = 'send_email' | 'wait' | 'condition' | 'issue_coupon' | 'add_tag' | 'remove_tag' | 'update_attribute' | 'add_to_segment' | 'webhook'
export type JourneyEnrollmentStatus = 'active' | 'completed' | 'exited_goal' | 'exited_manual' | 'failed'

export interface JourneyStep {
  id: number
  journey: number
  step_type: JourneyStepType
  name: string
  sort_order: number
  config: Record<string, unknown>
  next_step: number | null
  true_branch: number | null
  false_branch: number | null
  created_at: string
  updated_at: string
}

export interface Journey {
  id: number
  name: string
  slug: string
  status: JourneyStatus
  description: string
  trigger_type: JourneyTriggerType
  trigger_config: Record<string, unknown>
  max_entries_per_user: number
  cooldown_hours: number
  goal_type: string
  goal_config: Record<string, unknown>
  active_enrollments_count: number
  completed_enrollments_count: number
  total_enrollments_count: number
  steps: JourneyStep[]
  step_count: number
  created_by: number | null
  created_by_email: string | null
  created_at: string
  updated_at: string
}

export interface JourneyListItem {
  id: number
  name: string
  slug: string
  status: JourneyStatus
  description: string
  trigger_type: JourneyTriggerType
  active_enrollments_count: number
  completed_enrollments_count: number
  total_enrollments_count: number
  step_count: number
  created_by: number | null
  created_by_email: string | null
  created_at: string
  updated_at: string
}

export interface JourneyCreateData {
  name: string
  description?: string
  trigger_type: JourneyTriggerType
  trigger_config?: Record<string, unknown>
  max_entries_per_user?: number
  cooldown_hours?: number
  goal_type?: string
  goal_config?: Record<string, unknown>
}

export interface JourneyEnrollment {
  id: number
  journey: number
  user: number
  user_email: string
  user_name: string
  status: JourneyEnrollmentStatus
  current_step: number | null
  current_step_name: string | null
  next_action_at: string | null
  entered_at: string
  completed_at: string | null
  created_at: string
}

export interface JourneyStepLog {
  id: number
  enrollment: number
  step: number
  step_name: string | null
  step_type: JourneyStepType
  status: 'success' | 'failed' | 'skipped'
  result: Record<string, unknown>
  executed_at: string
}

export interface JourneyStats {
  total_enrollments: number
  active_enrollments: number
  completed_enrollments: number
  exited_goal: number
  exited_manual: number
  failed_enrollments: number
  emails_sent: number
  coupons_issued: number
}

export interface JourneyFilters {
  search?: string
  status?: JourneyStatus
  trigger_type?: JourneyTriggerType
  page?: number
}

export interface JourneyStepCreateData {
  step_type: JourneyStepType
  name: string
  sort_order: number
  config?: Record<string, unknown>
  next_step?: number | null
  true_branch?: number | null
  false_branch?: number | null
}

export interface BulkStepData extends JourneyStepCreateData {
  temp_id: string
  next_step_ref?: string | null
  true_branch_ref?: string | null
  false_branch_ref?: string | null
}

// ─── Journey API ──────────────────────────────────────────────────

export async function getJourneys(filters?: JourneyFilters): Promise<PaginatedResponse<JourneyListItem>> {
  const params = new URLSearchParams()
  if (filters?.search) params.set('search', filters.search)
  if (filters?.status) params.set('status', filters.status)
  if (filters?.trigger_type) params.set('trigger_type', filters.trigger_type)
  if (filters?.page) params.set('page', String(filters.page))
  const query = params.toString()
  return apiClient<PaginatedResponse<JourneyListItem>>(`/api/admin/marketing/journeys/${query ? `?${query}` : ''}`)
}

export async function getJourney(id: number): Promise<Journey> {
  return apiClient<Journey>(`/api/admin/marketing/journeys/${id}/`)
}

export async function createJourney(data: JourneyCreateData): Promise<Journey> {
  return apiClient<Journey>('/api/admin/marketing/journeys/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateJourney(id: number, data: Partial<JourneyCreateData>): Promise<Journey> {
  return apiClient<Journey>(`/api/admin/marketing/journeys/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteJourney(id: number): Promise<void> {
  await apiClient(`/api/admin/marketing/journeys/${id}/`, {
    method: 'DELETE',
  })
}

export async function activateJourney(id: number): Promise<Journey> {
  return apiClient<Journey>(`/api/admin/marketing/journeys/${id}/activate/`, {
    method: 'POST',
  })
}

export async function pauseJourney(id: number): Promise<Journey> {
  return apiClient<Journey>(`/api/admin/marketing/journeys/${id}/pause/`, {
    method: 'POST',
  })
}

export async function archiveJourney(id: number): Promise<Journey> {
  return apiClient<Journey>(`/api/admin/marketing/journeys/${id}/archive/`, {
    method: 'POST',
  })
}

export async function duplicateJourney(id: number): Promise<Journey> {
  return apiClient<Journey>(`/api/admin/marketing/journeys/${id}/duplicate/`, {
    method: 'POST',
  })
}

export async function getJourneyEnrollments(id: number, filters?: { status?: JourneyEnrollmentStatus; page?: number }): Promise<PaginatedResponse<JourneyEnrollment>> {
  const params = new URLSearchParams()
  if (filters?.status) params.set('status', filters.status)
  if (filters?.page) params.set('page', String(filters.page))
  const query = params.toString()
  return apiClient<PaginatedResponse<JourneyEnrollment>>(`/api/admin/marketing/journeys/${id}/enrollments/${query ? `?${query}` : ''}`)
}

export async function getJourneyStats(id: number): Promise<JourneyStats> {
  return apiClient<JourneyStats>(`/api/admin/marketing/journeys/${id}/stats/`)
}

export async function getJourneySteps(id: number): Promise<JourneyStep[]> {
  return apiClient<JourneyStep[]>(`/api/admin/marketing/journeys/${id}/steps/`)
}

export async function createJourneyStep(journeyId: number, data: JourneyStepCreateData): Promise<JourneyStep> {
  return apiClient<JourneyStep>(`/api/admin/marketing/journeys/${journeyId}/steps/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateJourneyStep(journeyId: number, stepId: number, data: Partial<JourneyStepCreateData>): Promise<JourneyStep> {
  return apiClient<JourneyStep>(`/api/admin/marketing/journeys/${journeyId}/steps/${stepId}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteJourneyStep(journeyId: number, stepId: number): Promise<void> {
  await apiClient(`/api/admin/marketing/journeys/${journeyId}/steps/${stepId}/`, {
    method: 'DELETE',
  })
}

export async function bulkUpdateJourneySteps(journeyId: number, steps: BulkStepData[]): Promise<JourneyStep[]> {
  return apiClient<JourneyStep[]>(`/api/admin/marketing/journeys/${journeyId}/steps/bulk/`, {
    method: 'POST',
    body: JSON.stringify({ steps }),
  })
}

// ─── Reporting Types ──────────────────────────────────────────────

export interface MarketingOverview {
  // Campaign
  campaigns_total: number
  campaigns_sent: number
  campaigns_active: number
  total_emails_sent: number
  total_emails_delivered: number
  total_emails_opened: number
  total_emails_clicked: number
  avg_open_rate: number
  avg_click_rate: number
  // Coupon
  coupons_active: number
  total_redemptions: number
  redemptions_30d: number
  total_discount_given: number
  // Journey
  journeys_active: number
  active_enrollments: number
  completed_enrollments: number
  // Audience
  total_contacts: number
  opted_in: number
  suppressed: number
  segments_count: number
  consent_rate: number
}

export interface CampaignReport {
  id: number
  name: string
  slug: string
  status: string
  total_recipients: number
  sent_count: number
  delivered_count: number
  opened_count: number
  clicked_count: number
  bounced_count: number
  complained_count: number
  unsubscribed_count: number
  failed_count: number
  open_rate: number
  click_rate: number
  bounce_rate: number
  completed_at: string
}

export interface CouponReport {
  id: number
  name: string
  code: string
  status: string
  discount_type: string
  discount_value: number
  uses_count: number
  max_uses_total: number | null
  redemption_count: number
  unique_users: number
  total_discount: number
  total_credits: number
  created_at: string
  expires_at: string | null
}

export interface JourneyReport {
  id: number
  name: string
  slug: string
  status: string
  trigger_type: string
  enrollment_count: number
  active_count: number
  completed_count: number
  failed_count: number
  completion_rate: number
  emails_sent: number
  created_at: string
}

export interface AudienceHealth {
  consent_breakdown: Record<string, number>
  suppression_breakdown: Record<string, number>
  consent_daily: Array<{ date: string; count: number }>
  suppression_daily: Array<{ date: string; count: number }>
  total_consents: number
  total_opted_in: number
  total_suppressed: number
}

export interface RevenueAttributionItem {
  coupon_id: number
  coupon_code: string
  coupon_name: string
  discount_type: string
  redemption_count: number
  unique_users: number
  total_discount: number
  total_credits: number
}

export interface RevenueAttribution {
  by_coupon: RevenueAttributionItem[]
  total_discount: number
  total_redemptions: number
}

// ─── Reporting API ────────────────────────────────────────────────

export async function getMarketingOverview(): Promise<MarketingOverview> {
  return apiClient<MarketingOverview>('/api/admin/marketing/reports/overview/')
}

export async function getCampaignReport(days?: number): Promise<CampaignReport[]> {
  const params = new URLSearchParams()
  if (days) params.set('days', String(days))
  const query = params.toString()
  return apiClient<CampaignReport[]>(`/api/admin/marketing/reports/campaigns/${query ? `?${query}` : ''}`)
}

export async function getCouponReport(): Promise<CouponReport[]> {
  return apiClient<CouponReport[]>('/api/admin/marketing/reports/coupons/')
}

export async function getJourneyReport(): Promise<JourneyReport[]> {
  return apiClient<JourneyReport[]>('/api/admin/marketing/reports/journeys/')
}

export async function getAudienceHealth(days?: number): Promise<AudienceHealth> {
  const params = new URLSearchParams()
  if (days) params.set('days', String(days))
  const query = params.toString()
  return apiClient<AudienceHealth>(`/api/admin/marketing/reports/audience-health/${query ? `?${query}` : ''}`)
}

export async function getRevenueAttribution(): Promise<RevenueAttribution> {
  return apiClient<RevenueAttribution>('/api/admin/marketing/reports/revenue-attribution/')
}

export async function exportReport(reportType: string, filters?: Record<string, unknown>): Promise<{ detail: string }> {
  return apiClient<{ detail: string }>('/api/admin/marketing/reports/export/', {
    method: 'POST',
    body: JSON.stringify({ report_type: reportType, filters }),
  })
}

// ─── Compliance Types ─────────────────────────────────────────────

export interface ComplianceOverview {
  total_consents: number
  opted_in: number
  consent_rate: number
  total_suppressed: number
  consent_breakdown: Record<string, number>
  suppression_breakdown: Record<string, number>
  unsubscribes_30d: number
  bounces_30d: number
  complaints_30d: number
  unsubscribe_daily: Array<{ date: string; count: number }>
  suppression_daily: Array<{ date: string; count: number }>
}

export interface ConsentAuditEntry {
  id: number
  user_email: string
  user_name: string
  status: string
  source: string
  consented_at: string | null
  withdrawn_at: string | null
  express_consent: boolean
  updated_at: string
}

export interface ConsentAuditResponse {
  count: number
  page: number
  page_size: number
  results: ConsentAuditEntry[]
}

export interface DeliverabilityStats {
  total_sent_30d: number
  total_delivered_30d: number
  total_bounced_30d: number
  total_complained_30d: number
  delivery_rate: number
  bounce_rate: number
  complaint_rate: number
  open_rate: number
  click_rate: number
  campaigns_sent_30d: number
  suppression_growth: Array<{ date: string; count: number }>
}

export interface UserPreferences {
  email: string
  first_name: string
  consent_status: string
  token: string
}

// ─── Compliance API ───────────────────────────────────────────────

export async function getComplianceOverview(): Promise<ComplianceOverview> {
  return apiClient<ComplianceOverview>('/api/admin/marketing/compliance/overview/')
}

export async function getConsentAuditLog(page?: number, pageSize?: number): Promise<ConsentAuditResponse> {
  const params = new URLSearchParams()
  if (page) params.set('page', String(page))
  if (pageSize) params.set('page_size', String(pageSize))
  const query = params.toString()
  return apiClient<ConsentAuditResponse>(`/api/admin/marketing/compliance/consent-log/${query ? `?${query}` : ''}`)
}

export async function getDeliverabilityStats(): Promise<DeliverabilityStats> {
  return apiClient<DeliverabilityStats>('/api/admin/marketing/deliverability/')
}

// ─── Public Preferences API (no auth) ─────────────────────────────

export async function getPreferences(token: string): Promise<UserPreferences> {
  return apiClient<UserPreferences>(`/api/marketing/preferences/${token}/`)
}

export async function updatePreferences(token: string, status: 'opted_in' | 'unsubscribed'): Promise<{ detail: string; status: string }> {
  return apiClient<{ detail: string; status: string }>(`/api/marketing/preferences/${token}/`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function processUnsubscribe(token: string): Promise<{ detail: string; email?: string }> {
  return apiClient<{ detail: string; email?: string }>(`/api/marketing/unsubscribe/${token}/`, {
    method: 'POST',
  })
}
