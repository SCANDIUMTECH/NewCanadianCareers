"""
RUM Kafka Producer — Sends validated web vitals to Kafka topic.
Falls back to Celery task when Kafka is unavailable.
"""
import json
import logging
import threading

from django.conf import settings

logger = logging.getLogger('apps.rum')

_producer_instance = None
_producer_lock = threading.Lock()


def _get_kafka_producer():
    """
    Lazy singleton Kafka producer.
    Returns None if Kafka is not available.
    """
    global _producer_instance
    if _producer_instance is not None:
        return _producer_instance

    with _producer_lock:
        if _producer_instance is not None:
            return _producer_instance

        try:
            from kafka import KafkaProducer
            _producer_instance = KafkaProducer(
                bootstrap_servers=settings.RUM_KAFKA_BOOTSTRAP,
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                key_serializer=lambda k: k.encode('utf-8') if k else None,
                acks='all',
                retries=3,
                max_block_ms=5000,
                request_timeout_ms=10000,
            )
            logger.info('Kafka producer connected to %s', settings.RUM_KAFKA_BOOTSTRAP)
            return _producer_instance
        except Exception as e:
            logger.warning('Kafka producer unavailable: %s — falling back to Celery', e)
            return None


def send_vital(vital_data: dict) -> bool:
    """
    Send a single web vital to Kafka.
    Falls back to Celery task if Kafka is unavailable.
    Returns True if sent (Kafka or Celery), False on failure.
    """
    topic = getattr(settings, 'RUM_KAFKA_TOPIC', 'rum.webvitals.v1')
    session_id = vital_data.get('session_id', '')

    producer = _get_kafka_producer()
    if producer is not None:
        try:
            producer.send(
                topic,
                key=session_id,
                value=vital_data,
            )
            return True
        except Exception as e:
            logger.warning('Kafka send failed: %s — falling back to Celery', e)

    # Fallback: enqueue via Celery
    try:
        from .tasks import process_rum_vital
        process_rum_vital.delay(vital_data)
        return True
    except Exception as e:
        logger.error('Celery fallback also failed: %s', e)
        return False


def send_vitals_batch(vitals: list[dict]) -> int:
    """
    Send a batch of web vitals. Returns count of successfully sent.
    """
    sent = 0
    for vital in vitals:
        if send_vital(vital):
            sent += 1
    # Flush Kafka producer buffer
    producer = _get_kafka_producer()
    if producer is not None:
        try:
            producer.flush(timeout=5)
        except Exception:
            pass
    return sent
