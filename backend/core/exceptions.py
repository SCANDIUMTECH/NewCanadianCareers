"""
Custom DRF exception handler.

Normalizes error responses and logs unhandled exceptions server-side
to prevent stack trace leakage in production.
"""
import logging

from django.core.exceptions import PermissionDenied, ValidationError
from django.http import Http404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger('core.exceptions')


def custom_exception_handler(exc, context):
    """Handle DRF exceptions with consistent format and server-side logging.

    - Known exceptions (4xx): returned with structured error body.
    - Unknown exceptions (5xx): logged with full traceback, generic
      message returned to the client.
    """
    # Let DRF handle known exceptions first
    response = exception_handler(exc, context)

    if response is not None:
        return response

    # DRF didn't handle it — this is an unhandled server error.
    view = context.get('view')
    view_name = view.__class__.__name__ if view else 'Unknown'
    logger.exception(
        'Unhandled exception in %s: %s',
        view_name,
        exc,
    )

    return Response(
        {'detail': 'An unexpected error occurred. Please try again later.'},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
