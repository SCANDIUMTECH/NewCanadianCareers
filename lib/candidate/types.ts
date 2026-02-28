/**
 * TypeScript types for candidate data.
 * Matches backend serializers from apps/accounts/, apps/applications/
 */

import type { PaginatedResponse } from '@/lib/company/types'
import type { Session } from '@/lib/auth/types'

// Re-export for convenience
export type { PaginatedResponse, Session }

// =============================================================================
// Profile Types
// =============================================================================

export interface Resume {
  id: number
  file_url: string
  file_name: string
  file_size: number
  uploaded_at: string
}

export interface CandidateProfile {
  id: number
  email: string
  first_name: string
  last_name: string
  full_name: string
  phone: string | null
  avatar: string | null
  bio: string | null
  headline: string | null
  preferred_locations: string[]
  preferred_keywords: string[]
  remote_preference: 'remote-only' | 'remote-first' | 'hybrid' | 'onsite-only' | null
  open_to_work: boolean
  resume: Resume | null
  email_verified: boolean
  created_at: string
  last_login: string | null
}

export interface CandidateProfileUpdate {
  first_name?: string
  last_name?: string
  phone?: string | null
  bio?: string | null
  headline?: string | null
  preferred_locations?: string[]
  preferred_keywords?: string[]
  remote_preference?: 'remote-only' | 'remote-first' | 'hybrid' | 'onsite-only' | null
  open_to_work?: boolean
}

// =============================================================================
// Application Types
// =============================================================================

export type CandidateApplicationStatus =
  | 'submitted'
  | 'reviewing'
  | 'shortlisted'
  | 'interviewing'
  | 'offered'
  | 'hired'
  | 'rejected'
  | 'withdrawn'

export interface ApplicationJob {
  id: number
  job_id: string
  title: string
  slug: string
  company_name: string
  company_logo: string | null
  location: string
  salary_display: string | null
  employment_type: string
}

export interface ApplicationTimelineEvent {
  id: number
  event: string
  old_value: string | null
  new_value: string | null
  notes: string | null
  created_by_name: string | null
  created_at: string
}

export interface CandidateApplicationMessage {
  id: number
  sender: 'company' | 'candidate'
  content: string
  is_read: boolean
  created_at: string
}

export interface CandidateApplication {
  id: number
  job: ApplicationJob
  status: CandidateApplicationStatus
  created_at: string
  status_changed_at: string
  last_contact_at: string | null
  timeline: ApplicationTimelineEvent[]
  has_unread_messages: boolean
  cover_letter: string | null
  resume_url: string | null
}

export interface CandidateApplicationListItem {
  id: number
  job: ApplicationJob
  status: CandidateApplicationStatus
  created_at: string
  status_changed_at: string
  has_unread_messages: boolean
}

export interface CandidateApplicationFilters {
  status?: CandidateApplicationStatus
  search?: string
  page?: number
  page_size?: number
}

// =============================================================================
// Saved Jobs Types
// =============================================================================

export interface SavedJobInfo {
  id: number
  job_id: string
  title: string
  slug: string
  company_name: string
  company_logo: string | null
  location: string
  salary_display: string | null
  employment_type: string
  experience_level: string
  posted_at: string
  expires_at: string | null
  skills: string[]
  is_new: boolean
}

export interface SavedJob {
  id: number
  job: SavedJobInfo
  notes: string | null
  created_at: string
}

export interface SavedJobFilters {
  search?: string
  sort?: 'date_saved' | 'posted_at' | 'expiring_soon'
  page?: number
  page_size?: number
}

export interface SaveJobData {
  job_id: number
  notes?: string
}

// =============================================================================
// Job Alert Types
// =============================================================================

export interface JobAlertQuery {
  search?: string
  location?: string
  location_type?: 'remote' | 'onsite' | 'hybrid'
  employment_type?: string[]
  experience_level?: string[]
  salary_min?: number
  category?: string
}

export interface JobAlert {
  id: number
  name: string
  query: JobAlertQuery
  frequency: 'daily' | 'weekly' | 'off'
  enabled: boolean
  match_count: number
  last_sent_at: string | null
  created_at: string
}

export interface JobAlertCreate {
  name: string
  query: JobAlertQuery
  frequency: 'daily' | 'weekly' | 'off'
  enabled?: boolean
}

export interface JobAlertUpdate {
  name?: string
  query?: JobAlertQuery
  frequency?: 'daily' | 'weekly' | 'off'
  enabled?: boolean
}

// =============================================================================
// Settings Types
// =============================================================================

export interface CandidateNotificationPreferences {
  email_application_status: boolean
  email_job_alerts: boolean
  email_messages: boolean
  email_job_expired: boolean
  email_marketing: boolean
  push_enabled: boolean
}

export interface PrivacySettings {
  resume_visibility: 'public' | 'employers' | 'private'
  profile_indexable: boolean
  show_open_to_work: boolean
}

export interface CandidateSettings {
  notifications: CandidateNotificationPreferences
  privacy: PrivacySettings
}


// =============================================================================
// Notification Types
// =============================================================================

export type CandidateNotificationType =
  | 'application_status'
  | 'job_alert'
  | 'message'
  | 'job_expired'
  | 'system'

export interface CandidateNotification {
  id: number
  notification_type: CandidateNotificationType
  title: string
  message: string
  data: Record<string, unknown>
  link: string | null
  is_read: boolean
  read_at: string | null
  created_at: string
}

export interface CandidateNotificationFilters {
  is_read?: boolean
  notification_type?: CandidateNotificationType
  page?: number
  page_size?: number
}

// =============================================================================
// Dashboard Types
// =============================================================================

export interface DashboardStats {
  total_applications: number
  active_applications: number
  saved_jobs: number
  profile_views: number
  unread_messages: number
}

export interface ProfileCompletion {
  percentage: number
  missing_fields: string[]
  completed_fields: string[]
}

// =============================================================================
// Context Types
// =============================================================================

export interface CandidateContextValue {
  profile: CandidateProfile | null
  savedJobsCount: number
  applicationsCount: number
  unreadNotifications: number
  unreadMessages: number
  isLoading: boolean
  error: Error | null
  refreshProfile: () => Promise<void>
  refreshCounts: () => Promise<void>
  refreshNotifications: () => Promise<void>
  refreshAll: () => Promise<void>
}
