"""Cookie-based JWT authentication for Orion."""
import logging

from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

logger = logging.getLogger('core.authentication')


class CookieJWTAuthentication(JWTAuthentication):
    """JWT auth that reads from HTTP-only cookie, falling back to Authorization header.

    Priority: Authorization header > access_token cookie.
    This allows mobile/API consumers to use Bearer tokens while the web
    frontend uses HTTP-only cookies set by login/register views.

    When a cookie contains an invalid/expired token, this authenticator
    returns None (unauthenticated) instead of raising — so AllowAny
    endpoints like /login are never blocked by stale cookies.  The
    invalid cookie is flagged on the request so middleware can clear it.
    """

    def authenticate(self, request):
        # Try standard header-based auth first
        header_result = super().authenticate(request)
        if header_result is not None:
            return header_result

        # Fall back to cookie
        cookie_name = settings.SIMPLE_JWT.get('AUTH_COOKIE', 'orion_access')
        raw_token = request.COOKIES.get(cookie_name)
        if raw_token is None:
            return None

        try:
            validated_token = self.get_validated_token(raw_token)
            return self.get_user(validated_token), validated_token
        except (InvalidToken, TokenError):
            # Stale/expired cookie — treat as unauthenticated, not as an error.
            # Flag the underlying Django HttpRequest (not the DRF wrapper) so
            # ClearStaleAuthCookiesMiddleware can delete the bad cookies.
            django_request = getattr(request, '_request', request)
            django_request._orion_stale_cookie = True
            logger.debug('Stale JWT cookie cleared for %s', django_request.path)
            return None
