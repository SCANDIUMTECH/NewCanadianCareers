from django.middleware.csrf import CsrfViewMiddleware


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
