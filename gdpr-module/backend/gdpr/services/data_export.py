import json
import logging
import os

from django.conf import settings as django_settings
from django.contrib.auth import get_user_model
from django.core.mail import EmailMessage

from ..models import ConsentHistory, DataRequest, UserConsent

User = get_user_model()
logger = logging.getLogger("gdpr.export")


class DataExportService:
    """Handles user data export (Right to Access / data portability)."""

    def export_user_data(self, data_request: DataRequest) -> dict:
        """Collect all user data for export. Returns a dict of all data."""
        export = {
            "request_info": {
                "id": str(data_request.id),
                "type": data_request.request_type,
                "name": f"{data_request.first_name} {data_request.last_name}",
                "email": data_request.email,
                "created_at": str(data_request.created_at),
            },
            "user_data": None,
            "consent_data": None,
        }

        user = data_request.user
        if not user:
            try:
                user = User.objects.get(email=data_request.email)
            except User.DoesNotExist:
                pass

        if user:
            export["user_data"] = {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "date_joined": str(user.date_joined),
                "last_login": str(user.last_login) if user.last_login else None,
                "is_active": user.is_active,
            }

            try:
                consent = UserConsent.objects.get(user=user)
                export["consent_data"] = {
                    "consents": consent.consents,
                    "consent_version": consent.consent_version,
                    "consent_given_at": consent.consent_given_at.isoformat() if consent.consent_given_at else None,
                    "privacy_policy_accepted": consent.privacy_policy_accepted,
                    "privacy_policy_accepted_at": consent.privacy_policy_accepted_at.isoformat() if consent.privacy_policy_accepted_at else None,
                    "terms_accepted": consent.terms_accepted,
                    "terms_accepted_at": consent.terms_accepted_at.isoformat() if consent.terms_accepted_at else None,
                }
            except UserConsent.DoesNotExist:
                pass

            requests = DataRequest.objects.filter(email=user.email)
            export["gdpr_requests"] = [
                {
                    "id": str(r.id),
                    "type": r.request_type,
                    "status": r.status,
                    "created_at": str(r.created_at),
                }
                for r in requests
            ]

            # Export consent history for this user
            history = ConsentHistory.objects.filter(user=user).order_by("-timestamp")[:100]
            export["consent_history"] = [
                {
                    "timestamp": str(h.timestamp),
                    "action": h.action,
                    "service_id": h.service_id,
                    "service_name": h.service_name,
                    "consent_version": h.consent_version,
                }
                for h in history
            ]

        return export

    def export_and_email(self, data_request: DataRequest):
        """Export user data and email it as a JSON attachment."""
        export_data = self.export_user_data(data_request)

        export_dir = django_settings.GDPR_EXPORTS_DIR
        os.makedirs(export_dir, exist_ok=True)

        filename = f"gdpr-export-{data_request.id}.json"
        filepath = os.path.join(export_dir, filename)
        with open(filepath, "w") as f:
            json.dump(export_data, f, indent=2, default=str)

        email = EmailMessage(
            subject="Your Data Export Request",
            body=(
                f"Dear {data_request.first_name},\n\n"
                f"Please find your data export attached.\n\n"
                f"This file contains all personal data we hold about you."
            ),
            from_email=django_settings.DEFAULT_FROM_EMAIL,
            to=[data_request.email],
        )
        email.attach_file(filepath)
        try:
            email.send(fail_silently=False)
        except Exception as e:
            logger.error("Failed to send data export email to %s: %s", data_request.email, e)
            raise
        finally:
            try:
                os.remove(filepath)
            except OSError:
                pass
