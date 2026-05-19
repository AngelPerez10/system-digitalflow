from django.conf import settings
from django.middleware.csrf import CsrfViewMiddleware
from rest_framework import exceptions
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from .csrf_utils import (
    csrf_header_format_valid,
    get_csrf_header_token,
    is_trusted_origin,
    request_origin_header,
)


class CookieJWTAuthentication(JWTAuthentication):
    """Autenticación JWT en cookie HttpOnly + validación CSRF en métodos no seguros."""

    access_cookie_name = 'access_token'

    def authenticate(self, request):
        raw = request.COOKIES.get(self.access_cookie_name)
        if not raw:
            return None

        try:
            validated_token = self.get_validated_token(raw)
        except (TokenError, InvalidToken):
            return None

        if request.method not in ('GET', 'HEAD', 'OPTIONS', 'TRACE'):
            self._enforce_csrf(request)

        return self.get_user(validated_token), validated_token

    def _enforce_csrf(self, request):
        header_token = get_csrf_header_token(request)
        cookie_name = settings.CSRF_COOKIE_NAME
        cookie_token = request.COOKIES.get(cookie_name, '')

        origin = request_origin_header(request)
        allow_cross_origin_header_only = (
            not cookie_token
            and bool(header_token)
            and csrf_header_format_valid(header_token)
            and is_trusted_origin(origin)
        )

        if allow_cross_origin_header_only:
            request.COOKIES = request.COOKIES.copy()
            request.COOKIES[cookie_name] = header_token
            request.META['CSRF_COOKIE'] = header_token
        elif not header_token:
            raise exceptions.PermissionDenied('CSRF Failed: CSRF token missing.')
        elif cookie_token:
            request.META['CSRF_COOKIE'] = cookie_token

        check = CsrfViewMiddleware(get_response=lambda req: None)
        check.process_request(request)
        reason = check.process_view(request, lambda req: None, (), {})
        if reason:
            raise exceptions.PermissionDenied('CSRF Failed: CSRF token missing.')
