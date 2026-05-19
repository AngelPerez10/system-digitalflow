import re

from django.conf import settings

_DEV_VITE_ORIGIN = re.compile(
    r'^https?://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}):(5173|4173)$'
)

_AUTH_EXEMPT_PATHS = frozenset({'/api/login/', '/api/logout/', '/api/auth/csrf/', '/api/token/refresh/'})


class DisableCSRFFromAuthorizationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_view(self, request, view_func, view_args, view_kwargs):
        if not request.path.startswith('/api/'):
            return None
        # Exempt auth endpoints — login/logout/refresh need CSRF cookie
        # to exist before the request, which is impossible on first visit.
        if request.path in _AUTH_EXEMPT_PATHS:
            setattr(request, '_dont_enforce_csrf_checks', True)
            return None
        # Exempt Bearer token requests (backward compat / API clients)
        auth = request.headers.get('Authorization', '')
        if auth.startswith('Bearer '):
            setattr(request, '_dont_enforce_csrf_checks', True)
            return None
        if settings.DEBUG:
            origin = request.META.get('HTTP_ORIGIN', '')
            if origin and _DEV_VITE_ORIGIN.match(origin):
                setattr(request, '_dont_enforce_csrf_checks', True)
        return None


class SecurityHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "img-src 'self' data: https:; "
            "connect-src 'self'; "
            "font-src 'self' https://fonts.gstatic.com; "
            "frame-src 'self'; "
            "frame-ancestors 'none'; "
            "form-action 'self'; "
            "base-uri 'self'"
        )
        response['X-Content-Type-Options'] = 'nosniff'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response['Permissions-Policy'] = (
            "camera=(), microphone=(), geolocation=(), "
            "payment=(), usb=(), magnetometer=(), "
            "gyroscope=(), speaker=(), vibrate=()"
        )
        return response
