"""
RUM Admin Views — ClickHouse-backed Core Web Vitals for the admin dashboard.
Falls back to SEO-derived proxy estimates when no RUM data is available.
"""
import logging

from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsAdmin

from . import clickhouse_client as ch

logger = logging.getLogger('apps.rum')


class RUMCoreWebVitalsView(APIView):
    """
    GET /api/search/web-vitals/ — Core Web Vitals from RUM data.

    Response shape (backward compatible with AdminCoreWebVitalsView):
    {
        "current": { "lcp": 2.1, "cls": 0.05, "inp": 150 },
        "history": [{ "date": "2025-02-01", "vitals": { "lcp": ..., "cls": ..., "inp": ... } }],
        "source": "rum" | "estimate"
    }
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        days = int(request.query_params.get('days', 30))

        # Try ClickHouse first
        lcp_p75 = ch.query_p75('LCP', days=days)
        cls_p75 = ch.query_p75('CLS', days=days)
        inp_p75 = ch.query_p75('INP', days=days)

        sample_count = ch.get_sample_count(days=days)

        if sample_count > 0 and lcp_p75 is not None:
            # Real RUM data available
            current = {
                'lcp': lcp_p75,
                'cls': cls_p75 if cls_p75 is not None else 0,
                'inp': round(inp_p75) if inp_p75 is not None else 0,
            }

            # Build history from ClickHouse daily rollups
            lcp_history = ch.query_history('LCP', days=days, granularity='daily')
            cls_history = ch.query_history('CLS', days=days, granularity='daily')
            inp_history = ch.query_history('INP', days=days, granularity='daily')

            # Merge into the expected {date, vitals} format
            history = _merge_history(lcp_history, cls_history, inp_history)

            return Response({
                'current': current,
                'history': history,
                'source': 'rum',
                'sampleCount': sample_count,
            })

        # Fallback: SEO-derived estimates (same logic as AdminCoreWebVitalsView)
        return self._fallback_response()

    def _fallback_response(self):
        """
        Generate CWV estimates from the SEO scoring engine.
        This matches the original AdminCoreWebVitalsView behavior.
        """
        from django.core.cache import cache
        from apps.search.admin_views import _run_checks, _compute_category_score
        from apps.jobs.models import Job
        from apps.companies.models import Company

        checks = _run_checks(Job.objects, Company.objects)
        perf_checks = checks.get('performance', [])
        perf_score, *_ = _compute_category_score(perf_checks)

        current = {
            'lcp': round(perf_score / 100 * 2.5, 2),
            'cls': round((100 - perf_score) / 100 * 0.1, 3),
            'inp': round((100 - perf_score) / 100 * 200),
        }

        # Retrieve cached daily history
        history_cache = cache.get('orion:seo:cwv_history', [])
        today = timezone.now().strftime('%Y-%m-%d')
        today_exists = any(h['date'] == today for h in history_cache)
        if not today_exists:
            history_cache.append({'date': today, 'vitals': current})
            history_cache = history_cache[-30:]
            cache.set('orion:seo:cwv_history', history_cache, 60 * 60 * 24 * 30)

        return Response({
            'current': current,
            'history': history_cache,
            'source': 'estimate',
            'sampleCount': 0,
        })


def _merge_history(
    lcp_history: list[dict],
    cls_history: list[dict],
    inp_history: list[dict],
) -> list[dict]:
    """
    Merge separate metric histories into the combined format expected by the frontend:
    [{ "date": "2025-02-01", "vitals": { "lcp": 2.1, "cls": 0.05, "inp": 150 } }]
    """
    # Index by date
    cls_by_date = {h['date']: h['p75'] for h in cls_history}
    inp_by_date = {h['date']: h['p75'] for h in inp_history}

    history = []
    for entry in lcp_history:
        date = entry['date']
        history.append({
            'date': date,
            'vitals': {
                'lcp': entry['p75'],
                'cls': cls_by_date.get(date, 0),
                'inp': round(inp_by_date.get(date, 0)),
            },
        })

    return history
