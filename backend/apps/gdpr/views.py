from datetime import timedelta

from django.conf import settings as django_settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import generics, permissions, status, views
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

from core.permissions import IsAdmin

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
from .serializers import (
    AcceptPolicySerializer,
    AdminAuditLogSerializer,
    BulkConsentSerializer,
    ConsentHistorySerializer,
    ConsentLogSerializer,
    ConsentUpdateSerializer,
    DataBreachCreateSerializer,
    DataBreachSerializer,
    DataRequestCreateSerializer,
    DataRequestSerializer,
    GDPRPublicSettingsSerializer,
    GDPRSettingsSerializer,
    ProcessingActivitySerializer,
    ServiceCategorySerializer,
    ServicePublicSerializer,
    ServiceSerializer,
    UserConsentSerializer,
)
from .services.audit import log_admin_action
from .services.consent import ConsentService, get_client_ip, mask_ip
from .services.data_breach import DataBreachService
from .services.data_delete import DataDeleteService
from .services.data_export import DataExportService
from .services.analytics import ConsentAnalyticsService
from .services.geo_ip import is_eu_visitor

User = get_user_model()


class DSARActionThrottle(UserRateThrottle):
    """Limits DSAR export/delete actions to prevent abuse of data export endpoints."""
    scope = 'dsar_action'


# ─── Public API Views ───────────────────────────────────────────────────────────


class PublicGDPRSettingsView(views.APIView):
    """GET /api/gdpr/settings/ - Returns public GDPR settings + services."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [AnonRateThrottle]

    def get(self, request):
        gdpr_settings = GDPRSettings.load()
        services = Service.objects.filter(is_active=True).select_related("category")
        categories = ServiceCategory.objects.all()

        settings_data = GDPRPublicSettingsSerializer(gdpr_settings).data

        return Response(
            {
                "settings": settings_data,
                "services": ServicePublicSerializer(services, many=True).data,
                "categories": ServiceCategorySerializer(categories, many=True).data,
            }
        )


class CheckConsentView(views.APIView):
    """POST /api/gdpr/consent/check/ - Check consent state for all services."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        gdpr_settings = GDPRSettings.load()
        services = Service.objects.filter(is_active=True).select_related("category")
        consent_service = ConsentService()

        result = {}
        for service in services:
            allowed = consent_service.check_service_consent(
                request, service, gdpr_settings
            )
            service_data = {
                "allowed": allowed,
                "name": service.name,
                "category": service.category.slug if service.category else "unclassified",
                "cookies": service.get_cookie_list(),
            }
            if allowed:
                service_data["head_script"] = service.head_script
                service_data["body_script"] = service.body_script
            result[str(service.id)] = service_data

        return Response(
            {
                "services": result,
                "settings": GDPRPublicSettingsSerializer(gdpr_settings).data,
            }
        )


class UpdateConsentView(views.APIView):
    """POST /api/gdpr/consent/update/ - Toggle consent for a single service."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        serializer = ConsentUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service_id = serializer.validated_data["service_id"]
        allowed = serializer.validated_data["allowed"]

        consent_service = ConsentService()
        consent_service.update_service_consent(request, service_id, allowed)

        return Response({"status": "updated", "service_id": service_id, "allowed": allowed})


class BulkConsentView(views.APIView):
    """POST /api/gdpr/consent/bulk/ - Allow all or decline all cookies."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        serializer = BulkConsentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        action = serializer.validated_data["action"]
        consent_service = ConsentService()

        if action == "allow_all":
            result = consent_service.allow_all(request)
        else:
            result = consent_service.decline_all(request)

        return Response(result)


class AcceptPolicyView(views.APIView):
    """POST /api/gdpr/policy/accept/ - Accept privacy policy or terms."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        serializer = AcceptPolicySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        policy_type = serializer.validated_data["policy_type"]
        consent_service = ConsentService()
        consent_service.accept_policy(request, policy_type)

        return Response({"status": "accepted", "policy_type": policy_type})


class DataRequestCreateView(views.APIView):
    """POST /api/gdpr/requests/ - Submit a GDPR data request."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        serializer = DataRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data_request = serializer.save(
            user=request.user if request.user.is_authenticated else None
        )

        request_type = data_request.request_type
        if request_type in ("forget_me", "request_data"):
            self._send_confirmation_email(request, data_request)
        elif request_type == "dpo_contact":
            self._send_dpo_email(data_request)
        elif request_type == "rectification":
            self._send_rectification_email(data_request)

        return Response(
            DataRequestSerializer(data_request).data,
            status=status.HTTP_201_CREATED,
        )

    def _send_confirmation_email(self, request, data_request):
        confirm_url = (
            f"{django_settings.GDPR_BACKEND_URL}"
            f"/api/gdpr/requests/confirm/"
            f"?id={data_request.id}&token={data_request.verification_token}"
        )
        send_mail(
            subject="Confirm Your GDPR Request",
            message=(
                f"Dear {data_request.first_name},\n\n"
                f"Please confirm your {data_request.get_request_type_display()} request "
                f"by visiting:\n{confirm_url}\n\n"
                f"If you did not make this request, please ignore this email."
            ),
            from_email=django_settings.DEFAULT_FROM_EMAIL,
            recipient_list=[data_request.email],
            fail_silently=True,
        )

    def _send_dpo_email(self, data_request):
        gdpr_settings = GDPRSettings.load()
        send_mail(
            subject=f"DPO Contact Request from {data_request.first_name} {data_request.last_name}",
            message=(
                f"Name: {data_request.first_name} {data_request.last_name}\n"
                f"Email: {data_request.email}\n\n"
                f"Message:\n{data_request.message}"
            ),
            from_email=django_settings.DEFAULT_FROM_EMAIL,
            recipient_list=[gdpr_settings.dpo_email],
            fail_silently=True,
        )

    def _send_rectification_email(self, data_request):
        gdpr_settings = GDPRSettings.load()
        send_mail(
            subject=f"Data Rectification Request from {data_request.first_name} {data_request.last_name}",
            message=(
                f"Name: {data_request.first_name} {data_request.last_name}\n"
                f"Email: {data_request.email}\n\n"
                f"Message:\n{data_request.message}"
            ),
            from_email=django_settings.DEFAULT_FROM_EMAIL,
            recipient_list=[gdpr_settings.dpo_email],
            fail_silently=True,
        )


class DataRequestConfirmView(views.APIView):
    """GET /api/gdpr/requests/confirm/?id=...&token=... - Confirm a data request via email link."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [AnonRateThrottle]

    def get(self, request):
        request_id = request.query_params.get("id")
        token = request.query_params.get("token")

        if not request_id or not token:
            return Response(
                {"error": "Missing id or token."}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            data_request = DataRequest.objects.get(id=request_id)
        except (DataRequest.DoesNotExist, ValueError):
            return Response(
                {"error": "Request not found."}, status=status.HTTP_404_NOT_FOUND
            )

        if str(data_request.verification_token) != token:
            return Response(
                {"error": "Invalid token."}, status=status.HTTP_403_FORBIDDEN
            )

        if data_request.is_email_confirmed:
            return Response({"status": "already_confirmed"})

        data_request.is_email_confirmed = True
        data_request.status = DataRequest.Status.CONFIRMED
        data_request.save()

        return Response({"status": "confirmed", "request_type": data_request.request_type})


class GeoIPCheckView(views.APIView):
    """GET /api/gdpr/geo-ip/ - Check if the visitor is from an EU/EEA country."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [AnonRateThrottle]

    def get(self, request):
        return Response({"is_eu": is_eu_visitor(request)})


# ─── Admin API Views ─────────────────────────────────────────────────────────────


class AdminServiceCategoryListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/gdpr/admin/categories/"""

    queryset = ServiceCategory.objects.all()
    serializer_class = ServiceCategorySerializer
    permission_classes = [IsAdmin]

    def perform_create(self, serializer):
        instance = serializer.save()
        log_admin_action(
            self.request,
            action_type="category_modified",
            description=f"Created service category: {instance.name}",
            target_model="ServiceCategory",
            target_id=str(instance.id),
        )


class AdminServiceCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PUT/DELETE /api/gdpr/admin/categories/<id>/"""

    queryset = ServiceCategory.objects.all()
    serializer_class = ServiceCategorySerializer
    permission_classes = [IsAdmin]

    def perform_update(self, serializer):
        instance = serializer.save()
        log_admin_action(
            self.request,
            action_type="category_modified",
            description=f"Updated service category: {instance.name}",
            target_model="ServiceCategory",
            target_id=str(instance.id),
        )

    def perform_destroy(self, instance):
        name = instance.name
        instance_id = instance.id
        instance.delete()
        log_admin_action(
            self.request,
            action_type="category_modified",
            description=f"Deleted service category: {name}",
            target_model="ServiceCategory",
            target_id=str(instance_id),
        )


class AdminServiceListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/gdpr/admin/services/"""

    queryset = Service.objects.select_related("category").all()
    serializer_class = ServiceSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ["category", "is_active", "is_analytics", "is_advertising"]
    search_fields = ["name", "description"]

    def perform_create(self, serializer):
        instance = serializer.save()
        log_admin_action(
            self.request,
            action_type="service_modified",
            description=f"Created service: {instance.name}",
            target_model="Service",
            target_id=str(instance.id),
        )


class AdminServiceDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PUT/DELETE /api/gdpr/admin/services/<id>/"""

    queryset = Service.objects.select_related("category").all()
    serializer_class = ServiceSerializer
    permission_classes = [IsAdmin]

    def perform_update(self, serializer):
        instance = serializer.save()
        log_admin_action(
            self.request,
            action_type="service_modified",
            description=f"Updated service: {instance.name}",
            target_model="Service",
            target_id=str(instance.id),
        )

    def perform_destroy(self, instance):
        name = instance.name
        instance_id = instance.id
        instance.delete()
        log_admin_action(
            self.request,
            action_type="service_modified",
            description=f"Deleted service: {name}",
            target_model="Service",
            target_id=str(instance_id),
        )


class AdminConsentLogListView(generics.ListAPIView):
    """GET /api/gdpr/admin/consent-logs/"""

    queryset = ConsentLog.objects.all()
    serializer_class = ConsentLogSerializer
    permission_classes = [IsAdmin]
    search_fields = ["ip_address"]


class AdminUserConsentListView(generics.ListAPIView):
    """GET /api/gdpr/admin/user-consents/"""

    queryset = UserConsent.objects.select_related("user").all()
    serializer_class = UserConsentSerializer
    permission_classes = [IsAdmin]
    search_fields = ["user__email", "user__first_name", "user__last_name"]


class AdminConsentHistoryListView(generics.ListAPIView):
    """GET /api/gdpr/admin/consent-history/"""

    queryset = ConsentHistory.objects.all()
    serializer_class = ConsentHistorySerializer
    permission_classes = [IsAdmin]
    filterset_fields = ["action", "user"]
    search_fields = ["ip_address", "service_name"]


class AdminAuditLogListView(generics.ListAPIView):
    """GET /api/gdpr/admin/audit-logs/"""

    queryset = AdminAuditLog.objects.all()
    serializer_class = AdminAuditLogSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ["action_type"]
    search_fields = ["description"]


class AdminDataRequestListView(generics.ListAPIView):
    """GET /api/gdpr/admin/requests/"""

    queryset = DataRequest.objects.all()
    serializer_class = DataRequestSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ["request_type", "status", "is_email_confirmed"]
    search_fields = ["first_name", "last_name", "email"]


class AdminDataRequestDetailView(generics.RetrieveUpdateAPIView):
    """GET/PUT /api/gdpr/admin/requests/<id>/"""

    queryset = DataRequest.objects.all()
    serializer_class = DataRequestSerializer
    permission_classes = [IsAdmin]


class AdminDataRequestActionView(views.APIView):
    """POST /api/gdpr/admin/requests/<id>/action/ - Process a data request."""

    permission_classes = [IsAdmin]
    throttle_classes = [DSARActionThrottle]

    def post(self, request, pk):
        try:
            data_request = DataRequest.objects.get(pk=pk)
        except DataRequest.DoesNotExist:
            return Response(
                {"error": "Request not found."}, status=status.HTTP_404_NOT_FOUND
            )

        action = request.data.get("action")
        valid_actions = {"export_data", "send_data", "delete_data", "mark_done"}
        if action not in valid_actions:
            return Response(
                {"error": f"Unknown action: {action}. Valid: {', '.join(sorted(valid_actions))}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if action == "export_data":
            export_service = DataExportService()
            export_data = export_service.export_user_data(data_request)
            data_request.status = DataRequest.Status.DONE
            data_request.processed_at = timezone.now()
            data_request.save()
            log_admin_action(
                request,
                action_type="data_exported",
                description=f"Exported data for DSAR {pk} ({data_request.email})",
                target_model="DataRequest",
                target_id=str(pk),
            )
            return Response({"status": "exported", "data": export_data})

        elif action == "send_data":
            export_service = DataExportService()
            export_service.export_and_email(data_request)
            data_request.status = DataRequest.Status.DONE
            data_request.processed_at = timezone.now()
            data_request.save()
            log_admin_action(
                request,
                action_type="data_exported",
                description=f"Exported and emailed data for DSAR {pk} ({data_request.email})",
                target_model="DataRequest",
                target_id=str(pk),
            )
            return Response({"status": "sent"})

        elif action == "delete_data":
            delete_service = DataDeleteService()
            delete_service.delete_user_data(data_request)
            data_request.status = DataRequest.Status.DONE
            data_request.processed_at = timezone.now()
            data_request.save()
            log_admin_action(
                request,
                action_type="data_deleted",
                description=f"Deleted data for DSAR {pk} ({data_request.email})",
                target_model="DataRequest",
                target_id=str(pk),
            )
            return Response({"status": "deleted"})

        elif action == "mark_done":
            data_request.status = DataRequest.Status.DONE
            data_request.processed_at = timezone.now()
            data_request.save()
            log_admin_action(
                request,
                action_type="dsar_processed",
                description=f"Marked DSAR {pk} as done ({data_request.email})",
                target_model="DataRequest",
                target_id=str(pk),
            )
            return Response({"status": "done"})

        return Response(
            {"error": f"Unknown action: {action}"},
            status=status.HTTP_400_BAD_REQUEST,
        )


class AdminDSARExtendDeadlineView(views.APIView):
    """POST /api/gdpr/admin/requests/<uuid:pk>/extend-deadline/ - Extend DSAR deadline (Art. 12(3))."""

    permission_classes = [IsAdmin]

    def post(self, request, pk):
        try:
            data_request = DataRequest.objects.get(pk=pk)
        except DataRequest.DoesNotExist:
            return Response(
                {"error": "Request not found."}, status=status.HTTP_404_NOT_FOUND
            )

        days = request.data.get("days")
        reason = request.data.get("reason", "")

        if not days:
            return Response(
                {"error": "Field 'days' is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            days = int(days)
        except (TypeError, ValueError):
            return Response(
                {"error": "Field 'days' must be an integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if days < 1 or days > 60:
            return Response(
                {"error": "Extension must be between 1 and 60 days (Art. 12(3) max +2 months)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not reason:
            return Response(
                {"error": "A reason for extension is required (Art. 12(3))."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if data_request.deadline_extended:
            return Response(
                {"error": "Deadline has already been extended. Art. 12(3) allows only one extension."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not data_request.deadline:
            data_request.deadline = data_request.created_at + timedelta(days=30)

        data_request.deadline = data_request.deadline + timedelta(days=days)
        data_request.deadline_extended = True
        data_request.deadline_extension_reason = reason
        data_request.save()

        log_admin_action(
            request,
            action_type="dsar_processed",
            description=(
                f"Extended DSAR {pk} deadline by {days} days. "
                f"Reason: {reason}"
            ),
            target_model="DataRequest",
            target_id=str(pk),
            metadata={"days_extended": days, "reason": reason},
        )

        # Notify the data subject about the extension per Art. 12(3)
        send_mail(
            subject="GDPR Request — Deadline Extension Notice",
            message=(
                f"Dear {data_request.first_name},\n\n"
                f"We are writing to inform you that we need additional time to process "
                f"your {data_request.get_request_type_display()} request.\n\n"
                f"Reason: {reason}\n\n"
                f"Your new deadline is: {data_request.deadline.strftime('%Y-%m-%d')}.\n\n"
                f"We will process your request as soon as possible."
            ),
            from_email=django_settings.DEFAULT_FROM_EMAIL,
            recipient_list=[data_request.email],
            fail_silently=True,
        )

        return Response(
            {
                "status": "extended",
                "new_deadline": data_request.deadline.isoformat(),
                "days_extended": days,
            }
        )


class AdminGDPRSettingsView(views.APIView):
    """GET/PUT /api/gdpr/admin/settings/"""

    permission_classes = [IsAdmin]

    def get(self, request):
        gdpr_settings = GDPRSettings.load()
        return Response(GDPRSettingsSerializer(gdpr_settings).data)

    def put(self, request):
        gdpr_settings = GDPRSettings.load()
        serializer = GDPRSettingsSerializer(gdpr_settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_admin_action(
            request,
            action_type="settings_update",
            description="Updated GDPR settings",
            target_model="GDPRSettings",
            target_id="1",
        )
        return Response(serializer.data)


class AdminDataBreachListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/gdpr/admin/data-breaches/"""

    queryset = DataBreach.objects.all()
    permission_classes = [IsAdmin]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return DataBreachCreateSerializer
        return DataBreachSerializer

    def perform_create(self, serializer):
        instance = serializer.save(reported_by=self.request.user)
        log_admin_action(
            self.request,
            action_type="breach_created",
            description=f"Created data breach record: {instance.title}",
            target_model="DataBreach",
            target_id=str(instance.id),
        )


class AdminDataBreachDetailView(generics.RetrieveUpdateAPIView):
    """GET/PUT /api/gdpr/admin/data-breaches/<uuid:pk>/"""

    queryset = DataBreach.objects.all()
    serializer_class = DataBreachSerializer
    permission_classes = [IsAdmin]

    def perform_update(self, serializer):
        instance = serializer.save()
        log_admin_action(
            self.request,
            action_type="breach_updated",
            description=f"Updated data breach record: {instance.title}",
            target_model="DataBreach",
            target_id=str(instance.id),
        )


class AdminDataBreachNotifyView(views.APIView):
    """POST /api/gdpr/admin/data-breach/notify/ - Send data breach notification to all users."""

    permission_classes = [IsAdmin]
    throttle_classes = [DSARActionThrottle]

    def post(self, request):
        breach_id = request.data.get("breach_id")
        service = DataBreachService()
        count = service.notify_all_users(breach_id=breach_id)

        log_admin_action(
            request,
            action_type="breach_notified",
            description=f"Sent data breach notification to {count} users",
            target_model="DataBreach",
            target_id=str(breach_id) if breach_id else "",
            metadata={"users_notified": count, "breach_id": str(breach_id) if breach_id else None},
        )

        return Response({"status": "sent", "users_notified": count})


class AdminPolicyUpdateNotifyView(views.APIView):
    """POST /api/gdpr/admin/policy-update/notify/ - Send policy update notification to all users."""

    permission_classes = [IsAdmin]

    def post(self, request):
        service = DataBreachService()
        count = service.send_policy_update()

        log_admin_action(
            request,
            action_type="policy_notified",
            description=f"Sent policy update notification to {count} users",
            target_model="GDPRSettings",
            target_id="1",
            metadata={"users_notified": count},
        )

        return Response({"status": "sent", "users_notified": count})


class AdminProcessingActivityListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/gdpr/admin/processing-activities/"""

    queryset = ProcessingActivity.objects.all()
    serializer_class = ProcessingActivitySerializer
    permission_classes = [IsAdmin]

    def perform_create(self, serializer):
        instance = serializer.save()
        log_admin_action(
            self.request,
            action_type="ropa_modified",
            description=f"Created processing activity: {instance.name}",
            target_model="ProcessingActivity",
            target_id=str(instance.id),
        )


class AdminProcessingActivityDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PUT/DELETE /api/gdpr/admin/processing-activities/<int:pk>/"""

    queryset = ProcessingActivity.objects.all()
    serializer_class = ProcessingActivitySerializer
    permission_classes = [IsAdmin]

    def perform_update(self, serializer):
        instance = serializer.save()
        log_admin_action(
            self.request,
            action_type="ropa_modified",
            description=f"Updated processing activity: {instance.name}",
            target_model="ProcessingActivity",
            target_id=str(instance.id),
        )

    def perform_destroy(self, instance):
        name = instance.name
        instance_id = instance.id
        instance.delete()
        log_admin_action(
            self.request,
            action_type="ropa_modified",
            description=f"Deleted processing activity: {name}",
            target_model="ProcessingActivity",
            target_id=str(instance_id),
        )


class AdminConsentAnalyticsView(views.APIView):
    """GET /api/gdpr/admin/analytics/ - Aggregated consent & compliance stats."""

    permission_classes = [IsAdmin]

    def get(self, request):
        analytics_service = ConsentAnalyticsService()
        return Response(analytics_service.get_stats())
