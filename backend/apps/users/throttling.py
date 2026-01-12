from rest_framework.throttling import AnonRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """Rate limit for login endpoint: 5 attempts per minute to prevent brute force."""
    rate = '5/minute'
    scope = 'login'
