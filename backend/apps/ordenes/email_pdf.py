"""Envío del PDF de orden de servicio por correo (SMTP)."""

from __future__ import annotations

import logging
import os
import re

from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import EmailMessage, get_connection
from django.core.validators import validate_email

from apps.clientes.models import Cliente

logger = logging.getLogger(__name__)

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _env_email(key: str, default: str = "") -> str:
    """Lee SMTP desde proceso, settings o backend/.env (por si runserver arrancó antes)."""
    val = (os.environ.get(key) or "").strip()
    if val:
        return val
    val = (getattr(settings, key, None) or "").strip() if hasattr(settings, key) else ""
    if val:
        return val
    try:
        from config.settings import get_env_from_dotenv

        return (get_env_from_dotenv(key) or "").strip() or default
    except Exception:
        return default


def smtp_configured() -> bool:
    host = _env_email("EMAIL_HOST")
    user = _env_email("EMAIL_HOST_USER")
    password = _env_email("EMAIL_HOST_PASSWORD")
    return bool(host and user and password)


def normalize_email(value: str | None) -> str:
    return (value or "").strip()


def is_valid_email(value: str) -> bool:
    raw = normalize_email(value)
    if not raw or not _EMAIL_RE.match(raw):
        return False
    try:
        validate_email(raw)
    except DjangoValidationError:
        return False
    return True


def resolve_cliente_correo(cliente: Cliente | None) -> str:
    """Correo del cliente; si vacío, el del contacto principal (igual que listado de Clientes)."""
    if cliente is None:
        return ""
    correo = normalize_email(getattr(cliente, "correo", None))
    if correo:
        return correo
    contactos = list(cliente.contactos.all())
    principal = next((c for c in contactos if getattr(c, "is_principal", False)), None)
    contacto = principal or (contactos[0] if contactos else None)
    if contacto is None:
        return ""
    return normalize_email(getattr(contacto, "correo", None))


def maybe_save_cliente_correo(cliente: Cliente | None, correo: str) -> bool:
    """Si el cliente no tenía correo, guarda el usado en el envío. No toca contactos."""
    if cliente is None:
        return False
    if normalize_email(cliente.correo):
        return False
    correo_ok = normalize_email(correo)
    if not is_valid_email(correo_ok):
        return False
    cliente.correo = correo_ok
    cliente.save(update_fields=["correo"])
    return True


def build_orden_email_subject(orden) -> str:
    folio = (getattr(orden, "folio", None) or "").strip()
    if not folio:
        folio = str(getattr(orden, "idx", None) or getattr(orden, "id", "") or "")
    cliente = (getattr(orden, "cliente", None) or "").strip() or "cliente"
    return f"Orden de servicio #{folio} — {cliente}"


def build_orden_email_body(orden) -> str:
    folio = (getattr(orden, "folio", None) or "").strip()
    if not folio:
        folio = str(getattr(orden, "idx", None) or getattr(orden, "id", "") or "")
    cliente = (getattr(orden, "cliente", None) or "").strip() or "cliente"
    return (
        f"Estimado(a),\n\n"
        f"Adjuntamos el PDF de la orden de servicio #{folio} "
        f"correspondiente a {cliente}.\n\n"
        f"Saludos cordiales,\n"
        f"Grupo Intrax\n"
    )


def _smtp_connection():
    host = _env_email("EMAIL_HOST")
    user = _env_email("EMAIL_HOST_USER")
    password = _env_email("EMAIL_HOST_PASSWORD")
    port_raw = _env_email("EMAIL_PORT", "465") or "465"
    try:
        port = int(port_raw)
    except ValueError:
        port = 465
    use_ssl = _env_email("EMAIL_USE_SSL", "true").lower() in ("1", "true", "yes", "on")
    use_tls = _env_email("EMAIL_USE_TLS", "false").lower() in ("1", "true", "yes", "on")
    backend = _env_email(
        "EMAIL_BACKEND",
        getattr(settings, "EMAIL_BACKEND", None)
        or "django.core.mail.backends.smtp.EmailBackend",
    )
    return get_connection(
        backend=backend,
        host=host,
        port=port,
        username=user,
        password=password,
        use_tls=use_tls,
        use_ssl=use_ssl,
        fail_silently=False,
    )


def send_pdf_email(*, to_email: str, subject: str, body: str, pdf_bytes: bytes, filename: str) -> None:
    """Envía un PDF por SMTP (órdenes, cotizaciones, etc.)."""
    if not smtp_configured():
        raise RuntimeError(
            "El correo de salida no está configurado. "
            "Defina EMAIL_HOST, EMAIL_HOST_USER y EMAIL_HOST_PASSWORD."
        )
    if not pdf_bytes:
        raise RuntimeError("PDF vacío; no se puede enviar.")

    from_email = (
        _env_email("DEFAULT_FROM_EMAIL")
        or _env_email("EMAIL_HOST_USER")
        or "webmaster@localhost"
    )
    message = EmailMessage(
        subject=subject,
        body=body,
        from_email=from_email,
        to=[normalize_email(to_email)],
        connection=_smtp_connection(),
    )
    message.attach(filename, pdf_bytes, "application/pdf")
    message.send(fail_silently=False)
    logger.info("PDF enviado a %s (%s)", to_email, filename)


def send_orden_pdf_email(*, to_email: str, subject: str, body: str, pdf_bytes: bytes, filename: str) -> None:
    """Alias histórico; preferir ``send_pdf_email``."""
    send_pdf_email(
        to_email=to_email,
        subject=subject,
        body=body,
        pdf_bytes=pdf_bytes,
        filename=filename,
    )
