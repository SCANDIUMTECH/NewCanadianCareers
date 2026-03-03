"""
RUM Pipeline Serializers — Validates incoming web vital payloads.
"""
from rest_framework import serializers


VALID_METRIC_NAMES = ('LCP', 'CLS', 'INP')
VALID_RATINGS = ('good', 'needs-improvement', 'poor')
VALID_NAVIGATION_TYPES = ('navigate', 'reload', 'back_forward', 'back-forward-cache', 'prerender', 'restore', '')
VALID_DEVICE_TYPES = ('mobile', 'desktop', 'tablet', '')
MAX_BATCH_SIZE = 10


class WebVitalSerializer(serializers.Serializer):
    metric_name = serializers.ChoiceField(choices=VALID_METRIC_NAMES)
    metric_value = serializers.FloatField(min_value=0)
    rating = serializers.ChoiceField(choices=VALID_RATINGS, required=False, default='good')
    session_id = serializers.CharField(max_length=64)
    page_url = serializers.CharField(max_length=2048)
    navigation_type = serializers.CharField(max_length=32, required=False, default='')
    device_type = serializers.CharField(max_length=16, required=False, default='')
    connection_type = serializers.CharField(max_length=32, required=False, default='')
    release = serializers.CharField(max_length=64, required=False, default='')
    trace_id = serializers.CharField(max_length=64, required=False, default='')


class WebVitalBatchSerializer(serializers.Serializer):
    vitals = WebVitalSerializer(many=True)

    def validate_vitals(self, value):
        if len(value) > MAX_BATCH_SIZE:
            raise serializers.ValidationError(
                f'Batch size exceeds maximum of {MAX_BATCH_SIZE}.'
            )
        if len(value) == 0:
            raise serializers.ValidationError('At least one vital is required.')
        return value
