"""
Shared logic for admin credit grants (company + agency).

Both AdminCompanyViewSet.add_credits and AdminAgencyViewSet.add_credits
delegate to process_admin_add_credits() to avoid code duplication.
"""
import logging
from decimal import Decimal

from django.db import transaction
from django.utils.dateparse import parse_datetime
from rest_framework.response import Response
from rest_framework import status

from .models import Entitlement, EntitlementLedger
from apps.moderation.models import JobPackage
from .services import InvoiceService
from .tasks import generate_invoice_pdf_task
from apps.audit.models import create_audit_log

logger = logging.getLogger(__name__)

# Payment method workflow configuration — single source of truth.
# The AdminCreditPaymentMethodsView in views.py derives its response from this dict.
PAYMENT_METHODS = {
    'complimentary': {
        'workflow': 'complimentary',
        'invoice_status': 'paid',
        'label': 'Complimentary (no charge)',
        'requires_package': False,
    },
    'stored_card': {
        'workflow': 'package',
        'invoice_status': 'paid',
        'label': 'Use stored card',
        'requires_package': True,
    },
    'etransfer': {
        'workflow': 'package',
        'invoice_status': 'paid',
        'label': 'E-Transfer received',
        'requires_package': True,
    },
    'invoice': {
        'workflow': 'package',
        'invoice_status': 'open',
        'label': 'Send invoice to client',
        'requires_package': True,
    },
    'phone_payment': {
        'workflow': 'package',
        'invoice_status': 'paid',
        'label': 'Card payment (phone/manual)',
        'requires_package': True,
    },
}


def process_admin_add_credits(request, company=None, agency=None):
    """Process an admin credit grant for a company or agency.

    Supports two workflows based on payment_method:
    - complimentary: free grant with optional post_duration_days
    - package-based: requires package_id, optional coupon, real invoice
    """
    entity = company or agency
    entity_name = entity.name if entity else 'Unknown'

    reason = request.data.get('reason', '')
    credit_type = request.data.get('credit_type', 'job')
    payment_method = request.data.get('payment_method', '')
    expires_at = request.data.get('expires_at')
    package_id = request.data.get('package_id')
    coupon_code = request.data.get('coupon_code')
    post_duration_days = request.data.get('post_duration_days')

    if credit_type not in ('job', 'featured', 'social'):
        return Response(
            {'error': 'credit_type must be job, featured, or social'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    config = PAYMENT_METHODS.get(payment_method)
    if not config:
        return Response(
            {'error': f'Invalid payment method: {payment_method}'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Parse expires_at
    parsed_expires = parse_datetime(expires_at) if expires_at else None

    source_ref = f'{request.user.email} | {payment_method} | {reason}'

    # Entity kwargs for Entitlement + Invoice
    entity_kwargs = {}
    if company:
        entity_kwargs['company'] = company
    if agency:
        entity_kwargs['agency'] = agency

    if config['workflow'] == 'complimentary':
        return _handle_complimentary(
            request, entity_name, credit_type, reason, post_duration_days,
            parsed_expires, source_ref, entity_kwargs,
        )
    else:
        return _handle_package(
            request, entity_name, credit_type, reason, payment_method,
            package_id, coupon_code, parsed_expires, source_ref,
            entity_kwargs, config['invoice_status'],
        )


def _build_credit_fields(credit_type, credits_int):
    """Map credit_type to Entitlement model fields."""
    return {
        'job': {'credits_total': credits_int},
        'featured': {'credits_total': 0, 'featured_credits_total': credits_int},
        'social': {'credits_total': 0, 'social_credits_total': credits_int},
    }[credit_type]


def _generate_pdf_safe(invoice_id):
    """Generate invoice PDF, falling back to async task on failure."""
    try:
        InvoiceService.generate_and_store_pdf(invoice_id)
    except Exception:
        logger.warning('PDF gen failed for invoice %s, queueing async', invoice_id)
        try:
            generate_invoice_pdf_task.delay(invoice_id)
        except Exception:
            logger.exception('Failed to enqueue PDF for invoice %s', invoice_id)


def _handle_complimentary(request, entity_name, credit_type, reason,
                          post_duration_days, parsed_expires, source_ref,
                          entity_kwargs):
    """Handle complimentary (free) credit grant."""
    credits = request.data.get('credits')
    if not credits or int(credits) <= 0:
        return Response(
            {'error': 'credits must be a positive number'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    credits_int = int(credits)

    # Get post duration from request or job policy default
    from apps.jobs.services import get_job_policy
    duration = (
        int(post_duration_days)
        if post_duration_days
        else get_job_policy().get('default_post_duration', 30)
    )

    with transaction.atomic():
        entitlement = Entitlement.objects.create(
            source='admin_grant',
            source_reference=source_ref,
            post_duration_days=duration,
            expires_at=parsed_expires,
            **entity_kwargs,
            **_build_credit_fields(credit_type, credits_int),
        )
        EntitlementLedger.objects.create(
            entitlement=entitlement,
            change=credits_int,
            reason='admin_grant',
            admin=request.user,
            notes=reason,
        )
        invoice = InvoiceService.create_admin_credit_invoice(
            credits=credits_int,
            credit_type=credit_type,
            admin_user=request.user,
            reason=reason,
            payment_method='complimentary',
            **entity_kwargs,
        )

    create_audit_log(
        actor=request.user,
        action='grant',
        target=entitlement,
        changes={
            'credits': credits_int,
            'credit_type': credit_type,
            'payment_method': 'complimentary',
        },
        reason=reason,
        request=request,
    )

    _generate_pdf_safe(invoice.id)

    return Response({
        'message': f'{credits_int} {credit_type} credits added to {entity_name}',
    })


def _handle_package(request, entity_name, credit_type, reason, payment_method,
                    package_id, coupon_code, parsed_expires, source_ref,
                    entity_kwargs, invoice_status):
    """Handle package-based credit grant with real pricing."""
    if not package_id:
        return Response(
            {'error': 'package_id is required for paid payment methods'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        package = JobPackage.objects.get(id=package_id, is_active=True)
    except JobPackage.DoesNotExist:
        return Response(
            {'error': 'Package not found or inactive'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Determine credits from package based on credit_type
    credit_map = {
        'job': package.credits,
        'featured': package.featured_credits,
        'social': package.social_credits,
    }
    credits_int = credit_map.get(credit_type, 0)
    if credits_int <= 0:
        return Response(
            {'error': f'Selected package has no {credit_type} credits'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Apply coupon discount if provided
    discount_amount = Decimal('0.00')
    coupon = None
    if coupon_code:
        from apps.marketing.services.coupon_service import CouponService
        is_valid, coupon, error = CouponService.validate_coupon(
            code=coupon_code.upper().strip(),
            user=request.user,
            cart_total=float(package.price),
            package_ids=[package.id],
        )
        if not is_valid:
            return Response(
                {'error': f'Invalid coupon: {error}'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        discount_amount = CouponService.calculate_discount(coupon, package.price)

    with transaction.atomic():
        entitlement = Entitlement.objects.create(
            package=package,
            source='package_purchase',
            source_reference=source_ref,
            post_duration_days=package.post_duration_days,
            expires_at=parsed_expires,
            **entity_kwargs,
            **_build_credit_fields(credit_type, credits_int),
        )
        EntitlementLedger.objects.create(
            entitlement=entitlement,
            change=credits_int,
            reason='package_purchase',
            admin=request.user,
            notes=f'Package: {package.name} | {reason}',
        )
        invoice = InvoiceService.create_admin_package_invoice(
            package=package,
            credit_type=credit_type,
            payment_method=payment_method,
            invoice_status=invoice_status,
            coupon_code=coupon_code,
            discount_amount=discount_amount if discount_amount > 0 else None,
            currency=package.currency,
            **entity_kwargs,
        )
        if coupon:
            from apps.marketing.services.coupon_service import CouponService
            CouponService.redeem_coupon(coupon, request.user, invoice=invoice)

    create_audit_log(
        actor=request.user,
        action='grant',
        target=entitlement,
        changes={
            'credits': credits_int,
            'credit_type': credit_type,
            'package': package.name,
            'payment_method': payment_method,
            'discount': str(discount_amount) if discount_amount else None,
        },
        reason=reason,
        request=request,
    )

    _generate_pdf_safe(invoice.id)

    status_msg = 'Invoice sent' if invoice_status == 'open' else 'Credits added'
    return Response({
        'message': f'{status_msg}: {credits_int} {credit_type} credits for {entity_name}',
        'invoice_id': invoice.id,
    })
