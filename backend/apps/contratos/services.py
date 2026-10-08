"""Lógica de negocio de contratos: contenido congelado, estados, sellado y correos."""

from __future__ import annotations

import hashlib
import json
import logging
from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from apps.cotizaciones.pdf_render import PdfRenderError, render_html_to_pdf

from .models import (
    ESTADO_BORRADOR,
    ESTADO_COMPLETADO,
    ESTADO_ENVIADO,
    ESTADO_FIRMADO_CLIENTE,
    ESTADO_FIRMADO_PRESTADOR,
    Contrato,
    ContratoEnlaceFirma,
    ContratoEvento,
)
from .prestador import normalizar_prestador

logger = logging.getLogger(__name__)

# Subir cuando cambie el texto de la plantilla: invalida hashes de contenido viejos.
PLANTILLA_VERSION = "internet-dedicado-v1"

ENLACE_VIGENCIA = timedelta(days=7)
OTP_VIGENCIA = timedelta(minutes=10)
OTP_MAX_INTENTOS = 5
OTP_MAX_ENVIOS = 5
OTP_ESPERA_REENVIO = timedelta(seconds=60)
SESION_VIGENCIA = timedelta(minutes=30)

CAMPOS_CONTENIDO = (
    "cliente_tipo_persona",
    "cliente_razon_social",
    "cliente_rfc",
    "cliente_regimen_fiscal",
    "cliente_domicilio_fiscal",
    "cliente_representante",
    "cliente_clave_elector",
    "cliente_curp",
    "cliente_correo",
    "domicilio_instalacion",
    "plan_mbps",
    "precio_mensual",
    "vigencia_meses",
    "fecha_firma",
    "ciudad_firma",
)


class ContratoError(Exception):
    """Error de negocio con mensaje apto para el usuario."""

    def __init__(self, detail: str, status: int = 400):
        super().__init__(detail)
        self.detail = detail
        self.status = status


# ---------------------------------------------------------------- contenido


def contenido_documento(contrato: Contrato) -> dict:
    d = {campo: getattr(contrato, campo) for campo in CAMPOS_CONTENIDO}
    for campo in CAMPOS_CONTENIDO:
        if isinstance(d[campo], str):
            d[campo] = d[campo].strip()
    d["precio_mensual"] = Decimal(str(d["precio_mensual"] or 0))
    d["prestador"] = normalizar_prestador(contrato.prestador_datos)
    return d


def hash_contenido(contrato: Contrato) -> str:
    d = contenido_documento(contrato)
    canon = {
        **{k: (str(v) if v is not None else "") for k, v in d.items() if k != "prestador"},
        "prestador": d["prestador"],
        "folio": contrato.folio or "",
        "plantilla": PLANTILLA_VERSION,
    }
    raw = json.dumps(canon, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def generar_html(contrato: Contrato) -> str:
    from .pdf_templates.contrato_internet import generar_contrato_html

    eventos = list(contrato.eventos.all()) if contrato.pk else []
    return generar_contrato_html(
        contrato,
        contenido_documento(contrato),
        documento_sha256=contrato.documento_sha256 or hash_contenido(contrato),
        eventos=eventos,
    )


def generar_pdf(contrato: Contrato, *, prefer_local: bool = False) -> bytes:
    from .pdf_templates.contrato_internet import opciones_pdf

    sha = contrato.documento_sha256 or hash_contenido(contrato)
    return render_html_to_pdf(
        generar_html(contrato),
        size="Letter",
        landscape=False,
        timeout=90,
        prefer_local=prefer_local,
        pdf_overrides=opciones_pdf(contrato, sha),
    )


def nombre_archivo(contrato: Contrato) -> str:
    return f"Contrato_{contrato.folio or contrato.idx or contrato.pk}.pdf"


# ---------------------------------------------------------------- bitácora


def registrar_evento(contrato, tipo, *, request=None, usuario=None, detalle=None):
    from .security import ip_cliente, user_agent

    ip = ip_cliente(request) if request is not None else None
    ua = user_agent(request) if request is not None else ""
    if usuario is None and request is not None:
        u = getattr(request, "user", None)
        if u is not None and getattr(u, "is_authenticated", False):
            usuario = u
    return ContratoEvento.objects.create(
        contrato=contrato, tipo=tipo, ip=ip, user_agent=ua, usuario=usuario, detalle=detalle or {}
    )


# ---------------------------------------------------------------- estados


def enlace_activo(contrato: Contrato) -> ContratoEnlaceFirma | None:
    ahora = timezone.now()
    return (
        contrato.enlaces.filter(revocado_at__isnull=True, usado_at__isnull=True, expira_at__gt=ahora)
        .order_by("-created_at")
        .first()
    )


def revocar_enlaces(contrato: Contrato) -> int:
    return contrato.enlaces.filter(revocado_at__isnull=True, usado_at__isnull=True).update(
        revocado_at=timezone.now()
    )


def estado_por_firmas(contrato: Contrato) -> str:
    if contrato.firmado_prestador_at and contrato.firmado_cliente_at:
        return ESTADO_COMPLETADO
    if contrato.firmado_cliente_at:
        return ESTADO_FIRMADO_CLIENTE
    if contrato.firmado_prestador_at:
        return ESTADO_FIRMADO_PRESTADOR
    if enlace_activo(contrato):
        return ESTADO_ENVIADO
    return ESTADO_BORRADOR


def limpiar_firmas(contrato: Contrato) -> None:
    """Tras editar el contenido ninguna firma previa es válida: se descartan."""
    contrato.documento_sha256 = ""
    for campo in (
        "firma_prestador_png", "firma_prestador_sha256", "firmado_prestador_nombre",
        "firma_cliente_png", "firma_cliente_sha256", "firma_cliente_nombre",
        "firmado_cliente_user_agent", "firmado_cliente_correo",
    ):
        setattr(contrato, campo, "")
    for campo in (
        "firmado_prestador_por", "firmado_prestador_at", "firmado_prestador_ip",
        "firmado_cliente_at", "firmado_cliente_ip",
    ):
        setattr(contrato, campo, None)
    contrato.estado = ESTADO_BORRADOR


def validar_listo_para_firma(contrato: Contrato) -> None:
    faltan = []
    if not contrato.cliente_razon_social.strip():
        faltan.append("razón social del cliente")
    if not contrato.cliente_correo.strip():
        faltan.append("correo del cliente")
    if not contrato.domicilio_instalacion.strip():
        faltan.append("domicilio de instalación")
    if not contrato.fecha_firma:
        faltan.append("fecha de firma")
    if not contrato.precio_mensual or contrato.precio_mensual <= 0:
        faltan.append("precio mensual")
    if contrato.cliente_tipo_persona == "moral" and not contrato.cliente_representante.strip():
        faltan.append("representante del cliente")
    prestador = normalizar_prestador(contrato.prestador_datos)
    if not prestador["correo"]:
        faltan.append("correo oficial del prestador")
    if faltan:
        raise ContratoError("Completa antes de firmar: " + ", ".join(faltan) + ".")


def congelar(contrato: Contrato) -> str:
    """Fija el hash del contenido (si no lo estaba) y lo devuelve."""
    if not contrato.documento_sha256:
        contrato.documento_sha256 = hash_contenido(contrato)
    return contrato.documento_sha256


# ---------------------------------------------------------------- sellado


def sellar_si_completo(contrato_id: int) -> bool:
    """Genera y guarda el PDF final cuando ya firmaron ambas partes.

    El render (hasta ~90 s) ocurre fuera del bloqueo de fila; el guardado es
    condicional para que dos peticiones simultáneas no pisen el PDF sellado.
    """
    with transaction.atomic():
        contrato = Contrato.objects.select_for_update().get(pk=contrato_id)
        if not (contrato.firmado_prestador_at and contrato.firmado_cliente_at):
            return False
        if contrato.pdf_sellado:
            return True
        if contrato.estado != ESTADO_COMPLETADO:
            contrato.estado = ESTADO_COMPLETADO
            contrato.sellado_at = timezone.now()
            contrato.save(update_fields=["estado", "sellado_at", "updated_at"])
            registrar_evento(contrato, "sellado", detalle={"documento_sha256": contrato.documento_sha256})

    try:
        pdf = generar_pdf(contrato, prefer_local=True)
    except PdfRenderError as exc:
        logger.error("No se pudo sellar el contrato %s: %s", contrato_id, exc.detail)
        return False
    except Exception:
        logger.exception("No se pudo sellar el contrato %s", contrato_id)
        return False

    guardados = Contrato.objects.filter(pk=contrato_id, pdf_sellado__isnull=True).update(
        pdf_sellado=pdf,
        pdf_sellado_sha256=hashlib.sha256(pdf).hexdigest(),
        updated_at=timezone.now(),
    )
    if guardados:
        transaction.on_commit(lambda: _enviar_pdf_final(contrato_id))
    return True


def pdf_final(contrato: Contrato) -> bytes | None:
    """PDF sellado guardado; si el sellado falló antes, lo reintenta."""
    if contrato.pdf_sellado:
        return bytes(contrato.pdf_sellado)
    if contrato.estado == ESTADO_COMPLETADO or (contrato.firmado_prestador_at and contrato.firmado_cliente_at):
        if sellar_si_completo(contrato.pk):
            contrato.refresh_from_db()
            return bytes(contrato.pdf_sellado) if contrato.pdf_sellado else None
    return None


# ---------------------------------------------------------------- correo


def _credenciales_smtp(usuario) -> tuple[str | None, str | None]:
    """SMTP del usuario que creó el enlace/contrato; si falta, el global (None, None)."""
    from apps.ordenes.email_pdf import UserSmtpCredentialsError, resolve_user_smtp_credentials

    if usuario is not None:
        try:
            return resolve_user_smtp_credentials(usuario)
        except UserSmtpCredentialsError:
            pass
    return None, None


def enviar_correo(*, usuario, para: str, asunto: str, cuerpo: str, adjunto: tuple[str, bytes] | None = None):
    from django.core.mail import EmailMessage

    from apps.ordenes.email_pdf import (
        _env_email,
        _smtp_connection,
        normalize_email,
        smtp_host_configured,
    )

    if not smtp_host_configured():
        raise RuntimeError("El correo de salida no está configurado.")
    smtp_user, smtp_pass = _credenciales_smtp(usuario)
    auth_user = smtp_user or _env_email("EMAIL_HOST_USER")
    auth_pass = smtp_pass if smtp_pass is not None else _env_email("EMAIL_HOST_PASSWORD")
    if not auth_user or not auth_pass:
        raise RuntimeError("No hay una cuenta de correo configurada para el envío.")
    msg = EmailMessage(
        subject=asunto,
        body=cuerpo,
        from_email=auth_user,
        to=[normalize_email(para)],
        connection=_smtp_connection(username=auth_user, password=auth_pass),
    )
    if adjunto:
        msg.attach(adjunto[0], adjunto[1], "application/pdf")
    msg.send(fail_silently=False)


def _enviar_pdf_final(contrato_id: int) -> None:
    from apps.common.marca import get_marca_nombre

    contrato = Contrato.objects.filter(pk=contrato_id).first()
    if not contrato or not contrato.pdf_sellado or not contrato.cliente_correo:
        return
    try:
        enviar_correo(
            usuario=contrato.creado_por,
            para=contrato.cliente_correo,
            asunto=f"Contrato {contrato.folio} firmado",
            cuerpo=(
                "Estimado(a) cliente:\n\n"
                f"Adjuntamos el contrato {contrato.folio} firmado por ambas partes, junto con su "
                "constancia de firma electrónica.\n\n"
                f"Saludos cordiales,\n{get_marca_nombre()}\n"
            ),
            adjunto=(nombre_archivo(contrato), bytes(contrato.pdf_sellado)),
        )
    except Exception:
        logger.exception("No se pudo enviar el PDF final del contrato %s", contrato_id)
