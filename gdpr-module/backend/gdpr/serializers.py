from rest_framework import serializers
from .models import (
    AdminAuditLog,
    ConsentHistory,
    ConsentLog,
    DataBreach,
    DataRequest,
    GDPRSettings,
    ProcessingActivity,
    Service,
    ServiceCategory,
    UserConsent,
)


class ServiceCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceCategory
        fields = ["id", "name", "slug", "description", "order"]


class ServiceSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)

    class Meta:
        model = Service
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "category",
            "category_name",
            "category_slug",
            "is_deactivatable",
            "default_enabled",
            "legal_basis",
            "cookies",
            "head_script",
            "body_script",
            "is_analytics",
            "is_advertising",
            "is_active",
        ]


class ServicePublicSerializer(serializers.ModelSerializer):
    """Serializer for public API - excludes script content until consent is granted."""

    category_name = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)

    class Meta:
        model = Service
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "category",
            "category_name",
            "category_slug",
            "is_deactivatable",
            "default_enabled",
            "is_active",
        ]


class ConsentLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsentLog
        fields = [
            "id",
            "ip_address",
            "consents",
            "consent_version",
            "consent_given_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["ip_address", "created_at", "updated_at"]


class UserConsentSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = UserConsent
        fields = [
            "id",
            "user",
            "username",
            "email",
            "consents",
            "consent_version",
            "consent_given_at",
            "privacy_policy_accepted",
            "privacy_policy_accepted_at",
            "terms_accepted",
            "terms_accepted_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["user", "created_at", "updated_at"]


class ConsentUpdateSerializer(serializers.Serializer):
    """Serializer for updating consent on a single service."""

    service_id = serializers.IntegerField()
    allowed = serializers.BooleanField()


class BulkConsentSerializer(serializers.Serializer):
    """Serializer for allowing/declining all cookies at once."""

    action = serializers.ChoiceField(choices=["allow_all", "decline_all"])


class ConsentHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsentHistory
        fields = "__all__"
        read_only_fields = [
            "id",
            "timestamp",
            "user",
            "ip_address",
            "service_id",
            "service_name",
            "action",
            "consent_version",
            "user_agent",
            "consents_snapshot",
        ]


class DataRequestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataRequest
        fields = [
            "request_type",
            "first_name",
            "last_name",
            "email",
            "message",
        ]

    def validate_request_type(self, value):
        settings = GDPRSettings.load()
        type_feature_map = {
            "forget_me": settings.forget_me_enabled,
            "request_data": settings.request_data_enabled,
            "rectification": settings.data_rectification_enabled,
            "dpo_contact": settings.contact_dpo_enabled,
        }
        if not type_feature_map.get(value, False):
            raise serializers.ValidationError(
                f"Request type '{value}' is not currently enabled."
            )
        return value


class DataRequestSerializer(serializers.ModelSerializer):
    is_overdue = serializers.BooleanField(read_only=True)
    days_until_deadline = serializers.IntegerField(read_only=True)

    class Meta:
        model = DataRequest
        fields = [
            "id",
            "request_type",
            "status",
            "first_name",
            "last_name",
            "email",
            "message",
            "is_email_confirmed",
            "user",
            "deadline",
            "deadline_extended",
            "deadline_extension_reason",
            "is_overdue",
            "days_until_deadline",
            "processed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "is_email_confirmed",
            "created_at",
            "updated_at",
        ]


class DataBreachCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataBreach
        fields = [
            "title",
            "nature_of_breach",
            "categories_of_data",
            "approximate_records_affected",
            "consequences",
            "measures_taken",
            "severity",
            "discovered_at",
        ]


class DataBreachSerializer(serializers.ModelSerializer):
    is_dpa_overdue = serializers.SerializerMethodField()
    hours_until_dpa_deadline = serializers.SerializerMethodField()

    class Meta:
        model = DataBreach
        fields = "__all__"

    def get_is_dpa_overdue(self, obj):
        return obj.is_dpa_overdue

    def get_hours_until_dpa_deadline(self, obj):
        return obj.hours_until_dpa_deadline


class ProcessingActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcessingActivity
        fields = "__all__"


class AdminAuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdminAuditLog
        fields = "__all__"
        read_only_fields = [
            "id",
            "timestamp",
            "user",
            "action_type",
            "description",
            "target_model",
            "target_id",
            "metadata",
            "ip_address",
        ]


class GDPRSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = GDPRSettings
        exclude = ["id", "created_at", "updated_at"]


class GDPRPublicSettingsSerializer(serializers.ModelSerializer):
    """Public-facing settings (no sensitive data)."""

    class Meta:
        model = GDPRSettings
        fields = [
            "is_enabled",
            "cookie_lifetime_days",
            "cookie_domain",
            "consent_mode_v2",
            "consent_version",
            "consent_expiry_days",
            "privacy_policy_url",
            "popup_enabled",
            "popup_text",
            "popup_agree_text",
            "popup_decline_text",
            "popup_preferences_text",
            "popup_style",
            "popup_position",
            "popup_bg_color",
            "popup_text_color",
            "agree_btn_bg_color",
            "agree_btn_text_color",
            "decline_btn_bg_color",
            "decline_btn_text_color",
            "preferences_btn_bg_color",
            "preferences_btn_text_color",
            "privacy_settings_trigger_enabled",
            "privacy_settings_trigger_position",
            "privacy_settings_backdrop_close",
            "first_visit_allow_all",
            "returning_visitor_allow_all",
            "geo_ip_eu_only",
            "forget_me_enabled",
            "request_data_enabled",
            "contact_dpo_enabled",
            "data_rectification_enabled",
            "privacy_policy_acceptance_enabled",
            "terms_acceptance_enabled",
            "gtm_id",
            "custom_css",
        ]


class PrivacySettingsResponseSerializer(serializers.Serializer):
    """Response for the check_privacy_settings endpoint."""

    services = serializers.DictField()
    settings = GDPRPublicSettingsSerializer()


class AcceptPolicySerializer(serializers.Serializer):
    policy_type = serializers.ChoiceField(
        choices=["privacy_policy", "terms_conditions"]
    )
