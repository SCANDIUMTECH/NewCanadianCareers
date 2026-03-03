"""
Public marketing URL patterns — no authentication required.
Registered under /api/marketing/ in config/urls.py.
"""
from django.urls import path

from . import public_views

urlpatterns = [
    # One-click unsubscribe (GET shows confirmation, POST for RFC 8058)
    path('unsubscribe/<str:token>/', public_views.UnsubscribeView.as_view(), name='marketing-unsubscribe'),

    # Preference center
    path('preferences/<str:token>/', public_views.PreferenceCenterView.as_view(), name='marketing-preferences'),
]
