"""Blacklist de *access tokens* JWT para que el logout termine la sesión de verdad.

`rest_framework_simplejwt` solo revoca el *refresh* (app `token_blacklist`). El
*access* es stateless y seguía siendo válido hasta 30 min después del logout.
Aquí guardamos el `jti` del access revocado en la caché de Django (la misma que
ya usa el throttling) con TTL = vida restante del token, y las clases de
autenticación lo consultan. Al expirar el token, la entrada desaparece sola.

Nota multi-worker: con `LocMemCache` cada proceso tiene su propia copia — igual
que el throttling actual. En despliegues con varios workers conviene una caché
compartida (Redis/Memcached) para que el corte de sesión sea inmediato en todos.
"""

from __future__ import annotations

import logging
import time

from django.core.cache import cache

logger = logging.getLogger(__name__)

_PREFIX = 'jwt_access_blacklist:'
_FALLBACK_TTL = 60 * 30  # vida por defecto del access token (SIMPLE_JWT)


def _payload(token) -> dict:
    return getattr(token, 'payload', None) or {}


def blacklist_access_token(token) -> None:
    """Revoca un access token ya validado (objeto AccessToken de SimpleJWT)."""
    payload = _payload(token)
    jti = payload.get('jti')
    if not jti:
        return
    exp = payload.get('exp')
    ttl = _FALLBACK_TTL
    if exp:
        try:
            ttl = int(exp - time.time())
        except (TypeError, ValueError):
            ttl = _FALLBACK_TTL
    if ttl <= 0:
        return  # ya expiró; nada que revocar
    try:
        cache.set(f'{_PREFIX}{jti}', True, timeout=ttl)
    except Exception:
        logger.exception('No se pudo poner el access token en blacklist (jti=%s)', jti)


def is_access_token_blacklisted(token) -> bool:
    jti = _payload(token).get('jti')
    if not jti:
        return False
    try:
        return cache.get(f'{_PREFIX}{jti}') is True
    except Exception:
        logger.exception('Fallo consultando blacklist de access token (jti=%s)', jti)
        return False
