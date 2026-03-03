"""
Webhook URL patterns for email provider callbacks.
Registered under /api/webhooks/ in config/urls.py.
"""
from django.urls import path

from . import webhook_views

urlpatterns = [
    # Email provider webhooks (bounce, complaint, delivered, opened, clicked)
    path('email/<str:provider>/', webhook_views.EmailWebhookView.as_view(), name='email-webhook'),
]
