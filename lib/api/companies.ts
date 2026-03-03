/**
 * Company API functions.
 * Endpoints for company profile and team management.
 */

import { apiClient } from './client'
import type {
  Company,
  CompanyProfileUpdate,
  TeamMember,
  PendingInvite,
  InviteMemberData,
  UpdateMemberData,
  PaginatedResponse,
} from '@/lib/company/types'

// =============================================================================
// Company Profile
// =============================================================================

/**
 * Get the current company profile.
 */
export async function getCompanyProfile(): Promise<Company> {
  return apiClient<Company>('/api/companies/profile/')
}

/**
 * Update the current company profile.
 */
export async function updateCompanyProfile(data: CompanyProfileUpdate): Promise<Company> {
  return apiClient<Company>('/api/companies/profile/', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Upload company logo.
 */
export async function uploadCompanyLogo(file: File): Promise<Company> {
  const formData = new FormData()
  formData.append('logo', file)

  return apiClient<Company>('/api/companies/profile/logo/', {
    method: 'POST',
    body: formData,
  })
}

/**
 * Upload company banner.
 */
export async function uploadCompanyBanner(file: File): Promise<Company> {
  const formData = new FormData()
  formData.append('banner', file)

  return apiClient<Company>('/api/companies/profile/banner/', {
    method: 'POST',
    body: formData,
  })
}

// =============================================================================
// Team Management
// =============================================================================

/**
 * Get all company team members.
 */
export async function getCompanyMembers(): Promise<TeamMember[]> {
  const response = await apiClient<PaginatedResponse<TeamMember>>('/api/companies/members/')
  return response.results
}

/**
 * Get all pending invites.
 */
export async function getPendingInvites(): Promise<PendingInvite[]> {
  const response = await apiClient<PaginatedResponse<PendingInvite>>('/api/companies/members/invites/')
  return response.results
}

/**
 * Invite a new member to the company.
 */
export async function inviteMember(data: InviteMemberData): Promise<PendingInvite> {
  return apiClient<PendingInvite>('/api/companies/members/invite/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Resend an invitation.
 */
export async function resendInvite(inviteId: number): Promise<void> {
  await apiClient(`/api/companies/members/invites/${inviteId}/resend/`, {
    method: 'POST',
  })
}

/**
 * Cancel a pending invitation.
 */
export async function cancelInvite(inviteId: number): Promise<void> {
  await apiClient(`/api/companies/members/invites/${inviteId}/`, {
    method: 'DELETE',
  })
}

/**
 * Update a team member's role or status.
 */
export async function updateMember(memberId: number, data: UpdateMemberData): Promise<TeamMember> {
  return apiClient<TeamMember>(`/api/companies/members/${memberId}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Remove a member from the company.
 */
export async function removeMember(memberId: number): Promise<void> {
  await apiClient(`/api/companies/members/${memberId}/`, {
    method: 'DELETE',
  })
}

/**
 * Transfer company ownership to another member.
 */
export async function transferOwnership(memberId: number): Promise<void> {
  await apiClient(`/api/companies/members/${memberId}/transfer-ownership/`, {
    method: 'POST',
  })
}

// =============================================================================
// Company Settings
// =============================================================================

export interface CompanyJobDefaults {
  default_apply_method: 'internal' | 'email' | 'external'
  default_apply_email: string
}

export interface CompanyNotificationPreferences {
  email_application_received: boolean
  email_job_status: boolean
  email_job_expired: boolean
  email_credits_low: boolean
  email_billing: boolean
  email_weekly_digest: boolean
  email_marketing: boolean
  push_enabled: boolean
}

export interface CompanySocialConnection {
  platform: 'linkedin' | 'twitter' | 'facebook' | 'instagram'
  connected: boolean
  account_name: string | null
  default_post: boolean
}

export interface CompanySettings {
  job_defaults: CompanyJobDefaults
  notifications: CompanyNotificationPreferences
  social_connections: CompanySocialConnection[]
}

/**
 * Get company settings.
 */
export async function getCompanySettings(): Promise<CompanySettings> {
  return apiClient<CompanySettings>('/api/companies/settings/')
}

/**
 * Update company job defaults.
 */
export async function updateJobDefaults(data: Partial<CompanyJobDefaults>): Promise<CompanyJobDefaults> {
  const res = await apiClient<{ job_defaults: CompanyJobDefaults }>('/api/companies/settings/job-defaults/', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  return res.job_defaults
}

/**
 * Get company notification preferences (shared endpoint).
 */
export async function getCompanyNotificationPreferences(): Promise<CompanyNotificationPreferences> {
  return apiClient<CompanyNotificationPreferences>('/api/notifications/preferences/')
}

/**
 * Update company notification preferences (shared endpoint).
 */
export async function updateCompanyNotifications(
  data: Partial<CompanyNotificationPreferences>
): Promise<CompanyNotificationPreferences> {
  return apiClient<CompanyNotificationPreferences>('/api/notifications/preferences/', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Connect a social platform.
 */
export async function connectSocialPlatform(
  platform: 'linkedin' | 'twitter' | 'facebook' | 'instagram'
): Promise<{ redirect_url: string }> {
  return apiClient<{ redirect_url: string }>(`/api/companies/settings/social/${platform}/connect/`, {
    method: 'POST',
  })
}

/**
 * Disconnect a social platform.
 */
export async function disconnectSocialPlatform(
  platform: 'linkedin' | 'twitter' | 'facebook' | 'instagram'
): Promise<void> {
  await apiClient(`/api/companies/settings/social/${platform}/disconnect/`, {
    method: 'POST',
  })
}

/**
 * Update social platform default post setting.
 */
export async function updateSocialDefault(
  platform: 'linkedin' | 'twitter' | 'facebook' | 'instagram',
  defaultPost: boolean
): Promise<CompanySocialConnection> {
  return apiClient<CompanySocialConnection>(`/api/companies/settings/social/${platform}/`, {
    method: 'PATCH',
    body: JSON.stringify({ default_post: defaultPost }),
  })
}
