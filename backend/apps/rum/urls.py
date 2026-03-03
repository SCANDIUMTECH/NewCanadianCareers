from django.urls import path

from .views import WebVitalsIngestView

urlpatterns = [
    path('web-vitals/', WebVitalsIngestView.as_view(), name='rum-web-vitals'),
]
