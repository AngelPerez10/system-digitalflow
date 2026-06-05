from rest_framework.throttling import AnonRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    # Varios técnicos pueden compartir la misma IP (oficina / datos móviles).
    rate = '20/minute'
    scope = 'login'


class RefreshRateThrottle(AnonRateThrottle):
    """Refresh puede llamarse sin usuario autenticado (solo cookie refresh_token)."""
    rate = '60/minute'
    scope = 'refresh_token'
