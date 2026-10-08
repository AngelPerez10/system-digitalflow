"""Primitivas de seguridad del link público de firma.

- Token del link: 256 bits aleatorios; en BD solo su SHA-256.
- OTP: 6 dígitos, guardado como HMAC (SECRET_KEY + id del enlace).
- Sesión de firma: segundo token aleatorio emitido tras validar el OTP.
- Firma: PNG decodificado y re-codificado con Pillow (descarta lo que no sea imagen).
"""

from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import io
import re
import secrets

from django.conf import settings
from PIL import Image, UnidentifiedImageError
from rest_framework.throttling import BaseThrottle

from apps.common.signature_image import normalize_signature_image

TOKEN_BYTES = 32
TOKEN_RE = re.compile(r"^[A-Za-z0-9_\-]{40,64}$")
OTP_LEN = 6
OTP_RE = re.compile(r"^\d{6}$")

FIRMA_MAX_BYTES = 300 * 1024
FIRMA_MAX_EDGE = 3000
FIRMA_MIN_EDGE = 20
_DATA_URL_RE = re.compile(r"^data:image/png;base64,([A-Za-z0-9+/=\s]+)$")


def nuevo_token() -> str:
    return secrets.token_urlsafe(TOKEN_BYTES)


def hash_token(token: str) -> str:
    return hashlib.sha256((token or "").encode("utf-8")).hexdigest()


def token_valido_formato(token: str) -> bool:
    return bool(token) and bool(TOKEN_RE.match(token))


def nuevo_otp() -> str:
    return f"{secrets.randbelow(10 ** OTP_LEN):0{OTP_LEN}d}"


def hash_otp(enlace_id: int, codigo: str) -> str:
    key = f"contratos.otp:{settings.SECRET_KEY}".encode("utf-8")
    msg = f"{enlace_id}:{codigo}".encode("utf-8")
    return hmac.new(key, msg, hashlib.sha256).hexdigest()


def otp_coincide(enlace_id: int, codigo: str, guardado: str) -> bool:
    if not guardado or not OTP_RE.match(codigo or ""):
        return False
    return hmac.compare_digest(hash_otp(enlace_id, codigo), guardado)


def hashes_iguales(a: str, b: str) -> bool:
    return bool(a) and bool(b) and hmac.compare_digest(a, b)


def enmascarar_correo(correo: str) -> str:
    correo = (correo or "").strip()
    if "@" not in correo:
        return ""
    local, dominio = correo.split("@", 1)
    visible = local[:2] if len(local) > 2 else local[:1]
    return f"{visible}{'*' * max(3, len(local) - len(visible))}@{dominio}"


def ip_cliente(request) -> str | None:
    """IP del cliente con la misma regla que los throttles (respeta NUM_PROXIES)."""
    ident = BaseThrottle().get_ident(request)
    ident = (ident or "").strip()
    if not ident:
        return None
    try:
        import ipaddress

        return str(ipaddress.ip_address(ident))
    except ValueError:
        return None


def user_agent(request) -> str:
    return (request.META.get("HTTP_USER_AGENT") or "")[:500]


class FirmaInvalida(ValueError):
    pass


def procesar_firma_png(data_url: str, *, max_bytes: int = FIRMA_MAX_BYTES) -> tuple[str, str]:
    """Valida un data URL PNG de firma y devuelve (data_url_normalizado, sha256_png).

    Lanza ``FirmaInvalida`` con un mensaje apto para el usuario.
    """
    if not isinstance(data_url, str):
        raise FirmaInvalida("La firma es obligatoria.")
    m = _DATA_URL_RE.match(data_url.strip())
    if not m:
        raise FirmaInvalida("La firma debe ser una imagen PNG.")
    b64 = re.sub(r"\s+", "", m.group(1))
    # base64 crece ~4/3; cortar antes de decodificar.
    if len(b64) > max_bytes * 4 // 3 + 8:
        raise FirmaInvalida("La imagen de la firma es demasiado grande.")
    try:
        raw = base64.b64decode(b64, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise FirmaInvalida("La firma no es una imagen válida.") from exc
    if not raw or len(raw) > max_bytes:
        raise FirmaInvalida("La imagen de la firma es demasiado grande.")
    try:
        with Image.open(io.BytesIO(raw)) as probe:
            if probe.format != "PNG":
                raise FirmaInvalida("La firma debe ser una imagen PNG.")
            w, h = probe.size
            if w > FIRMA_MAX_EDGE or h > FIRMA_MAX_EDGE or w < FIRMA_MIN_EDGE or h < FIRMA_MIN_EDGE:
                raise FirmaInvalida("Las dimensiones de la firma no son válidas.")
            probe.verify()
        with Image.open(io.BytesIO(raw)) as img:
            img.load()
            limpio = normalize_signature_image(img)
    except FirmaInvalida:
        raise
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError) as exc:
        raise FirmaInvalida("La firma no es una imagen válida.") from exc

    if not _tiene_tinta(limpio):
        raise FirmaInvalida("La firma está vacía.")

    out = io.BytesIO()
    limpio.save(out, format="PNG", optimize=True)
    png = out.getvalue()
    sha = hashlib.sha256(png).hexdigest()
    return "data:image/png;base64," + base64.b64encode(png).decode("ascii"), sha


def _tiene_tinta(img: Image.Image, minimo: int = 40) -> bool:
    alpha = img.convert("RGBA").getchannel("A")
    hist = alpha.histogram()
    return sum(hist[24:]) >= minimo
