"""
Moderation views for Orion API.
"""
from decimal import Decimal
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Count, Sum
from django.utils import timezone
from datetime import timedelta
from rest_framework import viewsets, generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action

from core.permissions import IsAdmin
from .models import (
    PlatformSetting, Banner, Announcement, Affiliate, SystemAlert,
    AdminActivity, FraudAlert, ComplianceRequest, FraudRule,
    SponsoredBanner, AffiliateLink, FeatureFlag, JobPackage, PlatformSettings,
    Category, Industry, BannerImpression, BannerClick, AffiliateLinkClick,
    RetentionRule, LegalDocument
)
from .serializers import (
    PlatformSettingSerializer, BannerSerializer,
    AnnouncementSerializer, AffiliateSerializer,
    SystemAlertSerializer, AdminActivitySerializer,
    AdminDashboardStatsSerializer, AdminDashboardTrendPointSerializer,
    AdminDashboardModerationItemSerializer,
    FraudAlertSerializer, FraudAlertStatsSerializer, FraudTrendSerializer,
    ComplianceRequestSerializer, ComplianceStatsSerializer, FraudRuleSerializer,
    SponsoredBannerSerializer, AffiliateLinkSerializer, FeatureFlagSerializer,
    JobPackageSerializer, PlatformSettingsSerializer,
    CategorySerializer, IndustrySerializer,
    PublicBannerSerializer, PublicAffiliateLinkSerializer,
    RetentionRuleSerializer, LegalDocumentSerializer
)
from rest_framework.parsers import MultiPartParser
from core.tracking import (
    record_impression, record_click, get_visitor_id, set_visitor_cookie,
    BannerTrackingThrottle, AffiliateTrackingThrottle,
)
from core.validators import validate_upload, sanitize_filename, convert_to_webp, BANNER_PROFILE, UploadRateThrottle


class AdminDashboardView(APIView):
    """Admin dashboard statistics."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from apps.users.models import User
        from apps.companies.models import Company, Agency
        from apps.jobs.models import Job, JobReport
        from apps.applications.models import Application
        from apps.billing.models import Invoice

        now = timezone.now()
        last_30_days = now - timedelta(days=30)
        last_7_days = now - timedelta(days=7)

        # User stats
        user_stats = {
            'total': User.objects.count(),
            'new_30_days': User.objects.filter(created_at__gte=last_30_days).count(),
            'active': User.objects.filter(status='active').count(),
            'by_role': dict(User.objects.values('role').annotate(count=Count('id')).values_list('role', 'count')),
        }

        # Company stats
        company_stats = {
            'total': Company.objects.count(),
            'verified': Company.objects.filter(status='verified').count(),
            'new_30_days': Company.objects.filter(created_at__gte=last_30_days).count(),
        }

        # Agency stats
        agency_stats = {
            'total': Agency.objects.count(),
            'verified': Agency.objects.filter(status='verified').count(),
        }

        # Job stats
        job_stats = {
            'total': Job.objects.count(),
            'published': Job.objects.filter(status='published').count(),
            'pending_review': Job.objects.filter(status='pending').count(),
            'new_7_days': Job.objects.filter(created_at__gte=last_7_days).count(),
            'expiring_soon': Job.objects.filter(
                status='published',
                expires_at__lte=now + timedelta(days=7)
            ).count(),
        }

        # Application stats
        application_stats = {
            'total': Application.objects.count(),
            'new_7_days': Application.objects.filter(created_at__gte=last_7_days).count(),
            'by_status': dict(
                Application.objects.values('status').annotate(count=Count('id')).values_list('status', 'count')
            ),
        }

        # Report stats
        report_stats = {
            'pending': JobReport.objects.filter(status='pending').count(),
            'total': JobReport.objects.count(),
        }

        # Revenue stats
        revenue_stats = {
            'total_30_days': float(Invoice.objects.filter(
                status='paid',
                paid_at__gte=last_30_days
            ).aggregate(total=Sum('amount'))['total'] or 0),
            'invoices_30_days': Invoice.objects.filter(created_at__gte=last_30_days).count(),
        }

        return Response({
            'users': user_stats,
            'companies': company_stats,
            'agencies': agency_stats,
            'jobs': job_stats,
            'applications': application_stats,
            'reports': report_stats,
            'revenue': revenue_stats,
        })


def _get_date_range(range_param):
    """Parse range parameter and return start date."""
    now = timezone.now()
    if range_param == '30d':
        return now - timedelta(days=30)
    elif range_param == '90d':
        return now - timedelta(days=90)
    else:  # default 7d
        return now - timedelta(days=7)


def _calculate_change(current, previous):
    """Calculate percentage change between two values."""
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return round(((current - previous) / previous) * 100, 1)


def _format_change(current, previous):
    """Format percentage change as string with + or - prefix."""
    if previous == 0:
        pct = 100.0 if current > 0 else 0.0
    else:
        pct = ((current - previous) / previous) * 100

    if pct >= 0:
        return f"+{pct:.1f}%"
    return f"{pct:.1f}%"


class AdminDashboardStatsView(APIView):
    """
    GET /api/admin/dashboard/stats/?range=7d
    Returns aggregated stats for the admin dashboard.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from apps.users.models import User
        from apps.companies.models import Company
        from apps.jobs.models import Job, JobReport
        from apps.billing.models import Invoice

        range_param = request.query_params.get('range', '7d')
        start_date = _get_date_range(range_param)
        now = timezone.now()

        # Calculate previous period for comparison
        period_days = (now - start_date).days
        prev_start = start_date - timedelta(days=period_days)
        prev_end = start_date

        # Jobs posted
        jobs_current = Job.objects.filter(created_at__gte=start_date).count()
        jobs_previous = Job.objects.filter(
            created_at__gte=prev_start, created_at__lt=prev_end
        ).count()

        # Active companies (companies with at least one published job)
        active_companies_current = Company.objects.filter(
            jobs__status='published',
            jobs__created_at__gte=start_date
        ).distinct().count()
        active_companies_previous = Company.objects.filter(
            jobs__status='published',
            jobs__created_at__gte=prev_start,
            jobs__created_at__lt=prev_end
        ).distinct().count()

        # Revenue MTD
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        revenue_current = Invoice.objects.filter(
            status='paid',
            paid_at__gte=month_start
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        prev_month_start = (month_start - timedelta(days=1)).replace(day=1)
        revenue_previous = Invoice.objects.filter(
            status='paid',
            paid_at__gte=prev_month_start,
            paid_at__lt=month_start
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        # Pending reviews (both are report counts for correct comparison)
        pending_current = JobReport.objects.filter(status='pending').count()
        pending_previous = JobReport.objects.filter(
            status='pending',
            created_at__lt=start_date,
        ).count()

        stats = {
            'jobs_posted': jobs_current,
            'jobs_change': _format_change(jobs_current, jobs_previous),
            'active_companies': active_companies_current,
            'companies_change': _format_change(
                active_companies_current, active_companies_previous
            ),
            'revenue_mtd': revenue_current,
            'revenue_change': _format_change(
                float(revenue_current), float(revenue_previous)
            ),
            'pending_reviews': pending_current,
            'reviews_change': _format_change(
                pending_current, pending_previous
            ),
        }

        serializer = AdminDashboardStatsSerializer(stats)
        return Response(serializer.data)


class AdminDashboardJobsTrendView(APIView):
    """
    GET /api/admin/dashboard/trends/jobs/?range=7d
    Returns job and application trend data.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from apps.jobs.models import Job
        from apps.applications.models import Application

        range_param = request.query_params.get('range', '7d')
        start_date = _get_date_range(range_param)
        now = timezone.now()

        # Generate data points for each day
        trend_data = []
        current_date = start_date.date()
        end_date = now.date()

        while current_date <= end_date:
            day_start = timezone.make_aware(
                timezone.datetime.combine(current_date, timezone.datetime.min.time())
            )
            day_end = day_start + timedelta(days=1)

            jobs_count = Job.objects.filter(
                created_at__gte=day_start, created_at__lt=day_end
            ).count()
            applications_count = Application.objects.filter(
                created_at__gte=day_start, created_at__lt=day_end
            ).count()

            trend_data.append({
                'date': current_date.strftime('%a'),  # Mon, Tue, etc.
                'jobs': jobs_count,
                'applications': applications_count,
            })
            current_date += timedelta(days=1)

        serializer = AdminDashboardTrendPointSerializer(trend_data, many=True)
        return Response(serializer.data)


class AdminDashboardRevenueTrendView(APIView):
    """
    GET /api/admin/dashboard/trends/revenue/?range=7d
    Returns revenue trend data.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from apps.billing.models import Invoice

        range_param = request.query_params.get('range', '7d')
        start_date = _get_date_range(range_param)
        now = timezone.now()

        trend_data = []
        current_date = start_date.date()
        end_date = now.date()

        while current_date <= end_date:
            day_start = timezone.make_aware(
                timezone.datetime.combine(current_date, timezone.datetime.min.time())
            )
            day_end = day_start + timedelta(days=1)

            revenue = Invoice.objects.filter(
                status='paid',
                paid_at__gte=day_start,
                paid_at__lt=day_end
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

            trend_data.append({
                'date': current_date.strftime('%a'),
                'revenue': revenue,
            })
            current_date += timedelta(days=1)

        serializer = AdminDashboardTrendPointSerializer(trend_data, many=True)
        return Response(serializer.data)


class AdminDashboardModerationView(APIView):
    """
    GET /api/admin/dashboard/moderation/
    Returns moderation queue breakdown.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from apps.jobs.models import Job, JobReport
        from apps.companies.models import Company

        moderation_data = [
            {
                'name': 'Pending Jobs',
                'value': Job.objects.filter(status='pending').count(),
                'color': '#3B82F6',  # blue
            },
            {
                'name': 'Reported Jobs',
                'value': JobReport.objects.filter(status='pending').count(),
                'color': '#EF4444',  # red
            },
            {
                'name': 'Unverified Companies',
                'value': Company.objects.filter(status='pending').count(),
                'color': '#F59E0B',  # amber
            },
            {
                'name': 'Flagged Content',
                'value': Job.objects.filter(status='hidden').count(),
                'color': '#8B5CF6',  # purple
            },
        ]

        serializer = AdminDashboardModerationItemSerializer(moderation_data, many=True)
        return Response(serializer.data)


class AdminDashboardActivityView(APIView):
    """
    GET /api/admin/dashboard/activity/?limit=5
    Returns recent admin activity.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        limit = int(request.query_params.get('limit', 5))
        activities = AdminActivity.objects.select_related('company').order_by(
            '-created_at'
        )[:limit]

        serializer = AdminActivitySerializer(activities, many=True)
        return Response(serializer.data)


class AdminDashboardAlertsView(APIView):
    """
    GET /api/admin/dashboard/alerts/
    Returns active system alerts.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        alerts = SystemAlert.objects.filter(is_dismissed=False).order_by('-created_at')
        serializer = SystemAlertSerializer(alerts, many=True)
        return Response(serializer.data)


class AdminDashboardAlertDismissView(APIView):
    """
    POST /api/admin/dashboard/alerts/{id}/dismiss/
    Dismiss a system alert.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, alert_id):
        try:
            alert = SystemAlert.objects.get(id=alert_id)
        except SystemAlert.DoesNotExist:
            return Response(
                {'detail': 'Alert not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        alert.is_dismissed = True
        alert.dismissed_by = request.user
        alert.dismissed_at = timezone.now()
        alert.save()

        return Response({'message': 'Alert dismissed successfully.'})


class PlatformSettingViewSet(viewsets.ModelViewSet):
    """Platform settings management."""

    queryset = PlatformSetting.objects.all()
    serializer_class = PlatformSettingSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    lookup_field = 'key'

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


class AdminPlatformSettingsView(APIView):
    """GET/PATCH singleton platform settings."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        settings = PlatformSettings.get_settings()
        serializer = PlatformSettingsSerializer(settings)
        return Response(serializer.data)

    def patch(self, request):
        settings_obj = PlatformSettings.get_settings()
        serializer = PlatformSettingsSerializer(settings_obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Invalidate Slack cache if any Slack fields were updated
        slack_fields = {
            'slack_enabled', 'slack_webhook_default', 'slack_webhook_security',
            'slack_webhook_moderation', 'slack_webhook_billing',
            'slack_webhook_jobs', 'slack_webhook_system',
        }
        if slack_fields & set(request.data.keys()):
            from apps.notifications.slack import invalidate_slack_cache
            invalidate_slack_cache()

        return Response(serializer.data)


class AdminStripeSettingsView(APIView):
    """GET/PATCH Stripe API keys. Keys are encrypted at rest.

    GET  — Returns masked keys, mode, and connectivity status.
    PATCH — Accepts new key values, validates format, stores encrypted.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from apps.billing.stripe_service import (
            get_stripe_keys, mask_key, detect_stripe_mode, test_stripe_connection,
        )

        keys = get_stripe_keys()
        ps = PlatformSettings.get_settings()

        # Determine source for each key (db or env)
        pk_source = 'database' if ps.stripe_publishable_key else ('environment' if keys['publishable_key'] else 'none')
        sk_source = 'database' if ps.stripe_secret_key else ('environment' if keys['secret_key'] else 'none')
        wh_source = 'database' if ps.stripe_webhook_secret else ('environment' if keys['webhook_secret'] else 'none')

        # Quick connectivity check
        connection = test_stripe_connection(keys['secret_key'])

        return Response({
            'publishable_key': mask_key(keys['publishable_key']),
            'publishable_key_source': pk_source,
            'secret_key': mask_key(keys['secret_key']),
            'secret_key_source': sk_source,
            'webhook_secret': mask_key(keys['webhook_secret']),
            'webhook_secret_source': wh_source,
            'mode': detect_stripe_mode(keys['secret_key']),
            'connected': connection['connected'],
            'account_name': connection['account_name'],
            'connection_error': connection['error'],
            'webhook_url': f'{settings.API_BASE_URL}/api/billing/webhook/' if settings.API_BASE_URL else f'{request.scheme}://{request.get_host()}/api/billing/webhook/',
        })

    def patch(self, request):
        from apps.billing.stripe_service import validate_key_format

        ps = PlatformSettings.get_settings()
        errors = {}

        publishable_key = request.data.get('publishable_key')
        secret_key = request.data.get('secret_key')
        webhook_secret = request.data.get('webhook_secret')

        # Validate formats
        if publishable_key is not None:
            err = validate_key_format(publishable_key, 'publishable')
            if err:
                errors['publishable_key'] = err
        if secret_key is not None:
            err = validate_key_format(secret_key, 'secret')
            if err:
                errors['secret_key'] = err
        if webhook_secret is not None:
            err = validate_key_format(webhook_secret, 'webhook')
            if err:
                errors['webhook_secret'] = err

        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        # Update only provided fields (EncryptedTextField handles encryption)
        updated_fields = []
        if publishable_key is not None:
            ps.stripe_publishable_key = publishable_key
            updated_fields.append('stripe_publishable_key')
        if secret_key is not None:
            ps.stripe_secret_key = secret_key
            updated_fields.append('stripe_secret_key')
        if webhook_secret is not None:
            ps.stripe_webhook_secret = webhook_secret
            updated_fields.append('stripe_webhook_secret')

        if updated_fields:
            try:
                ps.save(update_fields=updated_fields)
            except Exception as e:
                import logging
                logging.getLogger(__name__).exception('Failed to save Stripe keys')
                return Response(
                    {'detail': f'Failed to save keys: {type(e).__name__}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            # Log the action
            try:
                from apps.audit.models import create_audit_log
                create_audit_log(
                    actor=request.user,
                    action='update',
                    target=ps,
                    changes={f.replace('stripe_', ''): '(encrypted)' for f in updated_fields},
                    reason='Stripe keys updated',
                    request=request,
                )
            except Exception:
                pass

        return Response({'message': 'Stripe keys updated successfully'})


class AdminStripeTestView(APIView):
    """POST — Test Stripe API connectivity with current or provided keys."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        from apps.billing.stripe_service import test_stripe_connection, get_stripe_secret_key

        # Allow testing with a provided key (not saved yet) or the current key
        test_key = request.data.get('secret_key') or get_stripe_secret_key()
        result = test_stripe_connection(test_key)
        return Response(result)


class StripePublishableKeyView(APIView):
    """GET — Public endpoint to retrieve the Stripe publishable key.

    This allows the frontend to dynamically load the publishable key
    without hardcoding it in environment variables.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        from apps.billing.stripe_service import get_stripe_publishable_key, detect_stripe_mode

        key = get_stripe_publishable_key()
        if not key:
            return Response(
                {'error': 'Stripe is not configured'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response({
            'publishable_key': key,
            'mode': detect_stripe_mode(key),
        })


class AdminSlackTestWebhookView(APIView):
    """POST /api/admin/settings/slack/test/ — send a test message to a Slack channel."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        channel = request.data.get('channel')

        valid_channels = ['default', 'security', 'moderation', 'billing', 'jobs', 'system']
        if channel not in valid_channels:
            return Response(
                {'success': False, 'error': f'Invalid channel. Must be one of: {", ".join(valid_channels)}'},
                status=400,
            )

        from apps.notifications.slack import slack_notify, SlackChannel, _is_slack_enabled

        if not _is_slack_enabled():
            return Response(
                {'success': False, 'error': 'Slack notifications are disabled. Enable them first.'},
                status=400,
            )

        # Map 'default' to SYSTEM channel for testing (uses default channel resolution)
        if channel == 'default':
            ch = SlackChannel.SYSTEM
        else:
            try:
                ch = SlackChannel(channel)
            except ValueError:
                return Response({'success': False, 'error': 'Invalid channel'}, status=400)

        actor = request.user.get_full_name() or request.user.email
        success = slack_notify(
            channel=ch,
            title='Test Notification',
            message=f'This is a test message from Orion, triggered by *{actor}*.',
            severity='info',
            fields={'Channel': channel, 'Triggered By': actor},
        )

        if success:
            return Response({'success': True, 'message': f'Test message sent to #{channel}'})
        else:
            return Response(
                {'success': False, 'error': 'Failed to send test message. Check your Slack configuration.'},
                status=502,
            )


class AdminSlackOAuthBeginView(APIView):
    """GET /api/admin/settings/slack/oauth/begin/ — return Slack authorize URL."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from django.conf import settings as django_settings
        from django.core.cache import cache
        from apps.notifications.models import SlackInstallation

        installation = SlackInstallation.get_installation()

        # DB credentials first, env vars as fallback
        client_id = installation.client_id or getattr(django_settings, 'SLACK_CLIENT_ID', '')
        redirect_uri = getattr(django_settings, 'SLACK_REDIRECT_URI', '')

        if not client_id:
            return Response(
                {'error': 'Slack Client ID not configured. Add it in Settings → Integrations.'},
                status=400,
            )

        scopes = 'chat:write,channels:read,channels:join,groups:read'
        import secrets
        state = secrets.token_urlsafe(32)

        # Store state in cache keyed by user ID for CSRF verification (5 min TTL)
        cache.set(f'slack_oauth_state:{request.user.id}', state, 300)

        from urllib.parse import urlencode
        params = urlencode({
            'client_id': client_id,
            'scope': scopes,
            'redirect_uri': redirect_uri,
            'state': state,
        })
        url = f'https://slack.com/oauth/v2/authorize?{params}'

        return Response({'url': url, 'state': state})


class AdminSlackOAuthCallbackView(APIView):
    """POST /api/admin/settings/slack/oauth/callback/ — exchange code for bot token."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        code = request.data.get('code')
        if not code:
            return Response({'error': 'code is required'}, status=400)

        # Verify CSRF state token
        from django.core.cache import cache
        state = request.data.get('state', '')
        expected_state = cache.get(f'slack_oauth_state:{request.user.id}')
        if not expected_state or state != expected_state:
            return Response({'error': 'Invalid or expired state parameter'}, status=400)
        cache.delete(f'slack_oauth_state:{request.user.id}')

        from django.conf import settings as django_settings
        from apps.notifications.models import SlackInstallation as SlackInst
        inst = SlackInst.get_installation()

        # DB credentials first, env vars as fallback
        client_id = inst.client_id or getattr(django_settings, 'SLACK_CLIENT_ID', '')
        client_secret = inst.client_secret or getattr(django_settings, 'SLACK_CLIENT_SECRET', '')
        redirect_uri = getattr(django_settings, 'SLACK_REDIRECT_URI', '')

        import json
        import urllib.parse
        from urllib.request import Request, urlopen
        from urllib.error import URLError

        body = urllib.parse.urlencode({
            'code': code,
            'client_id': client_id,
            'client_secret': client_secret,
            'redirect_uri': redirect_uri,
        }).encode('utf-8')

        req = Request(
            'https://slack.com/api/oauth.v2.access',
            data=body,
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            method='POST',
        )

        try:
            response = urlopen(req, timeout=10)
            data = json.loads(response.read().decode('utf-8'))
        except URLError as e:
            return Response(
                {'error': f'Failed to contact Slack API: {e}'},
                status=502,
            )

        if not data.get('ok'):
            return Response(
                {'error': data.get('error', 'OAuth exchange failed')},
                status=400,
            )

        from apps.notifications.models import SlackInstallation
        from apps.notifications.slack import invalidate_slack_cache

        installation = SlackInstallation.get_installation()
        installation.team_id = data.get('team', {}).get('id', '')
        installation.team_name = data.get('team', {}).get('name', '')
        installation.bot_user_id = data.get('bot_user_id', '')
        installation.bot_token = data.get('access_token', '')
        installation.is_active = True
        installation.installed_at = timezone.now()
        installation.installed_by = request.user
        installation.save()

        invalidate_slack_cache()

        return Response({
            'connected': True,
            'team_name': installation.team_name,
            'team_id': installation.team_id,
        })


class AdminSlackInstallationView(APIView):
    """GET /api/admin/settings/slack/installation/ — get current installation status.
    PATCH /api/admin/settings/slack/installation/ — update Slack App credentials.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from apps.notifications.models import SlackInstallation

        installation = SlackInstallation.get_installation()
        return Response({
            'is_active': installation.is_active,
            'team_id': installation.team_id,
            'team_name': installation.team_name,
            'bot_user_id': installation.bot_user_id,
            'installed_at': installation.installed_at.isoformat() if installation.installed_at else None,
            'installed_by': installation.installed_by.get_full_name() if installation.installed_by else None,
            'client_id_set': bool(installation.client_id),
            'client_secret_set': bool(installation.client_secret),
            'channel_default': installation.channel_default,
            'channel_security': installation.channel_security,
            'channel_moderation': installation.channel_moderation,
            'channel_billing': installation.channel_billing,
            'channel_jobs': installation.channel_jobs,
            'channel_system': installation.channel_system,
        })

    def patch(self, request):
        """Update Slack App credentials (client_id, client_secret)."""
        from apps.notifications.models import SlackInstallation

        installation = SlackInstallation.get_installation()
        updated = False

        client_id = request.data.get('client_id')
        if client_id is not None and client_id != '':
            installation.client_id = client_id
            updated = True

        client_secret = request.data.get('client_secret')
        if client_secret is not None and client_secret != '':
            installation.client_secret = client_secret
            updated = True

        if updated:
            installation.save()

        return Response({
            'client_id_set': bool(installation.client_id),
            'client_secret_set': bool(installation.client_secret),
        })


class AdminSlackChannelsView(APIView):
    """GET /api/admin/settings/slack/channels/ — list available Slack channels.
    PATCH /api/admin/settings/slack/channels/ — update channel mappings.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from apps.notifications.models import SlackInstallation
        from django.core.cache import cache

        installation = SlackInstallation.get_installation()
        if not installation.is_active or not installation.bot_token:
            return Response({'error': 'Slack not connected'}, status=400)

        cache_key = f'slack:channels:{installation.team_id}'
        cached = cache.get(cache_key)
        if cached:
            return Response({'channels': cached})

        import json
        from urllib.request import Request, urlopen
        from urllib.error import URLError

        all_channels = []
        cursor = None

        # Paginate through all channels
        while True:
            url = (
                'https://slack.com/api/conversations.list'
                '?types=public_channel,private_channel&exclude_archived=true&limit=200'
            )
            if cursor:
                url += f'&cursor={cursor}'

            req = Request(
                url,
                headers={'Authorization': f'Bearer {installation.bot_token}'},
                method='GET',
            )

            try:
                response = urlopen(req, timeout=10)
                data = json.loads(response.read().decode('utf-8'))
            except URLError as e:
                return Response(
                    {'error': f'Slack API error: {e}'},
                    status=502,
                )

            if not data.get('ok'):
                return Response(
                    {'error': data.get('error', 'Failed to list channels')},
                    status=502,
                )

            for ch in data.get('channels', []):
                all_channels.append({
                    'id': ch['id'],
                    'name': ch['name'],
                    'is_private': ch.get('is_private', False),
                })

            # Check for next page
            next_cursor = data.get('response_metadata', {}).get('next_cursor', '')
            if not next_cursor:
                break
            cursor = next_cursor

        all_channels.sort(key=lambda c: c['name'])

        cache.set(cache_key, all_channels, 600)  # 10 minutes
        return Response({'channels': all_channels})

    def patch(self, request):
        from apps.notifications.models import SlackInstallation
        from apps.notifications.slack import invalidate_slack_cache

        installation = SlackInstallation.get_installation()
        if not installation.is_active:
            return Response({'error': 'Slack not connected'}, status=400)

        allowed = {
            'channel_default', 'channel_security', 'channel_moderation',
            'channel_billing', 'channel_jobs', 'channel_system',
        }
        updated = False
        for field in allowed:
            if field in request.data:
                setattr(installation, field, request.data[field])
                updated = True

        if updated:
            installation.save()
            invalidate_slack_cache()

        return Response({
            'channel_default': installation.channel_default,
            'channel_security': installation.channel_security,
            'channel_moderation': installation.channel_moderation,
            'channel_billing': installation.channel_billing,
            'channel_jobs': installation.channel_jobs,
            'channel_system': installation.channel_system,
        })


class AdminSlackDisconnectView(APIView):
    """POST /api/admin/settings/slack/disconnect/ — revoke and clear installation."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        from apps.notifications.models import SlackInstallation
        from apps.notifications.slack import invalidate_slack_cache

        installation = SlackInstallation.get_installation()
        installation.bot_token = ''
        installation.team_id = ''
        installation.team_name = ''
        installation.bot_user_id = ''
        installation.is_active = False
        installation.channel_default = ''
        installation.channel_security = ''
        installation.channel_moderation = ''
        installation.channel_billing = ''
        installation.channel_jobs = ''
        installation.channel_system = ''
        installation.save()

        invalidate_slack_cache()
        return Response({'disconnected': True})


class PublicSettingsView(APIView):
    """GET /api/settings/public/ — public settings (no auth required).

    Returns Turnstile configuration so the frontend can render the widget
    without requiring authentication.
    """

    permission_classes = []
    authentication_classes = []

    def get(self, request):
        settings = PlatformSettings.get_settings()
        return Response({
            'turnstile_site_key': settings.turnstile_site_key if settings.turnstile_enabled else '',
            'turnstile_enabled': settings.turnstile_enabled,
            'turnstile_protect_auth': settings.turnstile_protect_auth,
            'turnstile_protect_jobs': settings.turnstile_protect_jobs,
            'turnstile_protect_applications': settings.turnstile_protect_applications,
        })


class BannerViewSet(viewsets.ModelViewSet):
    """Banner management."""

    queryset = Banner.objects.all()
    serializer_class = BannerSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_fields = ['position', 'is_active']
    ordering = ['-created_at']


class AnnouncementViewSet(viewsets.ModelViewSet):
    """Announcement management."""

    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_fields = ['announcement_type', 'is_active']
    ordering = ['-created_at']


class AffiliateViewSet(viewsets.ModelViewSet):
    """Affiliate management."""

    queryset = Affiliate.objects.all()
    serializer_class = AffiliateSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_fields = ['is_active']
    search_fields = ['name', 'code']
    ordering = ['-created_at']


class AuditLogListView(generics.ListAPIView):
    """List audit logs."""

    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_fields = ['actor', 'action', 'target_type']
    search_fields = ['target_type', 'target_id']
    ordering = ['-created_at']

    def get_queryset(self):
        from apps.audit.models import AuditLog
        return AuditLog.objects.all().select_related('actor')

    def get_serializer_class(self):
        from apps.audit.serializers import AuditLogSerializer
        return AuditLogSerializer


# =============================================================================
# Admin Fraud Views
# =============================================================================


class AdminFraudAlertViewSet(viewsets.ModelViewSet):
    """Admin fraud alert management."""

    queryset = FraudAlert.objects.all().select_related('resolved_by')
    serializer_class = FraudAlertSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_fields = ['type', 'severity', 'status']
    search_fields = ['description', 'subject_name']
    ordering_fields = ['created_at', 'severity', 'status']
    ordering = ['-created_at']

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """GET /api/admin/fraud/alerts/stats/ — aggregate fraud stats."""
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        qs = FraudAlert.objects.all()
        total = qs.count()
        critical = qs.filter(severity='critical').count()
        open_count = qs.filter(status='open').count()
        blocked = qs.filter(status='blocked').count()
        investigating = qs.filter(status='investigating').count()
        resolved_today = qs.filter(
            status__in=['resolved', 'false_positive'],
            resolved_at__gte=today_start
        ).count()

        # Average resolution time
        from django.db.models import Avg, F, ExpressionWrapper, DurationField
        resolved = qs.filter(resolved_at__isnull=False)
        avg_duration = resolved.annotate(
            resolution_time=ExpressionWrapper(
                F('resolved_at') - F('detected_at'),
                output_field=DurationField()
            )
        ).aggregate(avg=Avg('resolution_time'))['avg']

        avg_hours = 0.0
        if avg_duration:
            avg_hours = round(avg_duration.total_seconds() / 3600, 1)

        by_severity = {}
        for choice_val, _ in FraudAlert.SEVERITY_CHOICES:
            by_severity[choice_val] = qs.filter(severity=choice_val).count()

        data = {
            'total_alerts': total,
            'critical_count': critical,
            'open_count': open_count + investigating,
            'blocked_count': blocked,
            'open_alerts': open_count + investigating,
            'resolved_today': resolved_today,
            'avg_resolution_time_hours': avg_hours,
            'by_severity': by_severity,
        }

        serializer = FraudAlertStatsSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def trends(self, request):
        """GET /api/admin/fraud/alerts/trends/ — daily alert counts."""
        range_param = request.query_params.get('range', '7d')
        start_date = _get_date_range(range_param)
        now = timezone.now()

        trend_data = []
        current_date = start_date.date()
        end_date = now.date()

        while current_date <= end_date:
            day_start = timezone.make_aware(
                timezone.datetime.combine(current_date, timezone.datetime.min.time())
            )
            day_end = day_start + timedelta(days=1)

            day_alerts = FraudAlert.objects.filter(
                created_at__gte=day_start, created_at__lt=day_end
            )
            alerts_count = day_alerts.count()
            blocked_count = day_alerts.filter(status='blocked').count()

            by_type = {}
            for choice_val, _ in FraudAlert.TYPE_CHOICES:
                c = day_alerts.filter(type=choice_val).count()
                if c > 0:
                    by_type[choice_val] = c

            trend_data.append({
                'date': current_date.strftime('%a'),
                'alerts': alerts_count,
                'blocked': blocked_count,
                'by_type': by_type,
            })
            current_date += timedelta(days=1)

        serializer = FraudTrendSerializer(trend_data, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def investigate(self, request, pk=None):
        """POST /api/admin/fraud/alerts/{id}/investigate/ — start investigation."""
        alert = self.get_object()
        if alert.status not in ('open',):
            return Response(
                {'error': 'Only open alerts can be investigated'},
                status=status.HTTP_400_BAD_REQUEST
            )
        alert.status = 'investigating'
        alert.save(update_fields=['status'])
        serializer = self.get_serializer(alert)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """POST /api/admin/fraud/alerts/{id}/resolve/ — resolve alert."""
        alert = self.get_object()
        resolution = request.data.get('resolution', 'resolved')
        notes = request.data.get('notes', '')

        if resolution == 'false_positive':
            alert.status = 'false_positive'
        else:
            alert.status = 'resolved'

        alert.resolved_at = timezone.now()
        alert.resolved_by = request.user
        alert.resolution_notes = notes
        alert.save(update_fields=['status', 'resolved_at', 'resolved_by', 'resolution_notes'])

        serializer = self.get_serializer(alert)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='action')
    def take_action(self, request, pk=None):
        """POST /api/admin/fraud/alerts/{id}/action/ — take action on subject."""
        alert = self.get_object()
        action_type = request.data.get('action')
        notes = request.data.get('notes', '')

        if action_type not in ('suspend', 'warn', 'delete'):
            return Response(
                {'error': 'action must be "suspend", "warn", or "delete"'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Perform action based on subject type
        if action_type == 'suspend' and alert.subject_type == 'user':
            from apps.users.models import User
            try:
                user = User.objects.get(id=alert.subject_id)
                user.status = 'suspended'
                user.save(update_fields=['status'])
            except User.DoesNotExist:
                pass

        if action_type in ('suspend', 'delete'):
            alert.status = 'blocked'
            alert.resolved_at = timezone.now()
            alert.resolved_by = request.user
            alert.resolution_notes = f'Action taken: {action_type}. {notes}'
            alert.save(update_fields=['status', 'resolved_at', 'resolved_by', 'resolution_notes'])

        return Response({'message': f'{action_type} action applied successfully'})

    @action(detail=False, methods=['get'])
    def export(self, request):
        """GET /api/admin/fraud/alerts/export/ — CSV export."""
        import csv
        from django.http import HttpResponse as DjangoHttpResponse

        qs = self.filter_queryset(self.get_queryset())
        response = DjangoHttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="fraud-alerts-export.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'ID', 'Type', 'Severity', 'Status', 'Subject Type',
            'Subject Name', 'Description', 'IP Address', 'Detected At',
            'Resolved At', 'Resolution Notes'
        ])

        for alert in qs:
            writer.writerow([
                alert.id, alert.type, alert.severity, alert.status,
                alert.subject_type, alert.subject_name, alert.description,
                alert.ip_address or '', alert.detected_at,
                alert.resolved_at or '', alert.resolution_notes,
            ])

        return response


class AdminFraudStatsView(APIView):
    """
    GET /api/admin/fraud/stats/
    Redirect to the ViewSet stats action for URL flexibility.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        view = AdminFraudAlertViewSet.as_view({'get': 'stats'})
        return view(request._request)


class AdminFraudTrendsView(APIView):
    """
    GET /api/admin/fraud/trends/
    Redirect to the ViewSet trends action for URL flexibility.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        view = AdminFraudAlertViewSet.as_view({'get': 'trends'})
        return view(request._request)


class AdminFraudExportView(APIView):
    """
    GET /api/admin/fraud/export/
    Redirect to the ViewSet export action for URL flexibility.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        view = AdminFraudAlertViewSet.as_view({'get': 'export'})
        return view(request._request)


# =============================================================================
# Admin Fraud Rules
# =============================================================================


class AdminFraudRuleViewSet(viewsets.ModelViewSet):
    """Admin fraud rule management."""

    queryset = FraudRule.objects.all()
    serializer_class = FraudRuleSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    ordering = ['-created_at']

    @action(detail=True, methods=['patch'])
    def toggle(self, request, pk=None):
        """PATCH /api/admin/fraud/rules/{id}/toggle/ — toggle rule enabled status."""
        rule = self.get_object()
        rule.enabled = not rule.enabled
        rule.save(update_fields=['enabled'])
        serializer = self.get_serializer(rule)
        return Response(serializer.data)


# =============================================================================
# Admin Compliance Views
# =============================================================================


class AdminComplianceRequestViewSet(viewsets.ModelViewSet):
    """Admin compliance request management."""

    queryset = ComplianceRequest.objects.all().select_related('requester', 'processed_by')
    serializer_class = ComplianceRequestSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_fields = ['type', 'status']
    search_fields = ['requester__email', 'requester__first_name', 'requester__last_name']
    ordering = ['-submitted_at']

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """GET /api/admin/compliance/stats/ — compliance statistics."""
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        seven_days = now + timedelta(days=7)

        qs = ComplianceRequest.objects.all()
        pending = qs.filter(status='pending').count()
        due_soon = qs.filter(status__in=['pending', 'in_progress'], due_at__lte=seven_days).count()
        completed_this_month = qs.filter(
            status='completed',
            completed_at__gte=month_start
        ).count()

        # Average completion days
        from django.db.models import Avg, F, ExpressionWrapper, DurationField
        completed = qs.filter(completed_at__isnull=False)
        avg_duration = completed.annotate(
            completion_time=ExpressionWrapper(
                F('completed_at') - F('submitted_at'),
                output_field=DurationField()
            )
        ).aggregate(avg=Avg('completion_time'))['avg']

        avg_days = 0.0
        if avg_duration:
            avg_days = round(avg_duration.total_seconds() / 86400, 1)

        # Additional counts for stat cards
        in_progress_count = qs.filter(status='in_progress').count()
        completed_count = qs.filter(status='completed').count()
        total_count = qs.count()

        data = {
            'pending_requests': pending,
            'due_soon': due_soon,
            'completed_this_month': completed_this_month,
            'average_completion_days': avg_days,
            'pending_count': pending,
            'processing_count': in_progress_count,
            'completed_count': completed_count,
            'total_count': total_count,
        }

        serializer = ComplianceStatsSerializer(data)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """POST /api/admin/compliance/requests/{id}/start/ — start processing."""
        compliance_request = self.get_object()
        if compliance_request.status != 'pending':
            return Response(
                {'error': 'Only pending requests can be started'},
                status=status.HTTP_400_BAD_REQUEST
            )
        compliance_request.status = 'in_progress'
        compliance_request.processed_by = request.user
        compliance_request.save(update_fields=['status', 'processed_by'])
        serializer = self.get_serializer(compliance_request)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        """POST /api/admin/compliance/requests/{id}/process/ — process request."""
        compliance_request = self.get_object()
        # Accept both 'status' (direct) and 'resolution' (frontend sends this)
        new_status = request.data.get('status') or request.data.get('resolution', 'completed')
        # Map frontend resolution values to backend status
        resolution_to_status = {
            'completed': 'completed',
            'partial': 'completed',
            'rejected': 'rejected',
        }
        new_status = resolution_to_status.get(new_status, new_status)
        notes = request.data.get('notes', '')

        if new_status not in ['completed', 'rejected']:
            return Response(
                {'error': 'status must be "completed" or "rejected"'},
                status=status.HTTP_400_BAD_REQUEST
            )

        compliance_request.status = new_status
        compliance_request.notes = notes
        compliance_request.completed_at = timezone.now()
        compliance_request.processed_by = request.user
        compliance_request.save(update_fields=['status', 'notes', 'completed_at', 'processed_by'])

        serializer = self.get_serializer(compliance_request)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """POST /api/admin/compliance/requests/{id}/verify/ — verify request identity."""
        import secrets
        compliance_request = self.get_object()

        # Generate verification code
        code = secrets.token_urlsafe(32)
        compliance_request.verification_code = code
        compliance_request.save(update_fields=['verification_code'])

        # TODO: Send verification email with code
        return Response({'message': 'Verification code sent to requester'})

    @action(detail=True, methods=['post'])
    def export(self, request, pk=None):
        """POST /api/admin/compliance/requests/{id}/export/ — generate data export."""
        compliance_request = self.get_object()

        # TODO: Generate actual export file with user data
        return Response({
            'download_url': None,
            'expires_at': None,
            'message': 'Export generated',
        })

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """GET /api/admin/compliance/requests/{id}/download/ — download data export."""
        compliance_request = self.get_object()
        # TODO: Return actual file; for now return placeholder
        return Response({
            'message': 'Download link generated',
            'file_url': None,
            'request_id': compliance_request.id,
        })

    @action(detail=True, methods=['get'], url_path='deletion-preview')
    def deletion_preview(self, request, pk=None):
        """GET /api/admin/compliance/requests/{id}/deletion-preview/ — preview deletion impact."""
        compliance_request = self.get_object()
        user = compliance_request.requester

        from apps.jobs.models import Job
        from apps.applications.models import Application

        # Count user's data that would be deleted
        applications_count = Application.objects.filter(applicant=user).count()
        jobs_count = Job.objects.filter(posted_by=user).count()
        notifications_count = user.notifications.count() if hasattr(user, 'notifications') else 0

        user_data = [
            {'type': 'Applications', 'count': applications_count},
            {'type': 'Jobs Posted', 'count': jobs_count},
            {'type': 'Notifications', 'count': notifications_count},
        ]

        total_records = applications_count + jobs_count + notifications_count

        preview = {
            'user_data': user_data,
            'total_records': total_records,
            'warnings': [
                'This action is irreversible. All user data will be permanently deleted.',
            ],
        }

        return Response(preview)

    @action(detail=True, methods=['post'])
    def delete(self, request, pk=None):
        """POST /api/admin/compliance/requests/{id}/delete/ — execute deletion."""
        compliance_request = self.get_object()

        if compliance_request.type not in ['gdpr_delete', 'ccpa_delete']:
            return Response(
                {'error': 'Request type must be a deletion request'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Mark user for deletion
        user = compliance_request.requester
        user.status = 'suspended'
        user.is_active = False
        user.save(update_fields=['status', 'is_active'])

        compliance_request.status = 'completed'
        compliance_request.completed_at = timezone.now()
        compliance_request.processed_by = request.user
        compliance_request.save(update_fields=['status', 'completed_at', 'processed_by'])

        return Response({'message': 'User data deletion initiated'})

    @action(detail=False, methods=['get', 'post'])
    def reports(self, request):
        """GET/POST /api/admin/compliance/reports/ — generate compliance report."""
        # TODO: Generate actual compliance report
        return Response({
            'message': 'Compliance report generated',
            'report_url': None,
        })

    @action(detail=False, methods=['get'], url_path='export')
    def export_requests(self, request):
        """GET /api/admin/compliance/export/ — export requests as CSV."""
        import csv
        from django.http import HttpResponse as DjangoHttpResponse

        qs = self.filter_queryset(self.get_queryset())
        response = DjangoHttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="compliance-requests-export.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'ID', 'Type', 'Status', 'Requester Email', 'Requester Name',
            'Submitted At', 'Due At', 'Completed At', 'Processed By'
        ])

        for req in qs:
            writer.writerow([
                req.id, req.get_type_display(), req.get_status_display(),
                req.requester.email, req.requester.get_full_name(),
                req.submitted_at, req.due_at, req.completed_at or '',
                req.processed_by.get_full_name() if req.processed_by else ''
            ])

        return response


class AdminComplianceStatsView(APIView):
    """
    GET /api/admin/compliance/stats/
    Redirect to the ViewSet stats action for URL flexibility.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        view = AdminComplianceRequestViewSet.as_view({'get': 'stats'})
        return view(request._request)


# =============================================================================
# Admin Dashboard Activity Log & Counts
# =============================================================================


class AdminDashboardActivityLogView(generics.ListAPIView):
    """
    GET /api/admin/dashboard/activity/log/
    Paginated activity log for admin dashboard.
    """

    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = AdminActivitySerializer
    ordering = ['-created_at']

    def get_queryset(self):
        return AdminActivity.objects.select_related('company', 'actor').order_by('-created_at')


class AdminDashboardCountsView(APIView):
    """
    GET /api/admin/dashboard/counts/
    Quick stat counts for dashboard.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from apps.users.models import User
        from apps.companies.models import Company
        from apps.jobs.models import Job

        data = {
            'users': User.objects.filter(status='active').count(),
            'companies': Company.objects.filter(status='verified').count(),
            'jobs': Job.objects.filter(status='published').count(),
            'pending_jobs': Job.objects.filter(status='pending').count(),
        }

        return Response(data)


class AdminDashboardAlertResolveView(APIView):
    """
    POST /api/admin/dashboard/alerts/{id}/resolve/
    Resolve a system alert (same as dismiss).
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, alert_id):
        try:
            alert = SystemAlert.objects.get(id=alert_id)
        except SystemAlert.DoesNotExist:
            return Response(
                {'detail': 'Alert not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        alert.is_dismissed = True
        alert.dismissed_by = request.user
        alert.dismissed_at = timezone.now()
        alert.save()

        return Response({'message': 'Alert resolved successfully.'})


# =============================================================================
# Admin Social Distribution
# =============================================================================


class AdminSocialProvidersView(APIView):
    """
    GET /api/admin/social/providers/
    List all social providers with connection status.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from apps.social.models import SocialAccount

        providers = [
            {'id': 'facebook', 'name': 'Facebook'},
            {'id': 'instagram', 'name': 'Instagram'},
            {'id': 'linkedin', 'name': 'LinkedIn'},
            {'id': 'twitter', 'name': 'Twitter/X'},
        ]

        # Check if platform admin accounts are connected (system-wide)
        result = []
        for provider in providers:
            # For admin, we check if ANY account exists for this platform
            account = SocialAccount.objects.filter(
                platform=provider['id']
            ).order_by('-created_at').first()

            result.append({
                'id': provider['id'],
                'name': provider['name'],
                'connected': account is not None and account.is_active,
                'tokenExpiry': account.token_expires_at.isoformat() if account and account.token_expires_at else None,
            })

        return Response(result)


class AdminSocialProviderConnectView(APIView):
    """
    POST /api/admin/social/providers/{providerId}/connect/
    Connect a social provider using OAuth credentials.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, providerId):
        from apps.social.models import SocialAccount

        app_id = request.data.get('app_id')
        app_secret = request.data.get('app_secret')

        if not app_id or not app_secret:
            return Response(
                {'error': 'app_id and app_secret are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create or update system-wide account for this provider
        # In production, this would exchange credentials for OAuth tokens
        account, created = SocialAccount.objects.update_or_create(
            platform=providerId,
            company=None,
            agency=None,
            defaults={
                'account_name': f'{providerId.title()} System Account',
                'account_id': f'system_{providerId}',
                'access_token': app_secret,  # In production, exchange for real token
                'refresh_token': '',
                'token_expires_at': timezone.now() + timedelta(days=60),
                'is_active': True,
            }
        )

        return Response({
            'id': providerId,
            'name': account.get_platform_display(),
            'connected': True,
            'tokenExpiry': account.token_expires_at.isoformat() if account.token_expires_at else None,
        })


class AdminSocialProviderDisconnectView(APIView):
    """
    POST /api/admin/social/providers/{providerId}/disconnect/
    Disconnect a social provider.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, providerId):
        from apps.social.models import SocialAccount

        SocialAccount.objects.filter(
            platform=providerId,
            company=None,
            agency=None
        ).update(is_active=False)

        return Response({'message': f'{providerId} disconnected successfully'})


class AdminSocialProviderRefreshView(APIView):
    """
    POST /api/admin/social/providers/{providerId}/refresh/
    Refresh OAuth token for a provider.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, providerId):
        from apps.social.models import SocialAccount

        try:
            account = SocialAccount.objects.get(
                platform=providerId,
                company=None,
                agency=None
            )
        except SocialAccount.DoesNotExist:
            return Response(
                {'error': 'Provider not connected'},
                status=status.HTTP_404_NOT_FOUND
            )

        # In production, refresh the actual OAuth token
        account.token_expires_at = timezone.now() + timedelta(days=60)
        account.save(update_fields=['token_expires_at', 'updated_at'])

        return Response({
            'id': providerId,
            'name': account.get_platform_display(),
            'connected': account.is_active,
            'tokenExpiry': account.token_expires_at.isoformat() if account.token_expires_at else None,
        })


class AdminSocialQueueView(generics.ListAPIView):
    """
    GET /api/admin/social/queue/
    Get social post queue with optional status filter.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from apps.social.models import SocialPost

        status_filter = request.query_params.get('status')
        page = int(request.query_params.get('page', 1))
        page_size = 50

        qs = SocialPost.objects.all().select_related('job', 'job__company').order_by('-created_at')

        if status_filter:
            qs = qs.filter(status=status_filter)

        # Manual pagination
        start = (page - 1) * page_size
        end = start + page_size
        total = qs.count()
        items = qs[start:end]

        results = []
        for post in items:
            results.append({
                'id': str(post.id),
                'jobTitle': post.job.title,
                'provider': post.platform,
                'status': post.status,
                'scheduledFor': post.scheduled_at.isoformat() if post.scheduled_at else None,
                'company': post.job.company.name if post.job.company else 'N/A',
                'error': post.error_message if post.error_message else None,
            })

        return Response({
            'count': total,
            'next': f'/api/admin/social/queue/?page={page + 1}' if end < total else None,
            'previous': f'/api/admin/social/queue/?page={page - 1}' if page > 1 else None,
            'results': results,
        })


class AdminSocialQueuePostNowView(APIView):
    """
    POST /api/admin/social/queue/{queueId}/post/
    Post immediately instead of waiting for scheduled time.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, queueId):
        from apps.social.models import SocialPost

        try:
            post = SocialPost.objects.get(id=queueId)
        except SocialPost.DoesNotExist:
            return Response(
                {'error': 'Post not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if post.status not in ['queued', 'pending', 'scheduled']:
            return Response(
                {'error': 'Post cannot be posted now'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Trigger immediate posting
        from apps.social.tasks import post_to_social_media
        post_to_social_media.delay(post.id)

        post.status = 'pending'
        post.save(update_fields=['status', 'updated_at'])

        return Response({
            'id': str(post.id),
            'jobTitle': post.job.title,
            'provider': post.platform,
            'status': post.status,
            'scheduledFor': post.scheduled_at.isoformat() if post.scheduled_at else None,
            'company': post.job.company.name if post.job.company else 'N/A',
        })


class AdminSocialQueueCancelView(APIView):
    """
    DELETE /api/admin/social/queue/{queueId}/
    Cancel a scheduled post.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def delete(self, request, queueId):
        from apps.social.models import SocialPost

        try:
            post = SocialPost.objects.get(id=queueId)
        except SocialPost.DoesNotExist:
            return Response(
                {'error': 'Post not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        post.delete()
        return Response({'message': 'Post cancelled successfully'}, status=status.HTTP_204_NO_CONTENT)


class AdminSocialQueueRetryView(APIView):
    """
    POST /api/admin/social/queue/{queueId}/retry/
    Retry a failed post.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, queueId):
        from apps.social.models import SocialPost

        try:
            post = SocialPost.objects.get(id=queueId)
        except SocialPost.DoesNotExist:
            return Response(
                {'error': 'Post not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if post.status != 'failed':
            return Response(
                {'error': 'Only failed posts can be retried'},
                status=status.HTTP_400_BAD_REQUEST
            )

        post.status = 'pending'
        post.error_message = ''
        post.save(update_fields=['status', 'error_message', 'updated_at'])

        # Trigger retry
        from apps.social.tasks import post_to_social_media
        post_to_social_media.delay(post.id)

        return Response({
            'id': str(post.id),
            'jobTitle': post.job.title,
            'provider': post.platform,
            'status': post.status,
            'scheduledFor': post.scheduled_at.isoformat() if post.scheduled_at else None,
            'company': post.job.company.name if post.job.company else 'N/A',
        })


class AdminSocialQueueRetryAllView(APIView):
    """
    POST /api/admin/social/queue/retry-all/
    Retry all failed posts.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        from apps.social.models import SocialPost

        failed_posts = SocialPost.objects.filter(status='failed')
        count = failed_posts.count()

        failed_posts.update(status='pending', error_message='')

        # Queue all for retry
        from apps.social.tasks import post_to_social_media
        for post in SocialPost.objects.filter(id__in=failed_posts.values_list('id', flat=True)):
            post_to_social_media.delay(post.id)

        return Response({'retriedCount': count})


class AdminSocialQueueSyncView(APIView):
    """
    POST /api/admin/social/queue/sync/
    Sync/refresh queue data from backend.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        # This is a no-op endpoint for frontend compatibility
        # In production, could trigger metrics sync from social platforms
        return Response({'message': 'Queue synced successfully'})


class AdminSocialTemplateViewSet(viewsets.ModelViewSet):
    """
    Admin social post template management.
    GET /api/admin/social/templates/
    POST /api/admin/social/templates/
    PATCH /api/admin/social/templates/{id}/
    DELETE /api/admin/social/templates/{id}/
    """

    from apps.social.models import SocialTemplate
    from apps.social.serializers import SocialTemplateSerializer

    queryset = SocialTemplate.objects.all()
    serializer_class = SocialTemplateSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    ordering = ['provider']


class AdminSocialSettingsView(APIView):
    """
    GET/PATCH /api/admin/social/settings/
    Social distribution settings.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        # Retrieve or create social settings from PlatformSetting
        try:
            setting = PlatformSetting.objects.get(key='social_settings')
            settings_data = setting.value
        except PlatformSetting.DoesNotExist:
            settings_data = {
                'policy_mode': 'user',
                'require_verification': False,
                'max_posts_per_day': 10,
                'rate_limits': {
                    'facebook': {'hourly': 5, 'daily': 50},
                    'instagram': {'hourly': 3, 'daily': 30},
                    'linkedin': {'hourly': 10, 'daily': 100},
                    'twitter': {'hourly': 20, 'daily': 200},
                }
            }

        return Response({
            'policyMode': settings_data.get('policy_mode', 'user'),
            'requireVerification': settings_data.get('require_verification', False),
            'maxPostsPerDay': settings_data.get('max_posts_per_day', 10),
            'rateLimits': settings_data.get('rate_limits', {}),
        })

    def patch(self, request):
        # Update social settings
        try:
            setting = PlatformSetting.objects.get(key='social_settings')
        except PlatformSetting.DoesNotExist:
            setting = PlatformSetting(key='social_settings', value={})

        current_value = setting.value if isinstance(setting.value, dict) else {}

        if 'policy_mode' in request.data:
            current_value['policy_mode'] = request.data['policy_mode']
        if 'require_verification' in request.data:
            current_value['require_verification'] = request.data['require_verification']
        if 'max_posts_per_day' in request.data:
            current_value['max_posts_per_day'] = request.data['max_posts_per_day']
        if 'rate_limits' in request.data:
            current_value['rate_limits'] = request.data['rate_limits']

        setting.value = current_value
        setting.updated_by = request.user
        setting.save()

        return Response({
            'policyMode': current_value.get('policy_mode', 'user'),
            'requireVerification': current_value.get('require_verification', False),
            'maxPostsPerDay': current_value.get('max_posts_per_day', 10),
            'rateLimits': current_value.get('rate_limits', {}),
        })


class AdminSocialStatsView(APIView):
    """
    GET /api/admin/social/stats/
    Social distribution statistics.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from apps.social.models import SocialPost

        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        total_posts = SocialPost.objects.count()
        posts_today = SocialPost.objects.filter(created_at__gte=today_start).count()
        queued_count = SocialPost.objects.filter(status__in=['queued', 'scheduled']).count()
        failed_count = SocialPost.objects.filter(status='failed').count()
        posted_count = SocialPost.objects.filter(status='posted').count()

        success_rate = 0.0
        if total_posts > 0:
            success_rate = round((posted_count / total_posts) * 100, 1)

        return Response({
            'postsToday': posts_today,
            'queuedCount': queued_count,
            'failedCount': failed_count,
            'successRate': success_rate,
        })


# =============================================================================
# Admin Banners
# =============================================================================


class AdminBannerViewSet(viewsets.ModelViewSet):
    """Admin sponsored banner management."""

    queryset = SponsoredBanner.objects.all()
    serializer_class = SponsoredBannerSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_fields = ['placement', 'is_active']
    search_fields = ['title', 'sponsor']
    ordering = ['-created_at']

    @action(detail=True, methods=['patch'], url_path='toggle-status')
    def toggle_status(self, request, pk=None):
        """PATCH /api/admin/banners/{id}/toggle-status/ — toggle banner active status."""
        banner = self.get_object()
        banner.is_active = not banner.is_active
        banner.save(update_fields=['is_active', 'updated_at'])
        serializer = self.get_serializer(banner)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='upload-image',
            parser_classes=[MultiPartParser], throttle_classes=[UploadRateThrottle])
    def upload_image(self, request):
        """POST /api/admin/sponsored-banners/upload-image/ — upload banner image to storage.

        Returns the public URL so the frontend can set it as image_url.
        """
        image_file = request.FILES.get('image')
        if not image_file:
            return Response(
                {'detail': 'No image file provided.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_upload(image_file, BANNER_PROFILE)
        except ValidationError as e:
            return Response({'detail': e.message}, status=status.HTTP_400_BAD_REQUEST)

        sanitize_filename(image_file)
        image_file = convert_to_webp(image_file)

        from django.core.files.storage import default_storage
        path = default_storage.save(f'sponsored_banners/{image_file.name}', image_file)
        url = default_storage.url(path)

        return Response({'url': url})


# =============================================================================
# Admin Affiliates
# =============================================================================


class AdminAffiliateLinkViewSet(viewsets.ModelViewSet):
    """Admin affiliate link management."""

    queryset = AffiliateLink.objects.all()
    serializer_class = AffiliateLinkSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_fields = ['placement', 'is_active']
    search_fields = ['name', 'company']
    ordering = ['-created_at']

    @action(detail=True, methods=['patch'], url_path='toggle-status')
    def toggle_status(self, request, pk=None):
        """PATCH /api/admin/affiliates/{id}/toggle-status/ — toggle affiliate link active status."""
        affiliate = self.get_object()
        affiliate.is_active = not affiliate.is_active
        affiliate.save(update_fields=['is_active', 'updated_at'])
        serializer = self.get_serializer(affiliate)
        return Response(serializer.data)


# =============================================================================
# Public Banner & Affiliate Endpoints
# =============================================================================


class PublicBannerViewSet(viewsets.ReadOnlyModelViewSet):
    """Public banner listing — returns active banners filtered by placement."""

    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = PublicBannerSerializer

    def get_queryset(self):
        today = timezone.now().date()
        qs = SponsoredBanner.objects.filter(is_active=True)
        # Filter by date range
        qs = qs.filter(
            models.Q(start_date__isnull=True) | models.Q(start_date__lte=today),
            models.Q(end_date__isnull=True) | models.Q(end_date__gte=today),
        )
        # Filter by placement query param
        placement = self.request.query_params.get('placement')
        if placement:
            qs = qs.filter(placement=placement)
        return qs

    @action(detail=True, methods=['post'], throttle_classes=[BannerTrackingThrottle])
    def impression(self, request, pk=None):
        """Record a banner impression. 24h dedup per visitor."""
        banner = self.get_object()
        is_new, visitor_id = record_impression(
            parent_instance=banner,
            detail_model_class=BannerImpression,
            fk_field_name='banner',
            request=request,
        )
        response = Response({'recorded': is_new}, status=status.HTTP_200_OK)
        return set_visitor_cookie(response, visitor_id)

    @action(detail=True, methods=['post'], throttle_classes=[BannerTrackingThrottle])
    def click(self, request, pk=None):
        """Record a banner click."""
        banner = self.get_object()
        visitor_id = record_click(
            parent_instance=banner,
            detail_model_class=BannerClick,
            fk_field_name='banner',
            request=request,
        )
        response = Response({'recorded': True}, status=status.HTTP_200_OK)
        return set_visitor_cookie(response, visitor_id)


class PublicAffiliateLinkViewSet(viewsets.ReadOnlyModelViewSet):
    """Public affiliate link listing — returns active links filtered by placement."""

    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = PublicAffiliateLinkSerializer

    def get_queryset(self):
        qs = AffiliateLink.objects.filter(is_active=True)
        placement = self.request.query_params.get('placement')
        if placement:
            qs = qs.filter(placement=placement)
        return qs

    @action(detail=True, methods=['post'], throttle_classes=[AffiliateTrackingThrottle])
    def click(self, request, pk=None):
        """Record an affiliate link click."""
        link = self.get_object()
        visitor_id = record_click(
            parent_instance=link,
            detail_model_class=AffiliateLinkClick,
            fk_field_name='link',
            request=request,
        )
        response = Response({'recorded': True}, status=status.HTTP_200_OK)
        return set_visitor_cookie(response, visitor_id)


# =============================================================================
# Admin Feature Flags
# =============================================================================


class AdminFeatureFlagViewSet(viewsets.ModelViewSet):
    """Admin feature flag management."""

    queryset = FeatureFlag.objects.all()
    serializer_class = FeatureFlagSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_fields = ['environment', 'enabled']
    search_fields = ['name', 'key']
    ordering = ['-created_at']

    @action(detail=True, methods=['patch'])
    def toggle(self, request, pk=None):
        """PATCH /api/admin/features/{id}/toggle/ — toggle feature flag enabled status."""
        flag = self.get_object()
        flag.enabled = not flag.enabled
        flag.save(update_fields=['enabled', 'updated_at'])
        serializer = self.get_serializer(flag)
        return Response(serializer.data)


# =============================================================================
# Admin Packages
# =============================================================================


class AdminPackageViewSet(viewsets.ModelViewSet):
    """Admin job package management."""

    queryset = JobPackage.objects.all()
    serializer_class = JobPackageSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_fields = ['payment_type', 'is_active']
    search_fields = ['name']
    ordering = ['sort_order', '-created_at']

    def perform_create(self, serializer):
        package = serializer.save()
        try:
            from apps.billing.stripe_service import sync_package_to_stripe
            sync_package_to_stripe(package)
        except Exception:
            import logging
            logging.getLogger(__name__).warning(
                'Failed to sync new package %s to Stripe', package.id, exc_info=True
            )

    def perform_update(self, serializer):
        package = serializer.save()
        try:
            from apps.billing.stripe_service import sync_package_to_stripe
            sync_package_to_stripe(package)
        except Exception:
            import logging
            logging.getLogger(__name__).warning(
                'Failed to sync updated package %s to Stripe', package.id, exc_info=True
            )

    @action(detail=True, methods=['patch'], url_path='toggle-status')
    def toggle_status(self, request, pk=None):
        """PATCH /api/admin/packages/{id}/toggle-status/ — toggle package active status."""
        package = self.get_object()
        package.is_active = not package.is_active
        package.save(update_fields=['is_active', 'updated_at'])
        try:
            from apps.billing.stripe_service import sync_package_to_stripe
            sync_package_to_stripe(package)
        except Exception:
            import logging
            logging.getLogger(__name__).warning(
                'Failed to sync package %s status to Stripe', package.id, exc_info=True
            )
        serializer = self.get_serializer(package)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """POST /api/admin/packages/{id}/duplicate/ — duplicate a package."""
        original = self.get_object()

        # Create duplicate with modified name
        duplicate = JobPackage.objects.create(
            name=f"{original.name} (Copy)",
            description=original.description,
            credits=original.credits,
            validity_days=original.validity_days,
            package_validity_days=original.package_validity_days,
            price=original.price,
            sale_price=original.sale_price,
            monthly_price=original.monthly_price,
            yearly_price=original.yearly_price,
            tax_rate=original.tax_rate,
            currency=original.currency,
            payment_type=original.payment_type,
            features=original.features,
            is_active=False,  # Duplicates start inactive
            is_popular=False,
            disable_repeat_purchase=original.disable_repeat_purchase,
            sort_order=original.sort_order + 1,
        )

        try:
            from apps.billing.stripe_service import sync_package_to_stripe
            sync_package_to_stripe(duplicate)
        except Exception:
            import logging
            logging.getLogger(__name__).warning(
                'Failed to sync duplicated package %s to Stripe', duplicate.id, exc_info=True
            )

        serializer = self.get_serializer(duplicate)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='sync-stripe')
    def sync_stripe(self, request, pk=None):
        """POST /api/admin/job-packages/{id}/sync-stripe/ — Force sync to Stripe."""
        package = self.get_object()
        try:
            from apps.billing.stripe_service import sync_package_to_stripe
            sync_package_to_stripe(package)
            return Response(self.get_serializer(package).data)
        except Exception as exc:
            return Response(
                {'error': f'Failed to sync to Stripe: {exc}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# =============================================================================
# Admin Categories & Industries
# =============================================================================


class AdminCategoryViewSet(viewsets.ModelViewSet):
    """Admin CRUD for job categories."""

    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = CategorySerializer
    queryset = Category.objects.all()
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search')
        is_active = self.request.query_params.get('is_active')
        if search:
            qs = qs.filter(name__icontains=search)
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')
        return qs


class AdminIndustryViewSet(viewsets.ModelViewSet):
    """Admin CRUD for company industries."""

    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = IndustrySerializer
    queryset = Industry.objects.all()
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search')
        is_active = self.request.query_params.get('is_active')
        if search:
            qs = qs.filter(name__icontains=search)
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')
        return qs


class AdminRetentionRuleViewSet(viewsets.ModelViewSet):
    """Admin CRUD for data retention rules."""

    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = RetentionRuleSerializer
    queryset = RetentionRule.objects.all()
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        enforcement = self.request.query_params.get('enforcement')
        is_active = self.request.query_params.get('is_active')
        search = self.request.query_params.get('search')
        if enforcement:
            qs = qs.filter(enforcement=enforcement)
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')
        if search:
            qs = qs.filter(
                models.Q(category__icontains=search) |
                models.Q(description__icontains=search)
            )
        return qs


class AdminLegalDocumentViewSet(viewsets.ModelViewSet):
    """Admin CRUD for legal documents (privacy policy, terms, etc.)."""

    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = LegalDocumentSerializer
    queryset = LegalDocument.objects.all()
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        document_type = self.request.query_params.get('document_type')
        doc_status = self.request.query_params.get('status')
        search = self.request.query_params.get('search')
        if document_type:
            qs = qs.filter(document_type=document_type)
        if doc_status:
            qs = qs.filter(status=doc_status)
        if search:
            qs = qs.filter(title__icontains=search)
        return qs

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """Publish a legal document."""
        doc = self.get_object()
        doc.status = 'published'
        doc.published_at = timezone.now()
        doc.last_reviewed_at = timezone.now()
        doc.reviewed_by = request.user
        doc.save()
        return Response(self.get_serializer(doc).data)

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Archive a legal document."""
        doc = self.get_object()
        doc.status = 'archived'
        doc.save()
        return Response(self.get_serializer(doc).data)
