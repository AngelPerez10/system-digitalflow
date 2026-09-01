import hashlib

from django.conf import settings
from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle, UserRateThrottle


class PortalRegistroRateThrottle(AnonRateThrottle):
    rate = '10/minute'
    scope = 'portal_registro'


class PortalConsultaRateThrottle(UserRateThrottle):
    """Consultas del portal (listado y detalle de órdenes). Holgado para un
    humano navegando; acota el raspado de una cuenta comprometida."""

    rate = '120/minute'
    scope = 'portal_consulta'


class PortalRegistroEmailThrottle(SimpleRateThrottle):
    """Limita registros repetidos contra el mismo correo."""

    rate = '5/hour'
    scope = 'portal_registro_email'

    def get_cache_key(self, request, view):
        data = request.data if isinstance(request.data, dict) else {}
        email = data.get('email') or ''
        if not isinstance(email, str):
            return None
        email = email.strip().lower()
        if not email:
            return None
        digest = hashlib.sha256(
            f'{settings.SECRET_KEY}:{email}'.encode('utf-8')
        ).hexdigest()
        return self.cache_format % {'scope': self.scope, 'ident': digest}
