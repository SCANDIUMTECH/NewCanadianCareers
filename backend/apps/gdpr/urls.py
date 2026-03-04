from django.urls import path
from . import views

app_name = "gdpr"

urlpatterns = [
    # ─── Public endpoints ────────────────────────────────────────────────
    path("settings/", views.PublicGDPRSettingsView.as_view(), name="public-settings"),
    path("consent/check/", views.CheckConsentView.as_view(), name="consent-check"),
    path("consent/update/", views.UpdateConsentView.as_view(), name="consent-update"),
    path("consent/bulk/", views.BulkConsentView.as_view(), name="consent-bulk"),
    path("policy/accept/", views.AcceptPolicyView.as_view(), name="policy-accept"),
    path("requests/", views.DataRequestCreateView.as_view(), name="request-create"),
    path("requests/confirm/", views.DataRequestConfirmView.as_view(), name="request-confirm"),
    path("geo-ip/", views.GeoIPCheckView.as_view(), name="geo-ip-check"),
    # ─── Admin endpoints ─────────────────────────────────────────────────
    path("admin/settings/", views.AdminGDPRSettingsView.as_view(), name="admin-settings"),
    path("admin/categories/", views.AdminServiceCategoryListCreateView.as_view(), name="admin-categories"),
    path("admin/categories/<int:pk>/", views.AdminServiceCategoryDetailView.as_view(), name="admin-category-detail"),
    path("admin/services/", views.AdminServiceListCreateView.as_view(), name="admin-services"),
    path("admin/services/<int:pk>/", views.AdminServiceDetailView.as_view(), name="admin-service-detail"),
    path("admin/consent-logs/", views.AdminConsentLogListView.as_view(), name="admin-consent-logs"),
    path("admin/user-consents/", views.AdminUserConsentListView.as_view(), name="admin-user-consents"),
    path("admin/consent-history/", views.AdminConsentHistoryListView.as_view(), name="admin-consent-history"),
    path("admin/audit-logs/", views.AdminAuditLogListView.as_view(), name="admin-audit-logs"),
    path("admin/requests/", views.AdminDataRequestListView.as_view(), name="admin-requests"),
    path("admin/requests/<uuid:pk>/", views.AdminDataRequestDetailView.as_view(), name="admin-request-detail"),
    path("admin/requests/<uuid:pk>/action/", views.AdminDataRequestActionView.as_view(), name="admin-request-action"),
    path("admin/requests/<uuid:pk>/extend-deadline/", views.AdminDSARExtendDeadlineView.as_view(), name="admin-request-extend-deadline"),
    # Static paths BEFORE parametric <uuid:pk> to avoid routing ambiguity
    path("admin/data-breaches/notify/", views.AdminDataBreachNotifyView.as_view(), name="admin-data-breach-notify"),
    path("admin/data-breaches/", views.AdminDataBreachListCreateView.as_view(), name="admin-data-breach-list"),
    path("admin/data-breaches/<uuid:pk>/", views.AdminDataBreachDetailView.as_view(), name="admin-data-breach-detail"),
    path("admin/policy-update/notify/", views.AdminPolicyUpdateNotifyView.as_view(), name="admin-policy-update-notify"),
    path("admin/processing-activities/", views.AdminProcessingActivityListCreateView.as_view(), name="admin-ropa-list"),
    path("admin/processing-activities/<int:pk>/", views.AdminProcessingActivityDetailView.as_view(), name="admin-ropa-detail"),
    path("admin/analytics/", views.AdminConsentAnalyticsView.as_view(), name="admin-analytics"),
]
