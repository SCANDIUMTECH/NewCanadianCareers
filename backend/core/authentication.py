"""Cookie-based JWT authentication for Orion."""
from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    """JWT auth that reads from HTTP-only cookie, falling back to Authorization header.

    Priority: Authorization header > access_token cookie.
    This allows mobile/API consumers to use Bearer tokens while the web
    frontend uses HTTP-only cookies set by login/register views.
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

        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token
