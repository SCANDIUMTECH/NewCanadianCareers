"""
Email management views for Admin API.
These views handle email providers, triggers, templates, logs, and settings.

All Resend operations use the SDK v2 (resend>=2.23.0) via Celery tasks
for async execution, or synchronously for admin-facing reads.
"""
import logging

import resend
from django.conf import settings
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from django.utils.text import slugify
from datetime import timedelta

from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action

from core.permissions import IsAdmin
from apps.notifications.models import (
    EmailProvider, EmailTrigger, EmailTemplate, EmailTemplateVersion,
    EmailLog, EmailSettings
)
from apps.notifications.serializers import (
    EmailProviderSerializer, EmailTriggerSerializer, EmailTriggerCreateUpdateSerializer,
    EmailTemplateListSerializer, EmailTemplateDetailSerializer,
    EmailTemplateVersionSerializer,
    EmailLogSerializer, EmailLogDetailSerializer, EmailSettingsSerializer
)

logger = logging.getLogger(__name__)

# Ensure Resend API key is set for synchronous admin operations
resend.api_key = settings.RESEND_API_KEY


class EmailProviderListView(APIView):
    """
    GET /api/admin/email/providers/
    List all email providers (both connected and available).
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        # Define available providers
        available_providers = [
            {'provider_type': 'resend', 'name': 'Resend', 'logo': '/logos/resend.svg'},
            {'provider_type': 'zeptomail', 'name': 'ZeptoMail', 'logo': '/logos/zeptomail.svg'},
            {'provider_type': 'smtp', 'name': 'SMTP', 'logo': '/logos/smtp.svg'},
        ]

        # Get or create provider instances
        providers = []
        for prov_data in available_providers:
            provider, created = EmailProvider.objects.get_or_create(
                provider_type=prov_data['provider_type'],
                defaults={
                    'name': prov_data['name'],
                    'logo': prov_data['logo']
                }
            )
            providers.append(provider)

        serializer = EmailProviderSerializer(providers, many=True)
        return Response(serializer.data)


class EmailProviderConnectView(APIView):
    """
    POST /api/admin/email/providers/{id}/connect/
    Connect a provider with API key.

    For Resend: validates the key by listing domains, then syncs domain data.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, id):
        try:
            provider = EmailProvider.objects.get(provider_type=id)
        except EmailProvider.DoesNotExist:
            return Response(
                {'detail': 'Provider not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        api_key = request.data.get('apiKey', '')
        sending_domain = request.data.get('sendingDomain', '')
        webhook_secret = request.data.get('webhookSecret', '')
        webhook_url = request.data.get('webhookUrl', '')

        # Validate based on provider type
        if id == 'resend':
            if not api_key:
                return Response(
                    {'detail': 'API key is required.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            try:
                old_key = resend.api_key
                resend.api_key = api_key
                domains = resend.Domains.list()
                resend.api_key = old_key

                if sending_domain and hasattr(domains, 'data'):
                    for d in domains.data:
                        d_name = d.get('name', '') if isinstance(d, dict) else getattr(d, 'name', '')
                        d_status = d.get('status', '') if isinstance(d, dict) else getattr(d, 'status', '')
                        if d_name == sending_domain:
                            if d_status == 'verified':
                                provider.spf = 'verified'
                                provider.dkim = 'verified'
                                provider.dmarc = 'verified'
                            elif d_status == 'pending':
                                provider.spf = 'warning'
                                provider.dkim = 'warning'
                                provider.dmarc = 'warning'
                            break
            except Exception as e:
                return Response(
                    {'detail': f'Invalid API key: {e}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        elif id == 'zeptomail':
            if not api_key:
                return Response(
                    {'detail': 'ZeptoMail send mail token is required.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            # Validate the token by making a lightweight API call
            import requests as http_requests
            try:
                resp = http_requests.post(
                    'https://api.zeptomail.com/v1.1/email',
                    headers={
                        'Authorization': f'Zoho-enczapikey {api_key}',
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    json={
                        'from': {'address': 'validate@test.invalid'},
                        'to': [{'email_address': {'address': 'validate@test.invalid'}}],
                        'subject': 'validate',
                        'textbody': 'validate',
                    },
                    timeout=10,
                )
                # 401/403 = bad token; 4xx with auth-error codes = bad token
                # 400 with domain/address errors = token is valid, domain not set up yet (expected)
                if resp.status_code in (401, 403):
                    return Response(
                        {'detail': 'Invalid ZeptoMail token. Check your send mail token.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except http_requests.RequestException as e:
                return Response(
                    {'detail': f'Could not reach ZeptoMail API: {e}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        elif id == 'smtp':
            smtp_host = request.data.get('smtpHost', '')
            smtp_port = int(request.data.get('smtpPort', 587))
            smtp_username = request.data.get('smtpUsername', '')
            smtp_password = request.data.get('smtpPassword', '')
            smtp_use_tls = request.data.get('smtpUseTls', True)
            smtp_use_ssl = request.data.get('smtpUseSsl', False)

            if not smtp_host:
                return Response(
                    {'detail': 'SMTP host is required.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Validate SMTP connection
            import smtplib
            try:
                if smtp_use_ssl:
                    server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10)
                else:
                    server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
                    if smtp_use_tls:
                        server.starttls()
                if smtp_username and smtp_password:
                    server.login(smtp_username, smtp_password)
                server.quit()
            except Exception as e:
                return Response(
                    {'detail': f'SMTP connection failed: {e}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            provider.smtp_host = smtp_host
            provider.smtp_port = smtp_port
            provider.smtp_username = smtp_username
            provider.smtp_password = smtp_password
            provider.smtp_use_tls = smtp_use_tls
            provider.smtp_use_ssl = smtp_use_ssl

        else:
            return Response(
                {'detail': f'Unknown provider: {id}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            EmailProvider.objects.exclude(pk=provider.pk).update(is_active=False)

            if api_key:
                provider.api_key = api_key
            provider.sending_domain = sending_domain
            if webhook_secret:
                provider.webhook_secret = webhook_secret
            if webhook_url:
                provider.webhook_url = webhook_url
            provider.connected = True
            provider.status = 'active'
            provider.is_active = True
            provider.last_sync = timezone.now()
            provider.save()

        if id == 'resend':
            resend.api_key = api_key

        serializer = EmailProviderSerializer(provider)
        return Response(serializer.data)


class EmailProviderDisconnectView(APIView):
    """
    POST /api/admin/email/providers/{id}/disconnect/
    Disconnect a provider.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, id):
        try:
            provider = EmailProvider.objects.get(provider_type=id)
        except EmailProvider.DoesNotExist:
            return Response(
                {'detail': 'Provider not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        provider.connected = False
        provider.status = 'disconnected'
        provider.api_key = ''
        provider.is_active = False
        provider.spf = 'missing'
        provider.dkim = 'missing'
        provider.dmarc = 'missing'
        provider.webhook_secret = ''
        provider.webhook_url = ''
        provider.smtp_host = ''
        provider.smtp_port = 587
        provider.smtp_username = ''
        provider.smtp_password = ''
        provider.smtp_use_tls = True
        provider.smtp_use_ssl = False
        provider.save()

        return Response({'message': 'Provider disconnected successfully.'})


class EmailProviderTestView(APIView):
    """
    POST /api/admin/email/providers/{id}/test/
    Test provider connection by sending a real test email via Resend SDK v2.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, id):
        try:
            provider = EmailProvider.objects.get(provider_type=id)
        except EmailProvider.DoesNotExist:
            return Response(
                {'detail': 'Provider not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not provider.connected:
            return Response(
                {'detail': 'Provider is not connected.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        recipient_email = request.data.get('recipientEmail')
        if not recipient_email:
            return Response(
                {'detail': 'Recipient email is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Optionally use a real template if provided
        template_slug = request.data.get('templateSlug')
        html_content = None
        subject = 'Orion Test Email'

        if template_slug:
            try:
                template_obj = EmailTemplate.objects.get(slug=template_slug)
                html_content = template_obj.html
                subject = template_obj.subject or subject
            except EmailTemplate.DoesNotExist:
                pass  # Fall back to default

        if not html_content:
            html_content = (
                '<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">'
                '<h2 style="color: #3B5BDB;">Test Email from Orion</h2>'
                '<p>This is a test email sent from the Orion admin panel to verify your email provider configuration.</p>'
                '<p style="color: #6B7280; font-size: 14px;">If you received this email, your email provider integration is working correctly.</p>'
                '<hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />'
                f'<p style="color: #9CA3AF; font-size: 12px;">Sent via {id.upper() if id == "smtp" else id.capitalize()}</p>'
                '</div>'
            )

        # Build sender info from EmailSettings
        email_settings = EmailSettings.get_settings()
        from_name = email_settings.default_from_name or 'Orion'
        from_email = email_settings.default_from_email or settings.DEFAULT_FROM_EMAIL

        if id == 'resend':
            try:
                old_key = resend.api_key
                if provider.api_key:
                    resend.api_key = provider.api_key

                if provider.spf != 'verified' or not provider.sending_domain:
                    from_email = 'onboarding@resend.dev'

                from_field = f'{from_name} <{from_email}>'

                params: resend.Emails.SendParams = {
                    'from': from_field,
                    'to': [recipient_email],
                    'subject': subject,
                    'html': html_content,
                    'tags': [
                        {'name': 'type', 'value': 'test'},
                        {'name': 'source', 'value': 'admin_panel'},
                    ],
                }

                email = resend.Emails.send(params)
                resend.api_key = old_key

                email_id = email.get('id', '') if isinstance(email, dict) else getattr(email, 'id', '')

                provider.last_sync = timezone.now()
                provider.status = 'active'
                provider.save(update_fields=['last_sync', 'status', 'updated_at'])

                return Response({
                    'success': True,
                    'message': f'Test email sent successfully to {recipient_email}',
                    'emailId': email_id,
                })

            except Exception as e:
                resend.api_key = old_key if 'old_key' in dir() else settings.RESEND_API_KEY
                provider.status = 'error'
                provider.save(update_fields=['status', 'updated_at'])
                error_msg = f'Failed to send test email: {e}'
                return Response(
                    {'success': False, 'detail': error_msg, 'message': error_msg},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        elif id == 'zeptomail':
            try:
                from django.core.mail import EmailMessage, get_connection
                connection = get_connection(
                    backend='apps.notifications.backends.zeptomail.ZeptoMailEmailBackend',
                    api_key=provider.api_key,
                    fail_silently=False,
                )

                msg = EmailMessage(
                    subject=subject,
                    body=html_content,
                    from_email=f'{from_name} <{from_email}>',
                    to=[recipient_email],
                    connection=connection,
                )
                msg.content_subtype = 'html'
                msg.send()

                provider.last_sync = timezone.now()
                provider.status = 'active'
                provider.save(update_fields=['last_sync', 'status', 'updated_at'])

                return Response({
                    'success': True,
                    'message': f'Test email sent successfully to {recipient_email} via ZeptoMail',
                })

            except Exception as e:
                provider.status = 'error'
                provider.save(update_fields=['status', 'updated_at'])
                error_msg = f'Failed to send test email via ZeptoMail: {e}'
                return Response(
                    {'success': False, 'detail': error_msg, 'message': error_msg},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        elif id == 'smtp':
            try:
                from django.core.mail import EmailMessage, get_connection
                connection = get_connection(
                    backend='django.core.mail.backends.smtp.EmailBackend',
                    host=provider.smtp_host,
                    port=provider.smtp_port,
                    username=provider.smtp_username,
                    password=provider.smtp_password,
                    use_tls=provider.smtp_use_tls,
                    use_ssl=provider.smtp_use_ssl,
                    fail_silently=False,
                )
                msg = EmailMessage(
                    subject=subject,
                    body=html_content,
                    from_email=f'{from_name} <{from_email}>',
                    to=[recipient_email],
                    connection=connection,
                )
                msg.content_subtype = 'html'
                msg.send()

                provider.last_sync = timezone.now()
                provider.status = 'active'
                provider.save(update_fields=['last_sync', 'status', 'updated_at'])

                return Response({
                    'success': True,
                    'message': f'Test email sent successfully to {recipient_email} via SMTP',
                })

            except Exception as e:
                provider.status = 'error'
                provider.save(update_fields=['status', 'updated_at'])
                error_msg = f'Failed to send test email via SMTP: {e}'
                return Response(
                    {'success': False, 'detail': error_msg, 'message': error_msg},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        else:
            return Response(
                {'detail': f'Test send not implemented for {id}.'},
                status=status.HTTP_501_NOT_IMPLEMENTED
            )


class EmailProviderSetActiveView(APIView):
    """
    POST /api/admin/email/providers/{id}/set-active/
    Set a provider as the active one.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, id):
        try:
            provider = EmailProvider.objects.get(provider_type=id)
        except EmailProvider.DoesNotExist:
            return Response(
                {'detail': 'Provider not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not provider.connected:
            return Response(
                {'detail': 'Cannot activate a disconnected provider.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Deactivate all other providers
        EmailProvider.objects.all().update(is_active=False)

        # Activate this provider
        provider.is_active = True
        provider.save()

        # Update the global resend API key
        if id == 'resend' and provider.api_key:
            resend.api_key = provider.api_key

        return Response({'message': f'{provider.name} set as active provider.'})


class EmailProviderSyncDnsView(APIView):
    """
    POST /api/admin/email/providers/{id}/sync-dns/
    Sync DNS verification status from Resend for the provider's sending domain.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, id):
        try:
            provider = EmailProvider.objects.get(provider_type=id)
        except EmailProvider.DoesNotExist:
            return Response(
                {'detail': 'Provider not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not provider.connected or id != 'resend':
            return Response(
                {'detail': 'DNS sync only available for connected Resend providers.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            if provider.api_key:
                resend.api_key = provider.api_key

            domains = resend.Domains.list()
            domain_data = domains.data if hasattr(domains, 'data') else (domains.get('data', []) if isinstance(domains, dict) else [])

            matched = False
            dns_records = []
            for d in domain_data:
                d_name = d.get('name', '') if isinstance(d, dict) else getattr(d, 'name', '')
                if d_name == provider.sending_domain:
                    d_status = d.get('status', '') if isinstance(d, dict) else getattr(d, 'status', '')
                    d_id = d.get('id', '') if isinstance(d, dict) else getattr(d, 'id', '')

                    # Get full domain details including DNS records
                    domain_detail = resend.Domains.get(d_id)
                    records = None
                    if isinstance(domain_detail, dict):
                        records = domain_detail.get('records', [])
                    elif hasattr(domain_detail, 'records'):
                        records = domain_detail.records

                    if records:
                        for rec in records:
                            rec_data = rec if isinstance(rec, dict) else rec.__dict__
                            rec_type = rec_data.get('record', '') or rec_data.get('type', '')
                            rec_status = rec_data.get('status', 'not_started')
                            dns_records.append(rec_data)

                            # Update provider DNS status
                            if 'spf' in rec_type.lower() or rec_type == 'MX':
                                provider.spf = 'verified' if rec_status == 'verified' else 'warning' if rec_status == 'pending' else 'missing'
                            elif 'dkim' in rec_type.lower():
                                if rec_status == 'verified':
                                    provider.dkim = 'verified'
                                elif rec_status == 'pending':
                                    provider.dkim = 'warning'

                    if d_status == 'verified':
                        provider.spf = 'verified'
                        provider.dkim = 'verified'
                        provider.dmarc = 'verified'

                    matched = True
                    break

            provider.last_sync = timezone.now()
            provider.save()

            if not matched:
                return Response({
                    'message': f'Domain {provider.sending_domain} not found in Resend account.',
                    'domains': [
                        (d.get('name', '') if isinstance(d, dict) else getattr(d, 'name', ''))
                        for d in domain_data
                    ],
                })

            serializer = EmailProviderSerializer(provider)
            return Response({
                'provider': serializer.data,
                'dnsRecords': dns_records,
            })

        except Exception as e:
            logger.error('DNS sync failed: %s', e)
            return Response(
                {'detail': f'DNS sync failed: {e}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ---------------------------------------------------------------------------
# Domain Management Views (Resend SDK v2)
# ---------------------------------------------------------------------------

class ResendDomainListView(APIView):
    """
    GET /api/admin/email/domains/
    List all sending domains from Resend.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        try:
            domains = resend.Domains.list()
            data = domains.data if hasattr(domains, 'data') else (domains.get('data', []) if isinstance(domains, dict) else [])
            result = [d if isinstance(d, dict) else d.__dict__ for d in data]
            return Response({'data': result})
        except Exception as e:
            return Response(
                {'detail': f'Failed to list domains: {e}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ResendDomainCreateView(APIView):
    """
    POST /api/admin/email/domains/
    Create a new sending domain in Resend.

    Body: { "name": "example.com", "region": "us-east-1" }
    Regions: us-east-1, eu-west-1, sa-east-1, ap-northeast-1
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        domain_name = request.data.get('name')
        region = request.data.get('region', 'us-east-1')

        if not domain_name:
            return Response(
                {'detail': 'Domain name is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            params: resend.Domains.CreateParams = {
                'name': domain_name,
                'region': region,
            }
            domain = resend.Domains.create(params)
            result = domain if isinstance(domain, dict) else domain.__dict__
            return Response(result, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {'detail': f'Failed to create domain: {e}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ResendDomainDetailView(APIView):
    """
    GET /api/admin/email/domains/{domain_id}/
    Get domain details including DNS records.

    DELETE /api/admin/email/domains/{domain_id}/
    Remove a sending domain.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, domain_id):
        try:
            domain = resend.Domains.get(domain_id)
            result = domain if isinstance(domain, dict) else domain.__dict__
            return Response(result)
        except Exception as e:
            return Response(
                {'detail': f'Failed to get domain: {e}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def delete(self, request, domain_id):
        try:
            resend.Domains.remove(domain_id)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response(
                {'detail': f'Failed to delete domain: {e}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ResendDomainVerifyView(APIView):
    """
    POST /api/admin/email/domains/{domain_id}/verify/
    Trigger DNS verification for a domain.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, domain_id):
        try:
            result = resend.Domains.verify(domain_id)
            return Response({
                'success': True,
                'result': result if isinstance(result, dict) else str(result),
            })
        except Exception as e:
            return Response(
                {'detail': f'Failed to verify domain: {e}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ResendDomainUpdateView(APIView):
    """
    PATCH /api/admin/email/domains/{domain_id}/
    Update domain settings (tracking, TLS).

    Body: { "open_tracking": true, "click_tracking": true, "tls": "enforced" }
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, domain_id):
        try:
            params: resend.Domains.UpdateParams = {'id': domain_id}

            if 'open_tracking' in request.data:
                params['open_tracking'] = request.data['open_tracking']
            if 'click_tracking' in request.data:
                params['click_tracking'] = request.data['click_tracking']
            if 'tls' in request.data:
                params['tls'] = request.data['tls']

            result = resend.Domains.update(params)
            return Response({
                'success': True,
                'result': result if isinstance(result, dict) else str(result),
            })
        except Exception as e:
            return Response(
                {'detail': f'Failed to update domain: {e}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ---------------------------------------------------------------------------
# API Key Management Views (Resend SDK v2)
# ---------------------------------------------------------------------------

class ResendApiKeyListView(APIView):
    """
    GET /api/admin/email/api-keys/
    List all API keys in the Resend account.

    POST /api/admin/email/api-keys/
    Create a new API key.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        try:
            keys = resend.ApiKeys.list()
            data = keys.data if hasattr(keys, 'data') else (keys.get('data', []) if isinstance(keys, dict) else [])
            result = [k if isinstance(k, dict) else k.__dict__ for k in data]
            return Response({'data': result})
        except Exception as e:
            return Response(
                {'detail': f'Failed to list API keys: {e}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def post(self, request):
        name = request.data.get('name')
        permission = request.data.get('permission', 'full_access')
        domain_id = request.data.get('domain_id')

        if not name:
            return Response(
                {'detail': 'API key name is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            params: resend.ApiKeys.CreateParams = {
                'name': name,
                'permission': permission,
            }
            if domain_id:
                params['domain_id'] = domain_id

            key = resend.ApiKeys.create(params)
            result = key if isinstance(key, dict) else key.__dict__
            return Response(result, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {'detail': f'Failed to create API key: {e}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ResendApiKeyDeleteView(APIView):
    """
    DELETE /api/admin/email/api-keys/{key_id}/
    Delete an API key.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def delete(self, request, key_id):
        try:
            resend.ApiKeys.remove(key_id)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response(
                {'detail': f'Failed to delete API key: {e}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ---------------------------------------------------------------------------
# Existing views (triggers, templates, logs, settings)
# ---------------------------------------------------------------------------

class EmailTriggerViewSet(viewsets.ModelViewSet):
    """
    ViewSet for email triggers.
    GET /api/admin/email/triggers/ - List triggers
    POST /api/admin/email/triggers/ - Create trigger
    GET /api/admin/email/triggers/{id}/ - Get trigger
    PATCH /api/admin/email/triggers/{id}/ - Update trigger
    """

    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = EmailTrigger.objects.select_related('provider', 'template').all()
    filterset_fields = ['status', 'category', 'audience']
    search_fields = ['name', 'event_key']
    ordering_fields = ['name', 'category', 'audience', 'status', 'sends_7d', 'errors_7d', 'updated_at']
    ordering = ['category', 'name']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return EmailTriggerCreateUpdateSerializer
        return EmailTriggerSerializer

    def update(self, request, *args, **kwargs):
        """Override to return the read serializer after save."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        instance.refresh_from_db()
        return Response(EmailTriggerSerializer(instance).data)

    def create(self, request, *args, **kwargs):
        """Override to return the read serializer after create."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        instance = serializer.instance
        instance.refresh_from_db()
        return Response(
            EmailTriggerSerializer(instance).data,
            status=status.HTTP_201_CREATED
        )

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by status param (enabled/disabled)
        status_filter = self.request.query_params.get('status')
        if status_filter == 'enabled':
            queryset = queryset.filter(status=True)
        elif status_filter == 'disabled':
            queryset = queryset.filter(status=False)

        return queryset

    @action(detail=True, methods=['post'])
    def toggle(self, request, pk=None):
        """Toggle trigger enabled/disabled."""
        trigger = self.get_object()
        enabled = request.data.get('enabled', not trigger.status)
        trigger.status = enabled
        trigger.save()

        serializer = EmailTriggerSerializer(trigger)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='bulk')
    def bulk_update(self, request):
        """Bulk update triggers."""
        ids = request.data.get('ids', [])
        action_type = request.data.get('action')

        if not ids:
            return Response(
                {'detail': 'No trigger IDs provided.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        triggers = EmailTrigger.objects.filter(id__in=ids)

        if action_type == 'enable':
            triggers.update(status=True)
        elif action_type == 'disable':
            triggers.update(status=False)
        elif action_type == 'move_category':
            category = request.data.get('category')
            if category:
                triggers.update(category=category)
        elif action_type == 'assign_template':
            template_id = request.data.get('template')
            if template_id:
                triggers.update(template_id=template_id)

        return Response({'updated': triggers.count()})

    @action(detail=False, methods=['get'], url_path='categories')
    def categories(self, request):
        """Get list of trigger categories."""
        cats = [choice[0] for choice in EmailTrigger.CATEGORY_CHOICES]
        return Response(cats)

    @action(detail=False, methods=['get'], url_path='audiences')
    def audiences(self, request):
        """Get list of audience types."""
        auds = [choice[0] for choice in EmailTrigger.AUDIENCE_CHOICES]
        return Response(auds)

    @action(detail=False, methods=['get'], url_path='event-keys')
    def event_keys(self, request):
        """Get known event keys with availability info."""
        from apps.notifications.management.commands.seed_email_triggers import TRIGGER_DEFINITIONS

        used_keys = set(EmailTrigger.objects.values_list('event_key', flat=True))

        results = []
        seen_keys = set()
        for name, event_key, category, audience, template_slug, enabled in TRIGGER_DEFINITIONS:
            seen_keys.add(event_key)
            results.append({
                'event_key': event_key,
                'name': name,
                'category': category,
                'audience': audience,
                'in_use': event_key in used_keys,
            })

        # Include any custom keys already in DB but not in seed
        for trigger in EmailTrigger.objects.exclude(event_key__in=seen_keys):
            results.append({
                'event_key': trigger.event_key,
                'name': trigger.name,
                'category': trigger.category,
                'audience': trigger.audience,
                'in_use': True,
            })

        return Response(results)

    @action(detail=True, methods=['post'])
    def test(self, request, pk=None):
        """Send a test email for this trigger using its linked template and provider.

        POST /api/admin/email/triggers/{id}/test/
        Body: { "recipientEmail": "user@example.com" }

        Resolves the trigger's template and provider, renders with sample
        context variables, and sends a real email.
        """
        trigger = self.get_object()
        recipient_email = request.data.get('recipientEmail')
        if not recipient_email:
            return Response(
                {'success': False, 'message': 'Recipient email is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Resolve template
        template = trigger.template
        if not template:
            return Response(
                {'success': False,
                 'message': 'No template linked to this trigger. '
                            'Assign a template first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Resolve provider: trigger-specific, or fall back to active provider
        provider = trigger.provider
        if not provider or not provider.connected:
            provider = EmailProvider.objects.filter(
                connected=True, is_active=True
            ).first()

        if not provider:
            return Response(
                {'success': False,
                 'message': 'No active email provider configured.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Build sample context from template variables
        from apps.notifications.tasks import render_email_template
        sample_values = {
            'name': 'Jane Doe',
            'job_title': 'Senior Software Engineer',
            'company_name': 'Acme Corp',
            'job_url': 'https://orion.jobs/jobs/example',
            'dashboard_url': 'https://orion.jobs/company',
            'billing_url': 'https://orion.jobs/company/billing',
            'support_url': 'https://orion.jobs/support',
            'reset_url': 'https://orion.jobs/reset-password',
            'invite_url': 'https://orion.jobs/accept-invite/example',
            'repost_url': 'https://orion.jobs/company/jobs/new',
            'resubscribe_url': 'https://orion.jobs/company/billing',
            'invoice_url': 'https://orion.jobs/company/billing/invoices/1',
            'download_url': 'https://orion.jobs/exports/download/example',
            'message_url': 'https://orion.jobs/applications/1/messages',
            'verify_url': 'https://orion.jobs/verify-email/example',
            'entity_type': 'company',
            'inviter_name': 'John Smith',
            'role': 'Recruiter',
            'status': 'Interview',
            'action': 'Paused by Admin',
            'reason': 'Pending content review',
            'change_type': 'email address',
            'ip_address': '192.168.1.1',
            'location': 'New York, US',
            'time': timezone.now().strftime('%Y-%m-%d %H:%M UTC'),
            'plan_name': 'Professional Plan',
            'end_date': '2026-04-01',
            'next_billing_date': '2026-03-15',
            'credits_remaining': '5',
            'credits_amount': '10',
            'invoice_number': 'INV-2026-0042',
            'amount': '$99.00',
            'unlock_time': '15 minutes',
            'expiry_hours': '48',
            'candidate_name': 'Alice Johnson',
            'sender_name': 'Bob Williams',
            'message_preview': 'Thank you for your application. We would like to schedule an interview...',
            'job_count': '7',
            'search_name': 'React Developer',
            'severity': 'High',
            'alert_type': 'Suspicious Login',
            'subject_name': 'test@example.com',
            'description': 'Multiple login attempts from unusual location.',
            'indicators': 'IP mismatch, new device',
            'rule_name': 'geo_anomaly',
            'alert_url': 'https://orion.jobs/admin/fraud',
            'review_url': 'https://orion.jobs/admin/jobs?status=pending',
            'expired_date': '2026-02-25',
            'expires_date': '2026-03-01',
            'days_remaining': '3',
            'scheduled_date': '2026-03-10',
            'applications_count': '24',
            'content': 'This is a test email sent from the Orion admin panel '
                       'to verify your trigger configuration.',
        }

        try:
            html_content = render_email_template(
                template.slug, {**sample_values}
            )
        except Exception as e:
            return Response(
                {'success': False,
                 'message': f'Failed to render template: {e}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Build sender info
        email_settings = EmailSettings.get_settings()
        from_name = email_settings.default_from_name or 'Orion'
        from_email = (email_settings.default_from_email
                      or settings.DEFAULT_FROM_EMAIL)
        subject = (f'[TEST] {trigger.name} — '
                   f'{template.subject or "Orion Notification"}')

        provider_type = provider.provider_type

        try:
            if provider_type == 'resend':
                old_key = resend.api_key
                if provider.api_key:
                    resend.api_key = provider.api_key

                if provider.spf != 'verified' or not provider.sending_domain:
                    from_email = 'onboarding@resend.dev'

                from_field = f'{from_name} <{from_email}>'
                params: resend.Emails.SendParams = {
                    'from': from_field,
                    'to': [recipient_email],
                    'subject': subject,
                    'html': html_content,
                    'tags': [
                        {'name': 'type', 'value': 'trigger_test'},
                        {'name': 'trigger', 'value': trigger.event_key.replace('.', '_')},
                        {'name': 'template', 'value': template.slug.replace('.', '_')},
                    ],
                }
                resend.Emails.send(params)
                resend.api_key = old_key

            elif provider_type == 'zeptomail':
                from apps.notifications.tasks import _send_via_zeptomail
                from_field = f'{from_name} <{from_email}>'
                _send_via_zeptomail(
                    provider=provider, to_email=recipient_email,
                    subject=subject, html_content=html_content,
                    from_field=from_field,
                )

            elif provider_type == 'smtp':
                from apps.notifications.tasks import _send_via_smtp
                from_field = f'{from_name} <{from_email}>'
                _send_via_smtp(
                    provider=provider, to_email=recipient_email,
                    subject=subject, html_content=html_content,
                    from_field=from_field,
                )

            else:
                return Response(
                    {'success': False,
                     'message': f'Unsupported provider type: {provider_type}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            return Response({
                'success': True,
                'message': (
                    f'Test email sent to {recipient_email} via '
                    f'{provider.name} using template "{template.name}".'
                ),
            })
        except Exception as e:
            logger.error(
                'Trigger test failed for %s: %s', trigger.event_key, e
            )
            return Response(
                {'success': False,
                 'message': f'Failed to send test email: {e}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class EmailTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for email templates.
    GET /api/admin/email/templates/ - List templates
    POST /api/admin/email/templates/ - Create template
    GET /api/admin/email/templates/{id}/ - Get template
    PATCH /api/admin/email/templates/{id}/ - Update template
    DELETE /api/admin/email/templates/{id}/ - Delete template
    """

    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = EmailTemplate.objects.all()
    ordering = ['-updated_at']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return EmailTemplateDetailSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return EmailTemplateDetailSerializer
        return EmailTemplateListSerializer

    def get_queryset(self):
        qs = EmailTemplate.objects.all()
        params = self.request.query_params
        if t := params.get('type'):
            qs = qs.filter(type=t)
        if sc := params.get('subcategory'):
            qs = qs.filter(subcategory=sc)
        if s := params.get('status'):
            qs = qs.filter(status=s)
        if search := params.get('search'):
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(slug__icontains=search)
                | Q(subject__icontains=search)
            )
        return qs.order_by('-updated_at')

    def perform_create(self, serializer):
        # Auto-generate slug if not provided
        if not serializer.validated_data.get('slug'):
            base_slug = slugify(serializer.validated_data['name'])
            slug = base_slug
            counter = 1
            while EmailTemplate.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            serializer.validated_data['slug'] = slug

        serializer.save()

    def perform_update(self, serializer):
        template = serializer.instance
        # Snapshot current state before saving
        EmailTemplateVersion.objects.create(
            template=template,
            version=template.version,
            html=template.html,
            subject=template.subject,
            preheader=template.preheader,
            saved_by=self.request.user,
        )
        template.version += 1
        serializer.save(version=template.version)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplicate a template."""
        template = self.get_object()

        # Create duplicate with modified name and slug
        new_name = f"{template.name} (Copy)"
        base_slug = slugify(new_name)
        slug = base_slug
        counter = 1
        while EmailTemplate.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1

        new_template = EmailTemplate.objects.create(
            name=new_name,
            slug=slug,
            type=template.type,
            subcategory=template.subcategory,
            status='Draft',
            subject=template.subject,
            preheader=template.preheader,
            html=template.html,
            variables=template.variables,
        )

        serializer = EmailTemplateListSerializer(new_template)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """Publish a template."""
        template = self.get_object()
        template.status = 'Published'
        template.save()

        serializer = EmailTemplateListSerializer(template)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def unpublish(self, request, pk=None):
        """Unpublish a template (revert to Draft)."""
        template = self.get_object()
        template.status = 'Draft'
        template.save()

        serializer = EmailTemplateListSerializer(template)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Archive a template."""
        template = self.get_object()
        template.status = 'Archived'
        template.save()

        serializer = EmailTemplateListSerializer(template)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def versions(self, request, pk=None):
        """List version history for a template."""
        template = self.get_object()
        versions = template.versions.all()
        serializer = EmailTemplateVersionSerializer(versions, many=True)
        return Response(serializer.data)


class EmailLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for email logs (read-only).
    GET /api/admin/email/logs/ - List logs
    GET /api/admin/email/logs/{id}/ - Get log detail
    """

    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = EmailLog.objects.all()
    filterset_fields = ['status']
    search_fields = ['to_email']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return EmailLogDetailSerializer
        return EmailLogSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)

        return queryset

    @action(detail=True, methods=['post'])
    def resend(self, request, pk=None):
        """Resend a failed email by dispatching a new send_email task."""
        log = self.get_object()

        if log.status not in ['failed', 'bounced']:
            return Response(
                {'detail': 'Only failed or bounced emails can be resent.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Dispatch a new email send via Celery
        from apps.notifications.tasks import send_email
        send_email.delay(
            to_email=log.to_email,
            subject=log.subject,
            template=log.template,
            context=log.context,
            user_id=log.user_id,
            campaign_id=log.campaign_id,
            journey_step_id=log.journey_step_id,
        )

        return Response({
            'success': True,
            'message': f'Email resend dispatched to {log.to_email}',
        })

    @action(detail=True, methods=['post'], url_path='refresh-status')
    def refresh_status(self, request, pk=None):
        """Refresh email status from Resend by querying the provider.

        Uses resend.Emails.get() to fetch the latest delivery status.
        """
        log = self.get_object()

        if not log.provider_id:
            return Response(
                {'detail': 'No Resend email ID available for this log.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            email = resend.Emails.get(log.provider_id)
            last_event = None
            if isinstance(email, dict):
                last_event = email.get('last_event')
            else:
                last_event = getattr(email, 'last_event', None)

            if last_event == 'delivered':
                log.status = 'sent'
            elif last_event == 'bounced':
                log.status = 'bounced'
            elif last_event in ('failed', 'complained'):
                log.status = 'failed'

            log.save(update_fields=['status'])

            return Response({
                'status': log.status,
                'lastEvent': last_event,
                'email': email if isinstance(email, dict) else email.__dict__,
            })
        except Exception as e:
            return Response(
                {'detail': f'Failed to refresh status: {e}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel_email(self, request, pk=None):
        """Cancel a scheduled email via Resend SDK v2.

        Only works for emails that were sent with scheduled_at
        and haven't been delivered yet.
        """
        log = self.get_object()

        if not log.provider_id:
            return Response(
                {'detail': 'No Resend email ID available.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            resend.Emails.cancel(log.provider_id)
            log.status = 'failed'
            log.error_message = 'Cancelled by admin'
            log.save(update_fields=['status', 'error_message'])

            return Response({
                'success': True,
                'message': 'Scheduled email cancelled.',
            })
        except Exception as e:
            return Response(
                {'detail': f'Failed to cancel email: {e}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def export(self, request):
        """GET /api/admin/email/logs/export/?format=csv|json — export email logs.

        Applies the same filters as the list view. Capped at 50,000 rows.
        """
        import csv
        import json as json_lib
        from django.http import HttpResponse as DjangoHttpResponse

        MAX_ROWS = 50000
        export_format = request.query_params.get('export_format', 'csv').lower()
        qs = self.filter_queryset(self.get_queryset()).select_related('user')

        def _iter_logs():
            """Yield log rows up to MAX_ROWS."""
            count = 0
            for log in qs.iterator(chunk_size=2000):
                if count >= MAX_ROWS:
                    break
                yield log
                count += 1

        if export_format == 'json':
            rows = []
            for log in _iter_logs():
                rows.append({
                    'id': log.id,
                    'timestamp': log.created_at.isoformat() if log.created_at else None,
                    'recipient': log.to_email,
                    'subject': log.subject,
                    'template': log.template,
                    'status': log.status,
                    'sent_at': log.sent_at.isoformat() if log.sent_at else None,
                    'error_message': log.error_message,
                    'provider_id': log.provider_id,
                    'user_email': log.user.email if log.user else None,
                })
            response = DjangoHttpResponse(
                json_lib.dumps(rows, indent=2),
                content_type='application/json',
            )
            response['Content-Disposition'] = 'attachment; filename="email-logs-export.json"'
            return response

        # Default: CSV
        response = DjangoHttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="email-logs-export.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'ID', 'Timestamp', 'Recipient', 'Subject', 'Template', 'Status',
            'Sent At', 'Error Message', 'Provider ID', 'User Email',
        ])

        for log in _iter_logs():
            writer.writerow([
                log.id,
                log.created_at,
                log.to_email,
                log.subject,
                log.template,
                log.status,
                log.sent_at or '',
                log.error_message,
                log.provider_id,
                log.user.email if log.user else '',
            ])

        return response


class EmailSuggestionsView(APIView):
    """
    GET /api/admin/email/suggestions/
    Get smart suggestions for email configuration.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        suggestions = []

        # Check if any provider is connected
        active_provider = EmailProvider.objects.filter(is_active=True).first()
        if not active_provider:
            suggestions.append({
                'type': 'error',
                'title': 'No Active Email Provider',
                'description': 'Connect and activate an email provider to start sending emails.',
                'action': 'Connect Provider'
            })

        # Check DNS verification
        if active_provider and active_provider.provider_type == 'resend':
            if active_provider.spf != 'verified' or active_provider.dkim != 'verified':
                suggestions.append({
                    'type': 'warning',
                    'title': 'DNS Records Not Verified',
                    'description': 'Your sending domain DNS records are not fully verified. This may affect deliverability.',
                    'action': 'Verify DNS'
                })

        # Check webhook secret configuration (per-provider, env var as fallback)
        webhook_configured = False
        if active_provider:
            if active_provider.provider_type == 'smtp':
                webhook_configured = True  # SMTP doesn't need webhooks
            elif active_provider.webhook_secret or getattr(settings, 'RESEND_WEBHOOK_SECRET', ''):
                webhook_configured = True
        if not webhook_configured and active_provider:
            suggestions.append({
                'type': 'warning',
                'title': 'Webhook Secret Not Configured',
                'description': 'No webhook signing secret is set on the active provider. Email delivery events will not be processed.',
                'action': 'Connect Provider'
            })

        # Check for triggers without templates
        triggers_without_template = EmailTrigger.objects.filter(template__isnull=True, status=True).count()
        if triggers_without_template > 0:
            suggestions.append({
                'type': 'warning',
                'title': f'{triggers_without_template} Triggers Without Templates',
                'description': 'Some enabled triggers do not have email templates assigned.',
                'action': 'Assign Templates'
            })

        # Check for high error rate
        recent_logs = EmailLog.objects.filter(created_at__gte=timezone.now() - timedelta(days=7))
        total_recent = recent_logs.count()
        failed_recent = recent_logs.filter(status__in=['failed', 'bounced']).count()

        if total_recent > 100 and failed_recent / total_recent > 0.1:
            suggestions.append({
                'type': 'warning',
                'title': 'High Email Failure Rate',
                'description': f'{int(failed_recent / total_recent * 100)}% of emails failed in the last 7 days.',
                'action': 'Review Logs'
            })

        # Check kill switch
        try:
            email_settings = EmailSettings.get_settings()
            if email_settings.kill_switch_enabled:
                suggestions.append({
                    'type': 'error',
                    'title': 'Email Kill Switch Active',
                    'description': 'All emails are currently paused. Disable the kill switch to resume sending.',
                    'action': 'Disable Kill Switch'
                })
        except Exception:
            pass

        # Filter out dismissed suggestions
        email_settings = EmailSettings.get_settings()
        dismissed = set(email_settings.dismissed_suggestions or [])
        if dismissed:
            suggestions = [s for s in suggestions if s['title'] not in dismissed]

        return Response(suggestions)


class EmailSuggestionDismissView(APIView):
    """
    POST /api/admin/email/suggestions/{id}/dismiss/
    Dismiss a suggestion by storing its title in EmailSettings.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, id):
        email_settings = EmailSettings.get_settings()
        dismissed = list(email_settings.dismissed_suggestions or [])
        if id not in dismissed:
            dismissed.append(id)
        email_settings.dismissed_suggestions = dismissed
        email_settings.save(update_fields=['dismissed_suggestions'])
        return Response({'message': 'Suggestion dismissed.'})


class EmailSettingsView(APIView):
    """
    GET /api/admin/email/settings/ - Get email settings
    PATCH /api/admin/email/settings/ - Update email settings
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        email_settings = EmailSettings.get_settings()
        serializer = EmailSettingsSerializer(email_settings)
        return Response(serializer.data)

    def patch(self, request):
        email_settings = EmailSettings.get_settings()
        serializer = EmailSettingsSerializer(email_settings, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EmailKillSwitchView(APIView):
    """
    POST /api/admin/email/settings/kill-switch/
    Toggle email kill switch.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        email_settings = EmailSettings.get_settings()
        enabled = request.data.get('enabled', False)
        email_settings.kill_switch_enabled = enabled
        email_settings.save()

        return Response({'killSwitchEnabled': email_settings.kill_switch_enabled})


class EmailRotateKeysView(APIView):
    """
    POST /api/admin/email/settings/rotate-keys/
    Rotate API keys for the active Resend provider.

    Creates a new API key in Resend, updates the provider, then deletes the old one.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        provider = EmailProvider.objects.filter(provider_type='resend', connected=True).first()
        if not provider:
            return Response(
                {'detail': 'No connected Resend provider found.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Create a new key
            params: resend.ApiKeys.CreateParams = {
                'name': f'orion-rotated-{timezone.now().strftime("%Y%m%d%H%M%S")}',
                'permission': 'full_access',
            }
            new_key = resend.ApiKeys.create(params)
            new_token = new_key.get('token', '') if isinstance(new_key, dict) else getattr(new_key, 'token', '')

            if not new_token:
                return Response(
                    {'detail': 'Failed to create new API key.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # Update provider with new key
            provider.api_key = new_token
            provider.last_sync = timezone.now()
            provider.save()

            # Update global resend key
            resend.api_key = new_token

            return Response({
                'rotated': [provider.name],
                'message': 'API key rotated successfully. Old key should be deleted from Resend dashboard.',
            })

        except Exception as e:
            return Response(
                {'detail': f'Key rotation failed: {e}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class EmailOverviewStatsView(APIView):
    """
    GET /api/admin/email/overview/
    Get email overview statistics.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        now = timezone.now()
        last_24h = now - timedelta(hours=24)
        last_7d = now - timedelta(days=7)
        last_30d = now - timedelta(days=30)

        # Provider status
        active_provider = EmailProvider.objects.filter(is_active=True).first()
        provider_status = {
            'name': active_provider.name if active_provider else 'None',
            'status': active_provider.status if active_provider else 'disconnected',
            'lastSync': active_provider.last_sync.isoformat() if active_provider and active_provider.last_sync else None
        }

        # Volume stats
        volume = {
            'last24h': EmailLog.objects.filter(created_at__gte=last_24h).count(),
            'last7d': EmailLog.objects.filter(created_at__gte=last_7d).count(),
            'last30d': EmailLog.objects.filter(created_at__gte=last_30d).count()
        }

        # Deliverability stats
        logs_30d = EmailLog.objects.filter(created_at__gte=last_30d)
        total_30d = logs_30d.count()
        delivered_30d = logs_30d.filter(status='sent').count()
        bounced_30d = logs_30d.filter(status='bounced').count()
        failed_30d = logs_30d.filter(status='failed').count()

        deliverability = {
            'deliveryRate': round(delivered_30d / total_30d * 100, 2) if total_30d > 0 else 0,
            'bounceRate': round(bounced_30d / total_30d * 100, 2) if total_30d > 0 else 0,
            'complaintRate': 0  # Updated via webhooks
        }

        # Top triggers (grouped by template name)
        top_triggers_data = EmailLog.objects.filter(
            created_at__gte=last_30d,
            template__isnull=False
        ).exclude(template='').values('template').annotate(
            count=Count('id')
        ).order_by('-count')[:5]

        top_triggers = [
            {'name': item['template'], 'count': item['count']}
            for item in top_triggers_data
        ]

        data = {
            'providerStatus': provider_status,
            'deliverability': deliverability,
            'volume': volume,
            'topTriggers': top_triggers
        }

        return Response(data)
