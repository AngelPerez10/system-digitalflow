"""Cliente HTTP para la API M2M Dataglobal (SIMs).

Docs: https://m2mcenter.app/apiclient/v1/help
Auth: header X-API-KEY (+ User-Agent obligatorio).
La clave vive solo en backend (.env → M2M_API_KEY); nunca en el frontend.
"""
from __future__ import annotations

import json
import logging
import os
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Literal

logger = logging.getLogger(__name__)

M2M_API_BASE = os.environ.get(
    "M2M_API_BASE",
    "https://m2mcenter.app/apiclient/v1",
).rstrip("/")
M2M_USER_AGENT = os.environ.get("M2M_USER_AGENT", "DigitalFlowERP/1.0").strip() or "DigitalFlowERP/1.0"
_DETAIL_CACHE_TTL_SEC = int(os.environ.get("M2M_DETAIL_CACHE_TTL_SEC", "120") or "120")

LookupKind = Literal["icc", "msisdn", "imei"]
_LOOKUP_KINDS: frozenset[str] = frozenset({"icc", "msisdn", "imei"})
_DIGITS_RE = re.compile(r"\D+")

# Caché en memoria del detalle SIM (la API externa es lenta al cambiar de unidad).
_detail_cache: dict[str, tuple[float, dict[str, Any]]] = {}
_detail_lock = threading.Lock()


def _detail_cache_key(kind: LookupKind, value: str) -> str:
    return f"{kind}:{value}"


def _detail_cache_get(key: str) -> dict[str, Any] | None:
    with _detail_lock:
        hit = _detail_cache.get(key)
        if not hit:
            return None
        ts, payload = hit
        if _DETAIL_CACHE_TTL_SEC > 0 and (time.monotonic() - ts) > _DETAIL_CACHE_TTL_SEC:
            _detail_cache.pop(key, None)
            return None
        return dict(payload)


def _detail_cache_set(key: str, payload: dict[str, Any]) -> None:
    if _DETAIL_CACHE_TTL_SEC <= 0:
        return
    with _detail_lock:
        _detail_cache[key] = (time.monotonic(), dict(payload))


def invalidate_sim_detail_cache(
    *,
    imei: str | None = None,
    msisdn: str | None = None,
    icc: str | None = None,
) -> None:
    """Invalida caché tras reset u otra mutación que pueda cambiar el estado."""
    try:
        kind, value = resolve_lookup(imei=imei, msisdn=msisdn, icc=icc)
    except M2mError:
        return
    with _detail_lock:
        _detail_cache.pop(_detail_cache_key(kind, value), None)


class M2mError(Exception):
    """Error de comunicación o lógica con M2M."""

    def __init__(self, message: str, *, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


def _api_key() -> str:
    return (os.environ.get("M2M_API_KEY") or "").strip()


def m2m_configured() -> bool:
    return bool(_api_key())


def normalize_lookup_value(kind: LookupKind, raw: str) -> str:
    cleaned = (raw or "").strip()
    if not cleaned:
        raise M2mError("Identificador de SIM vacío.")
    digits = _DIGITS_RE.sub("", cleaned)
    if kind == "imei":
        if len(digits) < 8:
            raise M2mError("IMEI inválido.")
        return digits
    if kind == "msisdn":
        if len(digits) < 8:
            raise M2mError("MSISDN inválido.")
        return digits
    # icc
    if len(digits) < 10:
        raise M2mError("ICC inválido.")
    return digits


def resolve_lookup(
    *,
    imei: str | None = None,
    msisdn: str | None = None,
    icc: str | None = None,
) -> tuple[LookupKind, str]:
    """Elige la mejor clave de búsqueda disponible (prioridad: imei → msisdn → icc)."""
    for kind, raw in (("imei", imei), ("msisdn", msisdn), ("icc", icc)):
        if raw and str(raw).strip() and str(raw).strip() != "—":
            return kind, normalize_lookup_value(kind, str(raw))  # type: ignore[arg-type]
    raise M2mError("Indica IMEI, MSISDN o ICC para consultar la SIM.")


def _request(
    method: str,
    path: str,
    *,
    body: dict[str, Any] | None = None,
    timeout: float = 45.0,
) -> dict[str, Any]:
    if not m2m_configured():
        raise M2mError(
            "M2M no configurado. Define M2M_API_KEY en backend/.env y reinicia el servidor.",
            status_code=503,
        )

    url = f"{M2M_API_BASE}/{path.lstrip('/')}"
    data: bytes | None = None
    headers = {
        "X-API-KEY": _api_key(),
        "User-Agent": M2M_USER_AGENT,
        "Accept": "application/json",
    }
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=data, headers=headers, method=method.upper())
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            payload = json.loads(raw) if raw.strip() else {}
            if not isinstance(payload, dict):
                raise M2mError("Respuesta inválida de M2M.")
            return payload
    except urllib.error.HTTPError as exc:
        detail = ""
        try:
            err_body = exc.read().decode("utf-8", errors="replace")
            parsed = json.loads(err_body) if err_body.strip() else {}
            if isinstance(parsed, dict):
                detail = str(parsed.get("error") or parsed.get("message") or "").strip()
        except Exception:
            detail = ""
        msg = detail or f"Error HTTP {exc.code} de M2M."
        logger.warning("M2M HTTPError path=%s code=%s detail=%s", path, exc.code, detail or "-")
        raise M2mError(msg, status_code=502) from exc
    except urllib.error.URLError as exc:
        logger.exception("M2M connection failed path=%s", path)
        raise M2mError("No se pudo conectar con M2M Dataglobal.") from exc
    except json.JSONDecodeError as exc:
        raise M2mError("Respuesta inválida de M2M.") from exc


def _ensure_ok(payload: dict[str, Any], fallback: str) -> dict[str, Any]:
    if payload.get("status") is False:
        err = str(payload.get("error") or payload.get("message") or fallback).strip()
        raise M2mError(err or fallback, status_code=404 if "not found" in err.lower() else 502)
    return payload


def _as_int(value: Any) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(float(str(value).replace(",", "")))
    except (TypeError, ValueError):
        return None


def _as_str(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def map_sim_detail(data: dict[str, Any]) -> dict[str, Any]:
    """Normaliza el payload M2M al shape del frontend (m2mTypes)."""
    state = _as_str(data.get("simCycleState")).upper().replace(" ", "_")
    # Emnify / algunos operadores mandan ACTIVE en lugar de ACTIVATED.
    if state == "ACTIVE":
        state = "ACTIVATED"
    elif state == "INACTIVE":
        state = "DEACTIVATED"

    sim_type = _as_str(data.get("simType"))
    operator = _as_str(data.get("operator")) or sim_type
    # La API a veces omite apn (p. ej. planes Emnify); aceptar alias si aparecen.
    apn = (
        _as_str(data.get("apn"))
        or _as_str(data.get("APN"))
        or _as_str(data.get("apnName"))
        or _as_str(data.get("accessPointName"))
    )

    return {
        "icc": _as_str(data.get("icc")),
        "msisdn": _as_str(data.get("msisdn")),
        "imei": _DIGITS_RE.sub("", _as_str(data.get("imei"))),
        "planName": _as_str(data.get("planName")),
        "planCode": _as_str(data.get("planCode")),
        "operator": operator,
        "simType": sim_type,
        "simCycleState": state or "UNKNOWN",
        "gprsStatus": _as_int(data.get("gprsStatus")),
        "consumptionMonthlyData": _as_int(data.get("consumptionMonthlyData")),
        "consumptionDailyData": _as_int(data.get("consumptionDailyData")),
        "lastConnStart": _as_str(data.get("lastConnStart")),
        "lastConnStop": _as_str(data.get("lastConnStop")),
        "apn": apn,
        "ip": _as_str(data.get("ip")),
        "commModuleManufacturer": _as_str(data.get("commModuleManufacturer")),
        "commModuleModel": _as_str(data.get("commModuleModel")),
        "customField1": _as_str(data.get("customField1")),
        "customField2": _as_str(data.get("customField2")),
        "imsi": _as_str(data.get("imsi")),
        "latitude": data.get("latitude"),
        "longitude": data.get("longitude"),
    }


def fetch_sim_details(
    *,
    imei: str | None = None,
    msisdn: str | None = None,
    icc: str | None = None,
    refresh: bool = False,
) -> dict[str, Any]:
    kind, value = resolve_lookup(imei=imei, msisdn=msisdn, icc=icc)
    cache_key = _detail_cache_key(kind, value)
    if not refresh:
        cached = _detail_cache_get(cache_key)
        if cached is not None:
            return cached

    path = f"sims/simDetails/{kind}/{urllib.parse.quote(value, safe='')}"
    payload = _ensure_ok(_request("GET", path, timeout=25.0), "No se pudo obtener el detalle de la SIM.")
    data = payload.get("data")
    if not isinstance(data, dict):
        raise M2mError("Simcard not found", status_code=404)
    mapped = map_sim_detail(data)
    _detail_cache_set(cache_key, mapped)
    return mapped


def test_gsm(
    *,
    imei: str | None = None,
    msisdn: str | None = None,
    icc: str | None = None,
) -> dict[str, Any]:
    kind, value = resolve_lookup(imei=imei, msisdn=msisdn, icc=icc)
    path = f"sims/testGsm/{kind}/{urllib.parse.quote(value, safe='')}"
    payload = _ensure_ok(_request("GET", path, timeout=90.0), "No se pudo probar GSM.")
    data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
    return {
        "result": _as_str(data.get("result")) or "OK",
        "message": _as_str(payload.get("message")),
    }


def test_gprs(
    *,
    imei: str | None = None,
    msisdn: str | None = None,
    icc: str | None = None,
) -> dict[str, Any]:
    kind, value = resolve_lookup(imei=imei, msisdn=msisdn, icc=icc)
    path = f"sims/testGprs/{kind}/{urllib.parse.quote(value, safe='')}"
    payload = _ensure_ok(_request("GET", path, timeout=90.0), "No se pudo probar GPRS.")
    data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
    return {
        "result": _as_str(data.get("result")) or "OK",
        "message": _as_str(payload.get("message")),
    }


def reset_sim(
    *,
    imei: str | None = None,
    msisdn: str | None = None,
    icc: str | None = None,
) -> dict[str, Any]:
    kind, value = resolve_lookup(imei=imei, msisdn=msisdn, icc=icc)
    path = f"sims/reset/{kind}/{urllib.parse.quote(value, safe='')}"
    payload = _ensure_ok(_request("GET", path, timeout=90.0), "No se pudo reiniciar la SIM.")
    invalidate_sim_detail_cache(imei=imei, msisdn=msisdn, icc=icc)
    return {"message": _as_str(payload.get("message")) or "Simcard reset successfully"}


def send_sms(
    message: str,
    *,
    imei: str | None = None,
    msisdn: str | None = None,
    icc: str | None = None,
) -> dict[str, Any]:
    text = (message or "").strip()
    if not text:
        raise M2mError("El mensaje SMS está vacío.")
    if len(text) > 160:
        raise M2mError("El mensaje SMS no puede superar 160 caracteres.")
    kind, value = resolve_lookup(imei=imei, msisdn=msisdn, icc=icc)
    path = f"sims/sms/{kind}/{urllib.parse.quote(value, safe='')}"
    payload = _ensure_ok(
        _request("POST", path, body={"message": text}, timeout=60.0),
        "No se pudo enviar el SMS.",
    )
    return {"message": _as_str(payload.get("message")) or "SMS sended successfully"}
