"""
Utilidades CSRF para autenticación JWT en cookie + SPA cross-origin.

El bypass sin cookie csrftoken solo aplica cuando:
- Hay cabecera Origin explícita (no solo Referer).
- El Origin está en CSRF_TRUSTED_ORIGINS.
- El cliente envía X-CSRFToken con formato válido (token emitido por Django).
"""
from urllib.parse import urlparse

from django.conf import settings
from django.middleware.csrf import _compare_masked_tokens, _unmask_cipher_token

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
    # Caracteres permitidos en token enmascarado Django (base64-like).
    return all(c.isalnum() or c in '-_' for c in token)


def csrf_tokens_match(header_token: str, cookie_token: str) -> bool:
    if not header_token or not cookie_token:
        return False
    try:
        return _compare_masked_tokens(
            _unmask_cipher_token(header_token),
            _unmask_cipher_token(cookie_token),
        )
    except (ValueError, TypeError):
        return False


def referer_origin(request) -> str:
    """Solo para logging o comprobaciones secundarias; no para bypass."""
    referer = request.headers.get('Referer', '')
    if not referer:
        return ''
    parsed = urlparse(referer)
    if not parsed.scheme or not parsed.netloc:
        return ''
    return normalized_origin(f'{parsed.scheme}://{parsed.netloc}')
