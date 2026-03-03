"""
RUM Celery Tasks — Fallback processing when Kafka is unavailable.
"""
import logging

from celery import shared_task
from django.core.cache import cache

logger = logging.getLogger('apps.rum')

BUFFER_CACHE_KEY = 'orion:rum:celery_buffer'
BUFFER_MAX_SIZE = 500
BUFFER_TTL = 300  # 5 minutes


@shared_task(name='apps.rum.tasks.process_rum_vital')
def process_rum_vital(vital_data: dict):
    """
    Process a single web vital via Celery (Kafka fallback).
    Buffers in Redis and flushes when batch size is reached.
    """
    buffer = cache.get(BUFFER_CACHE_KEY, [])
    buffer.append(vital_data)

    if len(buffer) >= BUFFER_MAX_SIZE:
        _flush_buffer(buffer)
        cache.delete(BUFFER_CACHE_KEY)
    else:
        cache.set(BUFFER_CACHE_KEY, buffer, BUFFER_TTL)


@shared_task(name='apps.rum.tasks.flush_rum_buffer')
def flush_rum_buffer():
    """
    Periodic task to flush any buffered vitals to ClickHouse.
    Runs every 30 seconds via Celery Beat.
    """
    buffer = cache.get(BUFFER_CACHE_KEY, [])
    if not buffer:
        return

    _flush_buffer(buffer)
    cache.delete(BUFFER_CACHE_KEY)


def _flush_buffer(buffer: list[dict]):
    """
    Flush a buffer of vitals to ClickHouse.
    """
    if not buffer:
        return

    try:
        from .clickhouse_client import insert_vitals
        inserted = insert_vitals(buffer)
        logger.info('RUM flush: %d/%d vitals inserted into ClickHouse', inserted, len(buffer))
    except Exception as e:
        logger.error('RUM flush failed: %s', e)
