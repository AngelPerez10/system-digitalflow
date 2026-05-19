"""
Utilidades CSRF para autenticación JWT en cookie + SPA cross-origin.

La comparación token cookie/header la realiza CsrfViewMiddleware (API pública de Django).
Aquí solo validamos Origin de confianza y formato del header antes del bypass sin cookie.
"""
from django.conf import settings

# Tokens enmascarados de Django suelen ser largos; rechazar valores triviales.
CSRF_HEADER_MIN_LEN = 32


def normalized_origin(url: str) -> str:
    return (url or '').strip().rstrip('/')


def request_origin_header(request) -> str:
    """Solo Origin; no usar Referer para decisiones de bypass (más fiable en CORS)."""
    return normalized_origin(request.headers.get('Origin', ''))


def trusted_origins_set() -> set[str]:
    trusted = getattr(settings, 'CSRF_TRUSTED_ORIGINS', None) or []
    return {normalized_origin(o) for o in trusted if o}


def is_trusted_origin(origin: str) -> bool:
    if not origin:
        return False
    return normalized_origin(origin) in trusted_origins_set()


def get_csrf_header_token(request) -> str:
    return (
        request.headers.get('X-CSRFToken')
        or request.headers.get('X-Csrftoken')
        or ''
    ).strip()


def csrf_header_format_valid(token: str) -> bool:
    if len(token) < CSRF_HEADER_MIN_LEN:
        return False
    return all(c.isalnum() or c in '-_' for c in token)
