"""Cookie helpers for JWT auth responses."""
from django.conf import settings


def _cookie_names():
    """Return the three auth cookie names from settings (single source of truth)."""
    jwt = settings.SIMPLE_JWT
    return (
        jwt['AUTH_COOKIE'],           # access token
        jwt['AUTH_COOKIE_REFRESH'],   # refresh token
        jwt['AUTH_COOKIE_SESSION'],   # JS-readable session presence flag
    )


def set_auth_cookies(response, access_token, refresh_token):
    """Set HTTP-only JWT cookies + a JS-readable session presence flag."""
    jwt_settings = settings.SIMPLE_JWT
    access_name, refresh_name, session_name = _cookie_names()
    access_max_age = int(jwt_settings['ACCESS_TOKEN_LIFETIME'].total_seconds())
    refresh_max_age = int(jwt_settings['REFRESH_TOKEN_LIFETIME'].total_seconds())
    secure = jwt_settings.get('AUTH_COOKIE_SECURE', True)
    samesite = jwt_settings.get('AUTH_COOKIE_SAMESITE', 'Lax')
    domain = jwt_settings.get('AUTH_COOKIE_DOMAIN', None)

    # Access token — HttpOnly, short-lived
    response.set_cookie(
        key=access_name,
        value=str(access_token),
        max_age=access_max_age,
        httponly=True,
        secure=secure,
        samesite=samesite,
        path='/',
        domain=domain,
    )

    # Refresh token — HttpOnly, long-lived, restricted path
    response.set_cookie(
        key=refresh_name,
        value=str(refresh_token),
        max_age=refresh_max_age,
        httponly=True,
        secure=secure,
        samesite=samesite,
        path='/api/auth/',  # Only sent to auth endpoints
        domain=domain,
    )

    # Session presence flag — JS-readable for Edge middleware + frontend hydration
    response.set_cookie(
        key=session_name,
        value='true',
        max_age=refresh_max_age,  # Lives as long as the refresh token
        httponly=False,  # Must be JS-readable
        secure=secure,
        samesite=samesite,
        path='/',
        domain=domain,
    )


def clear_auth_cookies(response):
    """Delete all auth cookies."""
    jwt_settings = settings.SIMPLE_JWT
    domain = jwt_settings.get('AUTH_COOKIE_DOMAIN', None)
    _, refresh_name, _ = _cookie_names()
    for cookie_name in _cookie_names():
        response.delete_cookie(
            key=cookie_name,
            path='/' if cookie_name != refresh_name else '/api/auth/',
            samesite='Lax',
            domain=domain,
        )
