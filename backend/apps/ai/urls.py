"""
AI service URL patterns (authenticated users).
"""
from django.urls import path
from . import views

urlpatterns = [
    path('seo/generate/', views.GenerateSEOMetaView.as_view(), name='ai-seo-generate'),
    path('social/generate/', views.GenerateSocialContentView.as_view(), name='ai-social-generate'),
]
