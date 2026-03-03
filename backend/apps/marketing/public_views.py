"""
Public marketing views — no authentication required.
Handles unsubscribe and preference center endpoints.
"""
import logging

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import (
    PreferencesSerializer,
    PreferencesUpdateSerializer,
)
from .services.compliance_service import ComplianceService

logger = logging.getLogger(__name__)


class UnsubscribeView(APIView):
    """One-click unsubscribe endpoint (RFC 8058 compliant).

    GET: Confirms unsubscribe via token (renders confirmation in frontend).
    POST: Processes one-click unsubscribe (List-Unsubscribe-Post header).
    """
    permission_classes = [AllowAny]
    authentication_classes = []  # No auth needed

    def get(self, request, token):
        result = ComplianceService.process_unsubscribe(token)
        if result.get('success'):
            return Response({
                'detail': 'You have been unsubscribed.',
                'email': result.get('user_email'),
            })
        return Response(
            {'detail': result.get('error', 'Invalid token')},
            status=status.HTTP_400_BAD_REQUEST
        )

    def post(self, request, token):
        """RFC 8058 one-click unsubscribe via POST."""
        result = ComplianceService.process_unsubscribe(token)
        if result.get('success'):
            return Response({
                'detail': 'You have been unsubscribed.',
                'email': result.get('user_email'),
            })
        return Response(
            {'detail': result.get('error', 'Invalid token')},
            status=status.HTTP_400_BAD_REQUEST
        )


class PreferenceCenterView(APIView):
    """Public preference center for managing marketing email preferences.

    GET: Returns current preferences for the token owner.
    PATCH: Updates preferences (opt-in or unsubscribe).
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, token):
        prefs = ComplianceService.get_user_preferences(token)
        if prefs is None:
            return Response(
                {'detail': 'Invalid or expired token'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = PreferencesSerializer(prefs)
        return Response(serializer.data)

    def patch(self, request, token):
        serializer = PreferencesUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = ComplianceService.update_user_preferences(
            token, serializer.validated_data['status']
        )

        if result.get('success'):
            return Response({
                'detail': 'Preferences updated.',
                'status': result['status'],
            })
        return Response(
            {'detail': result.get('error', 'Failed to update preferences')},
            status=status.HTTP_400_BAD_REQUEST
        )
