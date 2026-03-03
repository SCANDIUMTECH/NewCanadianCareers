"""
User views for Orion API.
"""
import logging
import secrets
from datetime import timedelta

from django.conf import settings as django_settings
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from django.contrib.auth import login, logout
from django.db.models import Count
from rest_framework import status, generics, viewsets
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from apps.moderation.turnstile import verify_turnstile_token
from core.validators import UploadRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken

from core.permissions import IsAdmin
from apps.audit.models import AuditLog
from .throttles import ResendVerificationThrottle
from .models import User, UserSession, PasswordResetToken, EmailVerificationToken
from .serializers import (
    UserSerializer, UserCreateSerializer, LoginSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
    PasswordChangeSerializer, EmailVerificationSerializer,
    UserSessionSerializer, AdminUserSerializer, AdminUserCreateSerializer,
    AdminUserStatsSerializer, UserActivitySerializer,
    ResumeSerializer, PrivacySettingsSerializer, DashboardStatsSerializer,
    ProfileCompletionSerializer
)


logger = logging.getLogger('apps.users')


def get_client_ip(request):
    """Get client IP address from request.

    Priority: CF-Connecting-IP (Cloudflare) > REMOTE_ADDR (Traefik sets this).
    We do NOT trust X-Forwarded-For first-hop as it is attacker-controlled.
    """
    # Cloudflare sets this header — cannot be forged at the edge
    cf_ip = request.META.get('HTTP_CF_CONNECTING_IP')
    if cf_ip:
        return cf_ip.strip()
    # Behind Traefik, REMOTE_ADDR is the real client IP
    return request.META.get('REMOTE_ADDR', '0.0.0.0')


class RegisterView(generics.CreateAPIView):
    """User registration endpoint."""

    serializer_class = UserCreateSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        # Turnstile verification
        is_valid, error = verify_turnstile_token(
            request.data.get('turnstile_token'),
            get_client_ip(request),
            feature='auth',
        )
        if not is_valid:
            return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # User + token creation in a single transaction
        with transaction.atomic():
            user = serializer.save()

            # Create email verification token
            token = secrets.token_urlsafe(32)
            EmailVerificationToken.objects.create(
                user=user,
                token=token,
                expires_at=timezone.now() + timedelta(hours=24)
            )

        # Send verification email OUTSIDE the transaction (non-blocking)
        try:
            from apps.notifications.tasks import send_email as send_email_task
            verify_url = f"{django_settings.FRONTEND_URL}/verify-email?token={token}"
            send_email_task.delay(
                to_email=user.email,
                subject='Verify your Orion email address',
                template='email_verification',
                context={
                    'name': user.first_name or 'there',
                    'verify_url': verify_url,
                },
                user_id=user.id,
            )
        except Exception:
            logger.warning("Failed to queue verification email for user %s", user.email)

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)

        from core.cookies import set_auth_cookies

        response = Response({
            'user': UserSerializer(user).data,
            'message': 'Registration successful. Please verify your email.'
        }, status=status.HTTP_201_CREATED)
        set_auth_cookies(response, refresh.access_token, refresh)
        return response


class LoginView(APIView):
    """User login endpoint with security tracking."""

    permission_classes = [AllowAny]
    serializer_class = LoginSerializer

    def post(self, request):
        from apps.audit.services import LoginSecurityService
        from rest_framework import serializers

        # Turnstile verification
        is_valid, error = verify_turnstile_token(
            request.data.get('turnstile_token'),
            get_client_ip(request),
            feature='auth',
        )
        if not is_valid:
            return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)

        email = request.data.get('email', '')

        # Check lockout for existing user
        try:
            user = User.objects.get(email=email)
            is_locked, remaining = LoginSecurityService.is_locked(user)
            if is_locked:
                LoginSecurityService.record_attempt(
                    request, email, user, success=False, failure_reason='account_locked'
                )
                return Response({
                    'error': 'Account temporarily locked',
                    'retry_after': remaining,
                    'message': f'Too many failed attempts. Try again in {remaining // 60} minutes.'
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)
        except User.DoesNotExist:
            user = None

        serializer = LoginSerializer(data=request.data)

        if not serializer.is_valid():
            failure_reason = 'invalid_credentials'
            if user and user.status == 'suspended':
                failure_reason = 'account_suspended'

            LoginSecurityService.record_attempt(
                request, email, user, success=False, failure_reason=failure_reason
            )
            raise serializers.ValidationError(serializer.errors)

        user = serializer.validated_data['user']

        # Record successful login
        LoginSecurityService.record_attempt(request, email, user, success=True)

        # Update last login IP
        user.last_login_ip = LoginSecurityService.get_client_ip(request)
        user.save(update_fields=['last_login_ip'])

        # Create session for session-based auth
        login(request, user)

        # Build location string from Cloudflare headers
        location_parts = filter(None, [
            request.META.get('HTTP_CF_IPCITY', ''),
            request.META.get('HTTP_CF_IPCOUNTRY', '')
        ])
        location = ', '.join(location_parts) or ''

        # Create session record
        UserSession.objects.create(
            user=user,
            session_key=request.session.session_key or '',
            ip_address=LoginSecurityService.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            location=location,
            expires_at=timezone.now() + timedelta(days=7)
        )

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)

        from core.cookies import set_auth_cookies

        response = Response({
            'user': UserSerializer(user).data,
        })
        set_auth_cookies(response, refresh.access_token, refresh)
        return response


class LogoutView(APIView):
    """User logout endpoint."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Invalidate session
        if request.session.session_key:
            UserSession.objects.filter(
                user=request.user,
                session_key=request.session.session_key
            ).update(is_active=False)

        logout(request)

        from core.cookies import clear_auth_cookies

        response = Response({'message': 'Logged out successfully'})
        clear_auth_cookies(response)
        return response


class CookieTokenRefreshView(APIView):
    """Refresh JWT using HTTP-only cookie.

    Reads the refresh token from the 'orion_refresh' cookie, validates it,
    issues a new access token (and rotated refresh token if rotation is enabled),
    and sets them as HTTP-only cookies on the response.

    Falls back to reading 'refresh' from request body for backward
    compatibility with mobile/API consumers.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        from rest_framework_simplejwt.tokens import RefreshToken
        from rest_framework_simplejwt.exceptions import TokenError
        from core.cookies import set_auth_cookies, clear_auth_cookies

        # Try cookie first, then request body (backward compat)
        refresh_token = request.COOKIES.get('orion_refresh') or request.data.get('refresh')
        if not refresh_token:
            return Response(
                {'error': 'No refresh token provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            old_refresh = RefreshToken(refresh_token)
            access_token = old_refresh.access_token

            if django_settings.SIMPLE_JWT.get('ROTATE_REFRESH_TOKENS', False):
                # Blacklist old token if configured
                if django_settings.SIMPLE_JWT.get('BLACKLIST_AFTER_ROTATION', False):
                    try:
                        old_refresh.blacklist()
                    except AttributeError:
                        pass  # Blacklist app not installed

                user = User.objects.get(id=old_refresh['user_id'])
                new_refresh = RefreshToken.for_user(user)
                response = Response({'access': str(new_refresh.access_token)})
                set_auth_cookies(response, new_refresh.access_token, new_refresh)
            else:
                response = Response({'access': str(access_token)})
                set_auth_cookies(response, access_token, old_refresh)

            return response

        except TokenError:
            response = Response(
                {'error': 'Invalid or expired refresh token'},
                status=status.HTTP_401_UNAUTHORIZED
            )
            clear_auth_cookies(response)
            return response


class MeView(generics.RetrieveUpdateAPIView):
    """Get/update current user profile."""

    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class CompleteOnboardingView(APIView):
    """Complete user onboarding - updates profile data and marks onboarding done."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        # Update user profile fields
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')

        if first_name:
            user.first_name = first_name
        if last_name:
            user.last_name = last_name

        # Update company details if employer
        if user.role == 'employer' and user.company:
            company = user.company
            address_fields = {
                'industry': request.data.get('industry', ''),
                'headquarters_address': request.data.get('headquarters_address', ''),
                'headquarters_city': request.data.get('headquarters_city', ''),
                'headquarters_state': request.data.get('headquarters_state', ''),
                'headquarters_country': request.data.get('headquarters_country', ''),
                'headquarters_postal_code': request.data.get('headquarters_postal_code', ''),
            }
            updated = False
            for field, value in address_fields.items():
                if value:
                    setattr(company, field, value)
                    updated = True
            if updated:
                company.save()

        user.onboarding_completed = True
        user.save()

        serializer = UserSerializer(user)
        return Response(serializer.data)


class PasswordResetRequestView(APIView):
    """Request password reset."""

    permission_classes = [AllowAny]
    serializer_class = PasswordResetRequestSerializer

    def post(self, request):
        # Turnstile verification
        is_valid, error = verify_turnstile_token(
            request.data.get('turnstile_token'),
            get_client_ip(request),
            feature='auth',
        )
        if not is_valid:
            return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)

        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']

        try:
            user = User.objects.get(email=email)

            with transaction.atomic():
                # Invalidate existing tokens
                PasswordResetToken.objects.filter(user=user, used_at__isnull=True).delete()

                # Create new token
                token = secrets.token_urlsafe(32)
                PasswordResetToken.objects.create(
                    user=user,
                    token=token,
                    expires_at=timezone.now() + timedelta(hours=1)
                )

            # Send password reset email via Resend
            from apps.notifications.tasks import send_email as send_email_task
            reset_url = f"{django_settings.FRONTEND_URL}/reset-password?token={token}"
            send_email_task.delay(
                to_email=user.email,
                subject='Reset your Orion password',
                template='password_reset',
                context={
                    'name': user.first_name or 'there',
                    'reset_url': reset_url,
                },
                user_id=user.id,
            )

        except User.DoesNotExist:
            pass  # Don't reveal if email exists

        return Response({
            'message': 'If an account exists with this email, you will receive a password reset link.'
        })


class PasswordResetConfirmView(APIView):
    """Confirm password reset."""

    permission_classes = [AllowAny]
    serializer_class = PasswordResetConfirmSerializer

    def post(self, request):
        # Turnstile verification
        is_valid, error = verify_turnstile_token(
            request.data.get('turnstile_token'),
            get_client_ip(request),
            feature='auth',
        )
        if not is_valid:
            return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)

        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            reset_token = PasswordResetToken.objects.get(
                token=serializer.validated_data['token']
            )

            if not reset_token.is_valid():
                return Response(
                    {'error': 'Invalid or expired token'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user = reset_token.user

            with transaction.atomic():
                user.set_password(serializer.validated_data['password'])
                user.save()

                reset_token.used_at = timezone.now()
                reset_token.save()

                # Invalidate all sessions
                UserSession.objects.filter(user=user).update(is_active=False)

                # Blacklist all outstanding refresh tokens
                try:
                    from rest_framework_simplejwt.token_blacklist.models import (
                        OutstandingToken, BlacklistedToken
                    )
                    outstanding = OutstandingToken.objects.filter(user=user)
                    BlacklistedToken.objects.bulk_create(
                        [BlacklistedToken(token=t) for t in outstanding],
                        ignore_conflicts=True,
                    )
                except (ImportError, AttributeError):
                    pass  # token_blacklist app not installed/configured
                except Exception:
                    logger.error('Failed to blacklist tokens for user %s after password reset', user.id, exc_info=True)

            return Response({'message': 'Password reset successful'})

        except PasswordResetToken.DoesNotExist:
            return Response(
                {'error': 'Invalid token'},
                status=status.HTTP_400_BAD_REQUEST
            )


class PasswordChangeView(APIView):
    """Change user password."""

    permission_classes = [IsAuthenticated]
    serializer_class = PasswordChangeSerializer

    def post(self, request):
        serializer = PasswordChangeSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            request.user.set_password(serializer.validated_data['new_password'])
            request.user.save()

            # Invalidate other sessions
            UserSession.objects.filter(user=request.user).exclude(
                session_key=request.session.session_key or ''
            ).update(is_active=False)

            # Blacklist all outstanding refresh tokens
            try:
                from rest_framework_simplejwt.token_blacklist.models import (
                    OutstandingToken, BlacklistedToken
                )
                outstanding = OutstandingToken.objects.filter(user=request.user)
                BlacklistedToken.objects.bulk_create(
                    [BlacklistedToken(token=t) for t in outstanding],
                    ignore_conflicts=True,
                )
            except (ImportError, AttributeError):
                pass  # token_blacklist app not installed/configured
            except Exception:
                logger.error('Failed to blacklist tokens for user %s after password change', request.user.id, exc_info=True)

        return Response({'message': 'Password changed successfully'})


class EmailVerifyView(APIView):
    """Verify email address."""

    permission_classes = [AllowAny]
    serializer_class = EmailVerificationSerializer

    def post(self, request):
        serializer = EmailVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            try:
                verification = EmailVerificationToken.objects.select_for_update().get(
                    token=serializer.validated_data['token']
                )

                if not verification.is_valid():
                    return Response(
                        {'error': 'Invalid or expired token'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                user = verification.user
                user.verify_email()

                verification.used_at = timezone.now()
                verification.save(update_fields=['used_at'])

                return Response({'message': 'Email verified successfully'})

            except EmailVerificationToken.DoesNotExist:
                return Response(
                    {'error': 'Invalid token'},
                    status=status.HTTP_400_BAD_REQUEST
                )


class UserSessionsView(generics.ListAPIView):
    """List user's active sessions."""

    serializer_class = UserSessionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserSession.objects.filter(
            user=self.request.user,
            is_active=True
        ).order_by('-last_activity')


class RevokeSessionView(APIView):
    """Revoke a specific session."""

    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        try:
            session = UserSession.objects.get(
                id=session_id,
                user=request.user,
                is_active=True
            )
            session.is_active = False
            session.save()
            return Response({'message': 'Session revoked'})
        except UserSession.DoesNotExist:
            return Response(
                {'error': 'Session not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class RevokeAllSessionsView(APIView):
    """Revoke all sessions except the current one."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        current_key = request.session.session_key or ''
        count = UserSession.objects.filter(
            user=request.user,
            is_active=True
        ).exclude(
            session_key=current_key
        ).update(is_active=False)
        return Response({
            'message': f'{count} session(s) revoked'
        })


# Admin views
class AdminUserViewSet(viewsets.ModelViewSet):
    """Admin user management."""

    queryset = User.objects.all().select_related('company', 'agency')
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_fields = ['role', 'status', 'company', 'agency', 'is_active']
    search_fields = ['email', 'first_name', 'last_name']
    ordering_fields = ['created_at', 'last_login', 'email']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return AdminUserCreateSerializer
        if self.action == 'stats':
            return AdminUserStatsSerializer
        if self.action == 'activity':
            return UserActivitySerializer
        return AdminUserSerializer

    def perform_update(self, serializer):
        user = self.get_object()
        was_verified = user.email_verified
        instance = serializer.save()
        if not was_verified and instance.email_verified and instance.status == 'pending':
            instance.status = 'active'
            instance.save(update_fields=['status'])

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Return user statistics summary."""
        total = User.objects.count()
        active = User.objects.filter(status='active').count()
        pending = User.objects.filter(status='pending').count()
        suspended = User.objects.filter(status='suspended').count()

        by_role = dict(
            User.objects.values('role')
            .annotate(count=Count('id'))
            .values_list('role', 'count')
        )

        # Ensure all roles have a count
        for role in ['admin', 'employer', 'agency', 'candidate']:
            if role not in by_role:
                by_role[role] = 0

        data = {
            'total': total,
            'active': active,
            'pending': pending,
            'suspended': suspended,
            'by_role': by_role,
        }

        serializer = AdminUserStatsSerializer(data)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def activity(self, request, pk=None):
        """Get activity history for a specific user."""
        user = self.get_object()
        queryset = AuditLog.objects.filter(actor=user).order_by('-created_at')

        # Apply pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = UserActivitySerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = UserActivitySerializer(queryset, many=True)
        return Response(serializer.data)


class AdminSuspendUserView(APIView):
    """Suspend a user account."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            user.status = 'suspended'
            user.save(update_fields=['status'])

            # Invalidate all sessions
            UserSession.objects.filter(user=user).update(is_active=False)

            serializer = AdminUserSerializer(user)
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class AdminActivateUserView(APIView):
    """Activate a user account."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            user.status = 'active'
            user.save(update_fields=['status'])

            serializer = AdminUserSerializer(user)
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class AdminResetPasswordView(APIView):
    """Admin reset user password."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)

            # Create password reset token and send email
            token = secrets.token_urlsafe(32)
            PasswordResetToken.objects.create(
                user=user,
                token=token,
                expires_at=timezone.now() + timedelta(hours=1)
            )

            # Send password reset email via Resend
            from apps.notifications.tasks import send_email as send_email_task
            reset_url = f"{django_settings.FRONTEND_URL}/reset-password?token={token}"
            send_email_task.delay(
                to_email=user.email,
                subject='Reset your Orion password',
                template='password_reset',
                context={
                    'name': user.first_name or 'there',
                    'reset_url': reset_url,
                },
                user_id=user.id,
            )

            return Response({'message': 'Password reset email sent'})
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class AdminUserLoginHistoryView(generics.ListAPIView):
    """Admin: Get login history for a user."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        from apps.audit.models import LoginAttempt
        user_id = self.kwargs.get('pk')
        return LoginAttempt.objects.filter(user_id=user_id).order_by('-created_at')

    def get_serializer_class(self):
        from apps.audit.serializers import LoginAttemptSerializer
        return LoginAttemptSerializer


class AdminVerifyUserEmailView(APIView):
    """Force verify user email."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            user.email_verified = True
            user.email_verified_at = timezone.now()
            if user.status == 'pending':
                user.status = 'active'
            user.save(update_fields=['email_verified', 'email_verified_at', 'status'])

            return Response({'message': 'Email verified successfully'})
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class AdminBulkSuspendUsersView(APIView):
    """Bulk suspend users."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        user_ids = request.data.get('user_ids', [])
        reason = request.data.get('reason', 'Bulk suspension by admin')

        if not user_ids:
            return Response(
                {'error': 'user_ids is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user_ids = [int(uid) for uid in user_ids]
        except (ValueError, TypeError):
            return Response(
                {'error': 'user_ids must be a list of integers'},
                status=status.HTTP_400_BAD_REQUEST
            )

        users = User.objects.filter(id__in=user_ids).exclude(role='admin')
        count = users.count()

        users.update(status='suspended')

        # Invalidate all sessions for suspended users
        UserSession.objects.filter(user__in=users).update(is_active=False)

        return Response({
            'message': f'Suspended {count} users',
            'count': count
        })


class AdminBulkDeleteUsersView(APIView):
    """Bulk delete users."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        user_ids = request.data.get('user_ids', [])

        if not user_ids:
            return Response(
                {'error': 'user_ids is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user_ids = [int(uid) for uid in user_ids]
        except (ValueError, TypeError):
            return Response(
                {'error': 'user_ids must be a list of integers'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Soft delete by marking as deleted
        users = User.objects.filter(id__in=user_ids).exclude(role='admin')
        count = users.count()

        users.update(status='suspended', is_active=False)

        # Invalidate all sessions for deleted users
        UserSession.objects.filter(user__in=users).update(is_active=False)

        return Response({
            'message': f'Deactivated {count} users',
            'count': count
        })


class AdminExportUsersView(APIView):
    """Export users as CSV."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        import csv
        import io
        from django.http import StreamingHttpResponse

        qs = User.objects.all().select_related('company', 'agency')

        # Apply filters if provided
        role = request.query_params.get('role')
        status_filter = request.query_params.get('status')
        if role and role != 'all':
            qs = qs.filter(role=role)
        if status_filter and status_filter != 'all':
            qs = qs.filter(status=status_filter)

        def csv_rows():
            buf = io.StringIO()
            writer = csv.writer(buf)
            # Header
            writer.writerow([
                'ID', 'Email', 'First Name', 'Last Name', 'Role',
                'Status', 'Email Verified', 'Company', 'Agency',
                'Last Login', 'Created At'
            ])
            yield buf.getvalue()
            buf.seek(0)
            buf.truncate(0)

            # Stream rows in chunks via iterator()
            for user in qs.iterator(chunk_size=500):
                writer.writerow([
                    user.id, user.email, user.first_name, user.last_name,
                    user.role, user.status, user.email_verified,
                    user.company.name if user.company else '',
                    user.agency.name if user.agency else '',
                    user.last_login or '', user.created_at
                ])
                yield buf.getvalue()
                buf.seek(0)
                buf.truncate(0)

        response = StreamingHttpResponse(csv_rows(), content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="users-export.csv"'
        return response


class AdminImpersonateUserView(APIView):
    """Start impersonation session."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, user_id):
        try:
            target_user = User.objects.get(id=user_id)

            # Generate impersonation token
            refresh = RefreshToken.for_user(target_user)

            # TODO: Log impersonation session in audit log
            from apps.audit.models import AuditLog
            AuditLog.objects.create(
                actor=request.user,
                action='impersonate',
                target_type='user',
                target_id=str(target_user.id),
                target_repr=str(target_user),
                reason=request.data.get('reason', ''),
                changes={
                    'target_email': target_user.email,
                }
            )

            return Response({
                'token': str(refresh.access_token),
                'redirect_url': f'/impersonate/{target_user.id}',
                'expires_at': (timezone.now() + timedelta(hours=1)).isoformat()
            })
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class AdminEndImpersonationView(APIView):
    """End impersonation session."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        # TODO: Handle ending impersonation
        return Response({'message': 'Impersonation session ended'})


# Candidate profile views
class ResumeUploadView(APIView):
    """Upload resume for current user."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [UploadRateThrottle]

    def post(self, request):
        from core.validators import validate_upload, sanitize_filename, DOCUMENT_PROFILE

        user = request.user
        resume_file = request.FILES.get('file')

        if not resume_file:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            validate_upload(resume_file, DOCUMENT_PROFILE)
        except ValidationError as e:
            return Response({'error': e.message}, status=status.HTTP_400_BAD_REQUEST)

        # Preserve original filename for display before sanitizing storage name
        original_name = resume_file.name
        sanitize_filename(resume_file)

        # Delete old resume if exists
        if user.resume:
            user.resume.delete(save=False)

        user.resume = resume_file
        user.resume_filename = original_name
        user.save(update_fields=['resume', 'resume_filename'])

        serializer = ResumeSerializer(user, context={'request': request})
        return Response(serializer.data)


class ResumeDeleteView(APIView):
    """Delete resume for current user."""

    permission_classes = [IsAuthenticated]

    def delete(self, request):
        user = request.user

        if not user.resume:
            return Response(
                {'error': 'No resume to delete'},
                status=status.HTTP_404_NOT_FOUND
            )

        user.resume.delete(save=False)
        user.resume = None
        user.resume_filename = ''
        user.save(update_fields=['resume', 'resume_filename'])

        return Response({'message': 'Resume deleted successfully'})


class AvatarUploadView(APIView):
    """Upload avatar for current user."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [UploadRateThrottle]

    def post(self, request):
        from core.validators import validate_upload, sanitize_filename, convert_to_webp, AVATAR_PROFILE

        user = request.user
        avatar_file = request.FILES.get('file')

        if not avatar_file:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            validate_upload(avatar_file, AVATAR_PROFILE)
        except ValidationError as e:
            return Response({'error': e.message}, status=status.HTTP_400_BAD_REQUEST)

        sanitize_filename(avatar_file)
        avatar_file = convert_to_webp(avatar_file)

        if user.avatar:
            user.avatar.delete(save=False)

        user.avatar = avatar_file
        user.save(update_fields=['avatar'])

        serializer = UserSerializer(user, context={'request': request})
        return Response(serializer.data)


class PrivacySettingsView(generics.RetrieveUpdateAPIView):
    """Get/update privacy settings for current user."""

    serializer_class = PrivacySettingsSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class ExportDataView(APIView):
    """Export user data (GDPR compliance)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        # Gather all user data
        data = {
            'profile': {
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'phone': user.phone,
                'bio': user.bio,
                'role': user.role,
                'status': user.status,
                'created_at': user.created_at.isoformat(),
            },
            'privacy_settings': {
                'profile_visible': user.profile_visible,
                'show_email': user.show_email,
                'show_phone': user.show_phone,
                'searchable': user.searchable,
                'allow_recruiter_contact': user.allow_recruiter_contact,
            },
            'applications': [],
            'saved_jobs': [],
            'sessions': [],
        }

        # Applications
        if user.role == 'candidate':
            from apps.applications.models import Application, SavedJob
            applications = Application.objects.filter(candidate=user).select_related('job')
            data['applications'] = [
                {
                    'job_title': app.job.title,
                    'company': app.job.company.name if app.job.company else None,
                    'status': app.status,
                    'applied_at': app.created_at.isoformat(),
                }
                for app in applications
            ]

            saved_jobs = SavedJob.objects.filter(candidate=user).select_related('job')
            data['saved_jobs'] = [
                {
                    'job_title': job.job.title,
                    'company': job.job.company.name if job.job.company else None,
                    'saved_at': job.created_at.isoformat(),
                }
                for job in saved_jobs
            ]

        # Sessions
        sessions = UserSession.objects.filter(user=user, is_active=True)
        data['sessions'] = [
            {
                'ip_address': session.ip_address,
                'location': session.location,
                'created_at': session.created_at.isoformat(),
                'last_activity': session.last_activity.isoformat(),
            }
            for session in sessions
        ]

        # Return as JSON (in production, this might be sent via email)
        return Response(data)


class DeleteAccountView(APIView):
    """Delete user account (GDPR compliance)."""

    permission_classes = [IsAuthenticated]

    def delete(self, request):
        user = request.user

        # Prevent deletion if user is company/agency owner
        if user.role == 'employer' and user.company:
            from apps.companies.models import CompanyUser
            is_owner = CompanyUser.objects.filter(
                user=user,
                company=user.company,
                role='owner'
            ).exists()
            if is_owner:
                return Response(
                    {'error': 'Cannot delete account. Transfer company ownership first.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        if user.role == 'agency' and user.agency:
            from apps.companies.models import AgencyUser
            is_owner = AgencyUser.objects.filter(
                user=user,
                agency=user.agency,
                role='owner'
            ).exists()
            if is_owner:
                return Response(
                    {'error': 'Cannot delete account. Transfer agency ownership first.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Anonymize instead of hard delete (for audit trail)
        user.email = f'deleted_{user.id}@deleted.local'
        user.first_name = 'Deleted'
        user.last_name = 'User'
        user.phone = ''
        user.bio = ''
        user.status = 'suspended'
        user.is_active = False
        if user.avatar:
            user.avatar.delete(save=False)
        if user.resume:
            user.resume.delete(save=False)
        user.save()

        # Invalidate all sessions
        UserSession.objects.filter(user=user).update(is_active=False)

        return Response({'message': 'Account deleted successfully'})


class ResendVerificationEmailView(APIView):
    """Resend email verification."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [ResendVerificationThrottle]

    def post(self, request):
        user = request.user

        if user.email_verified:
            return Response(
                {'error': 'Email already verified'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Invalidate old tokens
        EmailVerificationToken.objects.filter(
            user=user,
            used_at__isnull=True
        ).delete()

        # Create new token
        token = secrets.token_urlsafe(32)
        EmailVerificationToken.objects.create(
            user=user,
            token=token,
            expires_at=timezone.now() + timedelta(hours=24)
        )

        # Send verification email
        from apps.notifications.tasks import send_email as send_email_task
        verify_url = f"{django_settings.FRONTEND_URL}/verify-email?token={token}"
        send_email_task.delay(
            to_email=user.email,
            subject='Verify your Orion email address',
            template='email_verification',
            context={
                'name': user.first_name or 'there',
                'verify_url': verify_url,
            },
            user_id=user.id,
        )

        return Response({'message': 'Verification email sent'})


# Candidate dashboard views
class CandidateDashboardStatsView(APIView):
    """Get candidate dashboard statistics."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.applications.models import Application, SavedJob
        from django.utils import timezone
        from datetime import timedelta

        user = request.user
        seven_days_ago = timezone.now() - timedelta(days=7)

        # Get counts
        total_applications = Application.objects.filter(candidate=user).count()
        interviews = Application.objects.filter(
            candidate=user,
            status='interviewing'
        ).count()
        offers = Application.objects.filter(
            candidate=user,
            status__in=['offered', 'hired']
        ).count()
        saved_jobs = SavedJob.objects.filter(candidate=user).count()

        # Profile views (placeholder - would need JobView model integration)
        profile_views = 0

        # Last 7 days stats
        last_7_days = {
            'applications': Application.objects.filter(
                candidate=user,
                created_at__gte=seven_days_ago
            ).count(),
            'interviews': Application.objects.filter(
                candidate=user,
                status='interviewing',
                status_changed_at__gte=seven_days_ago
            ).count(),
            'offers': Application.objects.filter(
                candidate=user,
                status__in=['offered', 'hired'],
                status_changed_at__gte=seven_days_ago
            ).count(),
        }

        data = {
            'total_applications': total_applications,
            'interviews': interviews,
            'offers': offers,
            'saved_jobs': saved_jobs,
            'profile_views': profile_views,
            'last_7_days': last_7_days,
        }

        serializer = DashboardStatsSerializer(data)
        return Response(serializer.data)


class ProfileCompletionView(APIView):
    """Get profile completion percentage."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        sections = {
            'personal_info': bool(
                user.first_name and user.last_name and user.phone
            ),
            'resume': bool(user.resume),
            'skills': False,  # Placeholder - would need skills model
            'experience': False,  # Placeholder - would need experience model
            'education': False,  # Placeholder - would need education model
            'preferences': bool(user.bio),
        }

        completed = sum(1 for v in sections.values() if v)
        total = len(sections)
        percentage = int((completed / total) * 100)

        data = {
            'percentage': percentage,
            'sections': sections,
        }

        serializer = ProfileCompletionSerializer(data)
        return Response(serializer.data)
