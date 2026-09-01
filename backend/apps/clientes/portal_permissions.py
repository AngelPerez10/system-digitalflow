from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.clientes.portal_models import ClientePortalAccount


class _PortalClienteBase(BasePermission):
    """Cuenta **activa** de portal cliente.

    El portal es una superficie aparte del módulo `ordenes` del ERP: aquí no
    entra staff ni un técnico (ellos usan `OrdenViewSet` con `OrdenesPermission`).
    """

    message = 'Esta sección es solo para cuentas activas del portal de clientes.'

    def _cuenta_activa(self, request) -> bool:
        user = getattr(request, 'user', None)
        if not user or not getattr(user, 'is_authenticated', False):
            return False

        # El descriptor inverso de un OneToOne lanza `RelatedObjectDoesNotExist`
        # (subclase de AttributeError), así que `getattr` con default basta.
        account = getattr(user, 'cliente_portal_account', None)
        if account is None:
            return False
        return account.status == ClientePortalAccount.STATUS_ACTIVE


class PortalClientePermission(_PortalClienteBase):
    """Consulta: solo lectura. El cliente mira sus servicios, no los edita."""

    def has_permission(self, request, view):
        if request.method not in SAFE_METHODS:
            return False
        return self._cuenta_activa(request)


class PortalClienteCalificarPermission(_PortalClienteBase):
    """Única escritura del portal: calificar al técnico de una orden propia.

    La vista sigue validando que la orden sea suya, que esté resuelta y que no
    tenga calificación previa; este permiso solo abre la puerta al `POST`.
    """

    def has_permission(self, request, view):
        return self._cuenta_activa(request)
