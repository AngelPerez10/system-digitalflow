"""Firma CFDI 4.0 con CSD (FIEL de sellos)."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from cfdiclient import Fiel
from lxml import etree

_RESOURCES = Path(__file__).resolve().parent / "resources"
_XSLT_PATH = _RESOURCES / "cadenaoriginal_4_0.xslt"


@lru_cache(maxsize=1)
def _cadena_transform():
    doc = etree.parse(str(_XSLT_PATH))
    return etree.XSLT(doc)


def sign_cfdi_xml(xml_bytes: bytes, cer_der: bytes, key_der: bytes, key_password: str) -> bytes:
    root = etree.fromstring(xml_bytes)
    fiel = Fiel(cer_der, key_der, key_password.encode("utf-8"))

    cadena = str(_cadena_transform()(root)).strip()
    sello = fiel.firmar_sha1(cadena.encode("utf-8")).decode("utf-8")
    certificado = fiel.cer_to_base64().decode("utf-8")
    no_certificado = "".join(ch for ch in fiel.cer_serial_number() if ch.isdigit())[-20:]

    if root.tag.endswith("Comprobante"):
        comprobante = root
    else:
        comprobante = root.find(".//{http://www.sat.gob.mx/cfd/4}Comprobante")
        if comprobante is None:
            raise ValueError("No se encontró nodo Comprobante en el XML.")

    comprobante.set("Sello", sello)
    comprobante.set("Certificado", certificado)
    comprobante.set("NoCertificado", no_certificado)

    return etree.tostring(
        root,
        xml_declaration=True,
        encoding="UTF-8",
        pretty_print=False,
    ), {
        "cadena_original": cadena,
        "sello": sello,
        "no_certificado": no_certificado,
    }
