"""
Compliance service for unsubscribe handling, webhook processing,
and deliverability management.
"""
import hashlib
import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone

logger = logging.getLogger(__name__)


class ComplianceService:
    """Handles compliance operations: unsubscribe, webhook, deliverability."""

    # ─── Unsubscribe Tokens ────────────────────────────────────────

    @staticmethod
    def generate_unsubscribe_token(user, campaign=None, journey_step=None):
        """Generate a unique unsubscribe token for a user + email context."""
        from ..models import UnsubscribeToken

        token = secrets.token_urlsafe(48)
        return UnsubscribeToken.objects.create(
            user=user,
            token=token,
            campaign=campaign,
            journey_step=journey_step,
        )

    @staticmethod
    def get_unsubscribe_url(token_value):
        """Build the full unsubscribe URL for email footers."""
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        return f'{frontend_url}/preferences/{token_value}'

    @staticmethod
    def get_one_click_unsubscribe_url(token_value):
        """Build the one-click unsubscribe POST URL (RFC 8058)."""
        backend_url = getattr(settings, 'BACKEND_URL', 'http://localhost')
        return f'{backend_url}/api/marketing/unsubscribe/{token_value}/'

    @staticmethod
    @transaction.atomic
    def process_unsubscribe(token_value):
        """Process an unsubscribe request via token.

        Returns:
            dict with 'success' and optional 'user_email' for confirmation.
        """
        from ..models import UnsubscribeToken, MarketingConsent, SuppressionEntry

        try:
            unsub_token = UnsubscribeToken.objects.select_related('user').get(
                token=token_value
            )
        except UnsubscribeToken.DoesNotExist:
            return {'success': False, 'error': 'Invalid or expired token'}

        # Already used? Still process (idempotent) but note it
        user = unsub_token.user
        now = timezone.now()

        # Mark token as used
        if not unsub_token.used_at:
            unsub_token.used_at = now
            unsub_token.save(update_fields=['used_at'])

        # Update marketing consent
        consent, created = MarketingConsent.objects.get_or_create(
            user=user,
            defaults={
                'status': 'unsubscribed',
                'source': 'unsubscribe_link',
                'withdrawn_at': now,
            }
        )
        if not created and consent.status != 'unsubscribed':
            consent.status = 'unsubscribed'
            consent.withdrawn_at = now
            consent.source = 'unsubscribe_link'
            consent.save(update_fields=['status', 'withdrawn_at', 'source', 'updated_at'])

        # Add to suppression list
        SuppressionEntry.objects.get_or_create(
            email=user.email,
            defaults={
                'user': user,
                'reason': 'unsubscribe',
                'source': 'unsubscribe_link',
                'notes': f'Unsubscribed via token from campaign {unsub_token.campaign_id}',
            }
        )

        logger.info(f'Processed unsubscribe for {user.email} via token')
        return {
            'success': True,
            'user_email': user.email,
        }

    @staticmethod
    def get_user_preferences(token_value):
        """Get the user's current marketing preferences via an unsubscribe token.

        Returns user info + consent status for the preference center page.
        """
        from ..models import UnsubscribeToken, MarketingConsent

        try:
            unsub_token = UnsubscribeToken.objects.select_related('user').get(
                token=token_value
            )
        except UnsubscribeToken.DoesNotExist:
            return None

        user = unsub_token.user
        try:
            consent = MarketingConsent.objects.get(user=user)
            consent_status = consent.status
        except MarketingConsent.DoesNotExist:
            consent_status = 'opted_out'

        return {
            'email': user.email,
            'first_name': user.first_name,
            'consent_status': consent_status,
            'token': token_value,
        }

    @staticmethod
    @transaction.atomic
    def update_user_preferences(token_value, new_status):
        """Update user marketing preferences via token.

        Args:
            token_value: Unsubscribe token string
            new_status: 'opted_in' or 'unsubscribed'
        """
        from ..models import UnsubscribeToken, MarketingConsent, SuppressionEntry

        try:
            unsub_token = UnsubscribeToken.objects.select_related('user').get(
                token=token_value
            )
        except UnsubscribeToken.DoesNotExist:
            return {'success': False, 'error': 'Invalid token'}

        user = unsub_token.user
        now = timezone.now()

        consent, _ = MarketingConsent.objects.get_or_create(
            user=user,
            defaults={
                'status': new_status,
                'source': 'preference_center',
            }
        )

        if new_status == 'opted_in':
            consent.status = 'opted_in'
            consent.consented_at = now
            consent.withdrawn_at = None
            consent.source = 'preference_center'
            consent.save(update_fields=['status', 'consented_at', 'withdrawn_at', 'source', 'updated_at'])
            # Remove from suppression list
            SuppressionEntry.objects.filter(email=user.email, reason='unsubscribe').delete()
        elif new_status == 'unsubscribed':
            consent.status = 'unsubscribed'
            consent.withdrawn_at = now
            consent.source = 'preference_center'
            consent.save(update_fields=['status', 'withdrawn_at', 'source', 'updated_at'])
            # Add to suppression list
            SuppressionEntry.objects.get_or_create(
                email=user.email,
                defaults={
                    'user': user,
                    'reason': 'unsubscribe',
                    'source': 'preference_center',
                }
            )

        return {'success': True, 'status': new_status}

    # ─── Webhook Processing ────────────────────────────────────────

    @staticmethod
    @transaction.atomic
    def process_webhook_event(provider, event_type, payload):
        """Process an inbound email webhook event.

        Args:
            provider: Email provider name (e.g., 'resend', 'zeptomail')
            event_type: Event type string
            payload: Raw webhook payload dict

        Supported event types (Resend SDK v2):
            sent, delivered, delivery_delayed, failed, opened, clicked,
            bounced, complained, scheduled, suppressed, unsubscribed,
            contact_created, contact_updated, contact_deleted,
            domain_created, domain_updated, domain_deleted
        """
        from ..models import MarketingConsent, SuppressionEntry, CampaignRecipient

        # Contact and domain events don't have email recipients
        if event_type.startswith(('contact_', 'domain_')):
            logger.info('Webhook %s event from %s: %s', event_type, provider, payload.get('id', ''))
            return {'processed': True, 'event_type': event_type, 'action': 'logged'}

        email = payload.get('email') or payload.get('to') or payload.get('recipient')
        if not email:
            logger.warning('Webhook event missing email: %s', event_type)
            return {'processed': False, 'reason': 'missing_email'}

        now = timezone.now()
        result = {'processed': True, 'event_type': event_type, 'email': email}

        # Update EmailLog status from webhook for all email events
        resend_email_id = payload.get('resend_email_id') or payload.get('email_id') or payload.get('id', '')
        if resend_email_id:
            try:
                from apps.notifications.models import EmailLog
                log = EmailLog.objects.filter(provider_id=resend_email_id).first()
                if log:
                    if event_type in ('delivered', 'sent'):
                        log.status = 'sent'
                    elif event_type == 'bounced':
                        log.status = 'bounced'
                    elif event_type in ('failed', 'complained', 'suppressed'):
                        log.status = 'failed'
                        log.error_message = payload.get('error', '') or f'Event: {event_type}'
                    log.save(update_fields=['status', 'error_message'])
            except Exception:
                pass

        # Map event to actions
        if event_type == 'sent':
            result['action'] = 'logged as sent'

        elif event_type == 'delivery_delayed':
            result['action'] = 'logged delivery delay'

        elif event_type == 'failed':
            result['action'] = 'logged failure'

        elif event_type == 'scheduled':
            result['action'] = 'logged scheduled'

        elif event_type == 'suppressed':
            # Resend suppressed the email — add to our suppression list too
            SuppressionEntry.objects.get_or_create(
                email=email,
                defaults={
                    'reason': 'provider_suppressed',
                    'source': f'webhook_{provider}',
                    'notes': f'Suppressed by {provider}',
                }
            )
            result['action'] = 'suppressed (provider)'

        elif event_type in ('bounced', 'bounce'):
            bounce_type = payload.get('type', 'hard')
            reason = 'bounce_hard' if bounce_type == 'hard' else 'bounce_soft'

            # Add to suppression list for hard bounces
            if reason == 'bounce_hard':
                SuppressionEntry.objects.get_or_create(
                    email=email,
                    defaults={
                        'reason': reason,
                        'source': f'webhook_{provider}',
                        'notes': f'Hard bounce via {provider}: {payload.get("error", "")}',
                    }
                )
                # Update consent
                ComplianceService._update_consent_from_webhook(email, 'bounced')

            result['action'] = f'suppressed ({reason})'

        elif event_type in ('complained', 'complaint', 'spam_complaint'):
            SuppressionEntry.objects.get_or_create(
                email=email,
                defaults={
                    'reason': 'complaint',
                    'source': f'webhook_{provider}',
                    'notes': f'Spam complaint via {provider}',
                }
            )
            ComplianceService._update_consent_from_webhook(email, 'complained')
            result['action'] = 'suppressed (complaint)'

        elif event_type in ('delivered', 'delivery'):
            # Update campaign recipient if applicable
            campaign_id = payload.get('campaign_id')
            if campaign_id:
                CampaignRecipient.objects.filter(
                    campaign_id=campaign_id,
                    user__email=email,
                    status='sent',
                ).update(status='delivered', delivered_at=now)
            result['action'] = 'marked delivered'

        elif event_type in ('opened', 'open'):
            campaign_id = payload.get('campaign_id')
            if campaign_id:
                CampaignRecipient.objects.filter(
                    campaign_id=campaign_id,
                    user__email=email,
                    status__in=('sent', 'delivered'),
                ).update(status='opened', opened_at=now)
            result['action'] = 'marked opened'

        elif event_type in ('clicked', 'click'):
            campaign_id = payload.get('campaign_id')
            if campaign_id:
                CampaignRecipient.objects.filter(
                    campaign_id=campaign_id,
                    user__email=email,
                    status__in=('sent', 'delivered', 'opened'),
                ).update(status='clicked', clicked_at=now)
            result['action'] = 'marked clicked'

        elif event_type in ('unsubscribed', 'unsubscribe'):
            SuppressionEntry.objects.get_or_create(
                email=email,
                defaults={
                    'reason': 'unsubscribe',
                    'source': f'webhook_{provider}',
                }
            )
            ComplianceService._update_consent_from_webhook(email, 'unsubscribed')
            result['action'] = 'unsubscribed'

        else:
            logger.info('Unhandled webhook event type: %s from %s', event_type, provider)
            result['action'] = f'unhandled: {event_type}'

        return result

    @staticmethod
    def _update_consent_from_webhook(email, new_status):
        """Update MarketingConsent from a webhook event."""
        from ..models import MarketingConsent
        from apps.users.models import User

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return

        now = timezone.now()
        consent, created = MarketingConsent.objects.get_or_create(
            user=user,
            defaults={
                'status': new_status,
                'source': 'webhook',
                'withdrawn_at': now if new_status != 'opted_in' else None,
            }
        )
        if not created:
            consent.status = new_status
            consent.withdrawn_at = now if new_status != 'opted_in' else consent.withdrawn_at
            consent.save(update_fields=['status', 'withdrawn_at', 'updated_at'])

    # ─── Email Headers & Footer ────────────────────────────────────

    @staticmethod
    def get_list_unsubscribe_headers(token_value):
        """Generate RFC 8058 List-Unsubscribe and List-Unsubscribe-Post headers."""
        one_click_url = ComplianceService.get_one_click_unsubscribe_url(token_value)
        pref_url = ComplianceService.get_unsubscribe_url(token_value)

        return {
            'List-Unsubscribe': f'<{one_click_url}>, <mailto:unsubscribe@orion.jobs?subject=unsubscribe>',
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        }

    @staticmethod
    def get_compliance_footer_html(token_value):
        """Generate the compliance footer HTML for marketing emails."""
        pref_url = ComplianceService.get_unsubscribe_url(token_value)
        unsub_url = ComplianceService.get_one_click_unsubscribe_url(token_value)

        return f'''
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
            <p>You are receiving this email because you subscribed to marketing communications from Orion.</p>
            <p>
                <a href="{pref_url}" style="color: #3B5BDB; text-decoration: underline;">Manage preferences</a>
                &nbsp;|&nbsp;
                <a href="{unsub_url}" style="color: #3B5BDB; text-decoration: underline;">Unsubscribe</a>
            </p>
        </div>
        '''

    # ─── Compliance Stats ──────────────────────────────────────────

    @staticmethod
    def get_compliance_overview():
        """Get compliance statistics for the admin dashboard."""
        from ..models import MarketingConsent, SuppressionEntry, UnsubscribeToken

        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)

        # Consent breakdown
        consent_counts = dict(
            MarketingConsent.objects.values_list('status')
            .annotate(count=Count('id'))
            .values_list('status', 'count')
        )

        total_consents = sum(consent_counts.values())
        opted_in = consent_counts.get('opted_in', 0)
        consent_rate = round((opted_in / total_consents * 100), 1) if total_consents > 0 else 0

        # Suppression stats
        suppression_counts = dict(
            SuppressionEntry.objects.values_list('reason')
            .annotate(count=Count('id'))
            .values_list('reason', 'count')
        )
        total_suppressed = sum(suppression_counts.values())

        # Recent activity
        unsubscribes_30d = UnsubscribeToken.objects.filter(
            used_at__gte=thirty_days_ago
        ).count()

        bounces_30d = SuppressionEntry.objects.filter(
            reason__in=['bounce_hard', 'bounce_soft'],
            created_at__gte=thirty_days_ago,
        ).count()

        complaints_30d = SuppressionEntry.objects.filter(
            reason='complaint',
            created_at__gte=thirty_days_ago,
        ).count()

        # Daily trends (last 30 days)
        unsubscribe_daily = list(
            UnsubscribeToken.objects.filter(
                used_at__gte=thirty_days_ago,
            ).annotate(
                date=TruncDate('used_at')
            ).values('date').annotate(
                count=Count('id')
            ).order_by('date').values('date', 'count')
        )

        suppression_daily = list(
            SuppressionEntry.objects.filter(
                created_at__gte=thirty_days_ago,
            ).annotate(
                date=TruncDate('created_at')
            ).values('date').annotate(
                count=Count('id')
            ).order_by('date').values('date', 'count')
        )

        return {
            'total_consents': total_consents,
            'opted_in': opted_in,
            'consent_rate': consent_rate,
            'total_suppressed': total_suppressed,
            'consent_breakdown': consent_counts,
            'suppression_breakdown': suppression_counts,
            'unsubscribes_30d': unsubscribes_30d,
            'bounces_30d': bounces_30d,
            'complaints_30d': complaints_30d,
            'unsubscribe_daily': [
                {'date': str(d['date']), 'count': d['count']}
                for d in unsubscribe_daily
            ],
            'suppression_daily': [
                {'date': str(d['date']), 'count': d['count']}
                for d in suppression_daily
            ],
        }

    @staticmethod
    def get_consent_audit_log(page=1, page_size=50):
        """Get paginated consent change history for audit."""
        from ..models import MarketingConsent

        offset = (page - 1) * page_size
        consents = MarketingConsent.objects.select_related('user').order_by(
            '-updated_at'
        )[offset:offset + page_size]

        total = MarketingConsent.objects.count()

        return {
            'count': total,
            'results': [
                {
                    'id': c.id,
                    'user_email': c.user.email,
                    'user_name': c.user.get_full_name(),
                    'status': c.status,
                    'source': c.source,
                    'consented_at': str(c.consented_at) if c.consented_at else None,
                    'withdrawn_at': str(c.withdrawn_at) if c.withdrawn_at else None,
                    'express_consent': c.express_consent,
                    'updated_at': str(c.updated_at),
                }
                for c in consents
            ],
        }

    @staticmethod
    def get_deliverability_stats():
        """Get deliverability metrics for the admin dashboard."""
        from ..models import Campaign, CampaignRecipient

        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)

        # Aggregate from recent campaigns
        recent_campaigns = Campaign.objects.filter(
            status='sent',
            completed_at__gte=thirty_days_ago,
        )

        total_sent = sum(c.sent_count for c in recent_campaigns)
        total_delivered = sum(c.delivered_count for c in recent_campaigns)
        total_bounced = sum(c.bounced_count for c in recent_campaigns)
        total_complained = sum(c.complained_count for c in recent_campaigns)
        total_opened = sum(c.opened_count for c in recent_campaigns)
        total_clicked = sum(c.clicked_count for c in recent_campaigns)

        delivery_rate = round((total_delivered / total_sent * 100), 2) if total_sent > 0 else 0
        bounce_rate = round((total_bounced / total_sent * 100), 2) if total_sent > 0 else 0
        complaint_rate = round((total_complained / total_sent * 100), 4) if total_sent > 0 else 0
        open_rate = round((total_opened / total_delivered * 100), 2) if total_delivered > 0 else 0
        click_rate = round((total_clicked / total_delivered * 100), 2) if total_delivered > 0 else 0

        # Suppression list growth
        from ..models import SuppressionEntry
        suppression_growth = list(
            SuppressionEntry.objects.filter(
                created_at__gte=thirty_days_ago,
            ).annotate(
                date=TruncDate('created_at')
            ).values('date').annotate(
                count=Count('id')
            ).order_by('date').values('date', 'count')
        )

        return {
            'total_sent_30d': total_sent,
            'total_delivered_30d': total_delivered,
            'total_bounced_30d': total_bounced,
            'total_complained_30d': total_complained,
            'delivery_rate': delivery_rate,
            'bounce_rate': bounce_rate,
            'complaint_rate': complaint_rate,
            'open_rate': open_rate,
            'click_rate': click_rate,
            'campaigns_sent_30d': recent_campaigns.count(),
            'suppression_growth': [
                {'date': str(d['date']), 'count': d['count']}
                for d in suppression_growth
            ],
        }
