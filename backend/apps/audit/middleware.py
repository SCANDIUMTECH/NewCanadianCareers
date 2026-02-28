"""
Audit middleware for Orion.
"""
from .models import AuditLog


class AuditMiddleware:
    """Middleware to automatically log audit events."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Check if view set an audit log
        if hasattr(request, '_audit_log'):
            audit_data = request._audit_log

            # Get IP address — prefer CF-Connecting-IP, fall back to REMOTE_ADDR
            ip_address = (
                request.META.get('HTTP_CF_CONNECTING_IP', '').strip()
                or request.META.get('REMOTE_ADDR')
            )

            AuditLog.objects.create(
                actor=request.user if request.user.is_authenticated else None,
                ip_address=ip_address,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                **audit_data
            )

        return response


def log_audit(request, action, target, changes=None, reason=''):
    """Helper to set audit log data on request."""
    request._audit_log = {
        'action': action,
        'target_type': target.__class__.__name__.lower(),
        'target_id': str(target.pk),
        'target_repr': str(target)[:255],
        'changes': changes or {},
        'reason': reason,
    }
