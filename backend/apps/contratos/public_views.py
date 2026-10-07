"""API pública (sin sesión) del link de firma del cliente.

Credenciales, siempre en cabeceras (nunca en la URL ni en cookies):
- ``X-Firma-Token``: token del link (256 bits). En BD solo vive su SHA-256.
- ``X-Firma-Sesion``: token emitido tras validar el OTP; caduca a los 30 min y
  solo vale junto con el token de su propio link.

Antes de verificar el OTP no se expone ningún dato del contrato salvo folio,
nombre del prestador y el correo enmascarado. Todos los errores de link son
genéricos: no revelan si un token existió, expiró o fue revocado.
"""

from __future__ import annotations

import logging

from django.db import transaction
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle
from rest_framework.views import APIView

from apps.common.marca import get_marca_nombre
from apps.common.pdf_html import ensure_print_page_numbers
from apps.cotizaciones.pdf_render import PdfRenderError, any_provider_configured

from . import services
from .models import ESTADOS_CERRADOS, Contrato, ContratoEnlaceFirma
from .prestador import normalizar_prestador
from .security import (
    FirmaInvalida,
    enmascarar_correo,
    hash_otp,
    hash_token,
    hashes_iguales,
    ip_cliente,
    nuevo_otp,
    nuevo_token,
    otp_coincide,
    procesar_firma_png,
    token_valido_formato,
    user_agent,
)

logger = logging.getLogger(__name__)

ENLACE_INVALIDO = "Este enlace no es válido o ya no está disponible. Solicita uno nuevo a quien te lo envió."
SESION_INVALIDA = "Tu sesión de firma expiró. Vuelve a verificar tu identidad con un código nuevo."
ENLACE_BLOQUEADO = (
    "Por seguridad, este enlace se bloqueó tras varios intentos fallidos. Solicita uno nuevo a quien te lo envió."
)


class _Rechazo(Exception):
    def __init__(self, detail: str, status: int, extra: dict | None = None):
        super().__init__(detail)
        self.detail = detail
        self.status = status
        self.extra = extra or {}


class _PublicoBase(APIView):
    authentication_classes: list = []  # sin cookies de sesión: DRF también omite CSRF
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle, ScopedRateThrottle]
    throttle_scope = "contrato_publico"

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response["Cache-Control"] = "no-store, max-age=0"
        response["Pragma"] = "no-cache"
        response["Referrer-Policy"] = "no-referrer"
        response["X-Robots-Tag"] = "noindex, nofollow"
        return response

    def handle_exception(self, exc):
        if isinstance(exc, _Rechazo):
            return Response({"detail": exc.detail, **exc.extra}, status=exc.status)
        return super().handle_exception(exc)

    # -------------------------------------------------------- resolución

    def _token(self, request) -> str:
        token = (request.headers.get("X-Firma-Token") or "").strip()
        if not token_valido_formato(token):
            raise _Rechazo(ENLACE_INVALIDO, 404)
        return token

    def _enlace(self, request, *, bloquear=False, permitir_usado=False) -> ContratoEnlaceFirma:
        token_hash = hash_token(self._token(request))
        qs = ContratoEnlaceFirma.objects.select_related("contrato", "creado_por")
        if bloquear:
            qs = qs.select_for_update(of=("self",))
        enlace = qs.filter(token_hash=token_hash).first()
        if enlace is None or not hashes_iguales(enlace.token_hash, token_hash):
            raise _Rechazo(ENLACE_INVALIDO, 404)
        contrato = enlace.contrato
        ahora = timezone.now()
        vencido = enlace.revocado_at is not None or enlace.expira_at <= ahora
        usado = enlace.usado_at is not None
        if vencido or (usado and not permitir_usado):
            raise _Rechazo(ENLACE_INVALIDO, 410)
        if contrato.estado in ESTADOS_CERRADOS and not (permitir_usado and contrato.estado == "completado"):
            raise _Rechazo(ENLACE_INVALIDO, 410)
        if contrato.documento_sha256 != enlace.documento_sha256:
            raise _Rechazo(ENLACE_INVALIDO, 410)
        return enlace

    def _bloqueado(self, enlace) -> bool:
        return enlace.otp_intentos >= services.OTP_MAX_INTENTOS

    def _enlace_con_sesion(self, request, *, bloquear=False, permitir_usado=False) -> ContratoEnlaceFirma:
        enlace = self._enlace(request, bloquear=bloquear, permitir_usado=permitir_usado)
        sesion = (request.headers.get("X-Firma-Sesion") or "").strip()
        if (
            not token_valido_formato(sesion)
            or not enlace.sesion_expira_at
            or enlace.sesion_expira_at <= timezone.now()
            or not hashes_iguales(enlace.sesion_hash, hash_token(sesion))
        ):
            raise _Rechazo(SESION_INVALIDA, 401)
        return enlace


class EstadoFirmaView(_PublicoBase):
    """Datos mínimos para la pantalla de bienvenida (sin datos del contrato)."""

    def get(self, request):
        enlace = self._enlace(request)
        contrato = enlace.contrato
        if not contrato.eventos.filter(tipo="link_abierto", detalle__enlace=enlace.pk).exists():
            services.registrar_evento(contrato, "link_abierto", request=request, detalle={"enlace": enlace.pk})
        ahora = timezone.now()
        espera = 0
        if enlace.otp_ultimo_envio_at:
            restante = (enlace.otp_ultimo_envio_at + services.OTP_ESPERA_REENVIO - ahora).total_seconds()
            espera = max(0, int(restante))
        return Response(
            {
                "folio": contrato.folio,
                "prestador": normalizar_prestador(contrato.prestador_datos)["razon_social"],
                "marca": get_marca_nombre(),
                "correo": enmascarar_correo(enlace.correo_destino),
                "expira_at": enlace.expira_at,
                "bloqueado": self._bloqueado(enlace),
                "codigo_vigente": bool(enlace.otp_hash and enlace.otp_expira_at and enlace.otp_expira_at > ahora),
                "reenviar_en": espera,
            }
        )


class EnviarOtpView(_PublicoBase):
    throttle_scope = "contrato_otp_envio"

    def post(self, request):
        with transaction.atomic():
            enlace = self._enlace(request, bloquear=True)
            if self._bloqueado(enlace):
                raise _Rechazo(ENLACE_BLOQUEADO, 423)
            ahora = timezone.now()
            if enlace.otp_ultimo_envio_at:
                restante = (enlace.otp_ultimo_envio_at + services.OTP_ESPERA_REENVIO - ahora).total_seconds()
                if restante > 0:
                    raise _Rechazo(
                        "Espera un momento antes de pedir otro código.", 429, {"reenviar_en": int(restante) + 1}
                    )
            if enlace.otp_enviados >= services.OTP_MAX_ENVIOS:
                raise _Rechazo(
                    "Se alcanzó el máximo de códigos para este enlace. Solicita uno nuevo a quien te lo envió.", 429
                )
            codigo = nuevo_otp()
            enlace.otp_hash = hash_otp(enlace.pk, codigo)
            enlace.otp_expira_at = ahora + services.OTP_VIGENCIA
            enlace.otp_enviados += 1
            enlace.otp_ultimo_envio_at = ahora
            enlace.save(update_fields=["otp_hash", "otp_expira_at", "otp_enviados", "otp_ultimo_envio_at"])
            try:
                self._enviar(enlace, codigo)
            except Exception:
                logger.exception("No se pudo enviar el OTP del enlace %s", enlace.pk)
                # Revierte el contador: un fallo del SMTP no debe consumir envíos.
                transaction.set_rollback(True)
                return Response(
                    {"detail": "No pudimos enviar el código en este momento. Intenta de nuevo en unos minutos."},
                    status=503,
                )
            services.registrar_evento(enlace.contrato, "otp_enviado", request=request)
        return Response(
            {
                "correo": enmascarar_correo(enlace.correo_destino),
                "expira_at": enlace.otp_expira_at,
                "reenviar_en": int(services.OTP_ESPERA_REENVIO.total_seconds()),
            }
        )

    def _enviar(self, enlace, codigo):
        marca = get_marca_nombre()
        minutos = int(services.OTP_VIGENCIA.total_seconds() // 60)
        services.enviar_correo(
            usuario=enlace.creado_por or enlace.contrato.creado_por,
            para=enlace.correo_destino,
            asunto=f"Código de verificación: {codigo}",
            cuerpo=(
                f"Su código para firmar el contrato {enlace.contrato.folio} es:\n\n    {codigo}\n\n"
                f"Vence en {minutos} minutos y solo puede usarse una vez. No lo comparta con nadie: "
                f"{marca} nunca se lo pedirá por teléfono.\n\n"
                "Si usted no solicitó este código, ignore este mensaje.\n"
            ),
        )


class VerificarOtpView(_PublicoBase):
    throttle_scope = "contrato_otp_verificar"

    def post(self, request):
        codigo = str((request.data or {}).get("codigo") or "").strip()
        with transaction.atomic():
            enlace = self._enlace(request, bloquear=True)
            if self._bloqueado(enlace):
                raise _Rechazo(ENLACE_BLOQUEADO, 423)
            ahora = timezone.now()
            if not enlace.otp_hash or not enlace.otp_expira_at or enlace.otp_expira_at <= ahora:
                raise _Rechazo("El código expiró o no se ha solicitado. Pide uno nuevo.", 400)
            if not otp_coincide(enlace.pk, codigo, enlace.otp_hash):
                enlace.otp_intentos += 1
                enlace.save(update_fields=["otp_intentos"])
                services.registrar_evento(enlace.contrato, "otp_fallido", request=request)
                restantes = services.OTP_MAX_INTENTOS - enlace.otp_intentos
                if restantes <= 0:
                    enlace.otp_hash = ""
                    enlace.save(update_fields=["otp_hash"])
                    services.registrar_evento(enlace.contrato, "otp_bloqueado", request=request)
                    # Se confirma el bloqueo antes de responder con error.
                    return Response({"detail": ENLACE_BLOQUEADO}, status=423)
                return Response(
                    {"detail": "El código no es correcto.", "intentos_restantes": restantes}, status=400
                )
            sesion = nuevo_token()
            enlace.otp_hash = ""  # un solo uso
            enlace.verificado_at = enlace.verificado_at or ahora
            enlace.sesion_hash = hash_token(sesion)
            enlace.sesion_expira_at = ahora + services.SESION_VIGENCIA
            enlace.save(update_fields=["otp_hash", "verificado_at", "sesion_hash", "sesion_expira_at"])
            services.registrar_evento(enlace.contrato, "otp_verificado", request=request)
        return Response({"sesion": sesion, "expira_at": enlace.sesion_expira_at})


class DocumentoFirmaView(_PublicoBase):
    """Vista previa del contrato (PDF) para leer antes de firmar."""

    def get(self, request):
        enlace = self._enlace_con_sesion(request)
        contrato = enlace.contrato
        if not contrato.eventos.filter(tipo="documento_visto", detalle__enlace=enlace.pk).exists():
            services.registrar_evento(contrato, "documento_visto", request=request, detalle={"enlace": enlace.pk})
        html = services.generar_html(contrato)
        if not any_provider_configured():
            response = HttpResponse(ensure_print_page_numbers(html), content_type="text/html; charset=utf-8")
        else:
            try:
                pdf = services.generar_pdf(contrato)
            except PdfRenderError as exc:
                logger.error("PDF público del contrato %s falló: %s", contrato.pk, exc.detail)
                return Response({"detail": "No se pudo generar el documento. Intenta de nuevo."}, status=502)
            response = HttpResponse(pdf, content_type="application/pdf")
            response["Content-Disposition"] = f'inline; filename="{services.nombre_archivo(contrato)}"'
        response["X-Documento-Sha256"] = contrato.documento_sha256
        return response


class FirmarView(_PublicoBase):
    def post(self, request):
        body = request.data if isinstance(request.data, dict) else {}
        nombre = " ".join(str(body.get("nombre") or "").split())[:255]
        acepta = body.get("acepta") is True
        visto = str(body.get("documento_sha256") or "").strip()
        if not acepta:
            return Response({"detail": "Debes aceptar el contenido del contrato para firmar."}, status=400)
        if len(nombre) < 5:
            return Response({"detail": "Escribe tu nombre completo."}, status=400)
        try:
            png, firma_sha = procesar_firma_png(body.get("firma"))
        except FirmaInvalida as exc:
            return Response({"detail": str(exc)}, status=400)

        with transaction.atomic():
            enlace = self._enlace_con_sesion(request, bloquear=True)
            contrato = Contrato.objects.select_for_update().get(pk=enlace.contrato_id)
            if contrato.firmado_cliente_at:
                raise _Rechazo(ENLACE_INVALIDO, 410)
            if not hashes_iguales(visto, contrato.documento_sha256):
                raise _Rechazo(
                    "El contrato cambió desde que lo abriste. Recarga la página para revisarlo de nuevo.", 409
                )
            ahora = timezone.now()
            contrato.firma_cliente_png = png
            contrato.firma_cliente_sha256 = firma_sha
            contrato.firma_cliente_nombre = nombre
            contrato.firmado_cliente_at = ahora
            contrato.firmado_cliente_ip = ip_cliente(request)
            contrato.firmado_cliente_user_agent = user_agent(request)
            contrato.firmado_cliente_correo = enlace.correo_destino
            contrato.estado = services.estado_por_firmas(contrato)
            contrato.save()
            enlace.usado_at = ahora
            enlace.save(update_fields=["usado_at"])
            services.registrar_evento(
                contrato, "firmado_cliente", request=request, detalle={"firma_sha256": firma_sha}
            )

        completado = services.sellar_si_completo(contrato.pk)
        return Response({"completado": completado, "folio": contrato.folio})


class PdfFinalView(_PublicoBase):
    """PDF sellado, disponible mientras siga vigente la sesión de firma."""

    def get(self, request):
        enlace = self._enlace_con_sesion(request, permitir_usado=True)
        contrato = enlace.contrato
        if not (contrato.firmado_cliente_at and contrato.firmado_prestador_at):
            return Response(
                {"detail": "El contrato aún no tiene todas las firmas. Te lo enviaremos por correo."}, status=409
            )
        pdf = services.pdf_final(contrato)
        if not pdf:
            return Response({"detail": "El documento final aún se está generando."}, status=503)
        filename = services.nombre_archivo(contrato)
        response = HttpResponse(pdf, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response
