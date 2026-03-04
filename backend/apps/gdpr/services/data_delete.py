import logging

from django.conf import settings as django_settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail

from ..models import ConsentLog, DataRequest, UserConsent

User = get_user_model()
logger = logging.getLogger("gdpr.delete")


class DataDeleteService:
    """Handles user data deletion (Right to Erasure / Right to be Forgotten)."""

    def delete_user_data(self, data_request: DataRequest):
        """Delete all data associated with the requesting user."""
        user = data_request.user
        if not user:
            try:
                user = User.objects.get(email=data_request.email)
            except User.DoesNotExist:
                self._delete_anonymous_data(data_request.email)
                self._send_deletion_confirmation(data_request)
                return

        self._delete_authenticated_user_data(user)
        self._send_deletion_confirmation(data_request)

    def _delete_authenticated_user_data(self, user):
        """Delete all data for an authenticated user."""
        UserConsent.objects.filter(user=user).delete()

        DataRequest.objects.filter(user=user).exclude(
            request_type=DataRequest.RequestType.FORGET_ME,
            status=DataRequest.Status.PROCESSING,
        ).delete()

        # Soft delete: deactivate and anonymize
        user.is_active = False
        user.email = f"deleted-{user.id}@deleted.local"
        user.first_name = ""
        user.last_name = ""
        user.save()

    def _delete_anonymous_data(self, email: str):
        """Delete data for non-registered users.

        Deletes GDPR request records by email. ConsentLog entries
        cannot be reliably matched (keyed by masked IP, not email).
        """
        DataRequest.objects.filter(email=email).exclude(
            request_type=DataRequest.RequestType.FORGET_ME
        ).delete()

    def _send_deletion_confirmation(self, data_request: DataRequest):
        """Send confirmation email that data has been deleted."""
        try:
            send_mail(
                subject="Your Data Has Been Deleted",
                message=(
                    f"Dear {data_request.first_name},\n\n"
                    f"Your request for data deletion has been processed. "
                    f"All personal data associated with your account has been removed.\n\n"
                    f"If you did not request this, please contact us immediately."
                ),
                from_email=django_settings.DEFAULT_FROM_EMAIL,
                recipient_list=[data_request.email],
                fail_silently=False,
            )
        except Exception as e:
            logger.error(
                "Failed to send deletion confirmation to %s: %s",
                data_request.email, e,
            )
