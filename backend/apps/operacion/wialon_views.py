import logging

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.permissions import CuentasAntarixPermission

from .wialon_client import (
    WialonError,
    fetch_units_search_index,
    fetch_user_units,
    fetch_users,
    invalidate_wialon_cache,
    purge_blocked_accounts,
    update_wialon_user,
    WIALON_BLOCKED_PURGE_DAYS_DEFAULT,
)

logger = logging.getLogger(__name__)


def _request_has_cuentas_edit(request) -> bool:
    user = getattr(request, "user", None)
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
        return True
    perms_obj = getattr(user, "permissions_profile", None)
    permissions = getattr(perms_obj, "permissions", None) or {}
    module = permissions.get("cuentas_antarix") or {}
    if not isinstance(module, dict):
        lower_map = {str(k).lower(): v for k, v in permissions.items()} if isinstance(permissions, dict) else {}
        module = lower_map.get("cuentas_antarix") or {}
    if not isinstance(module, dict):
        return False
    return module.get("edit") is True


def _wialon_error_response(exc: WialonError, fallback: str) -> Response:
    detail = str(exc).strip() or fallback
    return Response({"detail": detail, "code": exc.code}, status=502)


class WialonUsuariosView(APIView):
    """Usuarios de Wialon (Antarix GPS) para la vista de Operación."""

    permission_classes = [IsAuthenticated, CuentasAntarixPermission]

    def get(self, request):
        refresh = str(request.query_params.get("refresh", "")).lower() in ("1", "true", "yes")
        if refresh:
            invalidate_wialon_cache()

        try:
            users = fetch_users(use_cache=not refresh)
            units_index = fetch_units_search_index(use_cache=not refresh)
        except WialonError as exc:
            logger.warning("Wialon usuarios: %s", exc)
            return _wialon_error_response(exc, "No se pudieron cargar los usuarios de Wialon.")
        except Exception:
            logger.exception("Error inesperado consultando usuarios Wialon")
            return Response({"detail": "No se pudieron cargar los usuarios de Wialon."}, status=502)

        return Response(
            {
                "source": "wialon",
                "items_type": "user",
                "count": len(users),
                "users": users,
                "units_index": units_index,
                "units_index_count": len(units_index),
            }
        )


class WialonPurgeBlockedView(APIView):
    """Desactiva unidades y elimina usuarios bloqueados hace más de N días."""

    permission_classes = [IsAuthenticated, CuentasAntarixPermission]

    def patch(self, request):
        if not _request_has_cuentas_edit(request):
            return Response(
                {"detail": "Se requiere permiso de edición en Cuentas Antarix."},
                status=403,
            )
        data = request.data if isinstance(request.data, dict) else {}
        days_raw = data.get("days", WIALON_BLOCKED_PURGE_DAYS_DEFAULT)
        dry_run = bool(data.get("dry_run", False))
        try:
            days = int(days_raw)
        except (TypeError, ValueError):
            return Response({"detail": "days debe ser un entero."}, status=400)
        if days < 1:
            return Response({"detail": "days debe ser al menos 1."}, status=400)

        try:
            result = purge_blocked_accounts(days=days, dry_run=dry_run)
        except WialonError as exc:
            logger.warning("Wialon purge bloqueados: %s", exc)
            return _wialon_error_response(exc, "No se pudo limpiar las cuentas bloqueadas.")
        except Exception:
            logger.exception("Error inesperado purgando cuentas bloqueadas Wialon")
            return Response({"detail": "No se pudo limpiar las cuentas bloqueadas."}, status=502)

        return Response({"source": "wialon", **result})


class WialonUnitsSearchIndexView(APIView):
    """Índice de unidades con las cuentas a las que están asignadas (búsqueda global)."""

    permission_classes = [IsAuthenticated, CuentasAntarixPermission]

    def get(self, request):
        refresh = str(request.query_params.get("refresh", "")).lower() in ("1", "true", "yes")
        if refresh:
            invalidate_wialon_cache()

        try:
            units = fetch_units_search_index(use_cache=not refresh)
        except WialonError as exc:
            logger.warning("Wialon índice unidades: %s", exc)
            return Response({"detail": "No se pudo cargar el índice de unidades."}, status=502)
        except Exception:
            logger.exception("Error inesperado construyendo índice de unidades Wialon")
            return Response({"detail": "No se pudo cargar el índice de unidades."}, status=502)

        return Response(
            {
                "source": "wialon",
                "count": len(units),
                "units": units,
            }
        )


class WialonUsuarioUnidadesView(APIView):
    """Unidades asignadas a un usuario Wialon."""

    permission_classes = [IsAuthenticated, CuentasAntarixPermission]

    def get(self, request, wialon_user_id: int):
        try:
            payload = fetch_user_units(wialon_user_id)
        except WialonError as exc:
            logger.warning("Wialon unidades usuario %s: %s", wialon_user_id, exc)
            return Response({"detail": "No se pudieron cargar las unidades."}, status=502)
        except Exception:
            logger.exception("Error inesperado consultando unidades Wialon user=%s", wialon_user_id)
            return Response({"detail": "No se pudieron cargar las unidades."}, status=502)

        return Response({"source": "wialon", **payload})


class WialonUsuarioDetailView(APIView):
    """Actualiza la cuenta de facturación del usuario en Wialon (CMS)."""

    permission_classes = [IsAuthenticated, CuentasAntarixPermission]

    def patch(self, request, wialon_user_id: int):
        data = request.data if isinstance(request.data, dict) else {}
        name = data.get("name")
        dealer_rights = data.get("dealer_rights")
        status_val = data.get("status")
        enabled = data.get("enabled")

        if name is None and dealer_rights is None and status_val is None and enabled is None:
            return Response(
                {"detail": "Indica al menos un campo: name, dealer_rights, status o enabled."},
                status=400,
            )

        dealer_bool: bool | None = None
        if dealer_rights is not None:
            if isinstance(dealer_rights, bool):
                dealer_bool = dealer_rights
            elif str(dealer_rights).strip().lower() in ("sí", "si", "yes", "1", "true"):
                dealer_bool = True
            elif str(dealer_rights).strip().lower() in ("no", "0", "false"):
                dealer_bool = False
            else:
                return Response({"detail": "dealer_rights debe ser Sí o No."}, status=400)

        enabled_bool: bool | None = None
        if enabled is not None:
            enabled_bool = (
                bool(enabled)
                if isinstance(enabled, bool)
                else str(enabled).lower() in ("1", "true", "yes", "activo")
            )
        elif status_val is not None:
            s = str(status_val).strip().lower()
            if s in ("activo", "active", "habilitado", "enabled"):
                enabled_bool = True
            elif s in ("bloqueado", "blocked", "disabled", "inactivo"):
                enabled_bool = False
            else:
                return Response({"detail": "status debe ser Activo o Bloqueado."}, status=400)

        try:
            row = update_wialon_user(
                int(wialon_user_id),
                name=str(name).strip() if name is not None else None,
                dealer_rights=dealer_bool,
                enabled=enabled_bool,
            )
        except WialonError as exc:
            logger.warning("Wialon actualizar usuario %s: %s", wialon_user_id, exc)
            return Response({"detail": "No se pudo actualizar el usuario en Wialon."}, status=502)
        except Exception:
            logger.exception("Error inesperado actualizando usuario Wialon %s", wialon_user_id)
            return Response({"detail": "No se pudo actualizar el usuario en Wialon."}, status=502)

        return Response({"source": "wialon", "user": row})
