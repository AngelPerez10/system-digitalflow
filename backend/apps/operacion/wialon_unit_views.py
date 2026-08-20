import logging

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.permissions import CuentasAntarixPermission

from .wialon_client import (
    WialonError,
    fetch_unit_catalogs,
    fetch_unit_detail,
    fetch_users_for_access,
    grant_unit_access,
    revoke_unit_access,
    set_wialon_unit_active,
    update_wialon_unit,
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
    if not isinstance(module, dict) and isinstance(permissions, dict):
        lower_map = {str(k).lower(): v for k, v in permissions.items()}
        module = lower_map.get("cuentas_antarix") or {}
    if not isinstance(module, dict):
        return False
    return module.get("edit") is True


class WialonUnitCatalogsView(APIView):
    permission_classes = [IsAuthenticated, CuentasAntarixPermission]

    def get(self, request):
        try:
            catalogs = fetch_unit_catalogs()
        except WialonError as exc:
            logger.warning("Wialon catálogos unidades: %s", exc)
            return Response({"detail": "No se pudo completar la solicitud con Wialon."}, status=502)
        except Exception:
            logger.exception("Error inesperado consultando catálogos Wialon")
            return Response({"detail": "No se pudieron cargar los catálogos."}, status=502)
        return Response({"source": "wialon", **catalogs})


class WialonAccessUsersView(APIView):
    permission_classes = [IsAuthenticated, CuentasAntarixPermission]

    def get(self, request):
        try:
            users = fetch_users_for_access()
        except WialonError as exc:
            logger.warning("Wialon usuarios acceso: %s", exc)
            return Response({"detail": "No se pudo completar la solicitud con Wialon."}, status=502)
        except Exception:
            logger.exception("Error inesperado consultando usuarios Wialon")
            return Response({"detail": "No se pudieron cargar los usuarios."}, status=502)
        return Response({"source": "wialon", "count": len(users), "users": users})


class WialonUnitDetailView(APIView):
    permission_classes = [IsAuthenticated, CuentasAntarixPermission]

    def get(self, request, unit_id: int):
        context_user_id = request.query_params.get("context_user_id")
        ctx_id = int(context_user_id) if context_user_id and str(context_user_id).isdigit() else None
        try:
            unit = fetch_unit_detail(int(unit_id), context_user_id=ctx_id)
        except WialonError as exc:
            logger.warning("Wialon unidad %s: %s", unit_id, exc)
            return Response({"detail": "No se pudo completar la solicitud con Wialon."}, status=502)
        except Exception:
            logger.exception("Error inesperado consultando unidad Wialon %s", unit_id)
            return Response({"detail": "No se pudo cargar la unidad."}, status=502)
        return Response({"source": "wialon", "unit": unit})

    def patch(self, request, unit_id: int):
        data = request.data if isinstance(request.data, dict) else {}
        if not data:
            return Response({"detail": "Indica al menos un campo para actualizar."}, status=400)

        custom_fields = data.get("custom_fields")
        if custom_fields is not None and not isinstance(custom_fields, list):
            return Response({"detail": "custom_fields debe ser una lista."}, status=400)

        hw_raw = data.get("hw_id")
        hw_id: int | None = None
        if hw_raw is not None and str(hw_raw).strip() != "":
            try:
                hw_id = int(hw_raw)
            except (TypeError, ValueError):
                return Response({"detail": "hw_id inválido."}, status=400)

        try:
            unit = update_wialon_unit(
                int(unit_id),
                name=data.get("name") if "name" in data else None,
                unit_type=data.get("unit_type") if "unit_type" in data else None,
                hw_id=hw_id if "hw_id" in data else None,
                uid=data.get("uid") if "uid" in data else None,
                phone=data.get("phone") if "phone" in data else None,
                access_password=data.get("access_password") if "access_password" in data else None,
                custom_fields=custom_fields,
            )
        except WialonError as exc:
            logger.warning("Wialon actualizar unidad %s: %s", unit_id, exc)
            return Response({"detail": "No se pudo completar la solicitud con Wialon."}, status=502)
        except Exception:
            logger.exception("Error inesperado actualizando unidad Wialon %s", unit_id)
            return Response({"detail": "No se pudo actualizar la unidad en Wialon."}, status=502)

        return Response({"source": "wialon", "unit": unit})


class WialonUnitActiveView(APIView):
    """Activa o desactiva una unidad (unit/set_active). No la elimina."""

    permission_classes = [IsAuthenticated, CuentasAntarixPermission]

    def patch(self, request, unit_id: int):
        if not _request_has_cuentas_edit(request):
            return Response(
                {"detail": "Se requiere permiso de edición en Cuentas Antarix."},
                status=403,
            )
        data = request.data if isinstance(request.data, dict) else {}
        if "active" not in data:
            return Response({"detail": "Indica active (true/false)."}, status=400)

        raw = data.get("active")
        if isinstance(raw, bool):
            active = raw
        elif str(raw).strip().lower() in ("1", "true", "yes", "activo", "on"):
            active = True
        elif str(raw).strip().lower() in ("0", "false", "no", "inactivo", "off"):
            active = False
        else:
            return Response({"detail": "active debe ser true o false."}, status=400)

        context_user_id = data.get("context_user_id")
        ctx_id = int(context_user_id) if context_user_id is not None and str(context_user_id).isdigit() else None

        try:
            unit = set_wialon_unit_active(int(unit_id), active, context_user_id=ctx_id)
        except WialonError as exc:
            logger.warning("Wialon set_active unidad %s: %s", unit_id, exc)
            return Response({"detail": "No se pudo completar la solicitud con Wialon."}, status=502)
        except Exception:
            logger.exception("Error inesperado en set_active unidad %s", unit_id)
            return Response({"detail": "No se pudo cambiar el estado de la unidad."}, status=502)

        return Response({"source": "wialon", "unit": unit})


class WialonUnitAccessView(APIView):
    permission_classes = [IsAuthenticated, CuentasAntarixPermission]

    def post(self, request, unit_id: int):
        data = request.data if isinstance(request.data, dict) else {}
        user_id = data.get("user_id")
        if user_id is None:
            return Response({"detail": "Indica user_id."}, status=400)
        try:
            grant_unit_access(int(unit_id), int(user_id))
        except WialonError as exc:
            logger.warning("Wialon conceder acceso unidad %s: %s", unit_id, exc)
            return Response({"detail": "No se pudo completar la solicitud con Wialon."}, status=502)
        except Exception:
            logger.exception("Error inesperado concediendo acceso unidad %s", unit_id)
            return Response({"detail": "No se pudo conceder acceso."}, status=502)
        return Response({"source": "wialon", "granted": True, "user_id": int(user_id)})


class WialonUnitAccessRevokeView(APIView):
    permission_classes = [IsAuthenticated, CuentasAntarixPermission]

    def delete(self, request, unit_id: int, user_id: int):
        try:
            revoke_unit_access(int(unit_id), int(user_id))
        except WialonError as exc:
            logger.warning("Wialon revocar acceso unidad %s user %s: %s", unit_id, user_id, exc)
            return Response({"detail": "No se pudo completar la solicitud con Wialon."}, status=502)
        except Exception:
            logger.exception("Error inesperado revocando acceso unidad %s", unit_id)
            return Response({"detail": "No se pudo revocar acceso."}, status=502)
        return Response({"source": "wialon", "revoked": True, "user_id": int(user_id)})
