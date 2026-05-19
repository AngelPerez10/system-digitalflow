from rest_framework.throttling import UserRateThrottle, AnonRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    rate = '5/minute'
    scope = 'login'


class RefreshRateThrottle(AnonRateThrottle):
    """Refresh puede llamarse sin usuario autenticado (solo cookie refresh_token)."""
    rate = '60/minute'
    scope = 'refresh_token'
