from django.contrib import admin
from django.utils import timezone

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


@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "order"]
    list_editable = ["order"]
    prepopulated_fields = {"slug": ("name",)}
    ordering = ["order"]


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = [
        "name", "category", "legal_basis", "is_deactivatable",
        "default_enabled", "is_analytics", "is_advertising", "is_active",
    ]
    list_filter = ["category", "is_active", "is_analytics", "is_advertising", "legal_basis"]
    search_fields = ["name", "description"]
    prepopulated_fields = {"slug": ("name",)}
    fieldsets = (
        (None, {"fields": ("name", "slug", "description", "category")}),
        ("Behavior", {"fields": ("is_deactivatable", "default_enabled", "legal_basis", "is_active")}),
        ("Tracking Type", {"fields": ("is_analytics", "is_advertising")}),
        ("Cookies", {"fields": ("cookies",)}),
        ("Scripts", {"fields": ("head_script", "body_script"), "classes": ("collapse",)}),
    )


@admin.register(ConsentLog)
class ConsentLogAdmin(admin.ModelAdmin):
    list_display = ["ip_address", "consent_version", "consent_given_at", "updated_at"]
    search_fields = ["ip_address"]
    readonly_fields = ["ip_address", "consents", "consent_version", "consent_given_at", "created_at", "updated_at"]


@admin.register(UserConsent)
class UserConsentAdmin(admin.ModelAdmin):
    list_display = [
        "user", "consent_version", "consent_given_at",
        "privacy_policy_accepted", "terms_accepted", "last_login_recorded", "updated_at",
    ]
    search_fields = ["user__email", "user__first_name", "user__last_name"]
    readonly_fields = ["created_at", "updated_at"]
    list_filter = ["privacy_policy_accepted", "terms_accepted"]


@admin.register(ConsentHistory)
class ConsentHistoryAdmin(admin.ModelAdmin):
    list_display = ["timestamp", "user", "ip_address", "action", "service_name", "consent_version"]
    list_filter = ["action", "consent_version"]
    search_fields = ["ip_address", "service_name", "user__email"]
    readonly_fields = [
        "timestamp", "user", "ip_address", "service_id", "service_name",
        "action", "consent_version", "user_agent", "consents_snapshot",
    ]
    date_hierarchy = "timestamp"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(DataRequest)
class DataRequestAdmin(admin.ModelAdmin):
    list_display = [
        "email", "first_name", "last_name", "request_type", "status",
        "is_email_confirmed", "deadline", "is_overdue_display", "created_at",
    ]
    list_filter = ["request_type", "status", "is_email_confirmed", "deadline_extended"]
    search_fields = ["first_name", "last_name", "email"]
    readonly_fields = ["id", "verification_token", "deadline", "created_at", "updated_at"]
    actions = ["mark_as_done"]

    @admin.display(boolean=True, description="Overdue?")
    def is_overdue_display(self, obj):
        return obj.is_overdue

    @admin.action(description="Mark selected requests as Done")
    def mark_as_done(self, request, queryset):
        queryset.update(status=DataRequest.Status.DONE, processed_at=timezone.now())


@admin.register(DataBreach)
class DataBreachAdmin(admin.ModelAdmin):
    list_display = [
        "title", "severity", "discovered_at", "dpa_notification_deadline",
        "dpa_notified_at", "users_notified_at", "is_resolved",
    ]
    list_filter = ["severity", "is_resolved"]
    search_fields = ["title", "nature_of_breach"]
    readonly_fields = ["id", "dpa_notification_deadline", "created_at", "updated_at"]
    fieldsets = (
        (None, {"fields": ("title", "nature_of_breach", "severity")}),
        ("Impact", {"fields": ("categories_of_data", "approximate_records_affected", "consequences")}),
        ("Response", {"fields": ("measures_taken",)}),
        ("Timeline", {"fields": (
            "discovered_at", "dpa_notification_deadline", "dpa_notified_at",
            "users_notified_at", "users_notified_count",
        )}),
        ("Resolution", {"fields": ("is_resolved", "resolved_at")}),
        ("Metadata", {"fields": ("reported_by", "id", "created_at", "updated_at"), "classes": ("collapse",)}),
    )


@admin.register(ProcessingActivity)
class ProcessingActivityAdmin(admin.ModelAdmin):
    list_display = ["name", "legal_basis", "is_active", "updated_at"]
    list_filter = ["legal_basis", "is_active"]
    search_fields = ["name", "purpose"]
    fieldsets = (
        (None, {"fields": ("name", "purpose", "legal_basis", "is_active")}),
        ("Data Categories", {"fields": ("categories_of_data_subjects", "categories_of_personal_data")}),
        ("Recipients & Transfers", {"fields": ("recipients", "third_country_transfers")}),
        ("Retention & Security", {"fields": ("retention_period", "security_measures")}),
    )


@admin.register(AdminAuditLog)
class AdminAuditLogAdmin(admin.ModelAdmin):
    list_display = ["timestamp", "user", "action_type", "description", "target_model"]
    list_filter = ["action_type"]
    search_fields = ["description", "target_model", "user__email"]
    readonly_fields = [
        "timestamp", "user", "action_type", "description",
        "target_model", "target_id", "metadata", "ip_address",
    ]
    date_hierarchy = "timestamp"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(GDPRSettings)
class GDPRSettingsAdmin(admin.ModelAdmin):
    fieldsets = (
        ("General", {"fields": ("is_enabled", "cookie_lifetime_days", "cookie_domain", "consent_logging_enabled", "consent_mode_v2")}),
        ("Consent Versioning & Expiry", {"fields": ("consent_version", "consent_expiry_days")}),
        ("Cookie Popup", {"fields": ("popup_enabled", "popup_text", "popup_agree_text", "popup_decline_text", "popup_preferences_text", "popup_style", "popup_position")}),
        ("Popup Colors", {"fields": ("popup_bg_color", "popup_text_color", "agree_btn_bg_color", "agree_btn_text_color", "decline_btn_bg_color", "decline_btn_text_color", "preferences_btn_bg_color", "preferences_btn_text_color"), "classes": ("collapse",)}),
        ("Privacy Settings", {"fields": ("privacy_settings_trigger_enabled", "privacy_settings_trigger_position", "privacy_settings_backdrop_close")}),
        ("Legal Links", {"fields": ("privacy_policy_url",)}),
        ("Behavior", {
            "fields": ("first_visit_allow_all", "returning_visitor_allow_all", "geo_ip_eu_only"),
        }),
        ("Features", {"fields": (
            "forget_me_enabled", "request_data_enabled", "contact_dpo_enabled",
            "data_rectification_enabled", "data_breach_notification_enabled",
            "data_retention_enabled", "data_retention_days",
            "privacy_policy_acceptance_enabled", "terms_acceptance_enabled",
        )}),
        ("Emails", {"fields": ("dpo_email", "data_breach_subject", "data_breach_body", "policy_update_subject", "policy_update_body")}),
        ("Integrations", {"fields": ("gtm_id",)}),
        ("Custom CSS", {"fields": ("custom_css",), "classes": ("collapse",)}),
    )

    def has_add_permission(self, request):
        return not GDPRSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
