"""Endpoints proxy M2M Dataglobal para Cuentas Antarix (SIM / conectividad)."""
from __future__ import annotations

import logging

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.permissions import CuentasAntarixPermission

from .m2m_client import (
    M2mError,
    fetch_sim_details,
    m2m_configured,
    reset_sim,
    send_sms,
    test_gprs,
    test_gsm,
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


def _lookup_from_request(data) -> dict[str, str | None]:
    def pick(*keys: str) -> str | None:
        for key in keys:
            raw = data.get(key)
            if raw is None:
                continue
            text = str(raw).strip()
            if text and text != "—":
                return text
        return None

    return {
        "imei": pick("imei", "uid"),
        "msisdn": pick("msisdn", "phone"),
        "icc": pick("icc"),
    }


def _m2m_error_response(exc: M2mError, fallback: str) -> Response:
    status = exc.status_code or 502
    if status not in (400, 403, 404, 503):
        status = 502
    detail = str(exc).strip() or fallback
    if status == 404 or "not found" in detail.lower():
        status = 404
        detail = (
            "Esta unidad no tiene una SIM registrada en M2M "
            "(no hay coincidencia por IMEI o teléfono)."
        )
    return Response({"detail": detail, "source": "m2m", "code": "not_found" if status == 404 else None}, status=status)


class M2mSimDetailView(APIView):
    """GET detalle de SIM por imei / msisdn / icc (query params)."""

    permission_classes = [IsAuthenticated, CuentasAntarixPermission]

    def get(self, request):
        if not m2m_configured():
            return Response(
                {
                    "detail": "M2M no configurado. Define M2M_API_KEY en backend/.env y reinicia el servidor.",
                    "source": "m2m",
                    "configured": False,
                },
                status=503,
            )
        lookup = _lookup_from_request(request.query_params)
        refresh = str(request.query_params.get("refresh") or "").strip().lower() in (
            "1",
            "true",
            "yes",
        )
        try:
            sim = fetch_sim_details(**lookup, refresh=refresh)
        except M2mError as exc:
            logger.warning("M2M detalle: %s", exc)
            return _m2m_error_response(exc, "No se pudo cargar el detalle de la SIM.")
        except Exception:
            logger.exception("Error inesperado consultando detalle M2M")
            return Response({"detail": "No se pudo cargar el detalle de la SIM."}, status=502)
        return Response({"source": "m2m", "configured": True, "sim": sim})


class M2mSimTestGsmView(APIView):
    permission_classes = [IsAuthenticated, CuentasAntarixPermission]

    def post(self, request):
        if not _request_has_cuentas_edit(request):
            return Response({"detail": "No tienes permiso para probar GSM."}, status=403)
        lookup = _lookup_from_request(request.data if isinstance(request.data, dict) else {})
        try:
            result = test_gsm(**lookup)
        except M2mError as exc:
            logger.warning("M2M test GSM: %s", exc)
            return _m2m_error_response(exc, "No se pudo probar GSM.")
        except Exception:
            logger.exception("Error inesperado en test GSM M2M")
            return Response({"detail": "No se pudo probar GSM."}, status=502)
        return Response({"source": "m2m", **result})


class M2mSimTestGprsView(APIView):
    permission_classes = [IsAuthenticated, CuentasAntarixPermission]

    def post(self, request):
        if not _request_has_cuentas_edit(request):
            return Response({"detail": "No tienes permiso para probar GPRS."}, status=403)
        lookup = _lookup_from_request(request.data if isinstance(request.data, dict) else {})
        try:
            result = test_gprs(**lookup)
        except M2mError as exc:
            logger.warning("M2M test GPRS: %s", exc)
            return _m2m_error_response(exc, "No se pudo probar GPRS.")
        except Exception:
            logger.exception("Error inesperado en test GPRS M2M")
            return Response({"detail": "No se pudo probar GPRS."}, status=502)
        return Response({"source": "m2m", **result})


class M2mSimResetView(APIView):
    permission_classes = [IsAuthenticated, CuentasAntarixPermission]

    def post(self, request):
        if not _request_has_cuentas_edit(request):
            return Response({"detail": "No tienes permiso para reiniciar la SIM."}, status=403)
        lookup = _lookup_from_request(request.data if isinstance(request.data, dict) else {})
        try:
            result = reset_sim(**lookup)
        except M2mError as exc:
            logger.warning("M2M reset: %s", exc)
            return _m2m_error_response(exc, "No se pudo reiniciar la SIM.")
        except Exception:
            logger.exception("Error inesperado en reset M2M")
            return Response({"detail": "No se pudo reiniciar la SIM."}, status=502)
        return Response({"source": "m2m", **result})


class M2mSimSmsView(APIView):
    permission_classes = [IsAuthenticated, CuentasAntarixPermission]

    def post(self, request):
        if not _request_has_cuentas_edit(request):
            return Response({"detail": "No tienes permiso para enviar SMS."}, status=403)
        data = request.data if isinstance(request.data, dict) else {}
        lookup = _lookup_from_request(data)
        message = str(data.get("message") or "").strip()
        try:
            result = send_sms(message, **lookup)
        except M2mError as exc:
            logger.warning("M2M SMS: %s", exc)
            return _m2m_error_response(exc, "No se pudo enviar el SMS.")
        except Exception:
            logger.exception("Error inesperado enviando SMS M2M")
            return Response({"detail": "No se pudo enviar el SMS."}, status=502)
        return Response({"source": "m2m", **result})
