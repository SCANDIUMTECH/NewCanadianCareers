"""
Moderation (Admin) URL patterns.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.users.views import (
    AdminUserViewSet, AdminSuspendUserView, AdminActivateUserView,
    AdminResetPasswordView, AdminUserLoginHistoryView,
    AdminVerifyUserEmailView, AdminBulkSuspendUsersView,
    AdminBulkDeleteUsersView, AdminExportUsersView,
    AdminImpersonateUserView, AdminEndImpersonationView
)
from apps.companies.views import AdminCompanyViewSet, AdminAgencyViewSet
from apps.jobs.views import AdminJobViewSet, AdminJobReportViewSet
from apps.applications.views import AdminApplicationViewSet
from apps.billing.views import AdminEntitlementViewSet, AdminInvoiceViewSet, AdminPaymentViewSet, AdminCreditPaymentMethodsView
from apps.articles.views import AdminArticleViewSet, AdminArticleCategoryViewSet
from apps.search import urls as search_urls
from . import views
from . import support_views
from . import email_views

router = DefaultRouter()
router.register(r'users', AdminUserViewSet, basename='admin-users')
router.register(r'companies', AdminCompanyViewSet, basename='admin-companies')
router.register(r'agencies', AdminAgencyViewSet, basename='admin-agencies')
router.register(r'jobs', AdminJobViewSet, basename='admin-jobs')
router.register(r'job-reports', AdminJobReportViewSet, basename='admin-job-reports')
router.register(r'applications', AdminApplicationViewSet, basename='admin-applications')
router.register(r'entitlements', AdminEntitlementViewSet, basename='admin-entitlements')
router.register(r'invoices', AdminInvoiceViewSet, basename='admin-invoices')
router.register(r'settings', views.PlatformSettingViewSet, basename='admin-settings')
router.register(r'banners', views.BannerViewSet, basename='admin-banners')
router.register(r'announcements', views.AnnouncementViewSet, basename='admin-announcements')
router.register(r'affiliates', views.AffiliateViewSet, basename='admin-affiliates')
router.register(r'fraud/alerts', views.AdminFraudAlertViewSet, basename='admin-fraud-alerts')
router.register(r'fraud/rules', views.AdminFraudRuleViewSet, basename='admin-fraud-rules')
router.register(r'compliance/requests', views.AdminComplianceRequestViewSet, basename='admin-compliance-requests')
router.register(r'compliance/retention-rules', views.AdminRetentionRuleViewSet, basename='admin-retention-rules')
router.register(r'compliance/legal-documents', views.AdminLegalDocumentViewSet, basename='admin-legal-documents')
router.register(r'payments', AdminPaymentViewSet, basename='admin-payments')
router.register(r'social/templates', views.AdminSocialTemplateViewSet, basename='admin-social-templates')
router.register(r'email/triggers', email_views.EmailTriggerViewSet, basename='admin-email-triggers')
router.register(r'email/templates', email_views.EmailTemplateViewSet, basename='admin-email-templates')
router.register(r'email/logs', email_views.EmailLogViewSet, basename='admin-email-logs')
router.register(r'sponsored-banners', views.AdminBannerViewSet, basename='admin-sponsored-banners')
router.register(r'affiliate-links', views.AdminAffiliateLinkViewSet, basename='admin-affiliate-links')
router.register(r'feature-flags', views.AdminFeatureFlagViewSet, basename='admin-feature-flags')
router.register(r'job-packages', views.AdminPackageViewSet, basename='admin-job-packages')
router.register(r'categories', views.AdminCategoryViewSet, basename='admin-categories')
router.register(r'industries', views.AdminIndustryViewSet, basename='admin-industries')
router.register(r'articles', AdminArticleViewSet, basename='admin-articles')
router.register(r'article-categories', AdminArticleCategoryViewSet, basename='admin-article-categories')

urlpatterns = [
    # Platform settings (singleton) — must come before router to avoid
    # settings/<pk> catching "platform" as a PlatformSetting lookup.
    path('settings/platform/', views.AdminPlatformSettingsView.as_view(), name='admin-platform-settings'),
    path('settings/slack/test/', views.AdminSlackTestWebhookView.as_view(), name='admin-slack-test'),
    path('settings/slack/oauth/begin/', views.AdminSlackOAuthBeginView.as_view(), name='admin-slack-oauth-begin'),
    path('settings/slack/oauth/callback/', views.AdminSlackOAuthCallbackView.as_view(), name='admin-slack-oauth-callback'),
    path('settings/slack/installation/', views.AdminSlackInstallationView.as_view(), name='admin-slack-installation'),
    path('settings/slack/channels/', views.AdminSlackChannelsView.as_view(), name='admin-slack-channels'),
    path('settings/slack/disconnect/', views.AdminSlackDisconnectView.as_view(), name='admin-slack-disconnect'),

    # Stripe key management
    path('settings/stripe/', views.AdminStripeSettingsView.as_view(), name='admin-stripe-settings'),
    path('settings/stripe/test/', views.AdminStripeTestView.as_view(), name='admin-stripe-test'),

    # Admin billing utilities
    path('billing/payment-methods/', AdminCreditPaymentMethodsView.as_view(), name='admin-credit-payment-methods'),

    # Search/SEO admin endpoints
    path('search/', include('apps.search.urls')),

    # Marketing module
    path('marketing/', include('apps.marketing.urls')),

    # Router-generated CRUD endpoints
    path('', include(router.urls)),

    # Dashboard endpoints (new granular endpoints matching frontend contract)
    path('dashboard/stats/', views.AdminDashboardStatsView.as_view(), name='admin-dashboard-stats'),
    path('dashboard/trends/jobs/', views.AdminDashboardJobsTrendView.as_view(), name='admin-dashboard-trends-jobs'),
    path('dashboard/trends/revenue/', views.AdminDashboardRevenueTrendView.as_view(), name='admin-dashboard-trends-revenue'),
    path('dashboard/moderation/', views.AdminDashboardModerationView.as_view(), name='admin-dashboard-moderation'),
    path('dashboard/activity/', views.AdminDashboardActivityView.as_view(), name='admin-dashboard-activity'),
    path('dashboard/activity/log/', views.AdminDashboardActivityLogView.as_view(), name='admin-dashboard-activity-log'),
    path('dashboard/alerts/', views.AdminDashboardAlertsView.as_view(), name='admin-dashboard-alerts'),
    path('dashboard/alerts/<int:alert_id>/dismiss/', views.AdminDashboardAlertDismissView.as_view(), name='admin-dashboard-alert-dismiss'),
    path('dashboard/alerts/<int:alert_id>/resolve/', views.AdminDashboardAlertResolveView.as_view(), name='admin-dashboard-alert-resolve'),
    path('dashboard/counts/', views.AdminDashboardCountsView.as_view(), name='admin-dashboard-counts'),

    # Legacy dashboard endpoint (kept for backwards compatibility)
    path('dashboard/', views.AdminDashboardView.as_view(), name='admin-dashboard'),

    # User actions
    path('users/<int:user_id>/suspend/', AdminSuspendUserView.as_view(), name='admin-suspend-user'),
    path('users/<int:user_id>/activate/', AdminActivateUserView.as_view(), name='admin-activate-user'),
    path('users/<int:user_id>/reactivate/', AdminActivateUserView.as_view(), name='admin-reactivate-user'),
    path('users/<int:user_id>/reset-password/', AdminResetPasswordView.as_view(), name='admin-reset-password'),
    path('users/<int:pk>/login-history/', AdminUserLoginHistoryView.as_view(), name='admin-user-login-history'),
    path('users/<int:user_id>/verify-email/', AdminVerifyUserEmailView.as_view(), name='admin-verify-email'),
    path('users/<int:user_id>/impersonate/', AdminImpersonateUserView.as_view(), name='admin-impersonate-user'),
    path('users/bulk-suspend/', AdminBulkSuspendUsersView.as_view(), name='admin-bulk-suspend-users'),
    path('users/bulk-delete/', AdminBulkDeleteUsersView.as_view(), name='admin-bulk-delete-users'),
    path('users/export/', AdminExportUsersView.as_view(), name='admin-export-users'),
    path('impersonation/end/', AdminEndImpersonationView.as_view(), name='admin-end-impersonation'),

    # Fraud endpoints (path-based aliases for frontend URL expectations)
    path('fraud/stats/', views.AdminFraudStatsView.as_view(), name='admin-fraud-stats'),
    path('fraud/trends/', views.AdminFraudTrendsView.as_view(), name='admin-fraud-trends'),
    path('fraud/export/', views.AdminFraudExportView.as_view(), name='admin-fraud-export'),

    # Compliance endpoints (path-based aliases)
    path('compliance/stats/', views.AdminComplianceStatsView.as_view(), name='admin-compliance-stats'),

    # Audit logs
    path('audit-logs/', views.AuditLogListView.as_view(), name='admin-audit-logs'),

    # Social Distribution endpoints
    path('social/providers/', views.AdminSocialProvidersView.as_view(), name='admin-social-providers'),
    path('social/providers/<str:providerId>/connect/', views.AdminSocialProviderConnectView.as_view(), name='admin-social-provider-connect'),
    path('social/providers/<str:providerId>/disconnect/', views.AdminSocialProviderDisconnectView.as_view(), name='admin-social-provider-disconnect'),
    path('social/providers/<str:providerId>/refresh/', views.AdminSocialProviderRefreshView.as_view(), name='admin-social-provider-refresh'),
    path('social/queue/', views.AdminSocialQueueView.as_view(), name='admin-social-queue'),
    path('social/queue/<int:queueId>/post/', views.AdminSocialQueuePostNowView.as_view(), name='admin-social-queue-post-now'),
    path('social/queue/<int:queueId>/', views.AdminSocialQueueCancelView.as_view(), name='admin-social-queue-cancel'),
    path('social/queue/<int:queueId>/retry/', views.AdminSocialQueueRetryView.as_view(), name='admin-social-queue-retry'),
    path('social/queue/retry-all/', views.AdminSocialQueueRetryAllView.as_view(), name='admin-social-queue-retry-all'),
    path('social/queue/sync/', views.AdminSocialQueueSyncView.as_view(), name='admin-social-queue-sync'),
    path('social/settings/', views.AdminSocialSettingsView.as_view(), name='admin-social-settings'),
    path('social/stats/', views.AdminSocialStatsView.as_view(), name='admin-social-stats'),

    # Support endpoints
    # User lookup
    path('support/users/', support_views.SupportUserSearchView.as_view(), name='admin-support-users-search'),
    path('support/users/<int:user_id>/', support_views.SupportUserDetailView.as_view(), name='admin-support-user-detail'),
    path('support/users/<int:user_id>/timeline/', support_views.SupportUserTimelineView.as_view(), name='admin-support-user-timeline'),

    # Company lookup
    path('support/companies/', support_views.SupportCompanySearchView.as_view(), name='admin-support-companies-search'),
    path('support/companies/<int:company_id>/', support_views.SupportCompanyDetailView.as_view(), name='admin-support-company-detail'),
    path('support/companies/<int:company_id>/timeline/', support_views.SupportCompanyTimelineView.as_view(), name='admin-support-company-timeline'),

    # Impersonation
    path('support/impersonate/', support_views.ImpersonateUserView.as_view(), name='admin-support-impersonate'),
    path('support/impersonate/end/', support_views.EndImpersonationView.as_view(), name='admin-support-impersonate-end'),
    path('support/impersonate/status/', support_views.ImpersonationStatusView.as_view(), name='admin-support-impersonate-status'),

    # Data export
    path('support/export/user/', support_views.ExportUserDataView.as_view(), name='admin-support-export-user'),
    path('support/export/company/', support_views.ExportCompanyDataView.as_view(), name='admin-support-export-company'),
    path('support/export/<str:job_id>/', support_views.ExportJobStatusView.as_view(), name='admin-support-export-status'),
    path('support/export/', support_views.ListExportJobsView.as_view(), name='admin-support-export-list'),

    # Quick actions
    path('support/users/<int:user_id>/reset-password/', support_views.AdminResetUserPasswordView.as_view(), name='admin-support-reset-password'),
    path('support/users/<int:user_id>/verify-email/', support_views.AdminVerifyUserEmailView.as_view(), name='admin-support-verify-email'),
    path('support/users/<int:user_id>/status/', support_views.UpdateUserStatusView.as_view(), name='admin-support-update-user-status'),
    path('support/companies/<int:company_id>/status/', support_views.UpdateCompanyStatusView.as_view(), name='admin-support-update-company-status'),

    # Email Management endpoints
    path('email/providers/', email_views.EmailProviderListView.as_view(), name='admin-email-providers'),
    path('email/providers/<str:id>/connect/', email_views.EmailProviderConnectView.as_view(), name='admin-email-provider-connect'),
    path('email/providers/<str:id>/disconnect/', email_views.EmailProviderDisconnectView.as_view(), name='admin-email-provider-disconnect'),
    path('email/providers/<str:id>/test/', email_views.EmailProviderTestView.as_view(), name='admin-email-provider-test'),
    path('email/providers/<str:id>/set-active/', email_views.EmailProviderSetActiveView.as_view(), name='admin-email-provider-set-active'),
    # categories/, audiences/, event-keys/ are now @action on EmailTriggerViewSet (router handles them)
    path('email/suggestions/', email_views.EmailSuggestionsView.as_view(), name='admin-email-suggestions'),
    path('email/suggestions/<str:id>/dismiss/', email_views.EmailSuggestionDismissView.as_view(), name='admin-email-suggestion-dismiss'),
    path('email/settings/', email_views.EmailSettingsView.as_view(), name='admin-email-settings'),
    path('email/settings/kill-switch/', email_views.EmailKillSwitchView.as_view(), name='admin-email-kill-switch'),
    path('email/settings/rotate-keys/', email_views.EmailRotateKeysView.as_view(), name='admin-email-rotate-keys'),
    path('email/overview/', email_views.EmailOverviewStatsView.as_view(), name='admin-email-overview'),

    # Resend SDK v2 — Domain Management
    path('email/providers/<str:id>/sync-dns/', email_views.EmailProviderSyncDnsView.as_view(), name='admin-email-provider-sync-dns'),
    path('email/domains/', email_views.ResendDomainListView.as_view(), name='admin-email-domains'),
    path('email/domains/create/', email_views.ResendDomainCreateView.as_view(), name='admin-email-domain-create'),
    path('email/domains/<str:domain_id>/', email_views.ResendDomainDetailView.as_view(), name='admin-email-domain-detail'),
    path('email/domains/<str:domain_id>/verify/', email_views.ResendDomainVerifyView.as_view(), name='admin-email-domain-verify'),
    path('email/domains/<str:domain_id>/update/', email_views.ResendDomainUpdateView.as_view(), name='admin-email-domain-update'),

    # Resend SDK v2 — API Key Management
    path('email/api-keys/', email_views.ResendApiKeyListView.as_view(), name='admin-email-api-keys'),
    path('email/api-keys/<str:key_id>/', email_views.ResendApiKeyDeleteView.as_view(), name='admin-email-api-key-delete'),
]
