"""
RUM OpenTelemetry Middleware — Adds Server-Timing header with trace ID
for correlating frontend RUM data with backend traces.
"""
import logging

from django.conf import settings

logger = logging.getLogger('apps.rum')


class OTelRUMMiddleware:
    """
    Middleware that:
    1. Reads incoming `traceparent` header from frontend requests
    2. Adds `Server-Timing: traceparent;desc="<trace_id>"` to responses
    3. Enables correlation between RUM vitals and backend traces
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.enabled = getattr(settings, 'OTEL_ENABLED', True)

    def __call__(self, request):
        response = self.get_response(request)

        if not self.enabled:
            return response

        # Extract trace_id from traceparent header if present
        # Format: 00-<trace_id>-<span_id>-<flags>
        traceparent = request.headers.get('traceparent', '')
        if traceparent:
            parts = traceparent.split('-')
            if len(parts) >= 2:
                trace_id = parts[1]
                response['Server-Timing'] = f'traceparent;desc="{trace_id}"'

        return response
