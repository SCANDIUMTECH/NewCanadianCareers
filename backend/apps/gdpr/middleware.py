import logging

from .services.data_retention import DataRetentionService

logger = logging.getLogger(__name__)


class GDPRLastLoginMiddleware:
    """Records the last login timestamp for GDPR data retention tracking.

    This middleware fires on every authenticated request but only updates
    the record once per session to avoid excessive DB writes.
    Gracefully degrades if GDPR tables don't exist yet (pre-migration).
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if request.user.is_authenticated:
            session_key = "gdpr_login_recorded"
            if not request.session.get(session_key):
                try:
                    retention_service = DataRetentionService()
                    retention_service.record_login(request.user)
                    request.session[session_key] = True
                except Exception:
                    # GDPR tables may not exist yet (pre-migration) — skip silently
                    pass

        return response
