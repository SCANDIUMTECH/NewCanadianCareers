"""
Shared utilities for Orion backend.
"""
import secrets
import string


def get_client_ip(request):
    """Get client IP address from request.

    Priority: CF-Connecting-IP (Cloudflare) > REMOTE_ADDR (Traefik sets this).
    X-Forwarded-For is intentionally ignored — it is attacker-controlled.
    """
    cf_ip = request.META.get('HTTP_CF_CONNECTING_IP')
    if cf_ip:
        return cf_ip.strip()
    return request.META.get('REMOTE_ADDR', '0.0.0.0')


def generate_entity_id(length=8):
    """Generate a unique 8-character alphanumeric entity ID (uppercase).

    Used across all public-facing models (Job, Company, Agency, User) for
    permanent, short, URL-safe identifiers.

    36^8 = 2.8 trillion combinations — collision-free at any practical scale.
    """
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))
