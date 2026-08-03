"""Cifrado Fernet para contraseñas SMTP de usuarios (nunca en texto plano)."""

from __future__ import annotations

import base64
import hashlib
import logging
import os

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings

logger = logging.getLogger(__name__)


def _resolve_fernet_key() -> bytes:
    """
    Clave Fernet (32 bytes en url-safe base64).

    Preferir ``SMTP_CREDENTIALS_KEY`` (Fernet.generate_key() o cualquier secreto).
    Si falta, se deriva de ``SECRET_KEY`` (estable entre reinicios del mismo secret).
    """
    raw = (os.environ.get("SMTP_CREDENTIALS_KEY") or getattr(settings, "SMTP_CREDENTIALS_KEY", "") or "").strip()
    if not raw:
        raw = str(getattr(settings, "SECRET_KEY", "") or "")
    if not raw:
        raise RuntimeError(
            "No hay clave para cifrar credenciales SMTP. "
            "Defina SMTP_CREDENTIALS_KEY o SECRET_KEY."
        )

    # Si ya es una clave Fernet válida (44 chars url-safe), usarla tal cual.
    try:
        if len(raw) == 44:
            Fernet(raw.encode("ascii") if isinstance(raw, str) else raw)
            return raw.encode("ascii") if isinstance(raw, str) else raw
    except Exception:
        pass

    digest = hashlib.sha256(f"digitalflow-smtp-v1:{raw}".encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


def get_fernet() -> Fernet:
    return Fernet(_resolve_fernet_key())


def encrypt_smtp_password(plain: str) -> str:
    token = get_fernet().encrypt(plain.encode("utf-8"))
    return token.decode("ascii")


def decrypt_smtp_password(token: str) -> str:
    try:
        return get_fernet().decrypt(token.encode("ascii")).decode("utf-8")
    except InvalidToken as exc:
        logger.warning("No se pudo descifrar contraseña SMTP (clave distinta o dato corrupto)")
        raise ValueError("Credenciales SMTP ilegibles; vuelve a guardar la contraseña.") from exc
