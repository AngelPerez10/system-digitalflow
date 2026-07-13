"""Firma CFDI 4.0 con CSD (FIEL de sellos)."""
from __future__ import annotations

import base64
import binascii
from functools import lru_cache
from pathlib import Path

from cfdiclient import Fiel
from cryptography.hazmat.primitives.serialization import (
    Encoding,
    NoEncryption,
    PrivateFormat,
    load_der_private_key,
    load_pem_private_key,
)
from lxml import etree
from OpenSSL import crypto

_RESOURCES = Path(__file__).resolve().parent / "resources"
_XSLT_PATH = _RESOURCES / "cadenaoriginal_4_0.xslt"

_CSD_PASSWORD_HINT = (
    "Revisa la contraseña del CSD en sellodigital (pwd): debe coincidir con la del archivo "
    ".key al generarlo en el portal del SAT. Si es correcta, vuelve a cargar el CSD en SICAR."
)


def normalize_csd_password(password: str) -> str:
    """Quita espacios y caracteres nulos que SICAR a veces guarda en pwd."""
    return str(password or "").strip().strip("\x00")


def normalize_csd_blob(value) -> bytes:
    """Convierte fCer/fKey de MySQL a bytes sin alterar DER/PEM."""
    if value is None:
        return b""
    if isinstance(value, memoryview):
        raw = bytes(value)
    elif isinstance(value, (bytes, bytearray)):
        raw = bytes(value)
    elif isinstance(value, str):
        text = value.strip()
        if not text:
            return b""
        try:
            return base64.b64decode(text, validate=True)
        except (binascii.Error, ValueError):
            return text.encode("latin-1")
    else:
        raw = bytes(value)
    return raw.strip(b"\x00").strip()


@lru_cache(maxsize=1)
def _cadena_transform():
    doc = etree.parse(str(_XSLT_PATH))
    return etree.XSLT(doc)


def _password_candidates(key_password: str) -> list[bytes | None]:
    pwd = normalize_csd_password(key_password)
    candidates: list[bytes | None] = []
    if not pwd:
        candidates.append(None)
    else:
        candidates.append(pwd.encode("utf-8"))
        latin = pwd.encode("latin-1")
        if latin not in candidates:
            candidates.append(latin)
    return candidates


def _try_load_unencrypted(raw: bytes):
    """SICAR a veces guarda fKey ya descifrada en la base de datos."""
    try:
        if b"BEGIN" in raw[:120]:
            return load_pem_private_key(raw, password=None)
        return load_der_private_key(raw, password=None)
    except Exception:
        return None


def _load_csd_key_material(raw: bytes, key_password: str):
    """Carga llave CSD (PEM o DER encriptado PKCS#8 del SAT)."""
    unencrypted = _try_load_unencrypted(raw)
    if unencrypted is not None:
        return unencrypted

    last_exc: Exception | None = None
    for pwd in _password_candidates(key_password):
        try:
            if b"BEGIN" in raw[:120]:
                return load_pem_private_key(raw, password=pwd)
            return load_der_private_key(raw, password=pwd)
        except Exception as exc:
            last_exc = exc
            msg = str(exc).lower()
            if not any(token in msg for token in ("password", "decrypt", "deserialize", "bad decrypt")):
                raise
    if last_exc is not None:
        raise last_exc
    raise ValueError("Contraseña del CSD vacía.")


def csd_row_label(row: dict) -> str:
    """Etiqueta legible del CSD sin datos sensibles."""
    parts = [f"sdi_id={row.get('sdi_id')}"]
    for key in ("nombreCer", "nombreKey", "nombre", "fecha"):
        value = str(row.get(key) or "").strip()
        if value:
            parts.append(f"{key}={value}")
    return ", ".join(parts)


def verify_csd_key_pair(cer_blob, key_blob, key_password: str) -> dict[str, str | int | bool]:
    """Diagnóstico seguro del CSD activo (sin exponer secretos)."""
    cer = normalize_csd_blob(cer_blob)
    key = normalize_csd_blob(key_blob)
    pwd = normalize_csd_password(key_password)
    info: dict[str, str | int | bool] = {
        "cer_bytes": len(cer),
        "key_bytes": len(key),
        "pwd_length": len(pwd),
        "key_format": "pem" if b"BEGIN" in key[:120] else "der",
        "key_header_hex": key[:4].hex() if key else "",
        "loads_without_password": False,
        "can_decrypt": False,
        "error": "",
    }
    if not cer:
        info["error"] = "fCer vacío"
        return info
    if not key:
        info["error"] = "fKey vacío"
        return info

    if _try_load_unencrypted(key) is not None:
        info["loads_without_password"] = True
        info["can_decrypt"] = True
        return info

    if not pwd:
        info["error"] = "pwd vacío y la llave requiere contraseña"
        return info
    try:
        _prepare_csd_private_key(key, pwd)
        info["can_decrypt"] = True
    except ValueError as exc:
        info["error"] = str(exc)
    except Exception as exc:
        info["error"] = str(exc)
    return info


def _prepare_csd_private_key(key_der: bytes, key_password: str) -> tuple[bytes, bytes]:
    """Normaliza .key del SAT (PEM / PKCS#8 DER) para cfdiclient.Fiel."""
    raw = normalize_csd_blob(key_der)
    key_password = normalize_csd_password(key_password)
    if not raw:
        raise ValueError("La llave del CSD (fKey) está vacía en sellodigital.")

    try:
        pkey = _load_csd_key_material(raw, key_password)
        pem_clear = pkey.private_bytes(
            encoding=Encoding.PEM,
            format=PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=NoEncryption(),
        )
        return pem_clear, b""
    except ValueError as exc:
        msg = str(exc).lower()
        if any(token in msg for token in ("password", "decrypt", "deserialize", "bad decrypt")):
            raise ValueError(f"No se pudo descifrar la llave del CSD. {_CSD_PASSWORD_HINT}") from exc
        raise
    except Exception as exc:
        msg = str(exc).lower()
        if any(token in msg for token in ("password", "decrypt", "bad decrypt")):
            raise ValueError(f"No se pudo descifrar la llave del CSD. {_CSD_PASSWORD_HINT}") from exc
        # Respaldo PyOpenSSL para llaves PEM sin encriptar o PKCS#1 legacy.
        pwd = normalize_csd_password(key_password).encode("utf-8")
        fmt = crypto.FILETYPE_PEM if b"BEGIN" in raw[:120] else crypto.FILETYPE_ASN1
        try:
            legacy = crypto.load_privatekey(fmt, raw, pwd)
        except crypto.Error as legacy_exc:
            raise ValueError(f"No se pudo descifrar la llave del CSD. {_CSD_PASSWORD_HINT}") from legacy_exc
        except Exception as legacy_exc:
            raise ValueError(f"No se pudo cargar la llave del CSD. {_CSD_PASSWORD_HINT}") from legacy_exc
        pem_clear = crypto.dump_privatekey(crypto.FILETYPE_PEM, legacy)
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
