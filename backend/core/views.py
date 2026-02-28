"""
Core views for health checks and system endpoints.
"""
from django.db import connection
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny


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
        except Exception as e:
            health_status['database'] = str(e)
            health_status['status'] = 'unhealthy'

        # Check cache
        try:
            cache.set('health_check', 'ok', 10)
            if cache.get('health_check') != 'ok':
                raise Exception('Cache read failed')
        except Exception as e:
            health_status['cache'] = str(e)
            health_status['status'] = 'unhealthy'

        status_code = 200 if health_status['status'] == 'healthy' else 503
        return Response(health_status, status=status_code)
