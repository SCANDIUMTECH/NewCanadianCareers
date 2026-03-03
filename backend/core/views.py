"""
Core views for health checks and system endpoints.
"""
import logging

from django.core.cache import cache
from django.db import connection
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger('core.views')


class HealthCheckView(APIView):
    """Health check endpoint for load balancers and monitoring."""

    permission_classes = [AllowAny]

    def get(self, request):
        health_status = {
            'status': 'healthy',
            'database': 'ok',
            'cache': 'ok',
        }

        # Check database
        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
        except Exception:
            logger.exception('Health check: database unavailable')
            health_status['database'] = 'unavailable'
            health_status['status'] = 'unhealthy'

        # Check cache
        try:
            cache.set('health_check', 'ok', 10)
            if cache.get('health_check') != 'ok':
                raise Exception('Cache read failed')
        except Exception:
            logger.exception('Health check: cache unavailable')
            health_status['cache'] = 'unavailable'
            health_status['status'] = 'unhealthy'

        status_code = 200 if health_status['status'] == 'healthy' else 503
        return Response(health_status, status=status_code)
