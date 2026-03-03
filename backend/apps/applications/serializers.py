"""
Application serializers for Orion API.
"""
from rest_framework import serializers
from apps.jobs.serializers import JobListSerializer
from apps.users.serializers import UserSerializer
from .models import Application, ApplicationTimeline, SavedJob, SavedSearch, ApplicationMessage


class ApplicationListSerializer(serializers.ModelSerializer):
    """Serializer for application listings."""

    job_title = serializers.CharField(source='job.title', read_only=True)
    company_name = serializers.CharField(source='job.company.name', read_only=True)
    candidate_name = serializers.CharField(source='candidate.get_full_name', read_only=True)
    candidate_email = serializers.CharField(source='candidate.email', read_only=True)

    class Meta:
        model = Application
        fields = [
            'id', 'job', 'job_title', 'company_name',
            'candidate', 'candidate_name', 'candidate_email',
            'status', 'rating', 'created_at', 'status_changed_at'
        ]


class ApplicationDetailSerializer(serializers.ModelSerializer):
    """Detailed application serializer."""

    job = JobListSerializer(read_only=True)
    candidate = UserSerializer(read_only=True)
    timeline = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = [
            'id', 'job', 'candidate',
            'resume', 'cover_letter', 'portfolio_url', 'linkedin_url',
            'custom_answers', 'status', 'notes', 'rating',
            'created_at', 'status_changed_at', 'last_contact_at',
            'timeline'
        ]

    def get_timeline(self, obj):
        timeline = obj.timeline.all()[:20]  # Last 20 events
        return ApplicationTimelineSerializer(timeline, many=True).data


class ApplicationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating applications."""

    class Meta:
        model = Application
        fields = [
            'job', 'resume', 'cover_letter',
            'portfolio_url', 'linkedin_url', 'custom_answers'
        ]

    ALLOWED_RESUME_EXTENSIONS = {'.pdf', '.doc', '.docx', '.rtf', '.txt', '.odt'}
    MAX_RESUME_SIZE = 10 * 1024 * 1024  # 10 MB

    def validate_resume(self, value):
        if value is None:
            return value
        import os
        ext = os.path.splitext(value.name)[1].lower()
        if ext not in self.ALLOWED_RESUME_EXTENSIONS:
            raise serializers.ValidationError(
                f'Invalid file type. Allowed: {", ".join(sorted(self.ALLOWED_RESUME_EXTENSIONS))}'
            )
        if value.size > self.MAX_RESUME_SIZE:
            raise serializers.ValidationError('File too large. Maximum size is 10 MB.')
        return value

    def validate_job(self, value):
        from django.utils import timezone

        if value.status != 'published':
            raise serializers.ValidationError('Job is not accepting applications')

        if value.expires_at is not None and value.expires_at < timezone.now():
            raise serializers.ValidationError('Job has expired')

        return value

    def validate(self, attrs):
        request = self.context.get('request')
        job = attrs.get('job')

        # Check if already applied
        if Application.objects.filter(job=job, candidate=request.user).exists():
            raise serializers.ValidationError('You have already applied to this job')

        return attrs

    def create(self, validated_data):
        from django.db import IntegrityError

        request = self.context.get('request')
        validated_data['candidate'] = request.user

        try:
            application = super().create(validated_data)
        except IntegrityError:
            raise serializers.ValidationError('You have already applied to this job')

        # Update job application count
        from apps.jobs.models import Job
        from django.db.models import F
        Job.objects.filter(pk=application.job_id).update(
            applications_count=F('applications_count') + 1
        )

        return application


class ApplicationTimelineSerializer(serializers.ModelSerializer):
    """Serializer for application timeline."""

    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True, allow_null=True)

    class Meta:
        model = ApplicationTimeline
        fields = ['id', 'event', 'old_value', 'new_value', 'notes', 'created_by_name', 'created_at']


class ApplicationStatusUpdateSerializer(serializers.Serializer):
    """Serializer for updating application status."""

    status = serializers.ChoiceField(choices=Application.STATUS_CHOICES)
    notes = serializers.CharField(required=False, allow_blank=True)


class ApplicationNoteSerializer(serializers.Serializer):
    """Serializer for adding notes to application."""

    notes = serializers.CharField()


class SavedJobSerializer(serializers.ModelSerializer):
    """Serializer for saved jobs."""

    job = JobListSerializer(read_only=True)

    class Meta:
        model = SavedJob
        fields = ['id', 'job', 'notes', 'created_at']
        read_only_fields = ['id', 'created_at']


class SavedJobCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating saved jobs."""

    class Meta:
        model = SavedJob
        fields = ['job', 'notes']

    def validate_job(self, value):
        request = self.context.get('request')
        if SavedJob.objects.filter(job=value, candidate=request.user).exists():
            raise serializers.ValidationError('Job already saved')
        return value

    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['candidate'] = request.user
        return super().create(validated_data)


class SavedSearchSerializer(serializers.ModelSerializer):
    """Serializer for saved searches."""

    class Meta:
        model = SavedSearch
        fields = [
            'id', 'name', 'query', 'frequency', 'enabled',
            'match_count', 'last_sent_at', 'created_at'
        ]
        read_only_fields = ['id', 'match_count', 'last_sent_at', 'created_at']

    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['candidate'] = request.user
        return super().create(validated_data)


class ApplicationMessageSerializer(serializers.ModelSerializer):
    """Serializer for application messages."""

    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    sender_role = serializers.CharField(source='sender.role', read_only=True)

    class Meta:
        model = ApplicationMessage
        fields = [
            'id', 'sender', 'sender_name', 'sender_role',
            'content', 'is_read', 'read_at', 'created_at'
        ]
        read_only_fields = ['id', 'sender', 'is_read', 'read_at', 'created_at']


class CandidateApplicationSerializer(serializers.ModelSerializer):
    """Serializer for candidate's view of their applications."""

    job = JobListSerializer(read_only=True)

    class Meta:
        model = Application
        fields = [
            'id', 'job', 'status', 'created_at',
            'status_changed_at', 'last_contact_at'
        ]


class AgencyApplicantSerializer(serializers.ModelSerializer):
    """Serializer for agency applicant listings."""

    candidate = serializers.SerializerMethodField()
    job = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = [
            'id', 'candidate', 'job', 'status', 'notes',
            'rating', 'created_at', 'status_changed_at'
        ]

    def get_candidate(self, obj):
        return {
            'name': obj.candidate.get_full_name(),
            'email': obj.candidate.email,
            'avatar': None,  # TODO: Add avatar field to User model
        }

    def get_job(self, obj):
        return {
            'id': obj.job.id,
            'title': obj.job.title,
        }
