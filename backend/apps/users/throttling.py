import hashlib

from django.conf import settings
from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    # Varios técnicos pueden compartir la misma IP (oficina / datos móviles).
    # El `rate` sale de settings.DEFAULT_THROTTLE_RATES['login'] (default 20/min,
    # overridable con THROTTLE_LOGIN_RATE) — así CI/tests pueden aflojarlo sin
    # tocar código. Sin `rate` en la clase, DRF lee THROTTLE_RATES[scope].
    scope = 'login'


class LoginAccountRateThrottle(SimpleRateThrottle):
    """Limita intentos de login contra una **cuenta** concreta, sin importar la IP.

    `LoginRateThrottle` va por IP y es deliberadamente holgado (20/min) porque
    varios técnicos comparten la IP de la oficina. Eso deja abierto el ataque
    inverso: password spraying distribuido: N IPs distintas probando
    contraseñas contra el mismo usuario, cada una por debajo del límite por IP.

    10/minuto por cuenta es cómodo para un humano que se equivoca al teclear
    (3-5 intentos) y a la vez acota la fuerza bruta contra un usuario concreto
    a ~14 400 intentos/día aunque el atacante rote de IP.

    La clave de caché nunca guarda el username en claro: se deriva un SHA-256
    con `SECRET_KEY` como sal, así un volcado de caché (o un log de claves) no
    revela qué cuentas se están intentando ni permite tabla arcoíris sobre
    usuarios conocidos.
    """

    # `rate` desde settings.DEFAULT_THROTTLE_RATES['login_account']
    # (default 10/min, overridable con THROTTLE_LOGIN_ACCOUNT_RATE).
    scope = 'login_account'

    def get_cache_key(self, request, view):
        data = request.data if isinstance(request.data, dict) else {}
        login_value = (data.get('email') or data.get('username') or '')
        if not isinstance(login_value, str):
            return None

        # Normalizar como lo hace la vista: el lookup de usuario es case-insensitive,
        # así que "Admin" y "admin" deben compartir contador.
        login_value = login_value.strip().lower()
        if not login_value:
            # Sin identificador no hay cuenta que proteger; LoginRateThrottle cubre por IP.
            return None

        digest = hashlib.sha256(
            f'{settings.SECRET_KEY}:{login_value}'.encode('utf-8')
        ).hexdigest()
        return self.cache_format % {'scope': self.scope, 'ident': digest}


class RefreshRateThrottle(AnonRateThrottle):
    """Refresh puede llamarse sin usuario autenticado (solo cookie refresh_token)."""
    # `rate` desde settings.DEFAULT_THROTTLE_RATES['refresh_token']
    # (default 60/min, overridable con THROTTLE_REFRESH_RATE).
    scope = 'refresh_token'
