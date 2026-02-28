"""
Notification URL patterns.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.NotificationViewSet, basename='notifications')

urlpatterns = [
    # Explicit paths before router to avoid router's slug pattern catching them
    path('unread-count/', views.UnreadCountView.as_view(), name='unread-count'),
    path('preferences/', views.NotificationPreferenceView.as_view(), name='notification-preferences'),

    # Router-based views last
    path('', include(router.urls)),
]
