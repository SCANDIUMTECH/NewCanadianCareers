"""
Shared utilities for Orion backend.
"""
import secrets
import string


def generate_entity_id(length=8):
    """Generate a unique 8-character alphanumeric entity ID (uppercase).

    Used across all public-facing models (Job, Company, Agency, User) for
    permanent, short, URL-safe identifiers.

    36^8 = 2.8 trillion combinations — collision-free at any practical scale.
    """
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))
