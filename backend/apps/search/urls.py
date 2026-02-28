"""
Search URL patterns.
"""
from django.urls import path
from . import views
from . import admin_views
from apps.rum.admin_views import RUMCoreWebVitalsView

urlpatterns = [
    # Public search endpoints
    path('jobs/', views.JobSearchView.as_view(), name='job-search'),
    path('companies/', views.CompanySearchView.as_view(), name='company-search'),
    path('suggestions/', views.SearchSuggestionsView.as_view(), name='search-suggestions'),
    path('filters/', views.SearchFiltersView.as_view(), name='search-filters'),
    path('sitemap-data/', views.SitemapDataView.as_view(), name='sitemap-data'),

    # Admin SEO Recommendations & Auto-Fix
    path('recommendations/', admin_views.AdminSEORecommendationsView.as_view(), name='admin-seo-recommendations'),
    path('auto-fix/', admin_views.AdminSEOAutoFixView.as_view(), name='admin-seo-auto-fix'),
    path('job-score/<str:job_id>/', admin_views.AdminJobSEOScoreView.as_view(), name='admin-job-seo-score'),

    # Admin SEO Health & Dashboard
    path('health/', admin_views.AdminSEOHealthView.as_view(), name='admin-seo-health'),
    path('web-vitals/', RUMCoreWebVitalsView.as_view(), name='admin-web-vitals'),
    path('page-speed/', admin_views.AdminPageSpeedView.as_view(), name='admin-page-speed'),

    # Admin Index Management
    path('index/status/', admin_views.AdminIndexStatusView.as_view(), name='admin-index-status'),
    path('index/history/', admin_views.AdminCrawlHistoryView.as_view(), name='admin-crawl-history'),
    path('index/failed/', admin_views.AdminFailedIndexJobsView.as_view(), name='admin-failed-index-jobs'),
    path('index/reindex/', admin_views.AdminReindexView.as_view(), name='admin-reindex'),
    path('index/reindex/<str:job_id>/', admin_views.AdminReindexView.as_view(), name='admin-reindex-status'),
    path('index/reindex/<str:job_id>/cancel/', admin_views.AdminReindexView.as_view(), name='admin-reindex-cancel'),
    path('index/retry/<str:job_id>/', admin_views.AdminRetryIndexView.as_view(), name='admin-retry-index'),

    # Admin Google for Jobs Validation
    path('google-jobs/summary/', admin_views.AdminGoogleJobsSummaryView.as_view(), name='admin-google-jobs-summary'),
    path('google-jobs/issues/', admin_views.AdminGoogleJobsIssuesView.as_view(), name='admin-google-jobs-issues'),
    path('google-jobs/validate/<str:job_id>/', admin_views.AdminGoogleJobsValidateView.as_view(), name='admin-google-jobs-validate'),
    path('google-jobs/batch-validate/', admin_views.AdminGoogleJobsBatchValidateView.as_view(), name='admin-google-jobs-batch-validate'),

    # Admin Sitemap Management
    path('sitemap/', admin_views.AdminSitemapInfoView.as_view(), name='admin-sitemap-info'),
    path('sitemap/regenerate/', admin_views.AdminSitemapRegenerateView.as_view(), name='admin-sitemap-regenerate'),
    path('sitemap/config/', admin_views.AdminSitemapConfigView.as_view(), name='admin-sitemap-config'),

    # Admin IndexNow
    path('indexnow/submit/', admin_views.AdminIndexNowSubmitView.as_view(), name='admin-indexnow-submit'),
    path('indexnow/history/', admin_views.AdminIndexNowHistoryView.as_view(), name='admin-indexnow-history'),
    path('indexnow/config/', admin_views.AdminIndexNowConfigView.as_view(), name='admin-indexnow-config'),

    # Admin AI Bot Management
    path('ai-bots/', admin_views.AdminAIBotsView.as_view(), name='admin-ai-bots'),
    path('ai-bots/<str:bot_id>/', admin_views.AdminAIBotDetailView.as_view(), name='admin-ai-bot-detail'),

    # Admin Robots.txt
    path('robots-txt/', admin_views.AdminRobotsTxtView.as_view(), name='admin-robots-txt'),

    # Admin Schema Management
    path('schema/settings/', admin_views.AdminSchemaSettingsView.as_view(), name='admin-schema-settings'),
    path('schema/preview/<str:job_id>/', admin_views.AdminSchemaPreviewView.as_view(), name='admin-schema-preview'),

    # Admin Technical SEO Audits
    path('audit/crawlability/', admin_views.AdminCrawlabilityAuditView.as_view(), name='admin-crawlability-audit'),
    path('audit/run/', admin_views.AdminSEOAuditRunView.as_view(), name='admin-seo-audit-run'),
    path('audit/results/latest/', admin_views.AdminSEOAuditResultsView.as_view(), name='admin-seo-audit-results-latest'),
    path('audit/results/<str:audit_id>/', admin_views.AdminSEOAuditResultsView.as_view(), name='admin-seo-audit-results'),
]
