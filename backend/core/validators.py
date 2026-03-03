"""
Centralized file upload validators for Orion.

Defense-in-depth: extension check + content verification + size limits.
All upload views must use validate_upload() before saving files.
"""
import logging
import os
import uuid

from django.core.exceptions import ValidationError
from PIL import Image
from rest_framework.throttling import UserRateThrottle

logger = logging.getLogger('core.validators')

# Limit Pillow decompression to prevent zip-bomb images (~7000x7000).
# Set once at module level — not per-call — to avoid mutating global state repeatedly.
Image.MAX_IMAGE_PIXELS = 50_000_000


class UploadRateThrottle(UserRateThrottle):
    """Per-user rate limit for file uploads (30/hour).

    Apply to upload views via throttle_classes = [UploadRateThrottle].
    """

    scope = 'uploads'


# ── Allowed file profiles ──────────────────────────────────────────────
# Each profile defines: extensions, max size, and whether to verify as image.

IMAGE_PROFILE = {
    'extensions': {'.png', '.jpg', '.jpeg', '.webp', '.gif'},
    'max_size': 10 * 1024 * 1024,  # 10 MB
    'verify_image': True,
    'max_dimensions': (8000, 8000),
}

DOCUMENT_PROFILE = {
    'extensions': {'.pdf', '.doc', '.docx', '.rtf', '.txt', '.odt'},
    'max_size': 10 * 1024 * 1024,  # 10 MB
    'verify_image': False,
    'max_dimensions': None,
}

AVATAR_PROFILE = {
    'extensions': {'.png', '.jpg', '.jpeg', '.webp', '.gif'},
    'max_size': 5 * 1024 * 1024,  # 5 MB
    'verify_image': True,
    'max_dimensions': (4000, 4000),
}

LOGO_PROFILE = {
    'extensions': {'.png', '.jpg', '.jpeg', '.webp'},
    'max_size': 5 * 1024 * 1024,  # 5 MB
    'verify_image': True,
    'max_dimensions': (4000, 4000),
}

BANNER_PROFILE = {
    'extensions': {'.png', '.jpg', '.jpeg', '.webp'},
    'max_size': 10 * 1024 * 1024,  # 10 MB
    'verify_image': True,
    'max_dimensions': (8000, 4000),
}

COVER_IMAGE_PROFILE = {
    'extensions': {'.png', '.jpg', '.jpeg', '.webp'},
    'max_size': 10 * 1024 * 1024,  # 10 MB
    'verify_image': True,
    'max_dimensions': (8000, 8000),
}


def validate_upload(uploaded_file, profile):
    """Validate an uploaded file against a security profile.

    Performs defense-in-depth validation:
    1. Extension check (reject SVG, executables, archives)
    2. File size check
    3. Content verification via Pillow (for images)
    4. Dimension check (prevent decompression bombs)

    Args:
        uploaded_file: Django UploadedFile instance
        profile: One of the *_PROFILE dicts above

    Raises:
        ValidationError with user-safe message on failure.
    """
    if not uploaded_file:
        raise ValidationError('No file provided.')

    # 1. Extension check
    ext = os.path.splitext(uploaded_file.name)[1].lower()
    allowed = profile['extensions']
    if ext not in allowed:
        raise ValidationError(
            f'File type "{ext}" is not allowed. '
            f'Accepted: {", ".join(sorted(allowed))}'
        )

    # 2. File size check
    max_size = profile['max_size']
    if uploaded_file.size > max_size:
        max_mb = max_size / (1024 * 1024)
        raise ValidationError(
            f'File too large ({uploaded_file.size / (1024 * 1024):.1f} MB). '
            f'Maximum: {max_mb:.0f} MB.'
        )

    # 3. Content verification for images (magic bytes + structure)
    if profile['verify_image']:
        _verify_image_content(uploaded_file, profile)


def _verify_image_content(uploaded_file, profile):
    """Verify file is a valid image using Pillow.

    Pillow checks magic bytes and attempts to parse the image structure,
    catching disguised executables and corrupted files.
    Reads dimensions before verify() to avoid opening the image twice
    (verify() invalidates the image object).
    """
    try:
        uploaded_file.seek(0)
        img = Image.open(uploaded_file)
        width, height = img.size  # Read from header — no full decode needed
        img.verify()  # Checks file integrity (invalidates img after)
    except Exception:
        raise ValidationError(
            'File is not a valid image. The file may be corrupted or '
            'is not a supported image format.'
        )
    finally:
        uploaded_file.seek(0)

    # 4. Dimension check
    max_dims = profile.get('max_dimensions')
    if max_dims and (width > max_dims[0] or height > max_dims[1]):
        raise ValidationError(
            f'Image dimensions {width}x{height} exceed maximum '
            f'{max_dims[0]}x{max_dims[1]}.'
        )


def sanitize_filename(uploaded_file):
    """Sanitize filename: strip path components, add UUID prefix.

    Prevents path traversal and filename collisions. Original extension
    is preserved for Content-Type detection.

    Mutates uploaded_file.name in place.
    """
    basename = os.path.basename(uploaded_file.name)
    _, ext = os.path.splitext(basename)
    uploaded_file.name = f'{uuid.uuid4().hex[:12]}{ext.lower()}'


def convert_to_webp(uploaded_file, quality=85):
    """Convert an uploaded image to WebP format.

    WebP typically reduces file size by 25-35% vs PNG/JPEG with no
    visible quality loss at quality=85. All modern browsers support WebP.

    Args:
        uploaded_file: Django UploadedFile instance (already validated).
        quality: WebP quality 1-100 (default 85).

    Returns:
        A new InMemoryUploadedFile in WebP format, or the original file
        if it's already WebP or conversion fails.
    """
    import io
    from django.core.files.uploadedfile import InMemoryUploadedFile

    ext = os.path.splitext(uploaded_file.name)[1].lower()
    if ext == '.webp':
        return uploaded_file  # Already WebP

    try:
        uploaded_file.seek(0)
        img = Image.open(uploaded_file)

        # Preserve RGBA for PNGs, convert palette/CMYK modes
        if img.mode in ('RGBA', 'LA'):
            pass  # WebP supports alpha
        elif img.mode != 'RGB':
            img = img.convert('RGB')

        buffer = io.BytesIO()
        img.save(buffer, format='WEBP', quality=quality, method=4)
        buffer.seek(0)

        # Build new filename with .webp extension
        name_without_ext = os.path.splitext(uploaded_file.name)[0]
        webp_name = f'{name_without_ext}.webp'

        webp_file = InMemoryUploadedFile(
            file=buffer,
            field_name=uploaded_file.field_name if hasattr(uploaded_file, 'field_name') else 'file',
            name=webp_name,
            content_type='image/webp',
            size=buffer.getbuffer().nbytes,
            charset=None,
        )
        return webp_file
    except Exception as e:
        logger.warning('WebP conversion failed for %s: %s', uploaded_file.name, e)
        uploaded_file.seek(0)
        return uploaded_file
