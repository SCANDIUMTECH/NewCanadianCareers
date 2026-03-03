"""
RUM Kafka Consumer — Reads web vitals from Kafka and batch-inserts into ClickHouse.

Usage: python manage.py rum_consumer
"""
import json
import logging
import signal
import time

from django.conf import settings
from django.core.management.base import BaseCommand

logger = logging.getLogger('apps.rum')

BATCH_SIZE = 500
FLUSH_INTERVAL = 5  # seconds
MAX_PENDING = 10000  # backpressure threshold


class Command(BaseCommand):
    help = 'Consume web vitals from Kafka and insert into ClickHouse'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._shutdown = False

    def handle(self, *args, **options):
        self.stdout.write('Starting RUM consumer...')

        # Graceful shutdown on SIGTERM/SIGINT
        signal.signal(signal.SIGTERM, self._signal_handler)
        signal.signal(signal.SIGINT, self._signal_handler)

        topic = getattr(settings, 'RUM_KAFKA_TOPIC', 'rum.webvitals.v1')
        bootstrap = getattr(settings, 'RUM_KAFKA_BOOTSTRAP', 'kafka:9092')

        # Wait for Kafka to be ready
        consumer = None
        while not self._shutdown:
            try:
                from kafka import KafkaConsumer
                consumer = KafkaConsumer(
                    topic,
                    bootstrap_servers=bootstrap,
                    group_id='orion-rum-consumer',
                    auto_offset_reset='earliest',
                    enable_auto_commit=False,
                    value_deserializer=lambda m: json.loads(m.decode('utf-8')),
                    consumer_timeout_ms=1000,
                    max_poll_records=BATCH_SIZE,
                )
                self.stdout.write(self.style.SUCCESS(
                    f'Connected to Kafka at {bootstrap}, consuming "{topic}"'
                ))
                break
            except Exception as e:
                self.stdout.write(self.style.WARNING(
                    f'Kafka not ready ({e}), retrying in 5s...'
                ))
                time.sleep(5)

        if consumer is None:
            return

        from apps.rum.clickhouse_client import insert_vitals

        batch = []
        last_flush = time.monotonic()

        try:
            while not self._shutdown:
                # Poll for messages
                try:
                    messages = consumer.poll(timeout_ms=1000)
                except Exception as e:
                    logger.error('Kafka poll error: %s', e)
                    time.sleep(1)
                    continue

                for tp, records in messages.items():
                    for record in records:
                        batch.append(record.value)

                # Backpressure: pause consumer when too many pending
                if len(batch) >= MAX_PENDING:
                    logger.warning(
                        'RUM consumer backpressure: %d pending, pausing', len(batch)
                    )
                    self._flush_batch(batch, insert_vitals)
                    batch = []
                    consumer.commit()
                    last_flush = time.monotonic()
                    continue

                # Flush on batch size or interval
                elapsed = time.monotonic() - last_flush
                if len(batch) >= BATCH_SIZE or (batch and elapsed >= FLUSH_INTERVAL):
                    self._flush_batch(batch, insert_vitals)
                    batch = []
                    consumer.commit()
                    last_flush = time.monotonic()

        finally:
            # Final flush
            if batch:
                self._flush_batch(batch, insert_vitals)
                consumer.commit()
            consumer.close()
            self.stdout.write('RUM consumer stopped.')

    def _flush_batch(self, batch, insert_fn):
        """Flush a batch of vitals to ClickHouse."""
        if not batch:
            return
        try:
            inserted = insert_fn(batch)
            logger.info('RUM consumer: flushed %d/%d vitals', inserted, len(batch))
        except Exception as e:
            logger.error('RUM consumer flush failed: %s', e)

    def _signal_handler(self, signum, frame):
        self.stdout.write('Received shutdown signal, stopping gracefully...')
        self._shutdown = True
