"""
User serializers for Orion API.
"""
from datetime import timedelta

from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from .models import User, UserSession
from apps.audit.models import AuditLog
from apps.companies.models import Company, CompanyUser, Agency, AgencyUser


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user details."""

    full_name = serializers.CharField(source='get_full_name', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'entity_id', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'status', 'phone', 'avatar', 'bio',
            'company', 'agency', 'email_verified', 'mfa_enabled',
            'onboarding_completed', 'created_at', 'last_login'
        ]
        read_only_fields = ['id', 'entity_id', 'email', 'role', 'status', 'email_verified', 'onboarding_completed', 'created_at', 'last_login']


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""

    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    company_name = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['email', 'password', 'password_confirm', 'first_name', 'last_name', 'role', 'company_name']

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password_confirm'):
            raise serializers.ValidationError({'password_confirm': "Passwords don't match"})

        # Only allow certain roles during registration
        allowed_roles = ['candidate', 'employer', 'agency']
        if attrs.get('role', 'candidate') not in allowed_roles:
            raise serializers.ValidationError({'role': 'Invalid role for registration'})

        return attrs

    def create(self, validated_data):
        company_name = validated_data.pop('company_name', None)
        password = validated_data.pop('password')

        with transaction.atomic():
            user = User(**validated_data)
            user.set_password(password)
            user.save()

            # Create Company and CompanyUser for employers
            if user.role == 'employer':
                company = Company.objects.create(
                    name=company_name or f"{user.first_name}'s Company"
                )
                user.company = company
                user.save()
                CompanyUser.objects.create(
                    company=company,
                    user=user,
                    role='owner'
                )

            # Create Agency and AgencyUser for agencies
            elif user.role == 'agency':
                agency = Agency.objects.create(
                    name=company_name or f"{user.first_name}'s Agency"
                )
                user.agency = agency
                user.save()
                AgencyUser.objects.create(
                    agency=agency,
                    user=user,
                    role='owner'
                )

            return user


class LoginSerializer(serializers.Serializer):
    """Serializer for user login."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        from django.utils import timezone

        email = attrs.get('email')
        password = attrs.get('password')
        generic_error = 'Invalid email or password'

        # Check lockout — use generic message to prevent user enumeration
        try:
            user_check = User.objects.get(email=email)
            if user_check.locked_until and user_check.locked_until > timezone.now():
                raise serializers.ValidationError(generic_error)
        except User.DoesNotExist:
            pass

        user = authenticate(username=email, password=password)

        if not user:
            raise serializers.ValidationError(generic_error)

        if user.status in ('suspended', 'pending'):
            raise serializers.ValidationError(generic_error)

        attrs['user'] = user
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for password reset request."""

    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for password reset confirmation."""

    token = serializers.CharField()
    password = serializers.CharField(validators=[validate_password])
    password_confirm = serializers.CharField()

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': "Passwords don't match"})
        return attrs


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer for password change."""

    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(write_only=True)

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect')
        return value

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({'new_password_confirm': "Passwords don't match"})
        return attrs


class EmailVerificationSerializer(serializers.Serializer):
    """Serializer for email verification."""

    token = serializers.CharField()


class UserSessionSerializer(serializers.ModelSerializer):
    """Serializer for user sessions."""

    browser = serializers.SerializerMethodField()
    device = serializers.SerializerMethodField()
    last_active = serializers.DateTimeField(source='last_activity')
    is_current = serializers.SerializerMethodField()

    class Meta:
        model = UserSession
        fields = [
            'id', 'ip_address', 'browser', 'device',
            'location', 'last_active', 'is_current'
        ]

    def _parse_user_agent(self, ua):
        """Parse user agent string into browser and device."""
        ua_lower = (ua or '').lower()

        # Detect browser
        if 'edg/' in ua_lower or 'edge/' in ua_lower:
            browser = 'Edge'
        elif 'opr/' in ua_lower or 'opera' in ua_lower:
            browser = 'Opera'
        elif 'chrome/' in ua_lower and 'safari/' in ua_lower:
            browser = 'Chrome'
        elif 'firefox/' in ua_lower:
            browser = 'Firefox'
        elif 'safari/' in ua_lower:
            browser = 'Safari'
        else:
            browser = 'Unknown browser'

        # Detect device / OS
        if 'iphone' in ua_lower:
            device = 'iPhone'
        elif 'ipad' in ua_lower:
            device = 'iPad'
        elif 'android' in ua_lower and 'mobile' in ua_lower:
            device = 'Android Phone'
        elif 'android' in ua_lower:
            device = 'Android Tablet'
        elif 'macintosh' in ua_lower or 'mac os' in ua_lower:
            device = 'macOS'
        elif 'windows' in ua_lower:
            device = 'Windows'
        elif 'linux' in ua_lower:
            device = 'Linux'
        else:
            device = 'Unknown device'

        return browser, device

    def get_browser(self, obj):
        browser, _ = self._parse_user_agent(obj.user_agent)
        return browser

    def get_device(self, obj):
        _, device = self._parse_user_agent(obj.user_agent)
        return device

    def get_is_current(self, obj):
        request = self.context.get('request')
        if not request or not request.session.session_key:
            return False
        return obj.session_key == request.session.session_key


class AdminUserSerializer(serializers.ModelSerializer):
    """Serializer for admin user management."""

    full_name = serializers.CharField(source='get_full_name', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True, allow_null=True)
    agency_name = serializers.CharField(source='agency.name', read_only=True, allow_null=True)
    company_id = serializers.IntegerField(read_only=True, allow_null=True)
    agency_id = serializers.IntegerField(read_only=True, allow_null=True)

    class Meta:
        model = User
        fields = [
            'id', 'entity_id', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'status', 'phone', 'avatar', 'bio',
            'company', 'company_name', 'company_id',
            'agency', 'agency_name', 'agency_id',
            'email_verified', 'mfa_enabled',
            'is_marketing_admin', 'is_marketing_analyst',
            'is_active', 'is_staff',
            'last_login', 'last_login_ip', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'entity_id', 'created_at', 'updated_at', 'last_login',
            'role', 'status', 'is_staff', 'is_active', 'mfa_enabled',
            'is_marketing_admin', 'is_marketing_analyst',
        ]


class AdminUserCreateSerializer(serializers.ModelSerializer):
    """Serializer for admin creating users."""

    password = serializers.CharField(write_only=True, required=False, validators=[validate_password])

    class Meta:
        model = User
        fields = [
            'email', 'password', 'first_name', 'last_name',
            'role', 'status', 'company', 'agency',
        ]

    def validate_role(self, value):
        """Prevent creating admin users via the API — use createsuperuser instead."""
        if value == 'admin':
            raise serializers.ValidationError(
                'Cannot create admin users via the API. Use the createsuperuser management command.'
            )
        return value

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user


class AdminUserStatsSerializer(serializers.Serializer):
    """Serializer for admin user statistics."""

    total = serializers.IntegerField()
    active = serializers.IntegerField()
    pending = serializers.IntegerField()
    suspended = serializers.IntegerField()
    by_role = serializers.DictField(child=serializers.IntegerField())


class UserActivitySerializer(serializers.ModelSerializer):
    """Serializer for user activity matching frontend UserActivity interface."""

    user_id = serializers.IntegerField(source='actor_id', read_only=True)
    type = serializers.CharField(source='action', read_only=True)
    target = serializers.CharField(source='target_repr', read_only=True, allow_null=True)
    metadata = serializers.JSONField(source='changes', read_only=True)
    location = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = ['id', 'user_id', 'type', 'action', 'target', 'metadata',
                  'ip_address', 'user_agent', 'location', 'status', 'created_at']

    def get_location(self, obj):
        """Get location from LoginAttempt if this is a login/logout action."""
        if obj.action in ['login', 'logout']:
            from apps.audit.models import LoginAttempt
            attempt = LoginAttempt.objects.filter(
                user_id=obj.actor_id,
                created_at__gte=obj.created_at - timedelta(seconds=5),
                created_at__lte=obj.created_at + timedelta(seconds=5)
            ).first()
            if attempt:
                return attempt.location_display
        return None

    def get_status(self, obj):
        """Get status from LoginAttempt if this is a login action."""
        if obj.action == 'login':
            from apps.audit.models import LoginAttempt
            attempt = LoginAttempt.objects.filter(
                user_id=obj.actor_id,
                created_at__gte=obj.created_at - timedelta(seconds=5),
                created_at__lte=obj.created_at + timedelta(seconds=5)
            ).first()
            if attempt:
                return attempt.status
        return None


class ResumeSerializer(serializers.Serializer):
    """Serializer for user resume."""

    id = serializers.IntegerField(source='pk', read_only=True)
    filename = serializers.CharField(source='resume_filename', read_only=True)
    file_url = serializers.SerializerMethodField()
    uploaded_at = serializers.DateTimeField(source='updated_at', read_only=True)

    def get_file_url(self, obj):
        if obj.resume:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.resume.url)
            return obj.resume.url
        return None


class PrivacySettingsSerializer(serializers.ModelSerializer):
    """Serializer for user privacy settings."""

    class Meta:
        model = User
        fields = [
            'profile_visible', 'show_email', 'show_phone',
            'searchable', 'allow_recruiter_contact'
        ]


class DashboardStatsSerializer(serializers.Serializer):
    """Serializer for candidate dashboard stats."""

    total_applications = serializers.IntegerField()
    interviews = serializers.IntegerField()
    offers = serializers.IntegerField()
    saved_jobs = serializers.IntegerField()
    profile_views = serializers.IntegerField()
    last_7_days = serializers.DictField(child=serializers.IntegerField())


class ProfileCompletionSerializer(serializers.Serializer):
    """Serializer for profile completion."""

    percentage = serializers.IntegerField()
    sections = serializers.DictField(child=serializers.BooleanField())


class EmailCheckSerializer(serializers.Serializer):
    """Serializer for email existence check."""

    email = serializers.EmailField()


class SendLoginCodeSerializer(serializers.Serializer):
    """Serializer for sending a login code."""

    email = serializers.EmailField()


class VerifyLoginCodeSerializer(serializers.Serializer):
    """Serializer for verifying a login code."""

    email = serializers.EmailField()
    code = serializers.CharField(max_length=6, min_length=6)
