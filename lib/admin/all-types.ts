/**
 * Barrel re-export for all admin types.
 *
 * This file provides a single import point for every admin type definition,
 * whether they live in the central `types.ts` or co-located with their API modules.
 *
 * Usage:
 *   import type { AdminUser, Campaign, SponsoredBanner } from '@/lib/admin/all-types'
 *
 * Types from API modules are re-exported here so consumers don't need to
 * couple their type imports to the API layer.
 */

// Core admin types (users, companies, agencies, jobs, dashboard, payments, fraud, compliance, audit, entitlements)
export type * from './types'

// Banner types
export type {
  BannerPlacement,
  SponsoredBanner,
  CreateBannerData,
  UpdateBannerData,
} from '@/lib/api/admin-banners'

// Email types
export type {
  DnsStatus,
  ProviderStatus,
  EmailLogStatus,
  TemplateStatus,
  TemplateType,
  SuggestionType,
  EmailProvider,
  EmailTrigger,
  EmailTemplate,
  EmailTemplateDetail,
  EmailLog,
  SmartSuggestion,
  EmailSettings,
  EmailOverviewStats,
  TriggerFilters,
  LogFilters,
} from '@/lib/api/admin-email'

// Social types
export type {
  SocialProviderId,
  SocialProvider,
  QueueStatus,
  QueueItem,
  SocialTemplate,
  CreateTemplateData as CreateSocialTemplateData,
  UpdateTemplateData as UpdateSocialTemplateData,
  RateLimit,
  PolicyMode,
  SocialSettings,
  SocialStats,
  ConnectProviderCredentials,
} from '@/lib/api/admin-social'

// Search & SEO types
export type {
  CoreWebVitals,
  SEOHealthMetrics,
  IndexStatus,
  CrawlHistoryItem,
  FailedIndexJob,
  GoogleJobsValidationResult,
  SitemapInfo,
  AIBotConfig,
  ReindexJob,
  IndexNowSubmission,
  SchemaTemplateSettings,
  SEOAffectedJob,
  SEOAffectedCompany,
  SEORecommendation,
  AutoFixResult,
  JobSEOFieldScore,
  JobSEOScore,
} from '@/lib/api/admin-search'

// Settings types
export type {
  PlatformSettings,
  UpdatePlatformSettingsData,
  SlackInstallation,
  SlackChannelInfo,
} from '@/lib/api/admin-settings'

// Support types (UserType/UserStatus/CompanyStatus excluded — collide with auth/types)
export type {
  SupportUserResult,
  SupportCompanyResult,
  TimelineEventType,
  TimelineEvent,
  ImpersonationSession,
  DataExportRequest,
  DataExportJob,
  SupportSearchFilters,
  CompanySearchFilters,
  TimelineFilters,
} from '@/lib/api/admin-support'

// Marketing types
export type {
  MarketingConsent,
  ConsentStatus,
  SuppressionEntry,
  SuppressionReason,
  Segment,
  SegmentFilterRules,
  SegmentRule,
  SegmentPreview,
  AudienceOverview,
  SuppressionImportResult,
  ConsentFilters,
  SuppressionFilters,
  SegmentFilters,
  CampaignStatus,
  CampaignVariant,
  Campaign,
  CampaignRecipient,
  CampaignStats,
  CampaignFilters,
  CampaignCreateData,
  CouponDiscountType,
  CouponDistribution,
  CouponStatus,
  Coupon,
  CouponCreateData,
  CouponRedemption,
  CouponStats,
  CouponFilters,
  StoreCreditWallet,
  StoreCreditTransaction,
  WalletFilters,
  JourneyStatus,
  JourneyTriggerType,
  JourneyStepType,
  JourneyEnrollmentStatus,
  JourneyStep,
  Journey,
  JourneyListItem,
  JourneyCreateData,
  JourneyEnrollment,
  JourneyStepLog,
  JourneyStats,
  JourneyFilters,
  JourneyStepCreateData,
  BulkStepData,
  MarketingOverview,
  CampaignReport,
  CouponReport,
  JourneyReport,
  AudienceHealth,
  RevenueAttributionItem,
  RevenueAttribution,
  ComplianceOverview,
  ConsentAuditEntry,
  ConsentAuditResponse,
  DeliverabilityStats,
  UserPreferences,
} from '@/lib/api/admin-marketing'

// AI types
export type {
  AIProviderType,
  AIProviderConfig,
  AIProviderConfigCreate,
  AIProviderConfigUpdate,
  AIProviderDefaults,
  AIUsageLog,
  AIUsageStats,
  SEOMetaResult,
  SocialContentResult,
  BulkSEOResult,
  AITestResult,
} from '@/lib/api/ai'

// Package types
export type {
  JobPackage,
  CreateJobPackageData,
  UpdateJobPackageData,
} from '@/lib/api/admin-packages'

// Feature flag types
export type {
  FeatureEnvironment,
  FeatureFlag,
  CreateFeatureFlagData,
  UpdateFeatureFlagData,
} from '@/lib/api/admin-features'
