import logging

from ..models import AdminAuditLog
from .consent import get_client_ip, mask_ip

logger = logging.getLogger("gdpr.audit")


def log_admin_action(
    request,
    action_type: str,
    description: str,
    target_model: str = "",
    target_id: str = "",
    metadata: dict = None,
):
    """Record an admin audit log entry (ISO 27701 / NIST Privacy Framework)."""
    try:
        ip = mask_ip(get_client_ip(request))
        AdminAuditLog.objects.create(
            user=request.user if request.user.is_authenticated else None,
            action_type=action_type,
            description=description,
            target_model=target_model,
            target_id=str(target_id),
            metadata=metadata or {},
            ip_address=ip,
        )
    except Exception as e:
        logger.error("Failed to record audit log: %s", e)
