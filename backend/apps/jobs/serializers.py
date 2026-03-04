"""
Job serializers for Orion API.
"""
from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta

from apps.companies.serializers import CompanySerializer
from apps.companies.models import Company, Agency
from .models import Job, JobReport, JobView

CANADIAN_PROVINCES = [
    'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'
]

PROVINCE_NAME_TO_CODE = {
    'alberta': 'AB', 'british columbia': 'BC', 'manitoba': 'MB',
    'new brunswick': 'NB', 'newfoundland and labrador': 'NL',
    'nova scotia': 'NS', 'northwest territories': 'NT', 'nunavut': 'NU',
    'ontario': 'ON', 'prince edward island': 'PE', 'quebec': 'QC',
    'saskatchewan': 'SK', 'yukon': 'YT',
}


def _get_valid_category_slugs():
    """Return set of active category slugs from the Category table.

    Falls back to Job.CATEGORY_CHOICES slugs if the table doesn't exist yet
    (e.g. during early migrations).
    """
    try:
        from apps.moderation.models import Category
        slugs = set(Category.objects.filter(is_active=True).values_list('slug', flat=True))
        if slugs:
            return slugs
    except Exception:
        pass
    # Fallback to hardcoded choices
    return {slug for slug, _ in Job.CATEGORY_CHOICES}


def validate_dynamic_category(value):
    """Validate that a category slug exists in the active Category table."""
    if not value:
        return value
    valid = _get_valid_category_slugs()
    if value not in valid:
        sorted_valid = sorted(valid)
        raise serializers.ValidationError(
            f'Must be one of: {", ".join(sorted_valid)}'
        )
    return value


class JobListSerializer(serializers.ModelSerializer):
    """Serializer for job listings."""

    company_name = serializers.CharField(source='company.name', read_only=True)
    company_logo = serializers.ImageField(source='company.logo', read_only=True)
    location_display = serializers.CharField(read_only=True)
    salary_display = serializers.CharField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = Job
        fields = [
            'id', 'job_id', 'title', 'slug', 'company', 'company_name', 'company_logo',
            'employment_type', 'experience_level', 'category',
            'address', 'city', 'state', 'postal_code', 'country', 'location_type', 'location_display',
            'salary_min', 'salary_max', 'salary_currency', 'salary_period',
            'show_salary', 'salary_display',
            'status', 'featured', 'urgent', 'posted_at', 'expires_at',
            'scheduled_publish_at', 'closed_at', 'deleted_at',
            'is_active', 'views', 'applications_count', 'last_refreshed_at',
            'created_at', 'updated_at'
        ]


class JobDetailSerializer(serializers.ModelSerializer):
    """Detailed job serializer."""

    company = CompanySerializer(read_only=True)
    location_display = serializers.CharField(read_only=True)
    salary_display = serializers.CharField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = Job
        fields = [
            'id', 'job_id', 'title', 'slug', 'company', 'department',
            'employment_type', 'experience_level', 'category',
            'description', 'responsibilities', 'requirements',
            'nice_to_have', 'skills', 'benefits',
            'address', 'city', 'state', 'postal_code', 'country', 'location_type', 'timezone',
            'location_display',
            'salary_min', 'salary_max', 'salary_currency', 'salary_period',
            'show_salary', 'salary_display',
            'equity', 'equity_min', 'equity_max',
            'apply_method', 'apply_email', 'apply_url', 'apply_instructions',
            'status', 'featured', 'urgent',
            'posted_at', 'expires_at', 'scheduled_publish_at',
            'closed_at', 'deleted_at', 'is_active',
            'views', 'applications_count',
            'meta_title', 'meta_description',
            'created_at', 'updated_at',
            'last_refreshed_at', 'spam_score'
        ]


class JobCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating jobs."""

    class Meta:
        model = Job
        fields = [
            'title', 'department', 'employment_type', 'experience_level', 'category',
            'description', 'responsibilities', 'requirements',
            'nice_to_have', 'skills', 'benefits',
            'address', 'city', 'state', 'postal_code', 'country', 'location_type', 'timezone',
            'salary_min', 'salary_max', 'salary_currency', 'salary_period', 'show_salary',
            'equity', 'equity_min', 'equity_max',
            'apply_method', 'apply_email', 'apply_url', 'apply_instructions',
            'featured', 'urgent',
            'meta_title', 'meta_description'
        ]

    def validate_category(self, value):
        return validate_dynamic_category(value)

    def validate_country(self, value):
        if value and value.lower() not in ('canada', 'ca'):
            raise serializers.ValidationError("Jobs must be located in Canada.")
        return "Canada"  # Normalize to full name

    def validate_state(self, value):
        if value and value.upper() not in CANADIAN_PROVINCES:
            if value.lower() in PROVINCE_NAME_TO_CODE:
                return PROVINCE_NAME_TO_CODE[value.lower()]
            raise serializers.ValidationError(
                "Must be a valid Canadian province or territory code."
            )
        return value.upper() if value else value

    def validate_salary_currency(self, value):
        if value and value.upper() != 'CAD':
            raise serializers.ValidationError(
                "Currency must be CAD for Canadian jobs."
            )
        return 'CAD'

    def validate(self, attrs):
        # Validate salary range
        salary_min = attrs.get('salary_min')
        salary_max = attrs.get('salary_max')
        if salary_min and salary_max and salary_min > salary_max:
            raise serializers.ValidationError({
                'salary_max': 'Maximum salary must be greater than minimum salary'
            })

        # Validate apply method
        apply_method = attrs.get('apply_method', 'internal')
        if apply_method == 'email' and not attrs.get('apply_email'):
            raise serializers.ValidationError({
                'apply_email': 'Email is required for email application method'
            })
        if apply_method == 'external' and not attrs.get('apply_url'):
            raise serializers.ValidationError({
                'apply_url': 'URL is required for external application method'
            })

        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        user = request.user

        # Set company from user or agency client
        if user.company:
            validated_data['company'] = user.company
        elif user.agency:
            validated_data['agency'] = user.agency
            # Company should be specified in request for agency users
            if 'company' not in validated_data:
                raise serializers.ValidationError({
                    'company': 'Company is required for agency job postings'
                })

        validated_data['posted_by'] = user

        return super().create(validated_data)


class BulkJobImportItemSerializer(serializers.ModelSerializer):
    """
    Serializer for a single job row in a bulk import.
    Used by admin only — does NOT auto-set company from request user.
    Accepts optional company_name/company_email for agency mode.
    """

    company_name = serializers.CharField(required=False, allow_blank=True, default='')
    company_email = serializers.EmailField(required=False, allow_blank=True, default='')

    def validate_category(self, value):
        return validate_dynamic_category(value)

    class Meta:
        model = Job
        fields = [
            'title', 'department', 'employment_type', 'experience_level', 'category',
            'description', 'responsibilities', 'requirements',
            'nice_to_have', 'skills', 'benefits',
            'address', 'city', 'state', 'postal_code', 'country', 'location_type', 'timezone',
            'salary_min', 'salary_max', 'salary_currency', 'salary_period', 'show_salary',
            'equity', 'equity_min', 'equity_max',
            'apply_method', 'apply_email', 'apply_url', 'apply_instructions',
            'meta_title', 'meta_description',
            # Agency mode fields (not on model, handled by view)
            'company_name', 'company_email',
        ]

    def validate(self, attrs):
        import re

        # Strip HTML from text fields
        for field in ('title', 'description', 'apply_instructions', 'meta_title', 'meta_description'):
            val = attrs.get(field)
            if val and isinstance(val, str):
                attrs[field] = re.sub(r'<[^>]*>', '', val).strip()

        # Strip HTML from list fields
        for field in ('responsibilities', 'requirements', 'nice_to_have', 'skills', 'benefits'):
            val = attrs.get(field)
            if val and isinstance(val, list):
                attrs[field] = [
                    re.sub(r'<[^>]*>', '', item).strip()
                    for item in val if isinstance(item, str) and item.strip()
                ]

        # Validate title minimum length
        title = attrs.get('title', '')
        if len(title) < 3:
            raise serializers.ValidationError({
                'title': 'Title must be at least 3 characters'
            })

        # Validate description minimum length
        description = attrs.get('description', '')
        if len(description) < 10:
            raise serializers.ValidationError({
                'description': 'Description must be at least 10 characters'
            })

        # Validate salary range
        salary_min = attrs.get('salary_min')
        salary_max = attrs.get('salary_max')
        if salary_min and salary_max and salary_min > salary_max:
            raise serializers.ValidationError({
                'salary_max': 'Maximum salary must be greater than minimum salary'
            })

        # Validate apply method
        apply_method = attrs.get('apply_method', 'internal')
        if apply_method == 'email' and not attrs.get('apply_email'):
            raise serializers.ValidationError({
                'apply_email': 'Email is required for email application method'
            })
        if apply_method == 'external' and not attrs.get('apply_url'):
            raise serializers.ValidationError({
                'apply_url': 'URL is required for external application method'
            })

        # Validate company_email format if provided
        company_email = attrs.get('company_email', '')
        if company_email and '@' not in company_email:
            raise serializers.ValidationError({
                'company_email': 'Invalid email format'
            })

        return attrs


class JobUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating jobs."""

    def validate_category(self, value):
        return validate_dynamic_category(value)

    class Meta:
        model = Job
        fields = [
            'title', 'department', 'employment_type', 'experience_level', 'category',
            'description', 'responsibilities', 'requirements',
            'nice_to_have', 'skills', 'benefits',
            'address', 'city', 'state', 'postal_code', 'country', 'location_type', 'timezone',
            'salary_min', 'salary_max', 'salary_currency', 'salary_period', 'show_salary',
            'equity', 'equity_min', 'equity_max',
            'apply_method', 'apply_email', 'apply_url', 'apply_instructions',
            'meta_title', 'meta_description'
        ]


class JobReportSerializer(serializers.ModelSerializer):
    """Serializer for job reports."""

    class Meta:
        model = JobReport
        fields = ['id', 'job', 'reason', 'details', 'status', 'created_at']
        read_only_fields = ['id', 'status', 'created_at']

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['reporter'] = request.user
            validated_data['reporter_email'] = request.user.email
        return super().create(validated_data)


class JobReportCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating job reports (public)."""

    class Meta:
        model = JobReport
        fields = ['reason', 'details', 'reporter_email']


class AdminJobCompanySerializer(serializers.ModelSerializer):
    """Compact company serializer nested inside admin job list items."""

    verified = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = ['id', 'name', 'logo', 'verified']

    def get_verified(self, obj):
        return obj.status == 'verified'


class AdminJobAgencySerializer(serializers.ModelSerializer):
    """Compact agency serializer nested inside admin job list items."""

    class Meta:
        model = Agency
        fields = ['id', 'name', 'logo', 'allow_backdate_posting']


class AdminJobSerializer(serializers.ModelSerializer):
    """Admin job serializer with nested company/agency objects."""

    company = AdminJobCompanySerializer(read_only=True)
    agency = AdminJobAgencySerializer(read_only=True, allow_null=True)
    posted_by_name = serializers.CharField(source='posted_by.get_full_name', read_only=True, allow_null=True)
    location_display = serializers.CharField(read_only=True)
    # Map apply_method → apply_mode for frontend compatibility
    apply_mode = serializers.CharField(source='apply_method', read_only=True)
    # Map apply_url → external_url for frontend compatibility
    external_url = serializers.URLField(source='apply_url', read_only=True, allow_blank=True)
    # Map applications_count → applications for frontend compatibility
    applications = serializers.IntegerField(source='applications_count', read_only=True)
    # Map location fields → single location string
    location = serializers.SerializerMethodField()

    class Meta:
        model = Job
        fields = [
            'id', 'job_id', 'title', 'company', 'agency', 'status',
            'location_type', 'location',
            'salary_min', 'salary_max', 'salary_currency',
            'apply_mode', 'external_url',
            'created_at', 'posted_at', 'expires_at', 'scheduled_publish_at',
            'closed_at', 'deleted_at',
            'views', 'applications', 'report_count',
            'featured', 'category',
            'posted_by_name', 'location_display',
            'spam_score', 'last_refreshed_at',
        ]

    def get_location(self, obj):
        parts = [p for p in [obj.city, obj.state, obj.country] if p]
        return ', '.join(parts) if parts else ''

    def validate_posted_at(self, value):
        """Validate posted_at on admin PATCH updates."""
        if value is None:
            return value
        now = timezone.now()
        if value > now + timedelta(hours=24):
            raise serializers.ValidationError("Posted date cannot be in the future.")
        return value

    def validate_expires_at(self, value):
        """Admin can set any future expiry date."""
        if value is None:
            return value
        if value < timezone.now():
            raise serializers.ValidationError("Expiry date must be in the future.")
        return value


class AdminJobDetailSerializer(AdminJobSerializer):
    """Extended admin job serializer for retrieve (detail) view.

    Includes all list fields plus full job content, applicants, reports,
    and activity log — matching the frontend AdminJobDetail type.
    """

    created_by = serializers.SerializerMethodField()
    applicants = serializers.SerializerMethodField()
    reports = serializers.SerializerMethodField()
    activity = serializers.SerializerMethodField()

    class Meta(AdminJobSerializer.Meta):
        fields = AdminJobSerializer.Meta.fields + [
            'description', 'responsibilities', 'requirements',
            'nice_to_have', 'skills', 'benefits',
            'department', 'employment_type', 'experience_level',
            'salary_period', 'show_salary',
            'equity', 'equity_min', 'equity_max',
            'apply_method', 'apply_email', 'apply_url', 'apply_instructions',
            'meta_title', 'meta_description',
            'updated_at',
            'created_by', 'applicants', 'reports', 'activity',
        ]

    def get_created_by(self, obj):
        user = obj.posted_by
        if not user:
            return None
        return {
            'id': user.id,
            'full_name': user.get_full_name() or user.email,
            'email': user.email,
        }

    def get_applicants(self, obj):
        from apps.applications.models import Application
        applications = Application.objects.filter(
            job=obj
        ).select_related('candidate').order_by('-created_at')[:50]
        return [
            {
                'id': app.id,
                'candidate': {
                    'id': app.candidate.id,
                    'full_name': app.candidate.get_full_name() or app.candidate.email,
                    'email': app.candidate.email,
                    'avatar': app.candidate.avatar.url if hasattr(app.candidate, 'avatar') and app.candidate.avatar else None,
                },
                'status': app.status,
                'applied_at': app.created_at.isoformat(),
                'resume_url': app.resume.url if hasattr(app, 'resume') and app.resume else None,
            }
            for app in applications
        ]

    def get_reports(self, obj):
        reports = JobReport.objects.filter(job=obj).order_by('-created_at')[:50]
        return [
            {
                'id': report.id,
                'reason': report.reason,
                'reporter': report.reporter_email or 'Anonymous',
                'reported_at': report.created_at.isoformat(),
                'status': report.status,
                'notes': report.details or None,
            }
            for report in reports
        ]

    def get_activity(self, obj):
        try:
            from apps.audit.models import AuditLog
            logs = AuditLog.objects.filter(
                target_type='job',
                target_id=str(obj.id),
            ).order_by('-created_at')[:50]
            return [
                {
                    'id': log.id,
                    'action': log.action,
                    'actor': log.actor.get_full_name() if log.actor else 'System',
                    'timestamp': log.created_at.isoformat(),
                    'details': log.details or '',
                }
                for log in logs
            ]
        except Exception:
            return []


class AdminJobApproveSerializer(serializers.Serializer):
    """Request body for approve action with optional date override."""

    posted_at = serializers.DateTimeField(required=False, allow_null=True)
    reason = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_posted_at(self, value):
        if value is None:
            return value
        now = timezone.now()
        if value > now + timedelta(hours=24):
            raise serializers.ValidationError("Posted date cannot be in the future.")
        # Platform admin has no past-date restriction
        return value


class AdminJobReportSerializer(serializers.ModelSerializer):
    """Admin job report serializer."""

    job_title = serializers.CharField(source='job.title', read_only=True)
    reporter_name = serializers.SerializerMethodField()

    class Meta:
        model = JobReport
        fields = [
            'id', 'job', 'job_title', 'reporter', 'reporter_name',
            'reporter_email', 'reason', 'details', 'status',
            'reviewed_by', 'reviewed_at', 'review_notes',
            'created_at', 'updated_at',
        ]

    def get_reporter_name(self, obj):
        if obj.reporter:
            return obj.reporter.get_full_name()
        return obj.reporter_email
