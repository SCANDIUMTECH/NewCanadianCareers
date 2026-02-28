"""
Company views for Orion API.
"""
import logging

from django.db import models, transaction
from django.http import HttpResponse
from rest_framework import viewsets, generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action

logger = logging.getLogger(__name__)

from core.permissions import IsAdmin, IsEmployer, IsAgency, IsCompanyOwnerOrAdmin, HasTeamManagement
from .models import Company, CompanyUser, Agency, AgencyUser, AgencyClient, CompanySettings
from .serializers import (
    CompanySerializer, CompanyDetailSerializer, CompanyUserSerializer,
    CompanyUserInviteSerializer, AdminCompanySerializer,
    AdminCompanyStatsSerializer,
    AgencySerializer, AgencyDetailSerializer, AgencyUserSerializer,
    AgencyClientSerializer, CreateAgencyClientByNameSerializer,
    AdminAgencySerializer, AdminAgencyDetailSerializer,
    CompanySettingsSerializer, CompanyJobDefaultsSerializer,
    CompanyNotificationPreferencesSerializer, PendingInviteSerializer,
    AgencyUserInviteSerializer
)


class IndustryListView(APIView):
    """Return the list of available industries.

    Pulls active industries from the Industry table (managed by admins),
    with a fallback to Company.INDUSTRY_CHOICES if the table is empty.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        from apps.moderation.models import Industry

        db_industries = Industry.objects.filter(is_active=True).order_by('sort_order', 'name')

        if db_industries.exists():
            industries = [
                {'value': ind.name, 'label': ind.name}
                for ind in db_industries
            ]
        else:
            # Fallback to hardcoded choices
            industries = [
                {'value': value, 'label': label}
                for value, label in Company.INDUSTRY_CHOICES
            ]
        return Response(industries)


class PublicCompanyViewSet(viewsets.ReadOnlyModelViewSet):
    """Public company listing and detail. Lookup by entity_id."""

    queryset = Company.objects.filter(status='verified')
    permission_classes = [AllowAny]
    lookup_field = 'entity_id'
    filterset_fields = ['industry', 'size', 'headquarters_country']
    search_fields = ['name', 'description', 'industry']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CompanyDetailSerializer
        return CompanySerializer


class CompanyProfileView(generics.RetrieveUpdateAPIView):
    """Get/update company profile for authenticated users."""

    serializer_class = CompanyDetailSerializer
    permission_classes = [IsAuthenticated, IsEmployer]

    def get_object(self):
        return self.request.user.company


class CompanyLogoUploadView(APIView):
    """Upload company logo. Accepts PNG, JPG, SVG, WebP."""

    permission_classes = [IsAuthenticated, IsEmployer]

    def post(self, request):
        company = request.user.company
        logo_file = request.FILES.get('logo')

        if not logo_file:
            return Response(
                {'error': 'No logo file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        company.logo = logo_file
        company.full_clean()  # Triggers file extension validator
        company.save(update_fields=['logo'])

        serializer = CompanyDetailSerializer(company)
        return Response(serializer.data)


class CompanyBannerUploadView(APIView):
    """Upload company banner. Accepts PNG, JPG, SVG, WebP."""

    permission_classes = [IsAuthenticated, IsEmployer]

    def post(self, request):
        company = request.user.company
        banner_file = request.FILES.get('banner')

        if not banner_file:
            return Response(
                {'error': 'No banner file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        company.banner = banner_file
        company.full_clean()
        company.save(update_fields=['banner'])

        serializer = CompanyDetailSerializer(company)
        return Response(serializer.data)


class CompanyMembersView(generics.ListCreateAPIView):
    """List/add company members."""

    serializer_class = CompanyUserSerializer
    permission_classes = [IsAuthenticated, IsEmployer, IsCompanyOwnerOrAdmin, HasTeamManagement]

    def get_queryset(self):
        return CompanyUser.objects.filter(
            company=self.request.user.company
        ).select_related('user')

    def perform_create(self, serializer):
        serializer.save(
            company=self.request.user.company,
            invited_by=self.request.user
        )


class CompanyMemberDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get/update/remove company member."""

    serializer_class = CompanyUserSerializer
    permission_classes = [IsAuthenticated, IsEmployer, IsCompanyOwnerOrAdmin, HasTeamManagement]

    def get_queryset(self):
        return CompanyUser.objects.filter(company=self.request.user.company)


class InviteCompanyMemberView(APIView):
    """Invite a user to the company."""

    permission_classes = [IsAuthenticated, IsEmployer, IsCompanyOwnerOrAdmin, HasTeamManagement]
    serializer_class = CompanyUserInviteSerializer

    def post(self, request):
        serializer = CompanyUserInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        role = serializer.validated_data['role']
        first_name = serializer.validated_data.get('first_name', '')
        last_name = serializer.validated_data.get('last_name', '')

        # Check if user already exists
        from apps.users.models import User
        from django.utils import timezone

        user = User.objects.filter(email=email).first()

        if user:
            # Check if already a member
            if CompanyUser.objects.filter(company=request.user.company, user=user).exists():
                return Response(
                    {'error': 'User is already a member'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Add as member
            CompanyUser.objects.create(
                company=request.user.company,
                user=user,
                role=role,
                invited_by=request.user,
                invited_at=timezone.now()
            )
        else:
            # Create pending user account with unusable password
            # User must complete signup via invitation link to set password
            user = User.objects.create(
                email=email,
                first_name=first_name,
                last_name=last_name,
                role='employer',
                status='pending',
                is_active=False,
                company=request.user.company
            )
            user.set_unusable_password()
            user.save(update_fields=['password'])

            # Add as pending member
            CompanyUser.objects.create(
                company=request.user.company,
                user=user,
                role=role,
                invited_by=request.user,
                invited_at=timezone.now()
            )

            # Send invitation email to new user with password setup link
            self._send_invite_email(user, request.user.company)

        return Response({'message': 'Invitation sent'})

    def _send_invite_email(self, user, company):
        """Send a password setup email to the invited user."""
        import secrets
        from datetime import timedelta
        from django.conf import settings as django_settings
        from apps.users.models import PasswordResetToken
        from apps.notifications.tasks import send_email as send_email_task

        try:
            token = secrets.token_urlsafe(32)
            PasswordResetToken.objects.create(
                user=user,
                token=token,
                expires_at=timezone.now() + timedelta(hours=72),
            )
            reset_url = f"{django_settings.FRONTEND_URL}/reset-password?token={token}"
            send_email_task.delay(
                to_email=user.email,
                subject=f'You\'ve been invited to join {company.name} on Orion',
                template='password_reset',
                context={
                    'name': user.first_name or 'there',
                    'reset_url': reset_url,
                },
                user_id=user.id,
            )
        except Exception:
            logger.exception("Failed to send invitation email to %s", user.email)


class CompanyPendingInvitesView(generics.ListAPIView):
    """List pending company invites."""

    serializer_class = PendingInviteSerializer
    permission_classes = [IsAuthenticated, IsEmployer, IsCompanyOwnerOrAdmin, HasTeamManagement]

    def get_queryset(self):
        # Pending invites are CompanyUser records with invited_at but no joined_at
        return CompanyUser.objects.filter(
            company=self.request.user.company,
            invited_at__isnull=False,
            joined_at__isnull=True
        ).select_related('user', 'invited_by')


class ResendCompanyInviteView(APIView):
    """Resend a company invitation."""

    permission_classes = [IsAuthenticated, IsEmployer, IsCompanyOwnerOrAdmin, HasTeamManagement]

    def post(self, request, invite_id):
        try:
            invite = CompanyUser.objects.get(
                id=invite_id,
                company=request.user.company,
                invited_at__isnull=False,
                joined_at__isnull=True
            )
        except CompanyUser.DoesNotExist:
            return Response(
                {'error': 'Invite not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Resend invitation email
        import secrets
        from datetime import timedelta
        from django.conf import settings as django_settings
        from apps.users.models import PasswordResetToken
        from apps.notifications.tasks import send_email as send_email_task

        try:
            token = secrets.token_urlsafe(32)
            PasswordResetToken.objects.create(
                user=invite.user,
                token=token,
                expires_at=timezone.now() + timedelta(hours=72),
            )
            reset_url = f"{django_settings.FRONTEND_URL}/reset-password?token={token}"
            send_email_task.delay(
                to_email=invite.user.email,
                subject=f'Reminder: You\'ve been invited to join {request.user.company.name} on Orion',
                template='password_reset',
                context={
                    'name': invite.user.first_name or 'there',
                    'reset_url': reset_url,
                },
                user_id=invite.user.id,
            )
        except Exception:
            logger.exception("Failed to resend invitation email to %s", invite.user.email)
            return Response(
                {'error': 'Failed to resend invitation email'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response({'message': 'Invitation resent'})


class CancelCompanyInviteView(APIView):
    """Cancel a company invitation."""

    permission_classes = [IsAuthenticated, IsEmployer, IsCompanyOwnerOrAdmin, HasTeamManagement]

    def delete(self, request, invite_id):
        try:
            invite = CompanyUser.objects.get(
                id=invite_id,
                company=request.user.company,
                invited_at__isnull=False,
                joined_at__isnull=True
            )
        except CompanyUser.DoesNotExist:
            return Response(
                {'error': 'Invite not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Delete the pending invite and user if they haven't joined
        user = invite.user
        invite.delete()

        # If user was created for this invite and has no other company memberships, delete them
        if user.status == 'pending' and not user.company_memberships.exists():
            user.delete()

        return Response({'message': 'Invitation cancelled'})


class TransferCompanyOwnershipView(APIView):
    """Transfer company ownership to another member."""

    permission_classes = [IsAuthenticated, IsEmployer, HasTeamManagement]

    def post(self, request, member_id):
        # Only current owner can transfer ownership
        current_membership = CompanyUser.objects.filter(
            company=request.user.company,
            user=request.user,
            role='owner'
        ).first()

        if not current_membership:
            return Response(
                {'error': 'Only the owner can transfer ownership'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get target member
        try:
            target_membership = CompanyUser.objects.get(
                id=member_id,
                company=request.user.company,
                joined_at__isnull=False  # Must be active member
            )
        except CompanyUser.DoesNotExist:
            return Response(
                {'error': 'Member not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Can't transfer to yourself
        if target_membership.user_id == request.user.id:
            return Response(
                {'error': 'Cannot transfer ownership to yourself'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            # Demote current owner to admin
            current_membership.role = 'admin'
            current_membership.save(update_fields=['role'])

            # Promote target to owner
            target_membership.role = 'owner'
            target_membership.save(update_fields=['role'])

        return Response({
            'message': f'Ownership transferred to {target_membership.user.get_full_name()}'
        })


# Admin views
class AdminCompanyViewSet(viewsets.ModelViewSet):
    """Admin company management."""

    queryset = Company.objects.all()
    serializer_class = AdminCompanySerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_fields = ['status', 'billing_status', 'risk_level', 'industry']
    search_fields = ['name', 'domain', 'description']
    ordering_fields = ['created_at', 'name', 'job_credits_remaining']
    ordering = ['-created_at']

    def get_queryset(self):
        from apps.billing.models import Entitlement
        from django.db.models import Sum, Q, Value, IntegerField
        from django.db.models.functions import Coalesce, Greatest
        from django.utils import timezone

        qs = super().get_queryset()
        active_entitlements = Entitlement.objects.filter(
            Q(expires_at__gt=timezone.now()) | Q(expires_at__isnull=True),
            company=models.OuterRef('pk'),
        )
        qs = qs.annotate(
            _credits_total=Coalesce(
                models.Subquery(
                    active_entitlements.values('company').annotate(
                        s=Sum('credits_total')
                    ).values('s')[:1]
                ), Value(0), output_field=IntegerField(),
            ),
            _credits_used=Coalesce(
                models.Subquery(
                    active_entitlements.values('company').annotate(
                        s=Sum('credits_used')
                    ).values('s')[:1]
                ), Value(0), output_field=IntegerField(),
            ),
            job_credits_remaining=Greatest(
                models.F('_credits_total') - models.F('_credits_used'),
                Value(0),
                output_field=IntegerField(),
            ),
        )
        return qs

    def _assign_owner(self, company, owner_id):
        """Assign a user as the owner of a company (like WordPress author)."""
        from apps.users.models import User

        user = User.objects.get(id=owner_id)

        # Remove existing owner(s) — a company should have exactly one owner
        CompanyUser.objects.filter(company=company, role='owner').delete()

        # Create or update the membership
        CompanyUser.objects.update_or_create(
            company=company,
            user=user,
            defaults={'role': 'owner'},
        )

        # Link the user to this company
        if user.company_id != company.id:
            user.company = company
            if user.role != 'employer':
                user.role = 'employer'
            user.save(update_fields=['company', 'role'])

    def perform_create(self, serializer):
        owner_id = serializer.validated_data.pop('owner_id', None)
        send_invite = self.request.data.get('send_invite', False)
        with transaction.atomic():
            company = serializer.save()
            # Every company must have an owner — default to the admin creating it
            effective_owner_id = owner_id or self.request.user.id
            self._assign_owner(company, effective_owner_id)

        # Send password setup email to the owner (outside transaction)
        if send_invite and effective_owner_id != self.request.user.id:
            self._send_setup_email(effective_owner_id, company)

    def _send_setup_email(self, user_id, company):
        """Send a password setup email to the company owner."""
        import secrets
        from datetime import timedelta
        from django.utils import timezone
        from apps.users.models import User, PasswordResetToken
        from django.conf import settings as django_settings

        try:
            user = User.objects.get(id=user_id)
            token = secrets.token_urlsafe(32)
            PasswordResetToken.objects.create(
                user=user,
                token=token,
                expires_at=timezone.now() + timedelta(hours=72),
            )
            from apps.notifications.tasks import send_email as send_email_task
            reset_url = f"{django_settings.FRONTEND_URL}/reset-password?token={token}"
            send_email_task.delay(
                to_email=user.email,
                subject=f'You\'ve been invited to manage {company.name} on Orion',
                template='password_reset',
                context={
                    'name': user.first_name or 'there',
                    'reset_url': reset_url,
                },
                user_id=user.id,
            )
        except Exception:
            pass  # Don't fail company creation if email fails

    def perform_update(self, serializer):
        owner_id = serializer.validated_data.pop('owner_id', None)
        with transaction.atomic():
            company = serializer.save()
            if owner_id is not None:
                self._assign_owner(company, owner_id)

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """Verify a company."""
        company = self.get_object()
        company.status = 'verified'
        company.save(update_fields=['status'])
        serializer = self.get_serializer(company)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def suspend(self, request, pk=None):
        """Suspend a company."""
        company = self.get_object()
        company.status = 'suspended'
        company.billing_status = 'suspended'
        company.save(update_fields=['status', 'billing_status'])
        serializer = self.get_serializer(company)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a company."""
        company = self.get_object()
        company.billing_status = 'active'
        company.save(update_fields=['billing_status'])
        serializer = self.get_serializer(company)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reactivate(self, request, pk=None):
        """Reactivate a suspended company."""
        company = self.get_object()
        company.status = 'verified'
        company.billing_status = 'active'
        company.save(update_fields=['status', 'billing_status'])
        serializer = self.get_serializer(company)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='risk-level')
    def risk_level(self, request, pk=None):
        """Update company risk level."""
        company = self.get_object()
        new_level = request.data.get('risk_level')
        if new_level not in ('low', 'medium', 'high'):
            return Response({'error': 'Invalid risk level'}, status=status.HTTP_400_BAD_REQUEST)
        company.risk_level = new_level
        company.save(update_fields=['risk_level'])
        serializer = self.get_serializer(company)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def contact(self, request, pk=None):
        """Send a message to a company."""
        company = self.get_object()
        subject = request.data.get('subject', '')
        message = request.data.get('message', '')
        if not subject or not message:
            return Response(
                {'error': 'Subject and message are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        # TODO: send_mail(subject, message, ..., [company.contact_email])
        return Response({'message': 'Message sent successfully'})

    @action(detail=True, methods=['post'], url_path='billing/plan')
    def change_plan(self, request, pk=None):
        """Change company subscription plan."""
        company = self.get_object()
        plan_id = request.data.get('plan_id')
        payment_method = request.data.get('payment_method', '')
        notes = request.data.get('notes', '')
        if not plan_id:
            return Response({'error': 'plan_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        from apps.moderation.models import JobPackage
        package = JobPackage.objects.filter(id=plan_id, is_active=True).first()
        if not package:
            return Response({'error': 'Invalid package'}, status=status.HTTP_400_BAD_REQUEST)

        from apps.billing.models import Entitlement, EntitlementLedger
        from apps.billing.services import InvoiceService
        from apps.billing.tasks import generate_invoice_pdf_task

        with transaction.atomic():
            entitlement = Entitlement.objects.create(
                company=company,
                package=package,
                credits_total=package.credits,
                featured_credits_total=package.featured_credits,
                social_credits_total=package.social_credits,
                post_duration_days=package.post_duration_days,
                source='admin_grant',
                source_reference=f'{request.user.email} | {payment_method} | Plan change: {notes}',
            )

            EntitlementLedger.objects.create(
                entitlement=entitlement,
                change=package.credits,
                reason='plan_change',
                admin=request.user,
                notes=notes,
            )

            invoice = InvoiceService.create_plan_change_invoice(
                company=company,
                package=package,
                admin_user=request.user,
                notes=notes,
            )

        try:
            InvoiceService.generate_and_store_pdf(invoice.id)
        except Exception:
            logger.exception('Failed to generate PDF synchronously for invoice %s', invoice.id)
            try:
                generate_invoice_pdf_task.delay(invoice.id)
            except Exception:
                logger.exception('Failed to enqueue PDF generation for invoice %s', invoice.id)

        return Response({'message': f'Plan changed to {package.name}'})

    @action(detail=True, methods=['post'], url_path='billing/credits')
    def add_credits(self, request, pk=None):
        """Add credits to a company.

        Supports two workflows based on payment_method:
        - complimentary: free grant with optional post_duration_days override
        - package-based (stored_card, etransfer, invoice, phone_payment): requires
          package_id, optional coupon_code, creates proper invoice with real pricing
        """
        from apps.billing.admin_credits import process_admin_add_credits
        company = self.get_object()
        return process_admin_add_credits(request, company=company)

    @action(detail=True, methods=['post'], url_path='billing/credits/adjust')
    def adjust_credits(self, request, pk=None):
        """Remove credits from a company entitlement (admin adjustment)."""
        company = self.get_object()
        entitlement_id = request.data.get('entitlement_id')
        adjustment = request.data.get('adjustment')
        credit_type = request.data.get('credit_type', 'job')
        reason = request.data.get('reason', '')

        if not entitlement_id:
            return Response({'error': 'entitlement_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        if not reason or not reason.strip():
            return Response({'error': 'reason is required for credit adjustments'}, status=status.HTTP_400_BAD_REQUEST)
        if not adjustment or int(adjustment) >= 0:
            return Response({'error': 'adjustment must be a negative number'}, status=status.HTTP_400_BAD_REQUEST)

        if credit_type not in ('job', 'featured', 'social'):
            return Response({'error': 'credit_type must be job, featured, or social'}, status=status.HTTP_400_BAD_REQUEST)

        from apps.billing.models import Entitlement, EntitlementLedger

        adjustment_int = abs(int(adjustment))

        with transaction.atomic():
            entitlement = (
                Entitlement.objects
                .select_for_update()
                .filter(id=entitlement_id, company=company)
                .first()
            )

            if not entitlement:
                return Response({'error': 'Entitlement not found'}, status=status.HTTP_404_NOT_FOUND)

            # Determine available credits based on type
            if credit_type == 'featured':
                available = entitlement.featured_credits_total - entitlement.featured_credits_used
            elif credit_type == 'social':
                available = entitlement.social_credits_total - entitlement.social_credits_used
            else:
                available = entitlement.credits_total - entitlement.credits_used

            if adjustment_int > available:
                return Response(
                    {'error': f'Cannot remove {adjustment_int} credits — only {available} available'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Model removal as incrementing credits_used
            if credit_type == 'featured':
                entitlement.featured_credits_used += adjustment_int
            elif credit_type == 'social':
                entitlement.social_credits_used += adjustment_int
            else:
                entitlement.credits_used += adjustment_int

            entitlement.save()

            EntitlementLedger.objects.create(
                entitlement=entitlement,
                change=-adjustment_int,
                reason='admin_adjustment',
                admin=request.user,
                notes=reason,
            )

        return Response({'message': f'{adjustment_int} {credit_type} credits removed from {company.name}'})

    @action(detail=True, methods=['get'])
    def entitlements(self, request, pk=None):
        """List all entitlements for a company."""
        company = self.get_object()

        from apps.billing.models import Entitlement
        from django.utils import timezone

        qs = Entitlement.objects.filter(company=company).order_by('-created_at')
        now = timezone.now()

        results = []
        for ent in qs:
            # Determine credit_type from which *_total field is non-zero
            if ent.featured_credits_total > 0:
                credit_type = 'featured'
                added = ent.featured_credits_total
                used = ent.featured_credits_used
                remaining = ent.featured_credits_total - ent.featured_credits_used
            elif ent.social_credits_total > 0:
                credit_type = 'social'
                added = ent.social_credits_total
                used = ent.social_credits_used
                remaining = ent.social_credits_total - ent.social_credits_used
            else:
                credit_type = 'job'
                added = ent.credits_total
                used = ent.credits_used
                remaining = ent.credits_total - ent.credits_used

            # Parse source_reference: "admin_email | payment_method | reason"
            parts = [p.strip() for p in ent.source_reference.split('|')]
            admin_email = parts[0] if len(parts) >= 1 else ''
            payment_method_val = parts[1] if len(parts) >= 2 else ''
            reason_val = parts[2] if len(parts) >= 3 else ''

            # Fallback for old format "admin_email: reason"
            if len(parts) == 1 and ':' in parts[0]:
                old_parts = parts[0].split(':', 1)
                admin_email = old_parts[0].strip()
                reason_val = old_parts[1].strip() if len(old_parts) > 1 else ''

            results.append({
                'id': ent.id,
                'credit_type': credit_type,
                'credits_added': added,
                'credits_used': used,
                'credits_remaining': remaining,
                'source': ent.source,
                'payment_method': payment_method_val,
                'admin_email': admin_email,
                'reason': reason_val,
                'expires_at': ent.expires_at.isoformat() if ent.expires_at else None,
                'created_at': ent.created_at.isoformat(),
            })

        return Response(results)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Return company statistics summary."""
        from apps.billing.models import Entitlement
        from django.db.models import Sum, Q
        from django.utils import timezone

        total = Company.objects.count()
        verified = Company.objects.filter(status='verified').count()
        pending = Company.objects.filter(status='pending').count()
        high_risk = Company.objects.filter(risk_level='high').count()

        # Count companies with low job credits (remaining <= 2)
        low_credits_count = 0
        for company in Company.objects.all().iterator():
            result = Entitlement.objects.filter(
                Q(expires_at__gt=timezone.now()) | Q(expires_at__isnull=True),
                company=company,
            ).aggregate(
                total_credits=Sum('credits_total'),
                used_credits=Sum('credits_used'),
            )
            remaining = max((result['total_credits'] or 0) - (result['used_credits'] or 0), 0)
            if remaining <= 2:
                low_credits_count += 1

        data = {
            'total': total,
            'verified': verified,
            'pending': pending,
            'high_risk': high_risk,
            'low_credits': low_credits_count,
        }

        serializer = AdminCompanyStatsSerializer(data)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def billing(self, request, pk=None):
        """Get company billing summary."""
        company = self.get_object()

        from apps.billing.models import Subscription, Invoice, PaymentMethod

        # Active subscription → plan name + next billing date
        sub = Subscription.objects.filter(
            company=company, status='active'
        ).select_related('package').first()

        plan = sub.package.name if sub and sub.package else 'No Plan'
        next_billing_date = sub.current_period_end.isoformat() if sub else None

        # Monthly spend — sum of paid invoices in last 30 days
        from django.utils import timezone
        from django.db.models import Sum
        thirty_days_ago = timezone.now() - timezone.timedelta(days=30)
        monthly_spend = Invoice.objects.filter(
            company=company, status='paid', paid_at__gte=thirty_days_ago
        ).aggregate(total=Sum('amount'))['total'] or 0

        # Default payment method
        pm = PaymentMethod.objects.filter(company=company, is_default=True).first()
        payment_method = f'{pm.card_brand} •••• {pm.card_last4}' if pm else None

        return Response({
            'plan': plan,
            'monthly_spend': float(monthly_spend),
            'next_billing_date': next_billing_date,
            'payment_method': payment_method,
        })

    @action(detail=True, methods=['post'], url_path='team-management')
    def team_management(self, request, pk=None):
        """Toggle team management override for a company."""
        company = self.get_object()
        enabled = request.data.get('enabled')
        if enabled is None:
            return Response(
                {'error': 'enabled field is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        company.team_management_enabled = bool(enabled)
        company.save(update_fields=['team_management_enabled'])
        return Response({
            'team_management_enabled': company.team_management_enabled,
            'message': f'Team management {"enabled" if company.team_management_enabled else "disabled"}'
        })

    @action(detail=False, methods=['get'])
    def export(self, request):
        """Export companies as CSV."""
        import csv
        from django.http import HttpResponse as DjangoHttpResponse

        qs = self.filter_queryset(self.get_queryset())
        response = DjangoHttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="companies-export.csv"'

        writer = csv.writer(response)
        writer.writerow(['ID', 'Name', 'Domain', 'Status', 'Industry', 'Size', 'Created At', 'Billing Status', 'Risk Level'])

        for company in qs:
            writer.writerow([
                company.id, company.name, getattr(company, 'domain', ''),
                company.status, getattr(company, 'industry', ''),
                getattr(company, 'company_size', ''),
                company.created_at, getattr(company, 'billing_status', ''),
                getattr(company, 'risk_level', '')
            ])

        return response


# Agency views
class AgencyProfileView(generics.RetrieveUpdateAPIView):
    """Get/update agency profile."""

    serializer_class = AgencyDetailSerializer
    permission_classes = [IsAuthenticated, IsAgency]

    def get_object(self):
        return self.request.user.agency


class AgencyMembersView(generics.ListCreateAPIView):
    """List/add agency members."""

    serializer_class = AgencyUserSerializer
    permission_classes = [IsAuthenticated, IsAgency]

    def get_queryset(self):
        return AgencyUser.objects.filter(
            agency=self.request.user.agency
        ).select_related('user')

    def perform_create(self, serializer):
        serializer.save(agency=self.request.user.agency)


class AgencyClientsView(generics.ListCreateAPIView):
    """List/add agency clients.

    POST accepts two payload shapes:
    - ``{ "name": "...", "website": "...", "industry": "..." }``
      Creates a new Company record and links it as a client.
    - ``{ "company": <id> }``
      Links an existing Company (backward-compatible).
    """

    serializer_class = AgencyClientSerializer
    permission_classes = [IsAuthenticated, IsAgency]

    def get_queryset(self):
        return AgencyClient.objects.filter(
            agency=self.request.user.agency
        ).select_related('company')

    def create(self, request, *args, **kwargs):
        if 'name' in request.data:
            agency = request.user.agency
            serializer = CreateAgencyClientByNameSerializer(
                data=request.data,
                context={'agency': agency},
            )
            serializer.is_valid(raise_exception=True)
            data = serializer.validated_data

            with transaction.atomic():
                company = Company.objects.create(
                    name=data['name'],
                    website=data.get('website') or '',
                    industry=data.get('industry') or '',
                    status='pending',
                    represented_by_agency=agency,
                )
                client = AgencyClient.objects.create(
                    agency=agency,
                    company=company,
                )

            out = AgencyClientSerializer(client).data
            return Response(out, status=status.HTTP_201_CREATED)

        # Backward-compatible: link existing company by ID
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(agency=self.request.user.agency)


class AgencyClientDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get/update/remove agency client."""

    serializer_class = AgencyClientSerializer
    permission_classes = [IsAuthenticated, IsAgency]

    def get_queryset(self):
        return AgencyClient.objects.filter(agency=self.request.user.agency)


class InviteAgencyMemberView(APIView):
    """Invite a user to the agency."""

    permission_classes = [IsAuthenticated, IsAgency]

    def post(self, request):
        serializer = AgencyUserInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        role = serializer.validated_data['role']
        first_name = serializer.validated_data.get('first_name', '')
        last_name = serializer.validated_data.get('last_name', '')

        from apps.users.models import User

        user = User.objects.filter(email=email).first()

        if user:
            # Check if already a member
            if AgencyUser.objects.filter(agency=request.user.agency, user=user).exists():
                return Response(
                    {'error': 'User is already a member'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Add as member
            AgencyUser.objects.create(
                agency=request.user.agency,
                user=user,
                role=role
            )
        else:
            # Create pending user account
            user = User.objects.create(
                email=email,
                first_name=first_name,
                last_name=last_name,
                role='agency',
                status='pending',
                agency=request.user.agency
            )

            # Add as member
            AgencyUser.objects.create(
                agency=request.user.agency,
                user=user,
                role=role
            )

            # TODO: Send invitation email

        return Response({'message': 'Invitation sent'})


class ResendAgencyInviteView(APIView):
    """Resend an agency invitation."""

    permission_classes = [IsAuthenticated, IsAgency]

    def post(self, request, member_id):
        try:
            member = AgencyUser.objects.get(
                id=member_id,
                agency=request.user.agency
            )
        except AgencyUser.DoesNotExist:
            return Response(
                {'error': 'Member not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if user is pending
        if member.user.status != 'pending':
            return Response(
                {'error': 'User has already joined'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Resend invitation email
        import secrets
        from datetime import timedelta
        from django.conf import settings as django_settings
        from django.utils import timezone as tz
        from apps.users.models import PasswordResetToken
        from apps.notifications.tasks import send_email as send_email_task

        try:
            token = secrets.token_urlsafe(32)
            PasswordResetToken.objects.create(
                user=member.user,
                token=token,
                expires_at=tz.now() + timedelta(hours=72),
            )
            reset_url = f"{django_settings.FRONTEND_URL}/reset-password?token={token}"
            send_email_task.delay(
                to_email=member.user.email,
                subject=f'Reminder: You\'ve been invited to join {request.user.agency.name} on Orion',
                template='password_reset',
                context={
                    'name': member.user.first_name or 'there',
                    'reset_url': reset_url,
                },
                user_id=member.user.id,
            )
        except Exception:
            logger.exception("Failed to resend invitation email to %s", member.user.email)
            return Response(
                {'error': 'Failed to resend invitation email'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response({'message': 'Invitation resent'})


class AdminAgencyViewSet(viewsets.ModelViewSet):
    """Admin agency management."""

    queryset = Agency.objects.all()
    serializer_class = AdminAgencySerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_fields = ['status', 'billing_status', 'billing_model', 'risk_level']
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'name', 'job_credits_remaining']
    ordering = ['-created_at']

    def get_queryset(self):
        from apps.billing.models import Entitlement
        from django.db.models import Sum, Q, Value, IntegerField
        from django.db.models.functions import Coalesce, Greatest
        from django.utils import timezone

        qs = super().get_queryset()
        active_entitlements = Entitlement.objects.filter(
            Q(expires_at__gt=timezone.now()) | Q(expires_at__isnull=True),
            agency=models.OuterRef('pk'),
        )
        qs = qs.annotate(
            _credits_total=Coalesce(
                models.Subquery(
                    active_entitlements.values('agency').annotate(
                        s=Sum('credits_total')
                    ).values('s')[:1]
                ), Value(0), output_field=IntegerField(),
            ),
            _credits_used=Coalesce(
                models.Subquery(
                    active_entitlements.values('agency').annotate(
                        s=Sum('credits_used')
                    ).values('s')[:1]
                ), Value(0), output_field=IntegerField(),
            ),
            job_credits_remaining=Greatest(
                models.F('_credits_total') - models.F('_credits_used'),
                Value(0),
                output_field=IntegerField(),
            ),
        )
        return qs

    def get_serializer_class(self):
        if self.action in ('retrieve', 'verify', 'suspend', 'reactivate',
                           'risk_level', 'billing_model_change'):
            return AdminAgencyDetailSerializer
        return AdminAgencySerializer

    def _assign_owner(self, agency, owner_id):
        """Assign a user as the owner of an agency."""
        from apps.users.models import User

        user = User.objects.get(id=owner_id)

        # Remove existing owner(s) — an agency should have exactly one owner
        AgencyUser.objects.filter(agency=agency, role='owner').delete()

        # Create or update the membership
        AgencyUser.objects.update_or_create(
            agency=agency,
            user=user,
            defaults={'role': 'owner'},
        )

        # Link the user to this agency
        if user.agency_id != agency.id:
            user.agency = agency
            if user.role != 'agency':
                user.role = 'agency'
            user.save(update_fields=['agency', 'role'])

    def perform_create(self, serializer):
        owner_id = serializer.validated_data.pop('owner_id', None)
        send_invite = self.request.data.get('send_invite', False)
        with transaction.atomic():
            agency = serializer.save()
            # Every agency must have an owner — default to the admin creating it
            effective_owner_id = owner_id or self.request.user.id
            self._assign_owner(agency, effective_owner_id)

        # Send password setup email to the owner (outside transaction)
        if send_invite and effective_owner_id != self.request.user.id:
            self._send_setup_email(effective_owner_id, agency)

    def _send_setup_email(self, user_id, agency):
        """Send a password setup email to the agency owner."""
        import secrets
        from datetime import timedelta
        from django.utils import timezone
        from apps.users.models import User, PasswordResetToken
        from django.conf import settings as django_settings

        try:
            user = User.objects.get(id=user_id)
            token = secrets.token_urlsafe(32)
            PasswordResetToken.objects.create(
                user=user,
                token=token,
                expires_at=timezone.now() + timedelta(hours=72),
            )
            from apps.notifications.tasks import send_email as send_email_task
            reset_url = f"{django_settings.FRONTEND_URL}/reset-password?token={token}"
            send_email_task.delay(
                to_email=user.email,
                subject=f'You\'ve been invited to manage {agency.name} on Orion',
                template='password_reset',
                context={
                    'name': user.first_name or 'there',
                    'reset_url': reset_url,
                },
                user_id=user.id,
            )
        except Exception:
            pass  # Don't fail agency creation if email fails

    def perform_update(self, serializer):
        owner_id = serializer.validated_data.pop('owner_id', None)
        with transaction.atomic():
            agency = serializer.save()
            if owner_id is not None:
                self._assign_owner(agency, owner_id)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Return agency statistics summary."""
        from apps.billing.models import Entitlement
        from django.db.models import Sum, Q
        from django.utils import timezone

        qs = Agency.objects.all()

        # Count agencies with low job credits (remaining <= 2)
        low_credits_count = 0
        for agency in qs.iterator():
            result = Entitlement.objects.filter(
                Q(expires_at__gt=timezone.now()) | Q(expires_at__isnull=True),
                agency=agency,
            ).aggregate(
                total=Sum('credits_total'),
                used=Sum('credits_used'),
            )
            remaining = max((result['total'] or 0) - (result['used'] or 0), 0)
            if remaining <= 2:
                low_credits_count += 1

        data = {
            'total_agencies': qs.count(),
            'verified_agencies': qs.filter(status='verified').count(),
            'high_risk_agencies': qs.filter(risk_level='high').count(),
            'low_credits': low_credits_count,
            'monthly_volume': 0,
        }
        return Response(data)

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """Verify an agency."""
        agency = self.get_object()
        agency.status = 'verified'
        agency.save(update_fields=['status'])
        serializer = self.get_serializer(agency)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='risk-level')
    def risk_level(self, request, pk=None):
        """Change agency risk level."""
        agency = self.get_object()
        new_level = request.data.get('risk_level')
        if new_level not in ('low', 'medium', 'high'):
            return Response({'error': 'Invalid risk level'}, status=status.HTTP_400_BAD_REQUEST)
        agency.risk_level = new_level
        agency.save(update_fields=['risk_level'])
        serializer = self.get_serializer(agency)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def suspend(self, request, pk=None):
        """Suspend an agency."""
        agency = self.get_object()
        agency.billing_status = 'suspended'
        agency.save(update_fields=['billing_status'])
        serializer = self.get_serializer(agency)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reactivate(self, request, pk=None):
        """Reactivate a suspended agency."""
        agency = self.get_object()
        agency.billing_status = 'active'
        agency.save(update_fields=['billing_status'])
        serializer = self.get_serializer(agency)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='billing-model')
    def billing_model_change(self, request, pk=None):
        """Change agency billing model."""
        agency = self.get_object()
        new_model = request.data.get('billing_model')
        if new_model not in ('agency_pays', 'company_pays'):
            return Response({'error': 'Invalid billing model'}, status=status.HTTP_400_BAD_REQUEST)
        agency.billing_model = new_model
        agency.save(update_fields=['billing_model'])
        serializer = self.get_serializer(agency)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def billing(self, request, pk=None):
        """Get agency billing summary."""
        agency = self.get_object()

        from apps.billing.models import Subscription, Invoice, PaymentMethod

        sub = Subscription.objects.filter(
            agency=agency, status='active'
        ).select_related('package').first()

        plan = sub.package.name if sub and sub.package else 'No Plan'
        next_billing_date = sub.current_period_end.isoformat() if sub else None

        from django.utils import timezone
        from datetime import timedelta
        from django.db.models import Sum
        thirty_days_ago = timezone.now() - timedelta(days=30)
        monthly_spend = Invoice.objects.filter(
            agency=agency, status='paid', paid_at__gte=thirty_days_ago
        ).aggregate(total=Sum('amount'))['total'] or 0

        pm = PaymentMethod.objects.filter(agency=agency, is_default=True).first()
        payment_method = f'{pm.card_brand} •••• {pm.card_last4}' if pm else None

        return Response({
            'plan': plan,
            'monthly_spend': float(monthly_spend),
            'next_billing_date': next_billing_date,
            'payment_method': payment_method,
        })

    @action(detail=True, methods=['post'], url_path='billing/credits')
    def add_credits(self, request, pk=None):
        """Add credits to an agency."""
        from apps.billing.admin_credits import process_admin_add_credits
        agency = self.get_object()
        return process_admin_add_credits(request, agency=agency)

    @action(detail=True, methods=['post'], url_path='billing/credits/adjust')
    def adjust_credits(self, request, pk=None):
        """Remove credits from an agency entitlement (admin adjustment)."""
        agency = self.get_object()
        entitlement_id = request.data.get('entitlement_id')
        adjustment = request.data.get('adjustment')
        credit_type = request.data.get('credit_type', 'job')
        reason = request.data.get('reason', '')

        if not entitlement_id:
            return Response({'error': 'entitlement_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        if not reason or not reason.strip():
            return Response({'error': 'reason is required for credit adjustments'}, status=status.HTTP_400_BAD_REQUEST)
        if not adjustment or int(adjustment) >= 0:
            return Response({'error': 'adjustment must be a negative number'}, status=status.HTTP_400_BAD_REQUEST)

        if credit_type not in ('job', 'featured', 'social'):
            return Response({'error': 'credit_type must be job, featured, or social'}, status=status.HTTP_400_BAD_REQUEST)

        from apps.billing.models import Entitlement, EntitlementLedger

        adjustment_int = abs(int(adjustment))

        with transaction.atomic():
            entitlement = (
                Entitlement.objects
                .select_for_update()
                .filter(id=entitlement_id, agency=agency)
                .first()
            )

            if not entitlement:
                return Response({'error': 'Entitlement not found'}, status=status.HTTP_404_NOT_FOUND)

            if credit_type == 'featured':
                available = entitlement.featured_credits_total - entitlement.featured_credits_used
            elif credit_type == 'social':
                available = entitlement.social_credits_total - entitlement.social_credits_used
            else:
                available = entitlement.credits_total - entitlement.credits_used

            if adjustment_int > available:
                return Response(
                    {'error': f'Cannot remove {adjustment_int} credits — only {available} available'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if credit_type == 'featured':
                entitlement.featured_credits_used += adjustment_int
            elif credit_type == 'social':
                entitlement.social_credits_used += adjustment_int
            else:
                entitlement.credits_used += adjustment_int

            entitlement.save()

            EntitlementLedger.objects.create(
                entitlement=entitlement,
                change=-adjustment_int,
                reason='admin_adjustment',
                admin=request.user,
                notes=reason,
            )

        return Response({'message': f'{adjustment_int} {credit_type} credits removed from {agency.name}'})

    @action(detail=True, methods=['get'])
    def entitlements(self, request, pk=None):
        """List all entitlements for an agency."""
        agency = self.get_object()

        from apps.billing.models import Entitlement
        from django.utils import timezone

        qs = Entitlement.objects.filter(agency=agency).order_by('-created_at')

        results = []
        for ent in qs:
            if ent.featured_credits_total > 0:
                credit_type = 'featured'
                added = ent.featured_credits_total
                used = ent.featured_credits_used
                remaining = ent.featured_credits_total - ent.featured_credits_used
            elif ent.social_credits_total > 0:
                credit_type = 'social'
                added = ent.social_credits_total
                used = ent.social_credits_used
                remaining = ent.social_credits_total - ent.social_credits_used
            else:
                credit_type = 'job'
                added = ent.credits_total
                used = ent.credits_used
                remaining = ent.credits_total - ent.credits_used

            parts = [p.strip() for p in (ent.source_reference or '').split('|')]
            admin_email = parts[0] if len(parts) >= 1 else ''
            payment_method_val = parts[1] if len(parts) >= 2 else ''
            reason_val = parts[2] if len(parts) >= 3 else ''

            if len(parts) == 1 and ':' in parts[0]:
                old_parts = parts[0].split(':', 1)
                admin_email = old_parts[0].strip()
                reason_val = old_parts[1].strip() if len(old_parts) > 1 else ''

            results.append({
                'id': ent.id,
                'credit_type': credit_type,
                'credits_added': added,
                'credits_used': used,
                'credits_remaining': remaining,
                'source': ent.source,
                'payment_method': payment_method_val,
                'admin_email': admin_email,
                'reason': reason_val,
                'expires_at': ent.expires_at.isoformat() if ent.expires_at else None,
                'created_at': ent.created_at.isoformat(),
            })

        return Response(results)

    @action(detail=True, methods=['post'])
    def contact(self, request, pk=None):
        """Send a message to an agency."""
        agency = self.get_object()
        subject = request.data.get('subject', '')
        message = request.data.get('message', '')
        if not subject or not message:
            return Response(
                {'error': 'Subject and message are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        # TODO: send_mail(subject, message, ..., [agency.contact_email])
        return Response({'message': 'Message sent successfully'})

    @action(detail=True, methods=['post'], url_path='team-management')
    def team_management(self, request, pk=None):
        """Toggle team management override for an agency."""
        agency = self.get_object()
        enabled = request.data.get('enabled')
        if enabled is None:
            return Response(
                {'error': 'enabled field is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        agency.team_management_enabled = bool(enabled)
        agency.save(update_fields=['team_management_enabled'])
        return Response({
            'team_management_enabled': agency.team_management_enabled,
            'message': f'Team management {"enabled" if agency.team_management_enabled else "disabled"}'
        })

    @action(detail=False, methods=['get'])
    def export(self, request):
        """Export agencies as CSV."""
        import csv
        from django.http import HttpResponse as DjangoHttpResponse

        qs = self.filter_queryset(self.get_queryset())
        response = DjangoHttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="agencies-export.csv"'

        writer = csv.writer(response)
        writer.writerow(['ID', 'Name', 'Status', 'Billing Model', 'Billing Status', 'Risk Level', 'Created At'])

        for agency in qs:
            writer.writerow([
                agency.id, agency.name, agency.status,
                getattr(agency, 'billing_model', ''),
                getattr(agency, 'billing_status', ''),
                getattr(agency, 'risk_level', ''),
                agency.created_at
            ])

        return response


# Company Settings Views
class CompanySettingsView(APIView):
    """Get company settings (job defaults, notifications, social connections)."""

    permission_classes = [IsAuthenticated, IsEmployer]

    def get(self, request):
        company = request.user.company
        settings, _ = CompanySettings.objects.get_or_create(
            company=company,
            defaults={
                'job_defaults': CompanySettings.get_default_job_defaults(),
                'notification_preferences': CompanySettings.get_default_notification_preferences(),
            }
        )

        # Get social connections from social app
        from apps.social.models import SocialAccount
        social_connections = []
        for platform in ['linkedin', 'twitter', 'facebook', 'instagram']:
            conn = SocialAccount.objects.filter(
                company=company,
                platform=platform
            ).first()
            social_connections.append({
                'platform': platform,
                'connected': conn is not None and conn.is_active,
                'account_name': conn.account_name if conn else None,
                'default_post': False,  # TODO: add auto_post field to SocialAccount model
            })

        data = {
            'job_defaults': settings.job_defaults or CompanySettings.get_default_job_defaults(),
            'notifications': settings.notification_preferences or CompanySettings.get_default_notification_preferences(),
            'social_connections': social_connections,
        }

        serializer = CompanySettingsSerializer(data)
        return Response(serializer.data)


class CompanyJobDefaultsView(APIView):
    """Update company job posting defaults."""

    permission_classes = [IsAuthenticated, IsEmployer, IsCompanyOwnerOrAdmin]

    def patch(self, request):
        company = request.user.company
        settings, _ = CompanySettings.objects.get_or_create(
            company=company,
            defaults={
                'job_defaults': CompanySettings.get_default_job_defaults(),
                'notification_preferences': CompanySettings.get_default_notification_preferences(),
            }
        )

        serializer = CompanyJobDefaultsSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        # Update job_defaults JSON field
        current_defaults = settings.job_defaults or CompanySettings.get_default_job_defaults()
        current_defaults.update(serializer.validated_data)
        settings.job_defaults = current_defaults
        settings.save(update_fields=['job_defaults', 'updated_at'])

        return Response({'message': 'Job defaults updated', 'job_defaults': settings.job_defaults})


class CompanyNotificationsView(APIView):
    """Update company notification preferences."""

    permission_classes = [IsAuthenticated, IsEmployer, IsCompanyOwnerOrAdmin]

    def patch(self, request):
        company = request.user.company
        settings, _ = CompanySettings.objects.get_or_create(
            company=company,
            defaults={
                'job_defaults': CompanySettings.get_default_job_defaults(),
                'notification_preferences': CompanySettings.get_default_notification_preferences(),
            }
        )

        serializer = CompanyNotificationPreferencesSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        # Update notification_preferences JSON field
        current_prefs = settings.notification_preferences or CompanySettings.get_default_notification_preferences()
        current_prefs.update(serializer.validated_data)
        settings.notification_preferences = current_prefs
        settings.save(update_fields=['notification_preferences', 'updated_at'])

        return Response({'message': 'Notification preferences updated', 'notifications': settings.notification_preferences})


# ============================================================================
# COMPANY SOCIAL CONNECT/DISCONNECT
# ============================================================================

class CompanySocialConnectView(APIView):
    """Connect a social platform for the company."""

    permission_classes = [IsAuthenticated, IsEmployer]

    def post(self, request, platform):
        from apps.social.models import SocialAccount

        valid_platforms = ['linkedin', 'twitter', 'facebook', 'instagram']
        if platform not in valid_platforms:
            return Response(
                {'error': f'Invalid platform. Choose from: {", ".join(valid_platforms)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        company = request.user.company
        existing = SocialAccount.objects.filter(company=company, platform=platform, is_active=True).first()
        if existing:
            return Response({'error': f'{platform} is already connected'}, status=status.HTTP_400_BAD_REQUEST)

        account = SocialAccount.objects.create(
            company=company,
            platform=platform,
            account_name=request.data.get('account_name', f'{platform.title()} Account'),
            account_id=request.data.get('account_id', ''),
            access_token=request.data.get('access_token', ''),
            refresh_token=request.data.get('refresh_token', ''),
            is_active=True,
        )

        return Response({
            'message': f'{platform} connected successfully',
            'id': account.id,
            'platform': platform,
            'account_name': account.account_name,
        }, status=status.HTTP_201_CREATED)


class CompanySocialDisconnectView(APIView):
    """Disconnect a social platform for the company."""

    permission_classes = [IsAuthenticated, IsEmployer]

    def post(self, request, platform):
        from apps.social.models import SocialAccount

        company = request.user.company
        account = SocialAccount.objects.filter(company=company, platform=platform, is_active=True).first()
        if not account:
            return Response({'error': f'{platform} is not connected'}, status=status.HTTP_404_NOT_FOUND)

        account.is_active = False
        account.save(update_fields=['is_active', 'updated_at'])
        return Response({'message': f'{platform} disconnected successfully'})


class CompanySocialDefaultView(APIView):
    """Update default posting settings for a social platform."""

    permission_classes = [IsAuthenticated, IsEmployer]

    def patch(self, request, platform):
        from apps.social.models import SocialAccount

        company = request.user.company
        account = SocialAccount.objects.filter(company=company, platform=platform, is_active=True).first()
        if not account:
            return Response({'error': f'{platform} is not connected'}, status=status.HTTP_404_NOT_FOUND)

        return Response({'message': f'{platform} settings updated'})


class AgencyLogoUploadView(APIView):
    """Upload agency logo."""

    permission_classes = [IsAuthenticated, IsAgency]

    def post(self, request):
        agency = request.user.agency
        if not agency:
            return Response({'error': 'No agency associated with user'}, status=status.HTTP_400_BAD_REQUEST)

        logo_file = request.FILES.get('logo')
        if not logo_file:
            return Response({'error': 'No logo file provided'}, status=status.HTTP_400_BAD_REQUEST)

        agency.logo = logo_file
        agency.save(update_fields=['logo'])
        return Response({'message': 'Logo uploaded successfully'})


class AgencyClientJobsView(APIView):
    """List jobs for a specific agency client."""

    permission_classes = [IsAuthenticated, IsAgency]

    def get(self, request, client_id):
        from apps.jobs.models import Job
        from apps.jobs.serializers import JobListSerializer

        agency = request.user.agency
        if not agency:
            return Response({'error': 'No agency associated with user'}, status=status.HTTP_400_BAD_REQUEST)

        client = agency.clients.filter(id=client_id).first()
        if not client:
            return Response({'error': 'Client not found'}, status=status.HTTP_404_NOT_FOUND)

        jobs = Job.objects.filter(agency=agency, company_id=client_id).order_by('-created_at')
        serializer = JobListSerializer(jobs, many=True, context={'request': request})
        return Response(serializer.data)


# ============================================================================
# AGENCY ANALYTICS & DASHBOARD VIEWS
# ============================================================================

class AgencyAnalyticsView(APIView):
    """Get agency analytics data."""

    permission_classes = [IsAuthenticated, IsAgency]

    def get(self, request):
        from django.utils import timezone
        from datetime import timedelta
        from django.db.models import Count, Sum, Avg, Q
        from apps.jobs.models import Job
        from apps.applications.models import Application

        agency = request.user.agency
        if not agency:
            return Response(
                {'error': 'No agency associated with user'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Parse date range parameters
        period = request.query_params.get('period', '30d')
        start_date_param = request.query_params.get('start_date')
        end_date_param = request.query_params.get('end_date')

        now = timezone.now()
        if start_date_param and end_date_param:
            from django.utils.dateparse import parse_date
            start_date = timezone.make_aware(
                timezone.datetime.combine(parse_date(start_date_param), timezone.datetime.min.time())
            )
            end_date = timezone.make_aware(
                timezone.datetime.combine(parse_date(end_date_param), timezone.datetime.max.time())
            )
        else:
            # Use period
            if period == '7d':
                start_date = now - timedelta(days=7)
            elif period == '90d':
                start_date = now - timedelta(days=90)
            else:  # default 30d
                start_date = now - timedelta(days=30)
            end_date = now

        # Get jobs posted in period
        jobs = Job.objects.filter(
            agency=agency,
            created_at__gte=start_date,
            created_at__lte=end_date
        )

        # Get applications in period
        applications = Application.objects.filter(
            job__agency=agency,
            created_at__gte=start_date,
            created_at__lte=end_date
        )

        # Calculate stats
        jobs_posted = jobs.count()
        applications_received = applications.count()

        # Placements = applications with status 'hired'
        placements = applications.filter(status='hired').count()

        # Revenue calculation (from paid invoices)
        from apps.billing.models import Invoice
        invoices = Invoice.objects.filter(
            agency=agency,
            status='paid',
            paid_at__gte=start_date,
            paid_at__lte=end_date
        )
        revenue = invoices.aggregate(total=Sum('amount'))['total'] or 0

        # Recruiter stats - get all recruiters/members
        from apps.users.models import User
        agency_users = AgencyUser.objects.filter(agency=agency).select_related('user')
        recruiter_stats = []

        for agency_user in agency_users:
            user_jobs = jobs.filter(posted_by=agency_user.user).count()
            user_apps = Application.objects.filter(
                job__agency=agency,
                job__posted_by=agency_user.user,
                created_at__gte=start_date,
                created_at__lte=end_date
            ).count()
            user_placements = Application.objects.filter(
                job__agency=agency,
                job__posted_by=agency_user.user,
                status='hired',
                created_at__gte=start_date,
                created_at__lte=end_date
            ).count()

            recruiter_stats.append({
                'recruiter_id': agency_user.user.id,
                'recruiter_name': agency_user.user.get_full_name(),
                'role': agency_user.role,
                'jobs_posted': user_jobs,
                'applications_received': user_apps,
                'placements': user_placements,
            })

        return Response({
            'period': period,
            'start_date': start_date.date().isoformat(),
            'end_date': end_date.date().isoformat(),
            'jobs_posted': jobs_posted,
            'applications_received': applications_received,
            'placements': placements,
            'revenue': float(revenue),
            'recruiter_stats': recruiter_stats,
        })


class AgencyRecruiterPerformanceView(APIView):
    """Get performance stats for a specific recruiter."""

    permission_classes = [IsAuthenticated, IsAgency]

    def get(self, request, recruiter_id):
        from django.utils import timezone
        from datetime import timedelta
        from apps.jobs.models import Job
        from apps.applications.models import Application
        from apps.users.models import User

        agency = request.user.agency
        if not agency:
            return Response(
                {'error': 'No agency associated with user'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify recruiter belongs to agency
        try:
            agency_user = AgencyUser.objects.select_related('user').get(
                agency=agency,
                user_id=recruiter_id
            )
        except AgencyUser.DoesNotExist:
            return Response(
                {'error': 'Recruiter not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Parse date range
        start_date_param = request.query_params.get('start_date')
        end_date_param = request.query_params.get('end_date')

        now = timezone.now()
        if start_date_param and end_date_param:
            from django.utils.dateparse import parse_date
            start_date = timezone.make_aware(
                timezone.datetime.combine(parse_date(start_date_param), timezone.datetime.min.time())
            )
            end_date = timezone.make_aware(
                timezone.datetime.combine(parse_date(end_date_param), timezone.datetime.max.time())
            )
        else:
            start_date = now - timedelta(days=30)
            end_date = now

        # Get stats
        jobs_posted = Job.objects.filter(
            agency=agency,
            posted_by=agency_user.user,
            created_at__gte=start_date,
            created_at__lte=end_date
        ).count()

        applications_reviewed = Application.objects.filter(
            job__agency=agency,
            job__posted_by=agency_user.user,
            created_at__gte=start_date,
            created_at__lte=end_date
        ).count()

        placements = Application.objects.filter(
            job__agency=agency,
            job__posted_by=agency_user.user,
            status='hired',
            created_at__gte=start_date,
            created_at__lte=end_date
        ).count()

        # Average time to fill (days from job posted to first placement)
        from django.db.models import F, ExpressionWrapper, DurationField, Avg
        filled_jobs = Job.objects.filter(
            agency=agency,
            posted_by=agency_user.user,
            applications__status='hired',
            created_at__gte=start_date,
            created_at__lte=end_date
        ).annotate(
            time_to_fill=ExpressionWrapper(
                F('applications__updated_at') - F('created_at'),
                output_field=DurationField()
            )
        ).aggregate(avg_time=Avg('time_to_fill'))

        avg_time_to_fill = 0
        if filled_jobs['avg_time'] is not None:
            avg_time_to_fill = filled_jobs['avg_time'].days

        return Response({
            'recruiter_id': agency_user.user.id,
            'recruiter_name': agency_user.user.get_full_name(),
            'jobs_posted': jobs_posted,
            'placements': placements,
            'applications_reviewed': applications_reviewed,
            'avg_time_to_fill': avg_time_to_fill,
        })


class AgencyAnalyticsExportView(APIView):
    """Export agency analytics to CSV."""

    permission_classes = [IsAuthenticated, IsAgency]

    def get(self, request):
        import csv
        from django.utils import timezone
        from datetime import timedelta
        from apps.jobs.models import Job
        from apps.applications.models import Application

        agency = request.user.agency
        if not agency:
            return Response(
                {'error': 'No agency associated with user'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Parse date range
        start_date_param = request.query_params.get('start_date')
        end_date_param = request.query_params.get('end_date')

        now = timezone.now()
        if start_date_param and end_date_param:
            from django.utils.dateparse import parse_date
            start_date = timezone.make_aware(
                timezone.datetime.combine(parse_date(start_date_param), timezone.datetime.min.time())
            )
            end_date = timezone.make_aware(
                timezone.datetime.combine(parse_date(end_date_param), timezone.datetime.max.time())
            )
        else:
            start_date = now - timedelta(days=30)
            end_date = now

        # Create CSV response
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="agency-analytics-{start_date.date()}-{end_date.date()}.csv"'

        writer = csv.writer(response)
        writer.writerow(['Job ID', 'Job Title', 'Client', 'Posted Date', 'Status', 'Applications', 'Placements'])

        # Get jobs and their stats
        jobs = Job.objects.filter(
            agency=agency,
            created_at__gte=start_date,
            created_at__lte=end_date
        ).select_related('company').prefetch_related('applications')

        for job in jobs:
            apps_count = job.applications.count()
            placements = job.applications.filter(status='hired').count()

            writer.writerow([
                job.id,
                job.title,
                job.company.name if job.company else 'N/A',
                job.created_at.strftime('%Y-%m-%d'),
                job.status,
                apps_count,
                placements,
            ])

        return response


class AgencyDashboardCountsView(APIView):
    """Get dashboard count widgets for agency."""

    permission_classes = [IsAuthenticated, IsAgency]

    def get(self, request):
        from apps.jobs.models import Job
        from apps.applications.models import Application

        agency = request.user.agency
        if not agency:
            return Response(
                {'error': 'No agency associated with user'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Active jobs
        active_jobs = Job.objects.filter(
            agency=agency,
            status='published'
        ).count()

        # Pending applications (new + under_review)
        pending_applications = Application.objects.filter(
            job__agency=agency,
            status__in=['new', 'under_review']
        ).count()

        # Active clients
        active_clients = AgencyClient.objects.filter(
            agency=agency,
            is_active=True
        ).count()

        # Total views across all jobs
        from django.db.models import Sum
        total_views = Job.objects.filter(agency=agency).aggregate(
            total=Sum('views')
        )['total'] or 0

        return Response({
            'active_jobs': active_jobs,
            'pending_applications': pending_applications,
            'active_clients': active_clients,
            'total_views': total_views,
        })


class AgencyRecentActivityView(APIView):
    """Get recent activity feed for agency dashboard."""

    permission_classes = [IsAuthenticated, IsAgency]

    def get(self, request):
        from django.utils import timezone
        from apps.jobs.models import Job
        from apps.applications.models import Application

        agency = request.user.agency
        if not agency:
            return Response(
                {'error': 'No agency associated with user'},
                status=status.HTTP_400_BAD_REQUEST
            )

        limit = int(request.query_params.get('limit', 10))

        # Combine recent jobs and applications
        activities = []

        # Recent jobs
        recent_jobs = Job.objects.filter(
            agency=agency
        ).select_related('company').order_by('-created_at')[:limit]

        for job in recent_jobs:
            activities.append({
                'id': f'job-{job.id}',
                'type': 'job_posted',
                'message': f'Job posted: {job.title}',
                'company': job.company.name if job.company else None,
                'time': job.created_at.isoformat(),
                'link': f'/agency/jobs/{job.id}',
            })

        # Recent applications
        recent_apps = Application.objects.filter(
            job__agency=agency
        ).select_related('job', 'job__company', 'candidate').order_by('-created_at')[:limit]

        for app in recent_apps:
            activities.append({
                'id': f'app-{app.id}',
                'type': 'application_received',
                'message': f'New application for {app.job.title}',
                'company': app.job.company.name if app.job.company else None,
                'time': app.created_at.isoformat(),
                'link': f'/agency/jobs/{app.job.id}',
            })

        # Sort by time descending and limit
        activities = sorted(activities, key=lambda x: x['time'], reverse=True)[:limit]

        return Response(activities)
