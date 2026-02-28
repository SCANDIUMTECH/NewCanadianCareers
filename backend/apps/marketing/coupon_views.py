"""
Coupon & store credit management views for marketing module.
"""
from django.db.models import Sum, Count
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsAdmin
from apps.audit.models import create_audit_log
from .models import Coupon, CouponRedemption, StoreCreditWallet, StoreCreditTransaction
from .serializers import (
    CouponSerializer,
    CouponCreateSerializer,
    CouponUpdateSerializer,
    CouponRedemptionSerializer,
    CouponStatsSerializer,
    StoreCreditWalletSerializer,
    StoreCreditTransactionSerializer,
    IssueCreditSerializer,
)
from .services.coupon_service import CouponService


class CouponViewSet(viewsets.ModelViewSet):
    """
    CRUD for coupons.
    GET    /api/admin/marketing/coupons/
    POST   /api/admin/marketing/coupons/
    GET    /api/admin/marketing/coupons/{id}/
    PATCH  /api/admin/marketing/coupons/{id}/
    DELETE /api/admin/marketing/coupons/{id}/
    """
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Coupon.objects.select_related(
        'campaign', 'created_by', 'legacy_promo_code'
    ).prefetch_related('applicable_packages')
    filterset_fields = ['status', 'distribution', 'discount_type']
    search_fields = ['name', 'code']
    ordering_fields = ['created_at', 'uses_count', 'expires_at', 'name']

    def get_serializer_class(self):
        if self.action == 'create':
            return CouponCreateSerializer
        if self.action in ('update', 'partial_update'):
            return CouponUpdateSerializer
        return CouponSerializer

    def perform_create(self, serializer):
        coupon = serializer.save(created_by=self.request.user)
        create_audit_log(
            actor=self.request.user,
            action='coupon_create',
            target=coupon,
            request=self.request,
        )

    def perform_destroy(self, instance):
        create_audit_log(
            actor=self.request.user,
            action='coupon_delete',
            target=instance,
            request=self.request,
        )
        instance.delete()  # Soft delete via SoftDeleteMixin

    # ─── Custom Actions ───────────────────────────────────────────

    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        """POST /api/admin/marketing/coupons/{id}/pause/"""
        coupon = self.get_object()
        if coupon.status != 'active':
            return Response(
                {'error': 'Only active coupons can be paused.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        coupon.status = 'paused'
        coupon.save(update_fields=['status', 'updated_at'])
        create_audit_log(
            actor=request.user, action='coupon_pause',
            target=coupon, request=request,
        )
        return Response(CouponSerializer(coupon).data)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """POST /api/admin/marketing/coupons/{id}/activate/"""
        coupon = self.get_object()
        if coupon.status not in ('paused', 'expired'):
            return Response(
                {'error': 'Only paused or expired coupons can be activated.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        coupon.status = 'active'
        coupon.save(update_fields=['status', 'updated_at'])
        create_audit_log(
            actor=request.user, action='coupon_activate',
            target=coupon, request=request,
        )
        return Response(CouponSerializer(coupon).data)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """POST /api/admin/marketing/coupons/{id}/duplicate/"""
        coupon = self.get_object()
        new_coupon = CouponService.duplicate_coupon(coupon, actor=request.user)
        create_audit_log(
            actor=request.user, action='coupon_duplicate',
            target=new_coupon, request=request,
        )
        return Response(
            CouponSerializer(new_coupon).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['get'])
    def redemptions(self, request, pk=None):
        """GET /api/admin/marketing/coupons/{id}/redemptions/"""
        coupon = self.get_object()
        qs = CouponRedemption.objects.filter(
            coupon=coupon
        ).select_related('user', 'company', 'agency', 'invoice')

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = CouponRedemptionSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = CouponRedemptionSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """GET /api/admin/marketing/coupons/{id}/stats/"""
        coupon = self.get_object()
        redemptions = CouponRedemption.objects.filter(coupon=coupon)
        agg = redemptions.aggregate(
            total_discount=Sum('discount_amount'),
            total_credits=Sum('credits_granted'),
            unique_users=Count('user', distinct=True),
        )
        total_redemptions = redemptions.count()
        remaining = None
        if coupon.max_uses_total:
            remaining = max(0, coupon.max_uses_total - coupon.uses_count)

        data = {
            'total_redemptions': total_redemptions,
            'unique_users': agg['unique_users'] or 0,
            'total_discount_given': agg['total_discount'] or 0,
            'total_credits_granted': agg['total_credits'] or 0,
            'remaining_uses': remaining,
            'conversion_rate': 0.0,
        }
        return Response(CouponStatsSerializer(data).data)


class StoreCreditWalletViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only wallet list + detail with issue credit action.
    GET  /api/admin/marketing/credits/wallets/
    GET  /api/admin/marketing/credits/wallets/{id}/
    """
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = StoreCreditWallet.objects.select_related('company', 'agency')
    serializer_class = StoreCreditWalletSerializer
    filterset_fields = []
    search_fields = ['company__name', 'agency__name']
    ordering_fields = ['balance', 'created_at']

    @action(detail=True, methods=['get'])
    def transactions(self, request, pk=None):
        """GET /api/admin/marketing/credits/wallets/{id}/transactions/"""
        wallet = self.get_object()
        qs = StoreCreditTransaction.objects.filter(
            wallet=wallet
        ).select_related('coupon', 'invoice', 'admin')

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = StoreCreditTransactionSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = StoreCreditTransactionSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def issue(self, request, pk=None):
        """POST /api/admin/marketing/credits/wallets/{id}/issue/"""
        wallet = self.get_object()
        serializer = IssueCreditSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        txn = CouponService.issue_store_credit(
            wallet=wallet,
            amount=serializer.validated_data['amount'],
            description=serializer.validated_data['description'],
            admin=request.user,
        )
        create_audit_log(
            actor=request.user, action='store_credit_issue',
            target=wallet, request=request,
            details={
                'amount': str(txn.amount),
                'description': txn.description,
                'balance_after': str(txn.balance_after),
            },
        )
        return Response(
            StoreCreditTransactionSerializer(txn).data,
            status=status.HTTP_201_CREATED,
        )
