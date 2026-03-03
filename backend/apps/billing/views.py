"""
Billing views for Orion API.
"""
import csv
import stripe
from decimal import Decimal
from datetime import timedelta
from django.conf import settings
from django.utils import timezone
from django.http import HttpResponse, HttpResponseRedirect, FileResponse
from django.db import models
from django.db.models import Sum, Count, Avg, Q, F
from rest_framework import viewsets, generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from rest_framework.renderers import StaticHTMLRenderer, BaseRenderer

from core.permissions import IsAdmin, IsEmployer, IsAgency
from .models import Entitlement, EntitlementLedger, PaymentMethod, Invoice, PromoCode, Subscription
from .serializers import (
    PublicJobPackageSerializer, EntitlementSerializer, EntitlementLedgerSerializer,
    PaymentMethodSerializer, InvoiceSerializer, PromoCodeSerializer,
    CheckoutSessionSerializer, SubscriptionSerializer,
    AdminEntitlementSerializer, AdminEntitlementCreateSerializer,
    EntitlementSummarySerializer,
)
from apps.moderation.models import JobPackage

from .stripe_service import get_stripe_client, get_stripe_webhook_secret
from apps.audit.models import create_audit_log

import logging as _logging

_billing_logger = _logging.getLogger(__name__)


def _sanitize_stripe_error(exc):
    """Return a user-safe error message for a Stripe exception.

    Logs the original error at WARNING level before returning the
    sanitized message. This prevents leaking internal Stripe details
    (request IDs, API versions, internal codes) to the frontend.
    """
    _billing_logger.warning('Stripe error: %s', exc)

    if isinstance(exc, stripe.CardError):
        return getattr(exc, 'user_message', None) or 'Your card was declined. Please try a different payment method.'
    if isinstance(exc, stripe.InvalidRequestError):
        return 'The payment request was invalid. Please try again or contact support.'
    if isinstance(exc, stripe.AuthenticationError):
        return 'Payment service configuration error. Please contact support.'
    if isinstance(exc, stripe.RateLimitError):
        return 'Too many requests. Please wait a moment and try again.'
    if isinstance(exc, stripe.APIConnectionError):
        return 'Unable to connect to payment service. Please try again shortly.'
    return 'A payment error occurred. Please try again or contact support.'


class PDFRenderer(BaseRenderer):
    media_type = 'application/pdf'
    format = 'pdf'
    charset = None

    def render(self, data, accepted_media_type=None, renderer_context=None):
        return data


class PackageListView(generics.ListAPIView):
    """List available packages (from moderation.JobPackage, managed via admin UI)."""

    queryset = JobPackage.objects.filter(is_active=True).order_by('sort_order', 'price')
    serializer_class = PublicJobPackageSerializer
    permission_classes = [AllowAny]


class EntitlementViewSet(viewsets.ReadOnlyModelViewSet):
    """View entitlements for current company/agency."""

    serializer_class = EntitlementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.company:
            return Entitlement.objects.filter(company=user.company)
        elif user.agency:
            return Entitlement.objects.filter(agency=user.agency)
        return Entitlement.objects.none()


class EntitlementSummaryView(APIView):
    """Get entitlement summary for current company/agency."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        now = timezone.now()

        if user.company:
            queryset = Entitlement.objects.filter(
                company=user.company
            ).filter(
                Q(expires_at__isnull=True) | Q(expires_at__gt=now)
            )
        elif user.agency:
            queryset = Entitlement.objects.filter(
                agency=user.agency
            ).filter(
                Q(expires_at__isnull=True) | Q(expires_at__gt=now)
            )
        else:
            return Response({'error': 'No company or agency associated'}, status=400)

        summary = queryset.aggregate(
            total_credits=Sum('credits_total'),
            used_credits=Sum('credits_used'),
            total_featured_credits=Sum('featured_credits_total'),
            used_featured_credits=Sum('featured_credits_used'),
            total_social_credits=Sum('social_credits_total'),
            used_social_credits=Sum('social_credits_used'),
        )

        # Check team management access
        has_team_management = False
        if user.company:
            # Admin override takes priority
            if user.company.team_management_enabled:
                has_team_management = True
            else:
                # Check if any active subscription's package has team_management
                has_team_management = Subscription.objects.filter(
                    company=user.company,
                    status='active',
                    package__team_management=True,
                ).exists()
        elif user.agency:
            # Check admin override — agencies default to True but admin can disable
            has_team_management = getattr(user.agency, 'team_management_enabled', True)

        # Get post duration from active entitlement or fall back to policy default
        from apps.jobs.services import get_package_duration, get_job_policy
        entity = user.company or user.agency
        post_duration_days = get_package_duration(entity) if entity else get_job_policy().get('default_post_duration', 30)

        return Response({
            'total_credits': summary['total_credits'] or 0,
            'used_credits': summary['used_credits'] or 0,
            'remaining_credits': (summary['total_credits'] or 0) - (summary['used_credits'] or 0),
            'total_featured_credits': summary['total_featured_credits'] or 0,
            'remaining_featured_credits': (summary['total_featured_credits'] or 0) - (summary['used_featured_credits'] or 0),
            'total_social_credits': summary['total_social_credits'] or 0,
            'remaining_social_credits': (summary['total_social_credits'] or 0) - (summary['used_social_credits'] or 0),
            'active_entitlements': queryset.count(),
            'has_team_management': has_team_management,
            'post_duration_days': post_duration_days,
        })


class EntitlementLedgerView(generics.ListAPIView):
    """View entitlement ledger (credit history)."""

    serializer_class = EntitlementLedgerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.company:
            return EntitlementLedger.objects.filter(
                entitlement__company=user.company
            ).select_related('job')
        elif user.agency:
            return EntitlementLedger.objects.filter(
                entitlement__agency=user.agency
            ).select_related('job')
        return EntitlementLedger.objects.none()


class CreateCheckoutSessionView(APIView):
    """Create Stripe checkout session."""

    permission_classes = [IsAuthenticated]
    serializer_class = CheckoutSessionSerializer

    def post(self, request):
        client = get_stripe_client()

        serializer = CheckoutSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        items = serializer.validated_data['items']
        promo_code = serializer.validated_data.get('promo_code')

        # Get or create Stripe customer
        user = request.user
        customer_id = None

        if user.company and user.company.stripe_customer_id:
            customer_id = user.company.stripe_customer_id
        elif user.agency and user.agency.stripe_customer_id:
            customer_id = user.agency.stripe_customer_id
        else:
            # Create new Stripe customer
            customer = client.customers.create(params={
                'email': user.email,
                'name': user.get_full_name(),
                'metadata': {
                    'user_id': str(user.id),
                    'company_id': str(user.company_id or ''),
                    'agency_id': str(user.agency_id or ''),
                },
            })
            customer_id = customer.id

            # Save customer ID
            if user.company:
                user.company.stripe_customer_id = customer_id
                user.company.save(update_fields=['stripe_customer_id'])
            elif user.agency:
                user.agency.stripe_customer_id = customer_id
                user.agency.save(update_fields=['stripe_customer_id'])

        # Build line items
        line_items = []
        package_ids = [item['package_id'] for item in items]
        packages = {p.id: p for p in JobPackage.objects.filter(id__in=package_ids)}

        # Validate packages have Stripe price IDs
        for item in items:
            package = packages[item['package_id']]
            if not package.stripe_price_id:
                return Response(
                    {'error': f'Package "{package.name}" is not configured for payment. Please contact support.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        for item in items:
            package = packages[item['package_id']]
            line_items.append({
                'price': package.stripe_price_id,
                'quantity': item.get('quantity', 1),
            })

        # Create checkout session
        session_params = {
            'customer': customer_id,
            'line_items': line_items,
            'mode': 'payment',
            'success_url': f'{settings.FRONTEND_URL}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}',
            'cancel_url': f'{settings.FRONTEND_URL}/checkout/cancel',
            'metadata': {
                'user_id': str(user.id),
                'company_id': str(user.company_id or ''),
                'agency_id': str(user.agency_id or ''),
            },
        }

        # Apply promo/coupon code
        if promo_code:
            applied = False

            # Try marketing Coupon first
            try:
                from apps.marketing.services.coupon_service import CouponService

                # Calculate cart total for validation
                cart_total = sum(
                    packages[item['package_id']].price * item.get('quantity', 1)
                    for item in items
                )
                package_ids_list = [item['package_id'] for item in items]

                is_valid, coupon, error = CouponService.validate_coupon(
                    code=promo_code.upper().strip(),
                    user=user,
                    cart_total=float(cart_total),
                    package_ids=package_ids_list,
                    ip_address=request.META.get('REMOTE_ADDR'),
                )

                if coupon is not None:
                    if not is_valid:
                        return Response(
                            {'error': error},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    if coupon.discount_type in ('percentage', 'fixed'):
                        from .stripe_service import get_or_create_stripe_coupon
                        stripe_coupon_id = get_or_create_stripe_coupon(
                            coupon, client, cart_total=float(cart_total)
                        )
                        if stripe_coupon_id:
                            session_params['discounts'] = [{'coupon': stripe_coupon_id}]

                        session_params['metadata']['coupon_id'] = str(coupon.id)
                        session_params['metadata']['coupon_code'] = coupon.code

                    elif coupon.discount_type == 'credits':
                        # No Stripe discount — customer pays full price,
                        # bonus credits applied after payment in webhook
                        session_params['metadata']['coupon_id'] = str(coupon.id)
                        session_params['metadata']['coupon_code'] = coupon.code
                        session_params['metadata']['bonus_credits'] = str(int(coupon.discount_value))

                    applied = True
            except Exception:
                pass  # Fall through to legacy PromoCode

            # Fallback to legacy PromoCode
            if not applied:
                try:
                    promo = PromoCode.objects.get(code=promo_code, is_active=True)
                    if promo.is_valid:
                        session_params['metadata']['legacy_promo_code'] = promo.code
                        session_params['metadata']['legacy_promo_id'] = str(promo.id)
                except PromoCode.DoesNotExist:
                    pass

        try:
            session = client.checkout.sessions.create(params=session_params)

            return Response({
                'checkout_url': session.url,
                'session_id': session.id,
            })

        except stripe.StripeError as e:
            return Response(
                {'error': _sanitize_stripe_error(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class ValidatePromoCodeView(APIView):
    """Validate a promo/coupon code. Tries marketing Coupon first, then legacy PromoCode."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = request.data.get('code')
        if not code:
            return Response(
                {'error': 'Code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        cart_total = request.data.get('cart_total')
        package_ids = request.data.get('package_ids', [])
        ip_address = request.META.get('REMOTE_ADDR')

        # Try marketing coupon first
        try:
            from apps.marketing.services.coupon_service import CouponService
            is_valid, coupon, error = CouponService.validate_coupon(
                code=code.upper().strip(),
                user=request.user,
                cart_total=cart_total,
                package_ids=package_ids,
                ip_address=ip_address,
            )
            if coupon is not None:
                if not is_valid:
                    return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
                discount = 0
                if cart_total:
                    discount = float(CouponService.calculate_discount(coupon, cart_total))
                return Response({
                    'source': 'coupon',
                    'id': coupon.id,
                    'code': coupon.code,
                    'discount_type': coupon.discount_type,
                    'discount_value': float(coupon.discount_value),
                    'max_discount_amount': float(coupon.max_discount_amount) if coupon.max_discount_amount else None,
                    'calculated_discount': discount,
                })
        except Exception:
            pass

        # Fallback to legacy PromoCode
        try:
            promo = PromoCode.objects.get(code=code)
            if not promo.is_valid:
                return Response(
                    {'error': 'Promo code is not valid'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            return Response({
                'source': 'promo_code',
                **PromoCodeSerializer(promo).data,
            })

        except PromoCode.DoesNotExist:
            return Response(
                {'error': 'Promo code not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class PaymentMethodViewSet(viewsets.ModelViewSet):
    """Manage payment methods."""

    serializer_class = PaymentMethodSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.company:
            return PaymentMethod.objects.filter(company=user.company)
        elif user.agency:
            return PaymentMethod.objects.filter(agency=user.agency)
        return PaymentMethod.objects.none()

    @action(detail=False, methods=['post'])
    def setup(self, request):
        """POST /api/billing/payment-methods/setup/ — create Stripe SetupIntent."""
        client = get_stripe_client()
        user = request.user

        # Get or create Stripe customer
        customer_id = None
        if user.company and user.company.stripe_customer_id:
            customer_id = user.company.stripe_customer_id
        elif user.agency and user.agency.stripe_customer_id:
            customer_id = user.agency.stripe_customer_id
        else:
            # Create new Stripe customer
            customer = client.customers.create(params={
                'email': user.email,
                'name': user.get_full_name(),
                'metadata': {
                    'user_id': str(user.id),
                    'company_id': str(user.company_id or ''),
                    'agency_id': str(user.agency_id or ''),
                },
            })
            customer_id = customer.id

            # Save customer ID
            if user.company:
                user.company.stripe_customer_id = customer_id
                user.company.save(update_fields=['stripe_customer_id'])
            elif user.agency:
                user.agency.stripe_customer_id = customer_id
                user.agency.save(update_fields=['stripe_customer_id'])

        # Create SetupIntent
        setup_intent = client.setup_intents.create(params={
            'customer': customer_id,
            'usage': 'off_session',
            'metadata': {
                'user_id': str(user.id),
                'company_id': str(user.company_id or ''),
                'agency_id': str(user.agency_id or ''),
            },
        })

        return Response({'client_secret': setup_intent.client_secret})

    @action(detail=False, methods=['post'])
    def confirm(self, request):
        """POST /api/billing/payment-methods/confirm/ — save payment method after Stripe setup."""
        client = get_stripe_client()
        payment_method_id = request.data.get('payment_method_id')
        if not payment_method_id:
            return Response(
                {'error': 'payment_method_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user

        try:
            # Retrieve payment method from Stripe
            pm = client.payment_methods.retrieve(payment_method_id)

            # Check if already exists
            existing = self.get_queryset().filter(
                stripe_payment_method_id=payment_method_id
            ).first()
            if existing:
                return Response(PaymentMethodSerializer(existing).data)

            # Determine company/agency
            company = user.company if user.company else None
            agency = user.agency if user.agency else None

            # Check if this is the first payment method (make it default)
            is_default = not self.get_queryset().exists()

            # Create payment method record
            payment_method = PaymentMethod.objects.create(
                company=company,
                agency=agency,
                stripe_payment_method_id=payment_method_id,
                card_brand=pm.card.brand,
                card_last4=pm.card.last4,
                card_exp_month=pm.card.exp_month,
                card_exp_year=pm.card.exp_year,
                is_default=is_default,
                cardholder_name=pm.billing_details.name,
            )

            create_audit_log(
                actor=request.user,
                action='create',
                target=payment_method,
                changes={'card_brand': payment_method.card_brand, 'card_last4': payment_method.card_last4},
                reason='Payment method added',
                request=request,
            )

            return Response(PaymentMethodSerializer(payment_method).data)

        except stripe.StripeError as e:
            return Response(
                {'error': _sanitize_stripe_error(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        """Set payment method as default."""
        payment_method = self.get_object()

        # Unset other defaults
        self.get_queryset().update(is_default=False)

        payment_method.is_default = True
        payment_method.save(update_fields=['is_default'])

        return Response({'message': 'Default payment method updated'})

    def destroy(self, request, *args, **kwargs):
        client = get_stripe_client()
        payment_method = self.get_object()

        # Detach from Stripe
        try:
            client.payment_methods.detach(payment_method.stripe_payment_method_id)
        except stripe.StripeError:
            pass  # Already detached or doesn't exist

        create_audit_log(
            actor=request.user,
            action='delete',
            target=payment_method,
            changes={'card_brand': payment_method.card_brand, 'card_last4': payment_method.card_last4},
            reason='Payment method removed',
            request=request,
        )

        return super().destroy(request, *args, **kwargs)


class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    """View invoices."""

    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        if user.company:
            return Invoice.objects.filter(company=user.company).prefetch_related('items')
        elif user.agency:
            return Invoice.objects.filter(agency=user.agency).prefetch_related('items')
        return Invoice.objects.none()

    @action(detail=True, methods=['get'], renderer_classes=[PDFRenderer, StaticHTMLRenderer])
    def download(self, request, pk=None):
        """GET /api/billing/invoices/{id}/download/ — redirect to signed PDF URL."""
        from django.core.files.storage import default_storage

        invoice = self.get_object()
        if not invoice.invoice_pdf_key and invoice.status in ('paid', 'refunded'):
            from .services import InvoiceService
            try:
                InvoiceService.generate_and_store_pdf(invoice.id)
                invoice.refresh_from_db(fields=['invoice_pdf_key'])
            except Exception:
                pass

        if not invoice.invoice_pdf_key:
            return HttpResponse(
                'PDF not available',
                status=status.HTTP_404_NOT_FOUND,
                content_type='text/plain'
            )

        try:
            pdf_file = default_storage.open(invoice.invoice_pdf_key, 'rb')
            response = FileResponse(pdf_file, content_type='application/pdf')
            response['Content-Disposition'] = (
                f'attachment; filename="{invoice.invoice_number}.pdf"'
            )
            return response
        except FileNotFoundError:
            return HttpResponse(
                'PDF file not found',
                status=status.HTTP_404_NOT_FOUND,
                content_type='text/plain'
            )

    @action(detail=True, methods=['post'])
    def regenerate(self, request, pk=None):
        """POST /api/billing/invoices/{id}/regenerate/ — generate invoice PDF."""
        from .services import InvoiceService
        from .tasks import generate_invoice_pdf_task

        invoice = self.get_object()
        if invoice.status not in ('paid', 'refunded'):
            return Response(
                {'error': 'Can only regenerate PDFs for paid or refunded invoices'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            InvoiceService.generate_and_store_pdf(invoice.id)
        except Exception:
            try:
                generate_invoice_pdf_task.delay(invoice.id)
            except Exception:
                return Response(
                    {'error': 'Failed to start PDF generation'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        return Response({'message': 'PDF generation started'})


class SubscriptionView(generics.RetrieveAPIView):
    """Get current subscription."""

    serializer_class = SubscriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        user = self.request.user
        if user.company:
            return Subscription.objects.filter(
                company=user.company,
                status='active'
            ).first()
        elif user.agency:
            return Subscription.objects.filter(
                agency=user.agency,
                status='active'
            ).first()
        return None


class CancelSubscriptionView(APIView):
    """Cancel subscription."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        client = get_stripe_client()
        user = request.user

        if user.company:
            subscription = Subscription.objects.filter(
                company=user.company,
                status='active'
            ).first()
        elif user.agency:
            subscription = Subscription.objects.filter(
                agency=user.agency,
                status='active'
            ).first()
        else:
            return Response(
                {'error': 'No subscription found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not subscription:
            return Response(
                {'error': 'No active subscription'},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            # Cancel at period end
            client.subscriptions.update(
                subscription.stripe_subscription_id,
                params={'cancel_at_period_end': True},
            )

            subscription.canceled_at = timezone.now()
            subscription.save(update_fields=['canceled_at'])

            create_audit_log(
                actor=request.user,
                action='update',
                target=subscription,
                changes={'canceled_at': str(subscription.canceled_at)},
                reason='Subscription canceled',
                request=request,
            )

            return Response({'message': 'Subscription will be canceled at period end'})

        except stripe.StripeError as e:
            return Response(
                {'error': _sanitize_stripe_error(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class ReactivateSubscriptionView(APIView):
    """Reactivate a canceled subscription."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        client = get_stripe_client()
        user = request.user

        if user.company:
            subscription = Subscription.objects.filter(
                company=user.company,
                status='active',
                canceled_at__isnull=False
            ).first()
        elif user.agency:
            subscription = Subscription.objects.filter(
                agency=user.agency,
                status='active',
                canceled_at__isnull=False
            ).first()
        else:
            return Response(
                {'error': 'No subscription found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not subscription:
            return Response(
                {'error': 'No canceled subscription to reactivate'},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            client.subscriptions.update(
                subscription.stripe_subscription_id,
                params={'cancel_at_period_end': False},
            )

            subscription.canceled_at = None
            subscription.save(update_fields=['canceled_at'])

            create_audit_log(
                actor=request.user,
                action='update',
                target=subscription,
                changes={'canceled_at': None, 'status': 'reactivated'},
                reason='Subscription reactivated',
                request=request,
            )

            return Response(SubscriptionSerializer(subscription).data)

        except stripe.StripeError as e:
            return Response(
                {'error': _sanitize_stripe_error(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class ChangeSubscriptionPlanView(APIView):
    """Change subscription plan."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        client = get_stripe_client()
        user = request.user
        package_id = request.data.get('package_id')

        if not package_id:
            return Response(
                {'error': 'package_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            new_package = JobPackage.objects.get(id=package_id, is_active=True)
        except JobPackage.DoesNotExist:
            return Response(
                {'error': 'Package not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if user.company:
            subscription = Subscription.objects.filter(
                company=user.company,
                status='active'
            ).first()
        elif user.agency:
            subscription = Subscription.objects.filter(
                agency=user.agency,
                status='active'
            ).first()
        else:
            return Response(
                {'error': 'No active subscription'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not subscription:
            return Response(
                {'error': 'No active subscription to change'},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            stripe_sub = client.subscriptions.retrieve(
                subscription.stripe_subscription_id
            )

            client.subscriptions.update(
                subscription.stripe_subscription_id,
                params={
                    'items': [{
                        'id': stripe_sub.items.data[0].id,
                        'price': new_package.stripe_price_id,
                    }],
                    'proration_behavior': 'create_prorations',
                },
            )

            subscription.package = new_package
            subscription.save(update_fields=['package'])

            create_audit_log(
                actor=request.user,
                action='update',
                target=subscription,
                changes={'package_id': package_id, 'package_name': new_package.name},
                reason='Subscription plan changed',
                request=request,
            )

            return Response(SubscriptionSerializer(subscription).data)

        except stripe.StripeError as e:
            return Response(
                {'error': _sanitize_stripe_error(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class CheckoutSessionResultView(APIView):
    """Get checkout session result."""

    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        client = get_stripe_client()
        try:
            session = client.checkout.sessions.retrieve(session_id)

            # Verify session belongs to the requesting user
            session_email = session.customer_details.email if session.customer_details else None
            if session_email and session_email.lower() != request.user.email.lower():
                return Response(
                    {'error': 'This checkout session does not belong to your account.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            return Response({
                'status': session.status,
                'payment_status': session.payment_status,
                'customer_email': session.customer_details.email if session.customer_details else None,
                'amount_total': session.amount_total,
                'currency': session.currency,
            })

        except stripe.StripeError as e:
            return Response(
                {'error': _sanitize_stripe_error(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


def stripe_webhook(request):
    """Handle Stripe webhooks (both thin and snapshot payloads).

    Thin verification layer: validates the signature, records the event
    for idempotency, returns 200 immediately, and dispatches processing
    to Celery. This ensures Stripe never sees a timeout or 5xx from us.
    """
    import logging
    from .models import StripeWebhookEvent
    from .tasks import process_stripe_webhook_event

    logger = logging.getLogger(__name__)

    client = get_stripe_client()
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    webhook_secret = get_stripe_webhook_secret()

    if not webhook_secret:
        logger.error('Stripe webhook: STRIPE_WEBHOOK_SECRET is not configured')
        return HttpResponse(status=500)

    # 1. Verify signature
    try:
        thin_event = client.parse_thin_event(payload, sig_header, webhook_secret)
    except ValueError:
        logger.warning('Stripe webhook: invalid payload')
        return HttpResponse(status=400)
    except stripe.SignatureVerificationError:
        logger.warning('Stripe webhook: signature verification failed')
        return HttpResponse(status=400)

    event_id = thin_event.id
    event_type = thin_event.type
    object_id = thin_event.data.object.id if thin_event.data and thin_event.data.object else ''

    logger.info('Stripe webhook received: %s (%s) object=%s', event_id, event_type, object_id)

    # 2. Idempotency check — skip if already processed or in progress
    event, created = StripeWebhookEvent.objects.get_or_create(
        stripe_event_id=event_id,
        defaults={
            'event_type': event_type,
            'status': 'pending',
            'payload': {'object_id': object_id},
        },
    )

    if not created:
        if event.status == 'completed':
            logger.info('Event %s already processed, skipping', event_id)
            return HttpResponse(status=200)
        if event.status == 'processing' and event.attempts < 5:
            logger.info('Event %s already being processed, skipping', event_id)
            return HttpResponse(status=200)
        # If failed or stuck, allow re-processing
        logger.info('Re-dispatching event %s (status=%s, attempts=%d)', event_id, event.status, event.attempts)

    # 3. Return 200 immediately, dispatch to Celery
    process_stripe_webhook_event.delay(event.id)
    return HttpResponse(status=200)


class AdminEntitlementViewSet(viewsets.ModelViewSet):
    """Admin entitlement management."""

    queryset = Entitlement.objects.all().select_related('company', 'agency', 'package')
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_fields = ['company', 'agency', 'source']
    search_fields = ['company__name', 'agency__name']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return AdminEntitlementCreateSerializer
        return AdminEntitlementSerializer


class AdminInvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    """Admin invoice management."""

    queryset = Invoice.objects.all().select_related('company', 'agency')
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_fields = ['status', 'company', 'agency']
    search_fields = ['company__name', 'agency__name', 'description']
    ordering = ['-created_at']

    @action(detail=True, methods=['post'])
    def regenerate(self, request, pk=None):
        """POST /api/admin/invoices/{id}/regenerate/ — generate invoice PDF."""
        from .services import InvoiceService
        from .tasks import generate_invoice_pdf_task

        invoice = self.get_object()
        if invoice.status not in ('paid', 'refunded'):
            return Response(
                {'error': 'Can only generate PDFs for paid or refunded invoices'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            InvoiceService.generate_and_store_pdf(invoice.id)
        except Exception:
            try:
                generate_invoice_pdf_task.delay(invoice.id)
            except Exception:
                return Response(
                    {'error': 'Failed to start PDF generation'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        return Response({'message': 'PDF generation started'})


def _get_billing_date_range(range_param):
    """Parse range parameter and return start date for billing views."""
    now = timezone.now()
    if range_param == '90d':
        return now - timedelta(days=90)
    elif range_param == '30d':
        return now - timedelta(days=30)
    elif range_param == '24h':
        return now - timedelta(hours=24)
    elif range_param == '12m':
        return now - timedelta(days=365)
    else:  # default 7d
        return now - timedelta(days=7)


# ============================================================================
# AGENCY BILLING VIEWS
# ============================================================================

class AgencyPackageViewSet(viewsets.ReadOnlyModelViewSet):
    """View packages for agencies."""

    serializer_class = PublicJobPackageSerializer
    permission_classes = [IsAuthenticated, IsAgency]
    filterset_fields = ['payment_type']
    ordering = ['sort_order', 'price']

    def get_queryset(self):
        return JobPackage.objects.filter(is_active=True)

    @action(detail=False, methods=['get'])
    def available(self, request):
        """GET /api/billing/agency/packages/available/ - list available packages for purchase."""
        packages = self.get_queryset()
        serializer = PublicJobPackageSerializer(packages, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def purchase(self, request):
        """POST /api/billing/agency/packages/purchase/ - purchase a package."""
        client = get_stripe_client()
        package_id = request.data.get('package_id')
        payment_method_id = request.data.get('payment_method_id')

        if not package_id:
            return Response(
                {'error': 'package_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            package = JobPackage.objects.get(id=package_id, is_active=True)
        except JobPackage.DoesNotExist:
            return Response(
                {'error': 'Package not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        user = request.user
        agency = user.agency

        if not agency:
            return Response(
                {'error': 'No agency associated with user'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get or create Stripe customer
        customer_id = agency.stripe_customer_id
        if not customer_id:
            customer = client.customers.create(params={
                'email': user.email,
                'name': agency.name,
                'metadata': {'agency_id': str(agency.id), 'user_id': str(user.id)},
            })
            customer_id = customer.id
            agency.stripe_customer_id = customer_id
            agency.save(update_fields=['stripe_customer_id'])

        # Create checkout session
        try:
            session = client.checkout.sessions.create(params={
                'customer': customer_id,
                'line_items': [{'price': package.stripe_price_id, 'quantity': 1}],
                'mode': 'payment',
                'success_url': f'{settings.FRONTEND_URL}/agency/billing?session_id={{CHECKOUT_SESSION_ID}}',
                'cancel_url': f'{settings.FRONTEND_URL}/agency/billing',
                'metadata': {
                    'agency_id': str(agency.id),
                    'user_id': str(user.id),
                    'package_id': str(package.id),
                },
            })

            return Response({'checkout_url': session.url, 'session_id': session.id})

        except stripe.StripeError as e:
            return Response({'error': _sanitize_stripe_error(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        """POST /api/billing/agency/packages/{id}/assign/ - assign package credit to a job."""
        job_id = request.data.get('job_id')
        if not job_id:
            return Response(
                {'error': 'job_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Find a valid entitlement for this agency
        agency = request.user.agency
        now = timezone.now()
        entitlement = Entitlement.objects.filter(
            agency=agency,
            credits_used__lt=F('credits_total')
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=now)
        ).order_by('expires_at', 'created_at').first()

        if not entitlement:
            return Response(
                {'error': 'No available credits'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify job belongs to agency
        from apps.jobs.models import Job
        try:
            job = Job.objects.get(id=job_id, agency=agency)
        except Job.DoesNotExist:
            return Response(
                {'error': 'Job not found or does not belong to agency'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Use credit
        try:
            entitlement.use_credit(job=job)
            return Response({'message': 'Credit assigned successfully'})
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AgencyEntitlementView(APIView):
    """View agency entitlements summary."""

    permission_classes = [IsAuthenticated, IsAgency]

    def get(self, request):
        agency = request.user.agency
        if not agency:
            return Response(
                {'error': 'No agency associated with user'},
                status=status.HTTP_400_BAD_REQUEST
            )

        now = timezone.now()
        queryset = Entitlement.objects.filter(agency=agency).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=now)
        )

        summary = queryset.aggregate(
            total_credits=Sum('credits_total'),
            used_credits=Sum('credits_used'),
            total_featured_credits=Sum('featured_credits_total'),
            used_featured_credits=Sum('featured_credits_used'),
            total_social_credits=Sum('social_credits_total'),
            used_social_credits=Sum('social_credits_used'),
        )

        # Check for expiring credits (within 7 days)
        expiring_soon = queryset.filter(
            expires_at__isnull=False,
            expires_at__lte=now + timedelta(days=7),
            expires_at__gt=now
        ).aggregate(
            count=Count('id'),
            total_expiring=Sum('credits_total') - Sum('credits_used')
        )

        return Response({
            'total_credits': summary['total_credits'] or 0,
            'used_credits': summary['used_credits'] or 0,
            'remaining_credits': (summary['total_credits'] or 0) - (summary['used_credits'] or 0),
            'total_featured_credits': summary['total_featured_credits'] or 0,
            'remaining_featured_credits': (summary['total_featured_credits'] or 0) - (summary['used_featured_credits'] or 0),
            'total_social_credits': summary['total_social_credits'] or 0,
            'remaining_social_credits': (summary['total_social_credits'] or 0) - (summary['used_social_credits'] or 0),
            'expiring_soon': {
                'count': expiring_soon['count'] or 0,
                'days': 7
            },
            'post_duration_days': self._get_post_duration(agency),
        })

    @staticmethod
    def _get_post_duration(agency):
        from apps.jobs.services import get_package_duration, get_job_policy
        return get_package_duration(agency) if agency else get_job_policy().get('default_post_duration', 30)


class AgencyCreditPackView(generics.ListAPIView):
    """List credit packs available for agencies."""

    serializer_class = PublicJobPackageSerializer
    permission_classes = [IsAuthenticated, IsAgency]

    def get_queryset(self):
        return JobPackage.objects.filter(
            is_active=True,
            payment_type='bundle'
        ).order_by('price')


class AgencyInvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    """View agency invoices."""

    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated, IsAgency]
    filterset_fields = ['status']
    ordering = ['-created_at']

    def get_queryset(self):
        agency = self.request.user.agency
        if not agency:
            return Invoice.objects.none()
        return Invoice.objects.filter(agency=agency).prefetch_related('items')

    @action(detail=True, methods=['get'], renderer_classes=[PDFRenderer, StaticHTMLRenderer])
    def download(self, request, pk=None):
        """GET /api/billing/agency/invoices/{id}/download/ - download invoice PDF."""
        from django.core.files.storage import default_storage

        invoice = self.get_object()
        if not invoice.invoice_pdf_key and invoice.status in ('paid', 'refunded'):
            from .services import InvoiceService
            try:
                InvoiceService.generate_and_store_pdf(invoice.id)
                invoice.refresh_from_db(fields=['invoice_pdf_key'])
            except Exception:
                pass

        if not invoice.invoice_pdf_key:
            return HttpResponse(
                'PDF not available',
                status=status.HTTP_404_NOT_FOUND,
                content_type='text/plain'
            )

        try:
            pdf_file = default_storage.open(invoice.invoice_pdf_key, 'rb')
            response = FileResponse(pdf_file, content_type='application/pdf')
            response['Content-Disposition'] = (
                f'attachment; filename="{invoice.invoice_number}.pdf"'
            )
            return response
        except FileNotFoundError:
            return HttpResponse(
                'PDF file not found',
                status=status.HTTP_404_NOT_FOUND,
                content_type='text/plain'
            )


# ============================================================================
# ADMIN PAYMENT VIEWS
# ============================================================================

class AdminPaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Admin payment/transaction management.
    Maps Invoice model to AdminTransaction shape the frontend expects.
    """

    queryset = Invoice.objects.all().select_related('company', 'agency')
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_fields = ['status', 'company', 'agency', 'payment_method']
    search_fields = ['company__name', 'agency__name', 'description']
    ordering_fields = ['created_at', 'amount', 'status']
    ordering = ['-created_at']

    def get_serializer_class(self):
        from apps.moderation.serializers import AdminTransactionSerializer
        return AdminTransactionSerializer

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """GET /api/admin/payments/stats/ — payment stats."""
        from apps.moderation.serializers import AdminPaymentStatsSerializer

        range_param = request.query_params.get('range', '30d')
        start_date = _get_billing_date_range(range_param)
        now = timezone.now()

        # Current period
        current_invoices = Invoice.objects.filter(created_at__gte=start_date)
        paid_current = current_invoices.filter(status='paid')
        total_revenue = paid_current.aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0')
        tx_count = current_invoices.count()

        avg_tx = Decimal('0')
        if tx_count > 0:
            avg_tx = total_revenue / tx_count

        # Previous period for change calculation
        period_days = (now - start_date).days
        prev_start = start_date - timedelta(days=period_days)
        prev_end = start_date
        prev_revenue = Invoice.objects.filter(
            status='paid',
            created_at__gte=prev_start,
            created_at__lt=prev_end
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        revenue_change = 0.0
        if prev_revenue > 0:
            revenue_change = round(
                float((total_revenue - prev_revenue) / prev_revenue * 100), 1
            )
        elif total_revenue > 0:
            revenue_change = 100.0

        # By type (approximate from description)
        by_type = {'subscription': 0, 'package': 0, 'credit': 0}
        for inv in paid_current:
            desc = (inv.description or '').lower()
            if 'subscription' in desc:
                by_type['subscription'] += float(inv.amount)
            elif 'credit' in desc:
                by_type['credit'] += float(inv.amount)
            else:
                by_type['package'] += float(inv.amount)

        data = {
            'total_revenue': total_revenue,
            'revenue_change': revenue_change,
            'transactions_count': tx_count,
            'average_transaction': avg_tx,
            'by_type': by_type,
        }

        serializer = AdminPaymentStatsSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def trends(self, request):
        """GET /api/admin/payments/trends/ — daily revenue + tx count."""
        from apps.moderation.serializers import AdminRevenueTrendSerializer

        range_param = request.query_params.get('range', '7d')
        start_date = _get_billing_date_range(range_param)
        now = timezone.now()

        trend_data = []
        current_date = start_date.date()
        end_date = now.date()

        while current_date <= end_date:
            day_start = timezone.make_aware(
                timezone.datetime.combine(current_date, timezone.datetime.min.time())
            )
            day_end = day_start + timedelta(days=1)

            day_invoices = Invoice.objects.filter(
                created_at__gte=day_start, created_at__lt=day_end
            )
            revenue = day_invoices.filter(status='paid').aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0')
            tx_count = day_invoices.count()

            trend_data.append({
                'date': current_date.strftime('%a'),
                'revenue': revenue,
                'transactions': tx_count,
            })
            current_date += timedelta(days=1)

        serializer = AdminRevenueTrendSerializer(trend_data, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def refund(self, request, pk=None):
        """POST /api/admin/payments/{id}/refund/ — refund an invoice."""
        invoice = self.get_object()
        if invoice.status not in ('paid',):
            return Response(
                {'error': 'Only paid invoices can be refunded'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Issue refund via Stripe if a payment intent exists
        if invoice.stripe_payment_intent_id:
            import stripe
            from django.conf import settings
            stripe.api_key = settings.STRIPE_SECRET_KEY
            try:
                stripe.Refund.create(
                    payment_intent=invoice.stripe_payment_intent_id,
                    reason='requested_by_customer',
                )
            except stripe.error.StripeError as e:
                return Response(
                    {'error': f'Stripe refund failed: {str(e)}'},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

        invoice.status = 'refunded'
        invoice.refunded_at = timezone.now()
        invoice.save(update_fields=['status', 'refunded_at'])

        serializer = self.get_serializer(invoice)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        """POST /api/admin/payments/{id}/retry/ — retry a failed invoice."""
        invoice = self.get_object()
        if invoice.status not in ('failed',):
            return Response(
                {'error': 'Only failed invoices can be retried'},
                status=status.HTTP_400_BAD_REQUEST
            )

        invoice.status = 'pending'
        invoice.save(update_fields=['status'])

        serializer = self.get_serializer(invoice)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def export(self, request):
        """GET /api/admin/payments/export/ — CSV export."""
        qs = self.filter_queryset(self.get_queryset())
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="payments-export.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'ID', 'Company', 'Agency', 'Amount', 'Currency',
            'Status', 'Description', 'Created At', 'Paid At',
        ])

        for inv in qs:
            writer.writerow([
                inv.id,
                inv.company.name if inv.company else '',
                inv.agency.name if inv.agency else '',
                inv.amount, inv.currency, inv.status,
                inv.description, inv.created_at,
                inv.paid_at or '',
            ])

        return response

    @action(
        detail=True,
        methods=['get'],
        url_path='invoice/download',
        renderer_classes=[PDFRenderer, StaticHTMLRenderer],  # Bypass DRF content negotiation
    )
    def invoice_download(self, request, pk=None):
        """GET /api/admin/payments/{id}/invoice/download/ — redirect to signed PDF URL."""
        from django.core.files.storage import default_storage

        invoice = self.get_object()
        if not invoice.invoice_pdf_key and invoice.status in ('paid', 'refunded'):
            from .services import InvoiceService
            try:
                InvoiceService.generate_and_store_pdf(invoice.id)
                invoice.refresh_from_db(fields=['invoice_pdf_key'])
            except Exception:
                pass

        if not invoice.invoice_pdf_key:
            return HttpResponse(
                'PDF not available',
                status=status.HTTP_404_NOT_FOUND,
                content_type='text/plain'
            )

        try:
            pdf_file = default_storage.open(invoice.invoice_pdf_key, 'rb')
            response = FileResponse(pdf_file, content_type='application/pdf')
            response['Content-Disposition'] = (
                f'attachment; filename="{invoice.invoice_number}.pdf"'
            )
            return response
        except FileNotFoundError:
            return HttpResponse(
                'PDF file not found',
                status=status.HTTP_404_NOT_FOUND,
                content_type='text/plain'
            )


class AdminCreditPaymentMethodsView(APIView):
    """Return available admin payment methods for the Add Credits dialog."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from .admin_credits import PAYMENT_METHODS

        methods = [
            {
                'value': key,
                'label': config['label'],
                'workflow_type': config['workflow'],
                'requires_package': config['requires_package'],
                'invoice_status': config['invoice_status'],
            }
            for key, config in PAYMENT_METHODS.items()
        ]
        return Response(methods)
