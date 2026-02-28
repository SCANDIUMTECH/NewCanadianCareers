"""
RUM ClickHouse Client — Singleton client for inserting and querying web vitals.
"""
import logging
import threading
from datetime import datetime, timedelta, timezone

from django.conf import settings

logger = logging.getLogger('apps.rum')

_client_instance = None
_client_lock = threading.Lock()


def _get_client():
    """
    Lazy singleton ClickHouse client.
    Returns None if ClickHouse is not available.
    """
    global _client_instance
    if _client_instance is not None:
        return _client_instance

    with _client_lock:
        if _client_instance is not None:
            return _client_instance

        try:
            import clickhouse_connect
            url = getattr(settings, 'RUM_CLICKHOUSE_URL', 'http://clickhouse:8123')
            db = getattr(settings, 'RUM_CLICKHOUSE_DB', 'default')

            # Parse host/port from URL
            from urllib.parse import urlparse
            parsed = urlparse(url)
            host = parsed.hostname or 'clickhouse'
            port = parsed.port or 8123

            ch_user = getattr(settings, 'RUM_CLICKHOUSE_USER', 'orion')
            ch_password = getattr(settings, 'RUM_CLICKHOUSE_PASSWORD', '')

            _client_instance = clickhouse_connect.get_client(
                host=host,
                port=port,
                database=db,
                username=ch_user,
                password=ch_password,
            )
            logger.info('ClickHouse client connected to %s:%s/%s', host, port, db)
            return _client_instance
        except Exception as e:
            logger.warning('ClickHouse client unavailable: %s', e)
            return None


def insert_vitals(batch: list[dict]) -> int:
    """
    Batch insert web vitals into ClickHouse.
    Returns number of rows inserted, or 0 on failure.
    """
    client = _get_client()
    if client is None or not batch:
        return 0

    try:
        columns = [
            'timestamp', 'session_id', 'page_url', 'page_path',
            'metric_name', 'metric_value', 'rating',
            'navigation_type', 'device_type', 'connection_type',
            'release', 'trace_id', 'site_id',
        ]
        rows = []
        for v in batch:
            rows.append([
                v.get('timestamp', datetime.now(timezone.utc).isoformat()),
                v.get('session_id', ''),
                v.get('page_url', ''),
                v.get('page_path', '/'),
                v.get('metric_name', ''),
                float(v.get('metric_value', 0)),
                v.get('rating', 'good'),
                v.get('navigation_type', ''),
                v.get('device_type', ''),
                v.get('connection_type', ''),
                v.get('release', ''),
                v.get('trace_id', ''),
                v.get('site_id', 'orion'),
            ])

        client.insert('web_vitals', rows, column_names=columns)
        return len(rows)
    except Exception as e:
        logger.error('ClickHouse insert failed: %s', e)
        return 0


def query_p75(metric_name: str, days: int = 30, device_type: str = None) -> float | None:
    """
    Query p75 percentile for a metric over the last N days.
    Uses the daily materialized view when possible.
    """
    client = _get_client()
    if client is None:
        return None

    try:
        since = (datetime.now(timezone.utc) - timedelta(days=days)).strftime('%Y-%m-%d')
        if device_type:
            query = (
                f"SELECT quantileMerge(0.75)(p75_state) AS p75 "
                f"FROM web_vitals_hourly "
                f"WHERE metric_name = %(metric)s "
                f"AND hour >= %(since)s "
                f"AND device_type = %(device)s"
            )
            result = client.query(query, parameters={
                'metric': metric_name,
                'since': since,
                'device': device_type,
            })
        else:
            query = (
                f"SELECT quantileMerge(0.75)(p75_state) AS p75 "
                f"FROM web_vitals_daily "
                f"WHERE metric_name = %(metric)s "
                f"AND day >= %(since)s"
            )
            result = client.query(query, parameters={
                'metric': metric_name,
                'since': since,
            })

        if result.result_rows and result.result_rows[0][0] is not None:
            return round(float(result.result_rows[0][0]), 3)
        return None
    except Exception as e:
        logger.error('ClickHouse p75 query failed: %s', e)
        return None


def query_p95(metric_name: str, days: int = 30) -> float | None:
    """
    Query p95 percentile for a metric over the last N days.
    """
    client = _get_client()
    if client is None:
        return None

    try:
        since = (datetime.now(timezone.utc) - timedelta(days=days)).strftime('%Y-%m-%d')
        query = (
            f"SELECT quantileMerge(0.95)(p95_state) AS p95 "
            f"FROM web_vitals_daily "
            f"WHERE metric_name = %(metric)s "
            f"AND day >= %(since)s"
        )
        result = client.query(query, parameters={
            'metric': metric_name,
            'since': since,
        })

        if result.result_rows and result.result_rows[0][0] is not None:
            return round(float(result.result_rows[0][0]), 3)
        return None
    except Exception as e:
        logger.error('ClickHouse p95 query failed: %s', e)
        return None


def query_history(metric_name: str, days: int = 30, granularity: str = 'daily') -> list[dict]:
    """
    Query time-series history for a metric.
    Returns list of {date, p75, p95, sample_count}.
    """
    client = _get_client()
    if client is None:
        return []

    try:
        since = (datetime.now(timezone.utc) - timedelta(days=days)).strftime('%Y-%m-%d')

        if granularity == 'hourly':
            query = (
                "SELECT "
                "  formatDateTime(hour, '%Y-%m-%dT%H:%M:%S') AS ts, "
                "  quantileMerge(0.75)(p75_state) AS p75, "
                "  quantileMerge(0.95)(p95_state) AS p95, "
                "  sum(sample_count) AS samples "
                "FROM web_vitals_hourly "
                "WHERE metric_name = %(metric)s AND hour >= %(since)s "
                "GROUP BY hour ORDER BY hour"
            )
        else:
            query = (
                "SELECT "
                "  formatDateTime(day, '%Y-%m-%d') AS ts, "
                "  quantileMerge(0.75)(p75_state) AS p75, "
                "  quantileMerge(0.95)(p95_state) AS p95, "
                "  sum(sample_count) AS samples "
                "FROM web_vitals_daily "
                "WHERE metric_name = %(metric)s AND day >= %(since)s "
                "GROUP BY day ORDER BY day"
            )

        result = client.query(query, parameters={
            'metric': metric_name,
            'since': since,
        })

        history = []
        for row in result.result_rows:
            history.append({
                'date': row[0],
                'p75': round(float(row[1]), 3) if row[1] is not None else 0,
                'p95': round(float(row[2]), 3) if row[2] is not None else 0,
                'sample_count': int(row[3]) if row[3] is not None else 0,
            })
        return history
    except Exception as e:
        logger.error('ClickHouse history query failed: %s', e)
        return []


def get_sample_count(days: int = 30) -> int:
    """
    Get total number of vitals collected in the last N days.
    """
    client = _get_client()
    if client is None:
        return 0

    try:
        since = (datetime.now(timezone.utc) - timedelta(days=days)).strftime('%Y-%m-%d')
        query = (
            "SELECT sum(sample_count) "
            "FROM web_vitals_daily "
            "WHERE day >= %(since)s"
        )
        result = client.query(query, parameters={'since': since})
        if result.result_rows and result.result_rows[0][0] is not None:
            return int(result.result_rows[0][0])
        return 0
    except Exception:
        return 0
