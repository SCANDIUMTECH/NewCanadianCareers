"""
Admin Support views for user/company lookup, impersonation, timelines, and data export.
"""
import uuid
from datetime import timedelta
from django.db.models import Q, Count, Sum, Prefetch
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination

from core.permissions import IsAdmin
from apps.users.models import User, UserSession
from apps.companies.models import Company, CompanyUser
from apps.jobs.models import Job
from apps.applications.models import Application
from apps.billing.models import Invoice
from apps.audit.models import AuditLog
from .support_serializers import (
    SupportUserResultSerializer, SupportUserDetailSerializer,
    SupportCompanyResultSerializer, SupportCompanyDetailSerializer,
    TimelineEventSerializer, ImpersonationSessionSerializer,
    DataExportJobSerializer, ImpersonationStatusSerializer
)


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


def _map_user_role_to_type(role):
    """Map User.role to frontend UserType."""
    if role == 'admin':
        return 'admin'
    elif role == 'employer':
        return 'employer'
    elif role == 'agency':
        return 'agency_member'
    else:
        return 'candidate'


def _map_user_status(status_str):
    """Map User.status to frontend UserStatus."""
    # User model has: active, suspended, pending
    # Frontend expects: active, inactive, suspended, banned
    if status_str == 'active':
        return 'active'
    elif status_str == 'suspended':
        return 'suspended'
    elif status_str == 'pending':
        return 'inactive'
    else:
        return 'inactive'


# =============================================================================
# User Lookup
# =============================================================================


class SupportUserSearchView(APIView):
    """
    GET /api/admin/support/users/?q=<query>&type=<type>&status=<status>
    Search users by name or email.
    """
    permission_classes = [IsAuthenticated, IsAdmin]
    pagination_class = StandardPagination

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        user_type = request.query_params.get('type')
        user_status = request.query_params.get('status')

        qs = User.objects.select_related('company', 'agency').all()

        # Search by name or email
        if query:
            qs = qs.filter(
                Q(first_name__icontains=query) |
                Q(last_name__icontains=query) |
                Q(email__icontains=query)
            )

        # Filter by type (role)
        if user_type:
            role_map = {
                'candidate': 'candidate',
                'employer': 'employer',
                'agency_member': 'agency',
                'admin': 'admin',
            }
            role = role_map.get(user_type)
            if role:
                qs = qs.filter(role=role)

        # Filter by status
        if user_status:
            # Map frontend status to backend status
            status_map = {
                'active': 'active',
                'inactive': 'pending',
                'suspended': 'suspended',
                'banned': 'suspended',  # treat banned as suspended
            }
            mapped_status = status_map.get(user_status)
            if mapped_status:
                qs = qs.filter(status=mapped_status)

        qs = qs.order_by('-created_at')

        # Paginate
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(qs, request)

        # Build results
        results = []
        for user in page:
            results.append({
                'id': user.id,
                'name': user.get_full_name(),
                'email': user.email,
                'type': _map_user_role_to_type(user.role),
                'status': _map_user_status(user.status),
                'company': user.company.name if user.company else None,
                'company_id': user.company.id if user.company else None,
                'last_login': user.last_login or user.created_at,
                'created_at': user.created_at,
                'avatar': user.avatar.url if user.avatar else None,
            })

        serializer = SupportUserResultSerializer(results, many=True)
        return paginator.get_paginated_response(serializer.data)


class SupportUserDetailView(APIView):
    """
    GET /api/admin/support/users/{userId}/
    Get detailed user information for support.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, user_id):
        try:
            user = User.objects.select_related('company', 'agency').get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'detail': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Count related data
        login_count = UserSession.objects.filter(user=user).count()
        application_count = Application.objects.filter(applicant=user).count()
        saved_jobs_count = 0  # TODO: if SavedJob model exists

        # Notification preferences (placeholder)
        notification_prefs = {}

        data = {
            'id': user.id,
            'name': user.get_full_name(),
            'email': user.email,
            'type': _map_user_role_to_type(user.role),
            'status': _map_user_status(user.status),
            'company': user.company.name if user.company else None,
            'company_id': user.company.id if user.company else None,
            'last_login': user.last_login or user.created_at,
            'created_at': user.created_at,
            'avatar': user.avatar.url if user.avatar else None,
            'phone': user.phone or None,
            'email_verified': user.email_verified,
            'mfa_enabled': user.mfa_enabled,
            'loginCount': login_count,
            'applicationCount': application_count,
            'savedJobsCount': saved_jobs_count,
            'notificationPreferences': notification_prefs,
        }

        serializer = SupportUserDetailSerializer(data)
        return Response(serializer.data)


class SupportUserTimelineView(APIView):
    """
    GET /api/admin/support/users/{userId}/timeline/?event_type=<type>&start_date=<date>&end_date=<date>
    Get user activity timeline.
    """
    permission_classes = [IsAuthenticated, IsAdmin]
    pagination_class = StandardPagination

    def get(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'detail': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        event_type = request.query_params.get('event_type')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        # Query audit logs for this user
        qs = AuditLog.objects.filter(
            Q(actor=user) | Q(target_type='User', target_id=str(user.id))
        )

        if start_date:
            qs = qs.filter(created_at__gte=start_date)
        if end_date:
            qs = qs.filter(created_at__lte=end_date)

        qs = qs.order_by('-created_at')

        # Paginate
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(qs, request)

        # Build timeline events
        events = []
        for log in page:
            event_id = str(log.id)
            event_dict = {
                'id': event_id,
                'type': self._map_action_to_event_type(log.action),
                'description': f'{log.action} on {log.target_type}',
                'timestamp': log.created_at,
                'ip': log.details.get('ip') if log.details else None,
                'user_agent': log.details.get('user_agent') if log.details else None,
                'user': log.actor.get_full_name() if log.actor else None,
                'metadata': log.details or {},
            }
            events.append(event_dict)

        serializer = TimelineEventSerializer(events, many=True)
        return paginator.get_paginated_response(serializer.data)

    def _map_action_to_event_type(self, action):
        """Map audit log action to timeline event type."""
        action_lower = action.lower()
        if 'login' in action_lower:
            return 'login'
        elif 'logout' in action_lower:
            return 'logout'
        elif 'profile' in action_lower or 'update' in action_lower:
            return 'profile_update'
        elif 'application' in action_lower:
            return 'application'
        elif 'job' in action_lower and 'view' in action_lower:
            return 'job_view'
        elif 'password' in action_lower:
            return 'password_reset'
        elif 'email' in action_lower and 'verif' in action_lower:
            return 'email_verified'
        else:
            return 'profile_update'


# =============================================================================
# Company Lookup
# =============================================================================


class SupportCompanySearchView(APIView):
    """
    GET /api/admin/support/companies/?q=<query>&status=<status>
    Search companies by name or domain.
    """
    permission_classes = [IsAuthenticated, IsAdmin]
    pagination_class = StandardPagination

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        company_status = request.query_params.get('status')

        qs = Company.objects.annotate(
            job_count=Count('jobs'),
            employee_count=Count('users')
        ).all()

        # Search by name or domain
        if query:
            qs = qs.filter(
                Q(name__icontains=query) | Q(domain__icontains=query)
            )

        # Filter by status
        if company_status:
            qs = qs.filter(status=company_status)

        qs = qs.order_by('-created_at')

        # Paginate
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(qs, request)

        # Build results
        results = []
        for company in page:
            results.append({
                'id': company.id,
                'name': company.name,
                'slug': company.slug,
                'domain': company.domain or None,
                'status': company.status,
                'job_count': company.job_count,
                'employee_count': company.employee_count,
                'created_at': company.created_at,
                'logo': company.logo.url if company.logo else None,
            })

        serializer = SupportCompanyResultSerializer(results, many=True)
        return paginator.get_paginated_response(serializer.data)


class SupportCompanyDetailView(APIView):
    """
    GET /api/admin/support/companies/{companyId}/
    Get detailed company information for support.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, company_id):
        try:
            company = Company.objects.annotate(
                job_count=Count('jobs'),
                employee_count=Count('users')
            ).get(id=company_id)
        except Company.DoesNotExist:
            return Response(
                {'detail': 'Company not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Count active jobs
        active_jobs_count = Job.objects.filter(
            company=company, status='published'
        ).count()

        # Total applications
        total_applications = Application.objects.filter(
            job__company=company
        ).count()

        # Total payments
        total_payments = Invoice.objects.filter(
            company=company, status='paid'
        ).aggregate(total=Sum('amount'))['total'] or 0

        # Team members
        team_members = []
        company_users = CompanyUser.objects.filter(company=company).select_related('user')
        for cu in company_users:
            team_members.append({
                'id': cu.user.id,
                'name': cu.user.get_full_name(),
                'email': cu.user.email,
                'role': cu.role,
            })

        data = {
            'id': company.id,
            'name': company.name,
            'slug': company.slug,
            'domain': company.domain or None,
            'status': company.status,
            'job_count': company.job_count,
            'employee_count': company.employee_count,
            'created_at': company.created_at,
            'logo': company.logo.url if company.logo else None,
            'website': company.website or None,
            'industry': company.industry or None,
            'size': company.size or None,
            'billing_status': company.billing_status,
            'subscription': None,  # TODO: if subscription model exists
            'total_payments': total_payments,
            'active_jobs_count': active_jobs_count,
            'total_applications': total_applications,
            'teamMembers': team_members,
        }

        serializer = SupportCompanyDetailSerializer(data)
        return Response(serializer.data)


class SupportCompanyTimelineView(APIView):
    """
    GET /api/admin/support/companies/{companyId}/timeline/?event_type=<type>&start_date=<date>&end_date=<date>
    Get company activity timeline.
    """
    permission_classes = [IsAuthenticated, IsAdmin]
    pagination_class = StandardPagination

    def get(self, request, company_id):
        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            return Response(
                {'detail': 'Company not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        event_type = request.query_params.get('event_type')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        # Query audit logs for this company
        qs = AuditLog.objects.filter(
            target_type='Company', target_id=str(company.id)
        )

        if start_date:
            qs = qs.filter(created_at__gte=start_date)
        if end_date:
            qs = qs.filter(created_at__lte=end_date)

        qs = qs.order_by('-created_at')

        # Paginate
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(qs, request)

        # Build timeline events
        events = []
        for log in page:
            event_id = str(log.id)
            event_dict = {
                'id': event_id,
                'type': self._map_action_to_event_type(log.action),
                'description': f'{log.action} on {log.target_type}',
                'timestamp': log.created_at,
                'ip': log.details.get('ip') if log.details else None,
                'user_agent': log.details.get('user_agent') if log.details else None,
                'user': log.actor.get_full_name() if log.actor else None,
                'metadata': log.details or {},
            }
            events.append(event_dict)

        serializer = TimelineEventSerializer(events, many=True)
        return paginator.get_paginated_response(serializer.data)

    def _map_action_to_event_type(self, action):
        """Map audit log action to timeline event type."""
        action_lower = action.lower()
        if 'job' in action_lower and 'post' in action_lower:
            return 'job_posted'
        elif 'job' in action_lower and 'update' in action_lower:
            return 'job_updated'
        elif 'job' in action_lower and 'close' in action_lower:
            return 'job_closed'
        elif 'team' in action_lower and 'add' in action_lower:
            return 'team_member_added'
        elif 'team' in action_lower and 'remove' in action_lower:
            return 'team_member_removed'
        elif 'payment' in action_lower or 'package' in action_lower:
            return 'package_purchased'
        elif 'settings' in action_lower:
            return 'settings_changed'
        else:
            return 'settings_changed'


# =============================================================================
# Impersonation
# =============================================================================

# In-memory store for impersonation sessions (use Redis in production)
_impersonation_sessions = {}


class ImpersonateUserView(APIView):
    """
    POST /api/admin/support/impersonate/
    Body: { user_id: number, reason: string }
    Start an impersonation session.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        user_id = request.data.get('user_id')
        reason = request.data.get('reason', '')

        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'detail': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Generate impersonation token
        token = str(uuid.uuid4())
        expires_at = timezone.now() + timedelta(hours=1)

        session_data = {
            'token': token,
            'expires_at': expires_at,
            'target_user_id': target_user.id,
            'target_user_email': target_user.email,
            'admin_user_id': request.user.id,
            'reason': reason,
        }

        # Store session
        _impersonation_sessions[token] = session_data

        # Log impersonation start
        AuditLog.objects.create(
            actor=request.user,
            action='impersonate_user',
            target_type='User',
            target_id=str(target_user.id),
            details={'reason': reason}
        )

        serializer = ImpersonationSessionSerializer(session_data)
        return Response(serializer.data)


class EndImpersonationView(APIView):
    """
    POST /api/admin/support/impersonate/end/
    End an active impersonation session.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        # Get token from request (could be in headers or body)
        token = request.data.get('token') or request.headers.get('X-Impersonation-Token')

        if token and token in _impersonation_sessions:
            session = _impersonation_sessions[token]
            # Log impersonation end
            AuditLog.objects.create(
                actor=request.user,
                action='end_impersonation',
                target_type='User',
                target_id=str(session['target_user_id']),
                details={'reason': 'Session ended by admin'}
            )
            del _impersonation_sessions[token]

        return Response({'message': 'Impersonation session ended'})


class ImpersonationStatusView(APIView):
    """
    GET /api/admin/support/impersonate/status/
    Get current impersonation status.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        token = request.headers.get('X-Impersonation-Token')

        if token and token in _impersonation_sessions:
            session = _impersonation_sessions[token]
            if session['expires_at'] > timezone.now():
                data = {
                    'is_impersonating': True,
                    'session': session,
                }
                serializer = ImpersonationStatusSerializer(data)
                return Response(serializer.data)
            else:
                # Session expired
                del _impersonation_sessions[token]

        return Response({
            'isImpersonating': False,
            'session': None,
        })


# =============================================================================
# Data Export
# =============================================================================

# In-memory store for export jobs (use Redis + Celery in production)
_export_jobs = {}


class ExportUserDataView(APIView):
    """
    POST /api/admin/support/export/user/
    Body: { user_id: number, format: string, date_range: {start, end}, include_pii: bool, sections: string[] }
    Request a data export for a user (GDPR compliance).
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        user_id = request.data.get('user_id')
        format_type = request.data.get('format', 'json')
        date_range = request.data.get('date_range')
        include_pii = request.data.get('include_pii', False)
        sections = request.data.get('sections', [])

        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'detail': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Create export job
        job_id = str(uuid.uuid4())
        job_data = {
            'id': job_id,
            'status': 'pending',
            'download_url': None,
            'expires_at': None,
            'created_at': timezone.now(),
            'completed_at': None,
            'error': None,
            'user_id': user_id,
            'format': format_type,
        }

        _export_jobs[job_id] = job_data

        # Log export request
        AuditLog.objects.create(
            actor=request.user,
            action='export_user_data',
            target_type='User',
            target_id=str(user.id),
            details={'format': format_type, 'sections': sections}
        )

        # In production, this would trigger a Celery task
        # For now, we'll simulate immediate completion
        job_data['status'] = 'completed'
        job_data['completed_at'] = timezone.now()
        job_data['download_url'] = f'/api/admin/support/export/{job_id}/download/'
        job_data['expires_at'] = timezone.now() + timedelta(days=7)

        serializer = DataExportJobSerializer(job_data)
        return Response(serializer.data)


class ExportCompanyDataView(APIView):
    """
    POST /api/admin/support/export/company/
    Body: { company_id: number, format: string, date_range: {start, end}, include_pii: bool, sections: string[] }
    Request a data export for a company.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        company_id = request.data.get('company_id')
        format_type = request.data.get('format', 'json')
        date_range = request.data.get('date_range')
        include_pii = request.data.get('include_pii', False)
        sections = request.data.get('sections', [])

        if not company_id:
            return Response(
                {'error': 'company_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            return Response(
                {'detail': 'Company not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Create export job
        job_id = str(uuid.uuid4())
        job_data = {
            'id': job_id,
            'status': 'pending',
            'download_url': None,
            'expires_at': None,
            'created_at': timezone.now(),
            'completed_at': None,
            'error': None,
            'company_id': company_id,
            'format': format_type,
        }

        _export_jobs[job_id] = job_data

        # Log export request
        AuditLog.objects.create(
            actor=request.user,
            action='export_company_data',
            target_type='Company',
            target_id=str(company.id),
            details={'format': format_type, 'sections': sections}
        )

        # Simulate immediate completion
        job_data['status'] = 'completed'
        job_data['completed_at'] = timezone.now()
        job_data['download_url'] = f'/api/admin/support/export/{job_id}/download/'
        job_data['expires_at'] = timezone.now() + timedelta(days=7)

        serializer = DataExportJobSerializer(job_data)
        return Response(serializer.data)


class ExportJobStatusView(APIView):
    """
    GET /api/admin/support/export/{jobId}/
    Get status of a data export job.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, job_id):
        if job_id not in _export_jobs:
            return Response(
                {'detail': 'Export job not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        job_data = _export_jobs[job_id]
        serializer = DataExportJobSerializer(job_data)
        return Response(serializer.data)


class ListExportJobsView(APIView):
    """
    GET /api/admin/support/export/?page=<page>
    List all export jobs for the current admin.
    """
    permission_classes = [IsAuthenticated, IsAdmin]
    pagination_class = StandardPagination

    def get(self, request):
        # In production, filter by admin user
        jobs = list(_export_jobs.values())
        jobs.sort(key=lambda x: x['created_at'], reverse=True)

        # Simple manual pagination
        page_num = int(request.query_params.get('page', 1))
        page_size = 20
        start = (page_num - 1) * page_size
        end = start + page_size
        page_jobs = jobs[start:end]

        serializer = DataExportJobSerializer(page_jobs, many=True)

        return Response({
            'count': len(jobs),
            'next': None,
            'previous': None,
            'results': serializer.data,
        })


# =============================================================================
# Quick Actions
# =============================================================================


class AdminResetUserPasswordView(APIView):
    """
    POST /api/admin/support/users/{userId}/reset-password/
    Reset a user's password and send them a reset email.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'detail': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Log action
        AuditLog.objects.create(
            actor=request.user,
            action='admin_reset_password',
            target_type='User',
            target_id=str(user.id),
            details={'reason': 'Admin support action'}
        )

        # In production, generate reset token and send email
        # For now, return success message
        return Response({'message': 'Password reset email sent to user'})


class AdminVerifyUserEmailView(APIView):
    """
    POST /api/admin/support/users/{userId}/verify-email/
    Verify a user's email manually.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'detail': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        user.verify_email()
        user.save()

        # Log action
        AuditLog.objects.create(
            actor=request.user,
            action='admin_verify_email',
            target_type='User',
            target_id=str(user.id),
            details={'reason': 'Admin support action'}
        )

        return Response({'message': 'User email verified successfully'})


class UpdateUserStatusView(APIView):
    """
    PATCH /api/admin/support/users/{userId}/status/
    Update a user's status (active, suspended, banned).
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'detail': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        new_status = request.data.get('status')
        reason = request.data.get('reason', '')

        if not new_status:
            return Response(
                {'error': 'status is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Map frontend status to backend status
        status_map = {
            'active': 'active',
            'inactive': 'pending',
            'suspended': 'suspended',
            'banned': 'suspended',
        }
        backend_status = status_map.get(new_status)

        if not backend_status:
            return Response(
                {'error': 'Invalid status value'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.status = backend_status
        user.save()

        # Log action
        AuditLog.objects.create(
            actor=request.user,
            action='update_user_status',
            target_type='User',
            target_id=str(user.id),
            details={'new_status': new_status, 'reason': reason}
        )

        # Return updated user data
        data = {
            'id': user.id,
            'name': user.get_full_name(),
            'email': user.email,
            'type': _map_user_role_to_type(user.role),
            'status': _map_user_status(user.status),
            'company': user.company.name if user.company else None,
            'company_id': user.company.id if user.company else None,
            'last_login': user.last_login or user.created_at,
            'created_at': user.created_at,
            'avatar': user.avatar.url if user.avatar else None,
        }

        serializer = SupportUserResultSerializer(data)
        return Response(serializer.data)


class UpdateCompanyStatusView(APIView):
    """
    PATCH /api/admin/support/companies/{companyId}/status/
    Update a company's status (verified, suspended).
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, company_id):
        try:
            company = Company.objects.annotate(
                job_count=Count('jobs'),
                employee_count=Count('users')
            ).get(id=company_id)
        except Company.DoesNotExist:
            return Response(
                {'detail': 'Company not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        new_status = request.data.get('status')
        reason = request.data.get('reason', '')

        if not new_status:
            return Response(
                {'error': 'status is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate status
        valid_statuses = ['verified', 'pending', 'unverified', 'suspended']
        if new_status not in valid_statuses:
            return Response(
                {'error': 'Invalid status value'},
                status=status.HTTP_400_BAD_REQUEST
            )

        company.status = new_status
        company.save()

        # Log action
        AuditLog.objects.create(
            actor=request.user,
            action='update_company_status',
            target_type='Company',
            target_id=str(company.id),
            details={'new_status': new_status, 'reason': reason}
        )

        # Return updated company data
        data = {
            'id': company.id,
            'name': company.name,
            'slug': company.slug,
            'domain': company.domain or None,
            'status': company.status,
            'job_count': company.job_count,
            'employee_count': company.employee_count,
            'created_at': company.created_at,
            'logo': company.logo.url if company.logo else None,
        }

        serializer = SupportCompanyResultSerializer(data)
        return Response(serializer.data)
