"""
Webhook views for processing inbound email provider events.
Handles bounce, complaint, delivered, opened, clicked, and all Resend event types.

Resend webhook verification uses the official svix library for signature validation.
"""
import hashlib
import hmac
import json
import logging

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .services.compliance_service import ComplianceService

logger = logging.getLogger(__name__)


class EmailWebhookView(APIView):
    """Process inbound webhooks from email providers (Resend, ZeptoMail).

    POST /api/webhooks/email/{provider}/

    Resend uses svix for webhook delivery. Verification requires:
    - webhook_secret on the Resend EmailProvider (or RESEND_WEBHOOK_SECRET env var)
    - svix-id, svix-timestamp, svix-signature headers in the request

    ZeptoMail webhooks are verified using the webhook secret stored on the
    ZeptoMail EmailProvider record.

    The payload format varies by provider. This endpoint normalizes events
    and delegates to ComplianceService.process_webhook_event().
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request, provider):
        # Verify webhook signature (provider-specific)
        if not self._verify_signature(request, provider):
            logger.warning('Invalid webhook signature from %s', provider)
            return Response(
                {'detail': 'Invalid signature'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Normalize the payload based on provider
        events = self._normalize_events(request.data, provider)

        results = []
        for event in events:
            try:
                result = ComplianceService.process_webhook_event(
                    provider=provider,
                    event_type=event['event_type'],
                    payload=event['payload'],
                )
                results.append(result)
            except Exception as exc:
                logger.error('Webhook event processing error: %s', exc)
                results.append({
                    'processed': False,
                    'error': str(exc),
                })

        return Response({
            'received': len(events),
            'processed': sum(1 for r in results if r.get('processed')),
            'results': results,
        })

    def _verify_signature(self, request, provider):
        """Verify webhook authenticity using provider-specific methods.

        Resend: Uses svix library for official webhook signature verification.
        Returns False (rejects) if the webhook secret is not configured.
        """
        if provider == 'resend':
            return self._verify_resend_svix(request)
        elif provider == 'zeptomail':
            return self._verify_zeptomail(request)

        # Unknown provider — reject
        logger.warning('Unknown webhook provider: %s', provider)
        return False

    def _verify_resend_svix(self, request):
        """Verify Resend webhook using the official svix library.

        Resend uses svix for webhook delivery. The verification checks:
        - svix-id: unique message ID
        - svix-timestamp: unix timestamp (replay protection)
        - svix-signature: HMAC signature of "{msg_id}.{timestamp}.{body}"

        The svix library handles all of this automatically, including
        timestamp tolerance (default 5 minutes) for replay attack prevention.
        """
        # Prefer webhook secret from the Resend EmailProvider, fall back to env var
        webhook_secret = None
        try:
            from apps.notifications.models import EmailProvider
            resend_provider = EmailProvider.objects.filter(
                provider_type='resend', connected=True
            ).first()
            if resend_provider and resend_provider.webhook_secret:
                webhook_secret = resend_provider.webhook_secret
        except Exception:
            pass

        if not webhook_secret:
            webhook_secret = getattr(settings, 'RESEND_WEBHOOK_SECRET', None)

        if not webhook_secret:
            logger.error(
                'Webhook secret not configured — rejecting webhook. '
                'Set it via Admin > Email > Settings or the RESEND_WEBHOOK_SECRET env var.'
            )
            return False

        try:
            from svix.webhooks import Webhook

            # svix expects the raw body as bytes/string
            body = request.body

            # Build headers dict from request — svix needs these specific headers
            headers = {
                'svix-id': request.headers.get('svix-id', ''),
                'svix-timestamp': request.headers.get('svix-timestamp', ''),
                'svix-signature': request.headers.get('svix-signature', ''),
            }

            # Verify — raises exception if invalid
            wh = Webhook(webhook_secret)
            wh.verify(body, headers)
            return True

        except ImportError:
            logger.error(
                'svix package not installed. Install with: pip install svix. '
                'Falling back to manual HMAC verification.'
            )
            return self._verify_resend_hmac_fallback(request, webhook_secret)

        except Exception as exc:
            logger.warning('Resend webhook signature verification failed: %s', exc)
            return False

    def _verify_resend_hmac_fallback(self, request, webhook_secret):
        """Fallback HMAC verification if svix is not installed.

        This is NOT the recommended approach — install svix for production use.
        Kept only as a transitional fallback.
        """
        svix_id = request.headers.get('svix-id', '')
        svix_timestamp = request.headers.get('svix-timestamp', '')
        svix_signature = request.headers.get('svix-signature', '')

        if not all([svix_id, svix_timestamp, svix_signature]):
            return False

        # Construct the signed content: "{msg_id}.{timestamp}.{body}"
        body = request.body.decode('utf-8') if isinstance(request.body, bytes) else request.body
        signed_content = f'{svix_id}.{svix_timestamp}.{body}'

        # The webhook secret from Resend starts with "whsec_" prefix
        # We need to strip it and base64 decode the actual key
        import base64
        secret = webhook_secret
        if secret.startswith('whsec_'):
            secret = secret[6:]
        try:
            secret_bytes = base64.b64decode(secret)
        except Exception:
            logger.error('Failed to base64 decode RESEND_WEBHOOK_SECRET')
            return False

        # Compute HMAC-SHA256
        computed = hmac.new(
            secret_bytes,
            signed_content.encode('utf-8'),
            hashlib.sha256
        ).digest()
        computed_b64 = base64.b64encode(computed).decode('utf-8')

        # svix-signature can contain multiple signatures separated by spaces
        # Each prefixed with "v1,"
        for sig in svix_signature.split(' '):
            if sig.startswith('v1,'):
                sig_value = sig[3:]
                if hmac.compare_digest(computed_b64, sig_value):
                    return True

        return False

    def _verify_zeptomail(self, request):
        """Verify ZeptoMail webhook using the secret stored on the EmailProvider."""
        webhook_secret = None
        try:
            from apps.notifications.models import EmailProvider
            zeptomail_provider = EmailProvider.objects.filter(
                provider_type='zeptomail', connected=True
            ).first()
            if zeptomail_provider and zeptomail_provider.webhook_secret:
                webhook_secret = zeptomail_provider.webhook_secret
        except Exception:
            pass

        if not webhook_secret:
            logger.error(
                'ZeptoMail webhook secret not configured — rejecting webhook.'
            )
            return False

        # ZeptoMail sends the webhook token in the X-ZeptoMail-Webhook-Token header
        token = request.headers.get('X-ZeptoMail-Webhook-Token', '')
        if not token:
            logger.warning('Missing X-ZeptoMail-Webhook-Token header')
            return False

        return hmac.compare_digest(token, webhook_secret)

    def _normalize_events(self, data, provider):
        """Normalize provider-specific payload into standard event format.

        Resend event types (all handled):
        - email.sent
        - email.delivered
        - email.delivery_delayed
        - email.failed
        - email.opened
        - email.clicked
        - email.bounced
        - email.complained
        - email.scheduled
        - email.suppressed
        - contact.created
        - contact.updated
        - contact.deleted
        - domain.created
        - domain.updated
        - domain.deleted
        """
        events = []

        if provider == 'resend':
            event_type = data.get('type', '')

            # Map all Resend event types to internal event types
            type_map = {
                # Email events
                'email.sent': 'sent',
                'email.delivered': 'delivered',
                'email.delivery_delayed': 'delivery_delayed',
                'email.failed': 'failed',
                'email.opened': 'opened',
                'email.clicked': 'clicked',
                'email.bounced': 'bounced',
                'email.complained': 'complained',
                'email.scheduled': 'scheduled',
                'email.suppressed': 'suppressed',
                # Contact events
                'contact.created': 'contact_created',
                'contact.updated': 'contact_updated',
                'contact.deleted': 'contact_deleted',
                # Domain events
                'domain.created': 'domain_created',
                'domain.updated': 'domain_updated',
                'domain.deleted': 'domain_deleted',
            }

            mapped_type = type_map.get(event_type, event_type)
            payload = data.get('data', {})

            # Extract email for email events
            if event_type.startswith('email.'):
                to_field = payload.get('to', [])
                if isinstance(to_field, list) and to_field:
                    payload['email'] = to_field[0]
                elif isinstance(to_field, str):
                    payload['email'] = to_field

                # Preserve the Resend email ID for tracking
                payload['resend_email_id'] = payload.get('email_id') or payload.get('id', '')

            events.append({
                'event_type': mapped_type,
                'payload': payload,
            })

        elif provider == 'zeptomail':
            # ZeptoMail webhook payload: { "event_type": "...", "event_data": { ... } }
            event_type_raw = data.get('event_type', '')
            event_data = data.get('event_data', {})

            # Map ZeptoMail event types to internal types
            type_map = {
                'Delivered': 'delivered',
                'Softbounce': 'bounced',
                'Hardbounce': 'bounced',
                'Open': 'opened',
                'Click': 'clicked',
                'Unsubscribe': 'complained',
            }
            mapped_type = type_map.get(event_type_raw, event_type_raw.lower())

            payload = {
                'email': event_data.get('email_address', ''),
                'type': 'hard' if event_type_raw == 'Hardbounce' else 'soft' if event_type_raw == 'Softbounce' else '',
                'error': event_data.get('reason', ''),
            }

            events.append({
                'event_type': mapped_type,
                'payload': payload,
            })

        else:
            event_type = data.get('event_type') or data.get('type') or data.get('event', 'unknown')
            events.append({
                'event_type': event_type,
                'payload': data,
            })

        return events
