"""
Symmetric encryption utilities for sensitive data at rest.

Uses Fernet (AES-128-CBC + HMAC-SHA256) with a key derived from
Django's SECRET_KEY via PBKDF2.

The PBKDF2 salt is configurable via the FIELD_ENCRYPTION_SALT environment
variable. Each deployment should use a unique salt for defense-in-depth.

Usage (low-level):
    from core.encryption import encrypt, decrypt

    ciphertext = encrypt("sk-my-api-key")
    plaintext = decrypt(ciphertext)

Usage (model field — preferred):
    from core.encryption import EncryptedTextField

    class MyModel(models.Model):
        api_key = EncryptedTextField(blank=True, default='')
"""
import base64
import hashlib
import logging
import os

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.db import models

logger = logging.getLogger(__name__)

_fernet_instance = None


def _get_fernet() -> Fernet:
    """Derive a Fernet key from Django SECRET_KEY (cached per process)."""
    global _fernet_instance
    if _fernet_instance is not None:
        return _fernet_instance

    # PBKDF2 with SHA256, 480 000 iterations → 32-byte key → base64-encode for Fernet
    # Salt is configurable per-deployment for defense-in-depth
    salt = os.environ.get('FIELD_ENCRYPTION_SALT', 'orion-field-encryption-salt').encode('utf-8')
    dk = hashlib.pbkdf2_hmac(
        'sha256',
        settings.SECRET_KEY.encode('utf-8'),
        salt,
        480_000,
        dklen=32,
    )
    key = base64.urlsafe_b64encode(dk)
    _fernet_instance = Fernet(key)
    return _fernet_instance


def encrypt(plaintext: str) -> str:
    """Encrypt a plaintext string. Returns a URL-safe base64 ciphertext string."""
    if not plaintext:
        return ''
    return _get_fernet().encrypt(plaintext.encode('utf-8')).decode('ascii')


def decrypt(ciphertext: str) -> str:
    """Decrypt a ciphertext string back to plaintext.

    Returns empty string if ciphertext is empty or decryption fails
    (e.g. SECRET_KEY was rotated).
    """
    if not ciphertext:
        return ''
    try:
        return _get_fernet().decrypt(ciphertext.encode('ascii')).decode('utf-8')
    except (InvalidToken, Exception) as e:
        logger.warning('Failed to decrypt value (token may be stale or SECRET_KEY rotated): %s', type(e).__name__)
        return ''


class EncryptedTextField(models.TextField):
    """A TextField that transparently encrypts on save and decrypts on read.

    Values are Fernet-encrypted at rest in the database. Plaintext is only
    present in Python memory. Legacy unencrypted values (not starting with
    the Fernet 'gAAAAA' prefix) are returned as-is for backward compatibility.

    Usage:
        class MyModel(models.Model):
            api_key = EncryptedTextField(blank=True, default='')
    """

    def get_prep_value(self, value):
        """Encrypt before saving to DB."""
        value = super().get_prep_value(value)
        if not value:
            return value
        # Don't double-encrypt
        if value.startswith('gAAAAA'):
            return value
        return encrypt(value)

    def from_db_value(self, value, expression, connection):
        """Decrypt when loading from DB."""
        if not value:
            return value
        # Legacy unencrypted values pass through
        if not value.startswith('gAAAAA'):
            return value
        return decrypt(value)

    def deconstruct(self):
        """For migrations — behaves as a regular TextField in schema."""
        name, path, args, kwargs = super().deconstruct()
        # Report as plain TextField so migrations don't depend on this module
        path = 'django.db.models.TextField'
        return name, path, args, kwargs
