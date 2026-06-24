"""Timbrado CFDI vía PAC (SW por defecto)."""
from __future__ import annotations

import json
import re
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from typing import Any

_SW_PAC_URL = "https://services.sw.com.mx/cfdi/stamp/v4/xml"


class SicarStampError(Exception):
    pass


def _local_tag(tag: str) -> str:
    return tag.rsplit("}", 1)[-1] if "}" in tag else tag


def _extract_timbre(stamped_xml: bytes) -> dict[str, str]:
    root = ET.fromstring(stamped_xml)
    comprobante = root if _local_tag(root.tag) == "Comprobante" else None
    if comprobante is None:
        for elem in root.iter():
            if _local_tag(elem.tag) == "Comprobante":
                comprobante = elem
                break
    if comprobante is None:
        raise SicarStampError("XML timbrado sin nodo Comprobante.")

    attrs = dict(comprobante.attrib)
    timbre = {}
    for elem in root.iter():
        if _local_tag(elem.tag) == "TimbreFiscalDigital":
            timbre = dict(elem.attrib)
            break

    uuid = timbre.get("UUID") or attrs.get("UUID") or ""
    if not uuid:
        raise SicarStampError("El PAC no devolvió UUID en el XML timbrado.")

    return {
        "uuid": uuid,
        "fecha_cert": timbre.get("FechaTimbrado", ""),
        "no_serie_cert_sat": timbre.get("NoCertificadoSAT", ""),
        "sello_cfd": attrs.get("Sello", ""),
        "sello_sat": timbre.get("SelloSAT", ""),
        "cadena_original": "",
    }


def stamp_cfdi_xml(signed_xml: bytes, *, token: str) -> tuple[bytes, dict[str, str]]:
    pac_token = (token or "").strip()
    if not pac_token:
        raise SicarStampError("Falta empresa.claveApi en SICAR para timbrar.")

    url = _SW_PAC_URL
    req = urllib.request.Request(
        url,
        data=signed_xml,
        method="POST",
        headers={
            "Authorization": f"bearer {pac_token}",
            "Content-Type": "application/vnd.sw+xml",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            body = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise SicarStampError(f"PAC respondió HTTP {exc.code}: {detail[:500]}") from exc
    except urllib.error.URLError as exc:
        raise SicarStampError(f"No se pudo contactar al PAC: {exc}") from exc

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        if body.strip().startswith("<?xml") or body.strip().startswith("<"):
            stamped = body.encode("utf-8")
            return stamped, _extract_timbre(stamped)
        raise SicarStampError("Respuesta PAC inválida.") from None

    data = payload.get("data") if isinstance(payload, dict) else None
    if isinstance(data, dict):
        cfdi = data.get("cfdi") or data.get("xml")
        if cfdi:
            stamped = cfdi.encode("utf-8") if isinstance(cfdi, str) else bytes(cfdi)
            meta = _extract_timbre(stamped)
            return stamped, meta

    message = ""
    if isinstance(payload, dict):
        message = str(payload.get("message") or payload.get("detail") or payload)
    raise SicarStampError(message or "Timbrado rechazado por el PAC.")


def build_qr_png(
    *,
    uuid: str,
    rfc_emisor: str,
    rfc_receptor: str,
    total: str,
    sello_cfd: str,
) -> bytes:
    import io

    import qrcode

    fe = re.sub(r"[^0-9A-Za-z]", "", sello_cfd)[-8:] if sello_cfd else "00000000"
    total_qr = f"{float(total):.6f}".rstrip("0").rstrip(".")
    if "." not in total_qr:
        total_qr = f"{total_qr}.0"
    url = (
        "https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?"
        f"id={uuid}&re={rfc_emisor}&rr={rfc_receptor}&tt={total_qr}&fe={fe}"
    )
    img = qrcode.make(url)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()
