"""
Custom permission classes for the API.
"""
from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Permission for admin users only."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'admin'
        )


class IsSuperAdmin(BasePermission):
    """Permission for super admin users only."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'admin'
            and request.user.is_superuser
        )


class IsEmployer(BasePermission):
    """Permission for employer users."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'employer'
        )


class IsAgency(BasePermission):
    """Permission for agency users."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'agency'
        )


class IsCandidate(BasePermission):
    """Permission for candidate users."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'candidate'
        )


class IsCompanyMember(BasePermission):
    """Permission for users who belong to a specific company."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.company_id is not None
        )

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        if not request.user.company_id:
            return False

        company_id = getattr(obj, 'company_id', None)
        if company_id is None:
            return False

        return request.user.company_id == company_id


class IsAgencyMember(BasePermission):
    """Permission for users who belong to a specific agency."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.agency_id is not None
        )

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        if not request.user.agency_id:
            return False

        agency_id = getattr(obj, 'agency_id', None)
        if agency_id is None:
            return False

        return request.user.agency_id == agency_id


class CompanyRolePermission(BasePermission):
    """
    Permission based on company role.
    Subclass and set allowed_roles to restrict access.
    """
    allowed_roles = ['owner', 'admin', 'recruiter', 'viewer']

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if not request.user.company_id:
            return False

        # Import here to avoid circular imports
        from apps.companies.models import CompanyUser

        membership = CompanyUser.objects.filter(
            user=request.user,
            company_id=request.user.company_id
        ).first()

        if not membership:
            return False

        return membership.role in self.allowed_roles


class IsCompanyOwnerOrAdmin(CompanyRolePermission):
    """Permission for company owners or admins."""
    allowed_roles = ['owner', 'admin']


class IsCompanyRecruiter(CompanyRolePermission):
    """Permission for company recruiters and above."""
    allowed_roles = ['owner', 'admin', 'recruiter']


class IsOwner(BasePermission):
    """Permission for object owners."""

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        # Check various owner field names
        owner_id = (
            getattr(obj, 'user_id', None)
            or getattr(obj, 'owner_id', None)
            or getattr(obj, 'candidate_id', None)
        )

        return owner_id == request.user.id


class HasTeamManagement(BasePermission):
    """Check if company has team management feature enabled."""
    message = 'Team management requires a subscription with this feature enabled.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not request.user.company:
            return False
        # Admin override takes priority
        if request.user.company.team_management_enabled:
            return True
        # Check if any active subscription's package has team_management
        from apps.billing.models import Subscription
        return Subscription.objects.filter(
            company=request.user.company,
            status='active',
            package__team_management=True,
        ).exists()


class IsMarketingAdmin(BasePermission):
    """Permission for marketing admin users.

    Grants access to users who are either platform admins
    or have the is_marketing_admin flag set.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (
            request.user.role == 'admin'
            or request.user.is_marketing_admin
        )


class IsMarketingAnalyst(BasePermission):
    """Permission for marketing analyst users (read-only).

    Grants read-only access to users who are platform admins,
    marketing admins, or have the is_marketing_analyst flag set.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # Marketing admins and platform admins get full access
        if request.user.role == 'admin' or request.user.is_marketing_admin:
            return True
        # Analysts only get read access
        if request.user.is_marketing_analyst:
            return request.method in ('GET', 'HEAD', 'OPTIONS')
        return False


class ReadOnly(BasePermission):
    """Permission for read-only access."""

    def has_permission(self, request, view):
        return request.method in ('GET', 'HEAD', 'OPTIONS')
