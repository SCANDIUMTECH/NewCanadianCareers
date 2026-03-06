"""
Celery tasks for billing.
"""
import logging
from decimal import Decimal
import stripe
from django.db import transaction
from django.utils import timezone
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60, acks_late=True,
             soft_time_limit=120, time_limit=150)
def generate_invoice_pdf_task(self, invoice_id):
    """Generate invoice PDF and upload to MinIO."""
    from .services import InvoiceService

    try:
        InvoiceService.generate_and_store_pdf(invoice_id)
        return f'Generated PDF for invoice {invoice_id}'
    except Exception as exc:
        logger.exception('Failed to generate invoice PDF for %s', invoice_id)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=5, default_retry_delay=30, acks_late=True,
             soft_time_limit=120, time_limit=150)
def process_stripe_webhook_event(self, webhook_event_id):
    """Process a Stripe webhook event asynchronously.

    Fetches fresh data from the Stripe API for every event type
    (works identically for thin and snapshot payloads).
    """
    from .models import (
        StripeWebhookEvent, Entitlement, Invoice, InvoiceItem,
        Subscription,
    )
    from .stripe_service import get_stripe_client
    from apps.moderation.models import JobPackage

    try:
        event = StripeWebhookEvent.objects.get(id=webhook_event_id)
    except StripeWebhookEvent.DoesNotExist:
        logger.error('Webhook event %s not found', webhook_event_id)
        return

    # Guard: skip if already completed
    if event.status == 'completed':
        logger.info('Event %s already completed, skipping', event.stripe_event_id)
        return

    # Atomic status transition to prevent concurrent processing
    from django.db.models import F
    updated = StripeWebhookEvent.objects.filter(
        id=event.id, status__in=['pending', 'failed']
    ).update(status='processing', attempts=F('attempts') + 1)
    if not updated:
        logger.info('Event %s already being processed, skipping', event.stripe_event_id)
        return
    event.refresh_from_db()

    client = get_stripe_client()
    object_id = event.payload.get('object_id', '')
    event_type = event.event_type

    try:
        if event_type == 'checkout.session.completed':
            session = client.checkout.sessions.retrieve(
                object_id,
                params={'expand': ['line_items']},
            )
            _handle_checkout_completed(session, client)

        elif event_type == 'invoice.paid':
            invoice_data = client.invoices.retrieve(object_id)
            _handle_invoice_paid(invoice_data)

        elif event_type == 'customer.subscription.updated':
            subscription_data = client.subscriptions.retrieve(object_id)
            _handle_subscription_updated(subscription_data)

        elif event_type == 'customer.subscription.deleted':
            subscription_data = client.subscriptions.retrieve(object_id)
            _handle_subscription_deleted(subscription_data)

        elif event_type == 'payment_intent.payment_failed':
            pi_data = client.payment_intents.retrieve(object_id)
            _handle_payment_intent_failed(pi_data, client)

        elif event_type == 'invoice.payment_failed':
            invoice_data = client.invoices.retrieve(object_id)
            _handle_invoice_payment_failed(invoice_data, client)

        elif event_type == 'invoice.payment_action_required':
            invoice_data = client.invoices.retrieve(object_id)
            _handle_payment_action_required(invoice_data, client)

        elif event_type == 'payment_method.automatically_updated':
            pm_data = client.payment_methods.retrieve(object_id)
            _handle_payment_method_updated(pm_data, client)

        else:
            logger.info('Unhandled event type: %s', event_type)

        event.status = 'completed'
        event.processed_at = timezone.now()
        event.error_message = ''
        event.save(update_fields=['status', 'processed_at', 'error_message'])
        logger.info('Successfully processed event %s (%s)', event.stripe_event_id, event_type)

    except stripe.StripeError as exc:
        _mark_event_failed(event, exc, self)
    except Exception as exc:
        _mark_event_failed(event, exc, self)


def _mark_event_failed(event, exc, task):
    """Mark event as failed and retry if attempts remain."""
    event.status = 'failed'
    event.error_message = str(exc)
    event.save(update_fields=['status', 'error_message'])
    logger.exception(
        'Failed to process event %s (%s), attempt %d',
        event.stripe_event_id, event.event_type, event.attempts,
    )
    raise task.retry(exc=exc)


@transaction.atomic
def _handle_checkout_completed(session, client):
    """Handle completed checkout session inside a transaction."""
    from .models import Entitlement, Invoice, InvoiceItem
    from .services import InvoiceService
    from apps.moderation.models import JobPackage

    metadata = session.metadata or {}
    company_id = metadata.get('company_id')
    agency_id = metadata.get('agency_id')

    # Idempotency: skip if invoice already exists for this session
    if Invoice.objects.filter(stripe_checkout_session_id=session.id).exists():
        logger.info('Invoice already exists for session %s, skipping', session.id)
        return

    line_items = client.checkout.sessions.list_line_items(session.id)

    invoice = Invoice.objects.create(
        company_id=company_id if company_id else None,
        agency_id=agency_id if agency_id else None,
        invoice_number=InvoiceService.generate_invoice_number(),
        stripe_checkout_session_id=session.id,
        amount=Decimal(session.amount_total) / Decimal(100),
        currency=session.currency.upper(),
        description='Package purchase',
        status='paid',
        paid_at=timezone.now(),
    )

    for item in line_items.data:
        price_id = item.price.id
        try:
            package = JobPackage.objects.get(stripe_price_id=price_id)
        except JobPackage.DoesNotExist:
            logger.warning(
                'Unknown package for price %s in session %s',
                price_id, session.id,
            )
            continue

        qty = item.quantity

        Entitlement.objects.create(
            company_id=company_id if company_id else None,
            agency_id=agency_id if agency_id else None,
            package=package,
            credits_total=package.credits * qty,
            featured_credits_total=package.featured_credits * qty,
            social_credits_total=package.social_credits * qty,
            post_duration_days=package.validity_days,
            source='package_purchase',
            source_reference=str(invoice.id),
        )

        InvoiceItem.objects.create(
            invoice=invoice,
            package=package,
            description=package.name,
            quantity=qty,
            unit_price=package.price,
            total=package.price * qty,
        )

    # --- Coupon redemption ---
    coupon_id = metadata.get('coupon_id')
    coupon_code = metadata.get('coupon_code')
    bonus_credits = metadata.get('bonus_credits')

    if coupon_id:
        try:
            from apps.marketing.models import Coupon
            from apps.marketing.services.coupon_service import CouponService

            coupon = Coupon.objects.get(id=int(coupon_id))
            CouponService.redeem_coupon(
                coupon, user=None, invoice=invoice,
                ip_address='',
            )

            # Grant bonus credits for "credits" type coupons
            if bonus_credits:
                Entitlement.objects.create(
                    company_id=company_id if company_id else None,
                    agency_id=agency_id if agency_id else None,
                    credits_total=int(bonus_credits),
                    source='promotion',
                    source_reference=f'coupon:{coupon_code}',
                )

            # Create discount line item for audit trail
            if coupon.discount_type in ('percentage', 'fixed'):
                from apps.marketing.services.coupon_service import CouponService as CS
                discount_amount = CS.calculate_discount(coupon, invoice.amount)
                if discount_amount > 0:
                    InvoiceItem.objects.create(
                        invoice=invoice,
                        description=f'Discount: {coupon_code}',
                        quantity=1,
                        unit_price=-discount_amount,
                        total=-discount_amount,
                    )

            logger.info(
                'Redeemed coupon %s for session %s',
                coupon_code, session.id,
            )
        except Exception:
            # Log but do NOT swallow — re-raise to fail the transaction
            # so the coupon isn't used without being properly tracked
            logger.exception(
                'Failed to redeem coupon %s for session %s',
                coupon_code, session.id,
            )
            raise

    # Audit log
    from apps.audit.models import create_audit_log
    create_audit_log(
        actor=None,
        action='payment',
        target=invoice,
        changes={
            'amount': str(invoice.amount),
            'session_id': session.id,
            'company_id': company_id,
            'agency_id': agency_id,
        },
        reason=f'stripe:checkout.session.completed',
    )

    # Queue PDF generation (outside the critical path)
    transaction.on_commit(lambda: generate_invoice_pdf_task.delay(invoice.id))


@transaction.atomic
def _handle_invoice_paid(invoice_data):
    """Handle paid invoice (for subscriptions)."""
    from .models import Invoice

    stripe_invoice_id = invoice_data.id
    stripe_payment_intent_id = invoice_data.payment_intent

    inv = None
    if stripe_invoice_id:
        inv = Invoice.objects.filter(stripe_invoice_id=stripe_invoice_id).first()
    if not inv and stripe_payment_intent_id:
        inv = Invoice.objects.filter(stripe_payment_intent_id=stripe_payment_intent_id).first()

    if not inv:
        logger.info('No matching invoice for Stripe invoice %s', stripe_invoice_id)
        return

    if inv.status != 'paid':
        inv.status = 'paid'
        inv.paid_at = timezone.now()
        inv.save(update_fields=['status', 'paid_at'])
        logger.info('Marked invoice %s as paid', inv.id)
        from apps.audit.models import create_audit_log
        create_audit_log(
            actor=None,
            action='payment',
            target=inv,
            changes={'status': 'paid', 'stripe_invoice_id': stripe_invoice_id},
            reason='stripe:invoice.paid',
        )

    if not inv.invoice_pdf_key:
        generate_invoice_pdf_task.delay(inv.id)


@transaction.atomic
def _handle_subscription_updated(subscription_data):
    """Handle subscription update."""
    from .models import Subscription

    try:
        subscription = Subscription.objects.get(
            stripe_subscription_id=subscription_data.id
        )
    except Subscription.DoesNotExist:
        logger.warning(
            'Subscription %s not found in database', subscription_data.id
        )
        return

    subscription.status = subscription_data.status
    subscription.current_period_end = timezone.datetime.fromtimestamp(
        subscription_data.current_period_end,
        tz=timezone.utc,
    )
    subscription.save(update_fields=['status', 'current_period_end'])
    logger.info('Updated subscription %s → %s', subscription_data.id, subscription_data.status)
    from apps.audit.models import create_audit_log
    create_audit_log(
        actor=None,
        action='update',
        target=subscription,
        changes={'status': subscription_data.status},
        reason='stripe:customer.subscription.updated',
    )


@transaction.atomic
def _handle_subscription_deleted(subscription_data):
    """Handle subscription cancellation."""
    from .models import Subscription

    try:
        subscription = Subscription.objects.get(
            stripe_subscription_id=subscription_data.id
        )
    except Subscription.DoesNotExist:
        logger.warning(
            'Subscription %s not found in database', subscription_data.id
        )
        return

    subscription.status = 'canceled'
    subscription.canceled_at = timezone.now()
    subscription.save(update_fields=['status', 'canceled_at'])
    logger.info('Canceled subscription %s', subscription_data.id)
    from apps.audit.models import create_audit_log
    create_audit_log(
        actor=None,
        action='update',
        target=subscription,
        changes={'status': 'canceled'},
        reason='stripe:customer.subscription.deleted',
    )


@transaction.atomic
def _handle_payment_intent_failed(payment_intent_data, client):
    """Handle failed payment intent."""
    from .models import Invoice, PaymentMethod

    # Try to find the related invoice
    inv = Invoice.objects.filter(
        stripe_payment_intent_id=payment_intent_data.id
    ).first()

    if inv and inv.status != 'failed':
        inv.status = 'failed'
        inv.save(update_fields=['status'])
        logger.info('Marked invoice %s as failed', inv.id)
        from apps.audit.models import create_audit_log
        create_audit_log(
            actor=None,
            action='payment',
            target=inv,
            changes={'status': 'failed', 'payment_intent_id': payment_intent_data.id},
            reason='stripe:payment_intent.payment_failed',
        )

    # Notify the owner
    company_id = None
    agency_id = None
    if inv:
        company_id = inv.company_id
        agency_id = inv.agency_id
    else:
        # Try from payment intent metadata
        metadata = payment_intent_data.metadata or {}
        company_id = metadata.get('company_id') or None
        agency_id = metadata.get('agency_id') or None

    if company_id or agency_id:
        transaction.on_commit(lambda: _dispatch_payment_failed_notification(
            company_id=company_id,
            agency_id=agency_id,
            invoice_id=inv.id if inv else None,
            error_message=payment_intent_data.last_payment_error.message
                if payment_intent_data.last_payment_error else '',
        ))


@transaction.atomic
def _handle_invoice_payment_failed(invoice_data, client):
    """Handle failed invoice payment (subscription dunning)."""
    from .models import Invoice, Subscription
    from .services import InvoiceService

    stripe_sub_id = invoice_data.subscription
    stripe_invoice_id = invoice_data.id

    # Update subscription status
    if stripe_sub_id:
        try:
            sub = Subscription.objects.get(stripe_subscription_id=stripe_sub_id)
            if sub.status != 'past_due':
                sub.status = 'past_due'
                sub.save(update_fields=['status'])
                logger.info('Subscription %s marked as past_due', stripe_sub_id)
                from apps.audit.models import create_audit_log
                create_audit_log(
                    actor=None,
                    action='update',
                    target=sub,
                    changes={'status': 'past_due'},
                    reason='stripe:invoice.payment_failed',
                )
        except Subscription.DoesNotExist:
            logger.warning('Subscription %s not found for failed invoice', stripe_sub_id)

    # Find or create local invoice
    inv = Invoice.objects.filter(stripe_invoice_id=stripe_invoice_id).first()
    if inv:
        if inv.status != 'failed':
            inv.status = 'failed'
            inv.save(update_fields=['status'])
    else:
        # Determine owner from subscription or metadata
        company_id = None
        agency_id = None
        metadata = invoice_data.metadata or {}
        company_id = metadata.get('company_id') or None
        agency_id = metadata.get('agency_id') or None

        if not company_id and not agency_id and stripe_sub_id:
            try:
                sub = Subscription.objects.get(stripe_subscription_id=stripe_sub_id)
                company_id = sub.company_id
                agency_id = sub.agency_id
            except Subscription.DoesNotExist:
                pass

        if company_id or agency_id:
            inv = Invoice.objects.create(
                company_id=company_id,
                agency_id=agency_id,
                invoice_number=InvoiceService.generate_invoice_number(),
                stripe_invoice_id=stripe_invoice_id,
                amount=Decimal(invoice_data.amount_due) / Decimal(100) if invoice_data.amount_due else Decimal('0'),
                currency=(invoice_data.currency or 'cad').upper(),
                description='Subscription payment (failed)',
                status='failed',
            )

    # Notify
    owner_company = inv.company_id if inv else None
    owner_agency = inv.agency_id if inv else None
    if owner_company or owner_agency:
        transaction.on_commit(lambda: _dispatch_subscription_past_due_notification(
            company_id=owner_company,
            agency_id=owner_agency,
            invoice_id=inv.id if inv else None,
        ))


def _handle_payment_action_required(invoice_data, client):
    """Handle SCA / 3D Secure payment action required."""
    from .models import Subscription

    stripe_sub_id = invoice_data.subscription
    hosted_url = invoice_data.hosted_invoice_url or ''

    company_id = None
    agency_id = None
    metadata = invoice_data.metadata or {}
    company_id = metadata.get('company_id') or None
    agency_id = metadata.get('agency_id') or None

    if not company_id and not agency_id and stripe_sub_id:
        try:
            sub = Subscription.objects.get(stripe_subscription_id=stripe_sub_id)
            company_id = sub.company_id
            agency_id = sub.agency_id
        except Subscription.DoesNotExist:
            pass

    if company_id or agency_id:
        transaction.on_commit(lambda: _dispatch_action_required_notification(
            company_id=company_id,
            agency_id=agency_id,
            hosted_url=hosted_url,
        ))

    logger.info('Payment action required for invoice %s', invoice_data.id)


@transaction.atomic
def _handle_payment_method_updated(pm_data, client):
    """Handle automatic payment method update (card network updates)."""
    from .models import PaymentMethod

    stripe_pm_id = pm_data.id
    try:
        local_pm = PaymentMethod.objects.get(stripe_payment_method_id=stripe_pm_id)
        updated_fields = []
        if pm_data.card:
            if str(pm_data.card.exp_month) != local_pm.card_exp_month:
                local_pm.card_exp_month = str(pm_data.card.exp_month)
                updated_fields.append('card_exp_month')
            if str(pm_data.card.exp_year) != local_pm.card_exp_year:
                local_pm.card_exp_year = str(pm_data.card.exp_year)
                updated_fields.append('card_exp_year')
            if pm_data.card.last4 != local_pm.card_last4:
                local_pm.card_last4 = pm_data.card.last4
                updated_fields.append('card_last4')
        if updated_fields:
            local_pm.save(update_fields=updated_fields)
            logger.info('Updated payment method %s fields: %s', stripe_pm_id, updated_fields)
    except PaymentMethod.DoesNotExist:
        logger.info('Payment method %s not found locally, skipping update', stripe_pm_id)


# ---------------------------------------------------------------------------
# Notification dispatch helpers (called via transaction.on_commit)
# ---------------------------------------------------------------------------

def _dispatch_payment_failed_notification(company_id=None, agency_id=None,
                                           invoice_id=None, error_message=''):
    """Dispatch payment-failed notification task."""
    try:
        from apps.notifications.tasks import notify_payment_failed
        notify_payment_failed.delay(
            company_id=company_id,
            agency_id=agency_id,
            invoice_id=invoice_id,
            error_message=error_message,
        )
    except Exception:
        logger.exception('Failed to dispatch payment_failed notification')


def _dispatch_subscription_past_due_notification(company_id=None, agency_id=None,
                                                   invoice_id=None):
    """Dispatch subscription-past-due notification task."""
    try:
        from apps.notifications.tasks import notify_subscription_past_due
        notify_subscription_past_due.delay(
            company_id=company_id,
            agency_id=agency_id,
            invoice_id=invoice_id,
        )
    except Exception:
        logger.exception('Failed to dispatch subscription_past_due notification')


def _dispatch_action_required_notification(company_id=None, agency_id=None,
                                            hosted_url=''):
    """Dispatch payment-action-required notification task."""
    try:
        from apps.notifications.tasks import notify_payment_action_required
        notify_payment_action_required.delay(
            company_id=company_id,
            agency_id=agency_id,
            hosted_url=hosted_url,
        )
    except Exception:
        logger.exception('Failed to dispatch payment_action_required notification')


@shared_task(soft_time_limit=60, time_limit=90)
def cleanup_old_webhook_events():
    """Purge completed Stripe webhook events older than 90 days.

    Prevents the StripeWebhookEvent table from growing unbounded.
    Schedule via celery-beat (daily).
    """
    from datetime import timedelta
    from .models import StripeWebhookEvent

    cutoff = timezone.now() - timedelta(days=90)
    deleted, _ = StripeWebhookEvent.objects.filter(
        status='completed',
        processed_at__lt=cutoff,
    ).delete()
    if deleted:
        logger.info("Cleaned up %d old Stripe webhook events", deleted)
    return {"deleted": deleted}
