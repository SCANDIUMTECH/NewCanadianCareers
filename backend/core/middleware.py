from django.middleware.csrf import CsrfViewMiddleware

from core.cookies import clear_auth_cookies


class ApiCsrfExemptMiddleware(CsrfViewMiddleware):
    """Skip CSRF checks for API paths.

    CSRF protection for cookie-authenticated API endpoints is provided by
    SameSite=Lax cookies, which prevent cross-site POST/PUT/PATCH/DELETE
    requests from including cookies. Combined with Secure flag in production,
    this provides equivalent CSRF protection without requiring a CSRF token dance.

    Django admin at /admin/ still gets full CSRF protection since it
    relies on session authentication.
    """

    CSRF_EXEMPT_PREFIXES = ('/api/', '/rum/', '/health/')

    def process_view(self, request, callback, callback_args, callback_kwargs):
        if any(request.path_info.startswith(p) for p in self.CSRF_EXEMPT_PREFIXES):
            return None
        return super().process_view(request, callback, callback_args, callback_kwargs)


class ClearStaleAuthCookiesMiddleware:
    """Clear invalid JWT cookies from the browser.

    When CookieJWTAuthentication detects a stale/expired access cookie it
    flags the request with ``_orion_stale_cookie = True`` and returns None
    (unauthenticated) instead of raising.  This middleware picks up that
    flag and adds Set-Cookie headers to delete the bad cookies, so the
    browser stops sending them on subsequent requests.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if getattr(request, '_orion_stale_cookie', False):
            clear_auth_cookies(response)

        return response
