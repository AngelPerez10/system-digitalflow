"""Firma CFDI 4.0 con CSD (FIEL de sellos)."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from cfdiclient import Fiel
from lxml import etree
from OpenSSL import crypto

_RESOURCES = Path(__file__).resolve().parent / "resources"
_XSLT_PATH = _RESOURCES / "cadenaoriginal_4_0.xslt"

_CSD_PASSWORD_HINT = (
    "Revisa la contraseña del CSD en sellodigital (pwd): debe coincidir con la del archivo "
    ".key al generarlo en el portal del SAT."
)


@lru_cache(maxsize=1)
def _cadena_transform():
    doc = etree.parse(str(_XSLT_PATH))
    return etree.XSLT(doc)


def _prepare_csd_private_key(key_der: bytes, key_password: str) -> tuple[bytes, bytes]:
    """Normaliza .key del SAT (PEM / PKCS#8 DER) para cfdiclient.Fiel."""
    raw = bytes(key_der or b"").strip()
    if not raw:
        raise ValueError("La llave del CSD (fKey) está vacía en sellodigital.")

    pwd = key_password.encode("utf-8") if key_password else b""
    fmt = crypto.FILETYPE_PEM if b"BEGIN" in raw[:120] else crypto.FILETYPE_ASN1
    try:
        pkey = crypto.load_privatekey(fmt, raw, pwd)
    except crypto.Error as exc:
        raise ValueError(f"No se pudo descifrar la llave del CSD. {_CSD_PASSWORD_HINT}") from exc

    pem_clear = crypto.dump_privatekey(crypto.FILETYPE_PEM, pkey)
    return pem_clear, b""


def _build_fiel(cer_der: bytes, key_der: bytes, key_password: str) -> Fiel:
    try:
        key_bytes, passphrase = _prepare_csd_private_key(key_der, key_password)
        return Fiel(cer_der, key_bytes, passphrase)
    except ValueError:
        raise
    except Exception:
        # Respaldo: llaves PKCS#1 DER antiguas que PyCrypto importa directo.
        try:
            return Fiel(cer_der, key_der, key_password.encode("utf-8"))
        except ValueError as exc:
            if "RSA key format" in str(exc) or "not supported" in str(exc):
                raise ValueError(
                    f"Formato de llave CSD no soportado o contraseña incorrecta. {_CSD_PASSWORD_HINT}"
                ) from exc
            raise ValueError(f"No se pudo cargar la llave del CSD. {_CSD_PASSWORD_HINT}") from exc


def sign_cfdi_xml(
    xml_bytes: bytes, cer_der: bytes, key_der: bytes, key_password: str
) -> tuple[bytes, dict[str, str]]:
    root = etree.fromstring(xml_bytes)
    fiel = _build_fiel(cer_der, key_der, key_password)

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
