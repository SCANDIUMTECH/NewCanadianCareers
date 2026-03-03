"""
RUM Ingest View — POST /rum/v1/web-vitals/
Accepts web vital beacons from the frontend.
No JWT auth — secured via HMAC + origin allowlist + rate limiting.
"""
import time
import logging
from datetime import datetime, timezone

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView

from .security import verify_hmac, check_origin, should_sample, strip_pii, extract_page_path
from .serializers import WebVitalBatchSerializer
from .producer import send_vitals_batch

logger = logging.getLogger('apps.rum')


class RUMIngestThrottle(SimpleRateThrottle):
    scope = 'rum_ingest'

    def get_cache_key(self, request, view):
        # Rate limit by IP
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request),
        }


class WebVitalsIngestView(APIView):
    """
    Ingest endpoint for Real User Monitoring web vitals.

    POST /rum/v1/web-vitals/
    Body: { "vitals": [{ metric_name, metric_value, session_id, page_url, ... }] }
    Headers:
      - X-RUM-Signature: sha256=<hmac_hex>
      - Origin: http://localhost:3000

    Returns 204 No Content (beacon-friendly).
    """
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [RUMIngestThrottle]

    def post(self, request):
        start = time.monotonic()

        # Check if RUM is enabled
        if not getattr(settings, 'RUM_ENABLED', True):
            return Response(status=status.HTTP_204_NO_CONTENT)

        # HMAC verification (header or query param for sendBeacon compatibility)
        signature = request.headers.get('X-RUM-Signature', '') or request.query_params.get('sig', '')
        if not verify_hmac(request.body, signature):
            logger.warning('RUM ingest: HMAC verification failed from %s', request.META.get('REMOTE_ADDR'))
            return Response(
                {'error': 'Invalid signature'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Origin check
        origin = request.headers.get('Origin', '')
        if not check_origin(origin):
            logger.warning('RUM ingest: Origin rejected: %s', origin)
            return Response(
                {'error': 'Origin not allowed'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Validate payload
        serializer = WebVitalBatchSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        vitals = serializer.validated_data['vitals']

        # Deterministic sampling — check first vital's session_id
        session_id = vitals[0].get('session_id', '') if vitals else ''
        if not should_sample(session_id):
            # Sampled out — acknowledge but discard
            return Response(status=status.HTTP_204_NO_CONTENT)

        # Process vitals: strip PII, add metadata
        now = datetime.now(timezone.utc).isoformat()
        processed = []
        for vital in vitals:
            clean_url = strip_pii(vital.get('page_url', ''))
            processed.append({
                'timestamp': now,
                'session_id': vital['session_id'],
                'page_url': clean_url,
                'page_path': extract_page_path(clean_url),
                'metric_name': vital['metric_name'],
                'metric_value': vital['metric_value'],
                'rating': vital.get('rating', 'good'),
                'navigation_type': vital.get('navigation_type', ''),
                'device_type': vital.get('device_type', ''),
                'connection_type': vital.get('connection_type', ''),
                'release': vital.get('release', ''),
                'trace_id': vital.get('trace_id', ''),
                'site_id': 'orion',
            })

        # Enqueue to Kafka (or Celery fallback)
        sent = send_vitals_batch(processed)
        logger.debug('RUM ingest: %d/%d vitals enqueued', sent, len(processed))

        # Return 204 with Server-Timing header
        elapsed_ms = round((time.monotonic() - start) * 1000, 1)
        response = Response(status=status.HTTP_204_NO_CONTENT)
        response['Server-Timing'] = f'rum;dur={elapsed_ms}'
        return response
