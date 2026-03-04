"""
URL configuration for Orion backend.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from core.views import HealthCheckView
from apps.social.views import JobSocialPostsView
from apps.moderation.views import PublicSettingsView, StripePublishableKeyView

urlpatterns = [
    # Health check
    path('health/', HealthCheckView.as_view(), name='health-check'),

    # Public settings (no auth — Turnstile site key, feature toggles)
    path('api/settings/public/', PublicSettingsView.as_view(), name='public-settings'),

    # Stripe publishable key (public — safe to expose, needed by frontend checkout)
    path('api/settings/stripe/publishable-key/', StripePublishableKeyView.as_view(), name='stripe-publishable-key'),

    # Django admin (at /django-admin/ to avoid conflict with Next.js /admin pages)
    path('django-admin/', admin.site.urls),

    # API v1
    path('api/auth/', include('apps.users.urls')),
    path('api/companies/', include('apps.companies.urls')),
    path('api/jobs/', include('apps.jobs.urls')),
    path('api/applications/', include('apps.applications.urls')),
    path('api/billing/', include('apps.billing.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/search/', include('apps.search.urls')),
    path('api/social/', include('apps.social.urls')),
    path('api/candidates/', include('apps.candidates.urls')),
    path('api/articles/', include('apps.articles.urls')),

    # Job-specific social posts endpoint
    path('api/jobs/<int:job_id>/social-posts/', JobSocialPostsView.as_view(), name='job-social-posts'),

    # Public banners & affiliate links (no auth — rendered on public pages)
    path('api/', include('apps.moderation.public_urls')),

    # AI services (authenticated users: SEO + social generation)
    path('api/ai/', include('apps.ai.urls')),

    # Admin APIs
    path('api/admin/', include('apps.moderation.urls')),

    # Admin AI APIs (provider config, usage stats, bulk operations)
    path('api/admin/ai/', include('apps.ai.admin_urls')),

    # Public marketing (unsubscribe, preference center — no auth)
    path('api/marketing/', include('apps.marketing.public_urls')),

    # Webhooks (email provider callbacks — no auth)
    path('api/webhooks/', include('apps.marketing.webhook_urls')),

    # GDPR compliance (public consent + admin APIs)
    path('api/gdpr/', include('apps.gdpr.urls')),

    # RUM (Real User Monitoring) ingest endpoint — no auth, HMAC-secured
    path('rum/v1/', include('apps.rum.urls')),
]

# Debug toolbar (development only)
if settings.DEBUG:
    import debug_toolbar
    urlpatterns = [
        path('__debug__/', include(debug_toolbar.urls)),
    ] + urlpatterns

    # Serve media files in development
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
