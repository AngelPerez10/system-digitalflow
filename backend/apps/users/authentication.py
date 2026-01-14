from rest_framework import exceptions
from django.middleware.csrf import CsrfViewMiddleware
from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    """Authenticate using a JWT stored in an HttpOnly cookie.

    This is safer against token theft via XSS than localStorage.

    NOTE: When using cookies for auth, protect unsafe methods against CSRF.
    This class enforces CSRF validation for non-safe HTTP methods.
    """

    access_cookie_name = 'access_token'

    def authenticate(self, request):
        raw = request.COOKIES.get(self.access_cookie_name)
        if not raw:
            return None

        validated_token = self.get_validated_token(raw)

        # Enforce CSRF for cookie-based auth on unsafe methods
        if request.method not in ('GET', 'HEAD', 'OPTIONS', 'TRACE'):
            self._enforce_csrf(request)

        return self.get_user(validated_token), validated_token

    def _enforce_csrf(self, request):
        check = CsrfViewMiddleware(get_response=lambda req: None)
        check.process_request(request)
        reason = check.process_view(request, lambda req: None, (), {})
        if reason:
            raise exceptions.PermissionDenied(f'CSRF Failed: {reason}')
