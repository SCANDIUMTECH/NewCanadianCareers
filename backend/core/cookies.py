"""Cookie helpers for JWT auth responses."""
from django.conf import settings


def set_auth_cookies(response, access_token, refresh_token):
    """Set HTTP-only JWT cookies + a JS-readable session presence flag."""
    jwt_settings = settings.SIMPLE_JWT
    access_max_age = int(jwt_settings['ACCESS_TOKEN_LIFETIME'].total_seconds())
    refresh_max_age = int(jwt_settings['REFRESH_TOKEN_LIFETIME'].total_seconds())
    secure = jwt_settings.get('AUTH_COOKIE_SECURE', True)
    samesite = jwt_settings.get('AUTH_COOKIE_SAMESITE', 'Lax')

    # Access token — HttpOnly, short-lived
    response.set_cookie(
        key=jwt_settings.get('AUTH_COOKIE', 'orion_access'),
        value=str(access_token),
        max_age=access_max_age,
        httponly=True,
        secure=secure,
        samesite=samesite,
        path='/',
    )

    # Refresh token — HttpOnly, long-lived, restricted path
    response.set_cookie(
        key='orion_refresh',
        value=str(refresh_token),
        max_age=refresh_max_age,
        httponly=True,
        secure=secure,
        samesite=samesite,
        path='/api/auth/',  # Only sent to auth endpoints
    )

    # Session presence flag — JS-readable for Edge middleware + frontend hydration
    response.set_cookie(
        key='orion_has_session',
        value='true',
        max_age=refresh_max_age,  # Lives as long as the refresh token
        httponly=False,  # Must be JS-readable
        secure=secure,
        samesite=samesite,
        path='/',
    )


def clear_auth_cookies(response):
    """Delete all auth cookies."""
    for cookie_name in ['orion_access', 'orion_refresh', 'orion_has_session']:
        response.delete_cookie(
            key=cookie_name,
            path='/' if cookie_name != 'orion_refresh' else '/api/auth/',
            samesite='Lax',
        )
