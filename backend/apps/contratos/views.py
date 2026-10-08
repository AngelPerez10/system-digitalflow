"""API interna (con sesión) de Documentos › Contratos."""

from __future__ import annotations

import logging
import re

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.common.pdf_enlace import como_descarga
from apps.common.pdf_html import ensure_print_page_numbers, request_wants_html_preview
from apps.common.pdf_images import firma_url_to_data_uri
from apps.cotizaciones.pdf_render import PdfRenderError, any_provider_configured
from apps.users.models import UserSignature
from apps.users.permissions import ContratosFirmaPermission, ContratosPermission

from . import services
from .models import (
    ESTADO_CANCELADO,
    ESTADO_COMPLETADO,
    ESTADOS_CERRADOS,
    Contrato,
    ContratoEnlaceFirma,
)
from .prestador import PRESTADOR_DEFAULTS
from .security import FirmaInvalida, hash_token, ip_cliente, nuevo_token, procesar_firma_png
from .serializers import ContratoEventoSerializer, ContratoSerializer

logger = logging.getLogger(__name__)
# Las firmas registradas vienen normalizadas del perfil (hasta 1400 px de lado).
FIRMA_REGISTRADA_MAX_BYTES = 2 * 1024 * 1024

RUTA_FIRMA_PUBLICA = "/firmar/contrato"


def _origen_permitido(origin: str) -> bool:
    if origin in getattr(settings, "CORS_ALLOWED_ORIGINS", []):
        return True
    return any(re.match(rx, origin) for rx in getattr(settings, "CORS_ALLOWED_ORIGIN_REGEXES", []))


def url_frontend(request) -> str:
    base = (getattr(settings, "FRONTEND_PUBLIC_URL", "") or "").strip().rstrip("/")
    if base:
        return base
    origin = (request.META.get("HTTP_ORIGIN") or "").strip().rstrip("/")
    if origin and _origen_permitido(origin):
        return origin
    raise services.ContratoError(
        "No se pudo determinar la URL pública del sistema. Configura FRONTEND_PUBLIC_URL.", status=500
    )


def _es_admin(user) -> bool:
    return bool(getattr(user, "is_superuser", False) or getattr(user, "is_staff", False))


def _registro_firmante():
    """Firma registrada del firmante oficial de EL PRESTADOR, o None."""
    username = (getattr(settings, "CONTRATOS_FIRMANTE_USERNAME", "") or "").strip()
    if not username:
        return None
    return (
        UserSignature.objects.select_related("user")
        .filter(user__username__iexact=username, user__is_active=True)
        .exclude(url="")
        .first()
    )


def _puede_aplicar(user, firmante) -> bool:
    return _es_admin(user) or getattr(user, "pk", None) == firmante.pk


def _error(exc: services.ContratoError) -> Response:
    return Response({"detail": exc.detail}, status=exc.status)


class ContratoViewSet(viewsets.ModelViewSet):
    serializer_class = ContratoSerializer
    permission_classes = [IsAuthenticated, ContratosPermission]

    def get_permissions(self):
        if self.action in ("enlace_firma", "revocar_enlace", "firmar_prestador", "firmantes", "cancelar"):
            return [IsAuthenticated(), ContratosFirmaPermission()]
        return super().get_permissions()

    def get_queryset(self):
        qs = (
            Contrato.objects.select_related("creado_por", "firmado_prestador_por")
            .defer("pdf_sellado")
            .order_by("-idx")
        )
        params = self.request.query_params
        search = (params.get("search") or "").strip()
        if search:
            qs = qs.filter(
                Q(folio__icontains=search)
                | Q(cliente_razon_social__icontains=search)
                | Q(cliente_rfc__icontains=search)
                | Q(cliente_correo__icontains=search)
            )
        estado = (params.get("estado") or "").strip()
        if estado:
            qs = qs.filter(estado=estado)
        return qs

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["incluir_firmas"] = self.action == "retrieve"
        return ctx

    # ------------------------------------------------------------ CRUD

    def perform_create(self, serializer):
        contrato = serializer.save(creado_por=self.request.user)
        services.registrar_evento(contrato, "creado", request=self.request)

    def update(self, request, *args, **kwargs):
        contrato = self.get_object()
        if contrato.estado in ESTADOS_CERRADOS:
            return Response(
                {"detail": "Un contrato completado o cancelado ya no se puede editar."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().update(request, *args, **kwargs)

    @transaction.atomic
    def perform_update(self, serializer):
        contrato = Contrato.objects.select_for_update().get(pk=serializer.instance.pk)
        hash_antes = services.hash_contenido(contrato)
        habia_firmas_o_envio = bool(
            contrato.documento_sha256 or contrato.firmado_prestador_at or contrato.firmado_cliente_at
        )
        contrato = serializer.save()
        if services.hash_contenido(contrato) == hash_antes:
            return
        detalle = {}
        if habia_firmas_o_envio:
            # El contenido cambió: ninguna firma ni enlace previo puede seguir valiendo.
            revocados = services.revocar_enlaces(contrato)
            services.limpiar_firmas(contrato)
            contrato.save()
            detalle = {"firmas_descartadas": True, "enlaces_revocados": revocados}
        services.registrar_evento(contrato, "editado", request=self.request, detalle=detalle)

    def destroy(self, request, *args, **kwargs):
        contrato = self.get_object()
        if contrato.estado == ESTADO_COMPLETADO:
            return Response(
                {"detail": "Un contrato firmado por ambas partes no se puede eliminar."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    # ------------------------------------------------------------ acciones

    @action(detail=False, methods=["get"], url_path="defaults-prestador")
    def defaults_prestador(self, request):
        return Response(dict(PRESTADOR_DEFAULTS))

    @action(detail=True, methods=["get"], url_path="pdf")
    def pdf(self, request, pk=None):
        contrato = self.get_object()
        filename = services.nombre_archivo(contrato)

        if contrato.estado == ESTADO_COMPLETADO and not request_wants_html_preview(request):
            pdf = services.pdf_final(contrato)
            if pdf:
                response = HttpResponse(pdf, content_type="application/pdf")
                response["Content-Disposition"] = f'inline; filename="{filename}"'
                response["Cache-Control"] = "no-store"
                return como_descarga(response, filename, request)

        html = services.generar_html(contrato)
        if request_wants_html_preview(request) or not any_provider_configured():
            response = HttpResponse(ensure_print_page_numbers(html), content_type="text/html; charset=utf-8")
            response["Cache-Control"] = "no-store"
            return response
        try:
            pdf = services.generar_pdf(contrato)
        except PdfRenderError as exc:
            logger.error("PDF de contrato %s falló: %s", contrato.pk, exc.detail)
            return Response({"detail": "No se pudo generar el PDF."}, status=502)
        response = HttpResponse(pdf, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        response["Cache-Control"] = "no-store"
        return como_descarga(response, filename, request)

    @action(detail=True, methods=["get"], url_path="eventos")
    def eventos(self, request, pk=None):
        contrato = self.get_object()
        data = ContratoEventoSerializer(contrato.eventos.select_related("usuario"), many=True).data
        return Response(data)

    @action(detail=True, methods=["post"], url_path="enlace-firma")
    def enlace_firma(self, request, pk=None):
        """Genera el link único de firma del cliente. El token solo se devuelve aquí, una vez."""
        enviar = str((request.data or {}).get("enviar_correo", "")).lower() in ("1", "true", "yes", "si", "sí")
        try:
            with transaction.atomic():
                contrato = Contrato.objects.select_for_update().get(pk=self.get_object().pk)
                if contrato.estado in ESTADOS_CERRADOS:
                    raise services.ContratoError("El contrato ya está cerrado.")
                if contrato.firmado_cliente_at:
                    raise services.ContratoError("El cliente ya firmó este contrato.")
                services.validar_listo_para_firma(contrato)
                base = url_frontend(request)

                services.revocar_enlaces(contrato)
                sha = services.congelar(contrato)
                token = nuevo_token()
                enlace = ContratoEnlaceFirma.objects.create(
                    contrato=contrato,
                    token_hash=hash_token(token),
                    correo_destino=contrato.cliente_correo,
                    documento_sha256=sha,
                    expira_at=timezone.now() + services.ENLACE_VIGENCIA,
                    creado_por=request.user,
                )
                contrato.estado = services.estado_por_firmas(contrato)
                contrato.save(update_fields=["documento_sha256", "estado", "updated_at"])
                services.registrar_evento(
                    contrato, "enviado", request=request, detalle={"expira_at": enlace.expira_at.isoformat()}
                )
        except services.ContratoError as exc:
            return _error(exc)

        # Fragmento (#t=): nunca llega a logs de servidor ni a la cabecera Referer.
        url = f"{base}{RUTA_FIRMA_PUBLICA}#t={token}"
        correo_enviado = False
        correo_error = ""
        if enviar:
            try:
                self._enviar_enlace(contrato, url, enlace)
                correo_enviado = True
                services.registrar_evento(contrato, "enlace_correo", request=request)
            except Exception as exc:  # noqa: BLE001 — se reporta al usuario sin detalles internos
                logger.warning("No se pudo enviar el enlace del contrato %s: %s", contrato.pk, exc)
                correo_error = "No se pudo enviar el correo; copia el enlace y compártelo manualmente."
        return Response(
            {
                "url": url,
                "expira_at": enlace.expira_at,
                "correo_destino": enlace.correo_destino,
                "correo_enviado": correo_enviado,
                "correo_error": correo_error,
                "contrato": ContratoSerializer(contrato, context=self.get_serializer_context()).data,
            },
            status=status.HTTP_201_CREATED,
        )

    def _enviar_enlace(self, contrato, url, enlace):
        from apps.common.marca import get_marca_nombre

        marca = get_marca_nombre()
        services.enviar_correo(
            usuario=self.request.user,
            para=contrato.cliente_correo,
            asunto=f"Firma de contrato {contrato.folio} — {marca}",
            cuerpo=(
                "Estimado(a) cliente:\n\n"
                f"{marca} le envía el contrato {contrato.folio} de servicio de Internet Dedicado para su "
                "revisión y firma electrónica.\n\n"
                f"Abra el siguiente enlace para firmar:\n{url}\n\n"
                "Por seguridad, al abrirlo se le enviará a este mismo correo un código de verificación de "
                f"6 dígitos. El enlace es personal y vence el {timezone.localtime(enlace.expira_at):%d/%m/%Y %H:%M} h.\n\n"
                "Si usted no esperaba este mensaje, ignórelo.\n\n"
                f"Saludos cordiales,\n{marca}\n"
            ),
        )

    @action(detail=True, methods=["post"], url_path="revocar-enlace")
    def revocar_enlace(self, request, pk=None):
        with transaction.atomic():
            contrato = Contrato.objects.select_for_update().get(pk=self.get_object().pk)
            revocados = services.revocar_enlaces(contrato)
            if revocados:
                contrato.estado = services.estado_por_firmas(contrato)
                contrato.save(update_fields=["estado", "updated_at"])
                services.registrar_evento(contrato, "revocado", request=request)
        return Response(ContratoSerializer(contrato, context=self.get_serializer_context()).data)

    @action(detail=False, methods=["get"], url_path="firmantes")
    def firmantes(self, request):
        """Firmante oficial de EL PRESTADOR (``CONTRATOS_FIRMANTE_USERNAME``) y su firma registrada."""
        registro = _registro_firmante()
        if registro is None:
            return Response([])
        u = registro.user
        return Response(
            [
                {
                    "id": u.pk,
                    "nombre": u.get_full_name() or u.username,
                    "username": u.username,
                    "firma_url": registro.url,
                    "es_yo": u.pk == request.user.pk,
                    "puede_aplicar": _puede_aplicar(request.user, u),
                }
            ]
        )

    @action(detail=True, methods=["post"], url_path="firmar-prestador")
    def firmar_prestador(self, request, pk=None):
        """Aplica la firma registrada (Cloudinary) del firmante oficial como firma de EL PRESTADOR.

        El firmante es siempre ``CONTRATOS_FIRMANTE_USERNAME``. Puede aplicarla
        ese mismo usuario o un administrador. Se guarda una copia PNG en el
        contrato: si después cambia su firma en Cloudinary, el contrato no se altera.
        """
        body = request.data if isinstance(request.data, dict) else {}
        registro = _registro_firmante()
        if registro is None:
            return Response(
                {
                    "detail": f"El usuario «{settings.CONTRATOS_FIRMANTE_USERNAME}» no tiene una firma registrada. "
                    "Regístrala en Gestión de usuarios."
                },
                status=400,
            )
        if not _puede_aplicar(request.user, registro.user):
            return Response(
                {"detail": f"Solo {registro.user.username} o un administrador pueden aplicar esta firma."},
                status=403,
            )
        try:
            data_uri = firma_url_to_data_uri(registro.url)
            if not data_uri:
                raise FirmaInvalida("No se pudo descargar la firma registrada. Intenta de nuevo.")
            png, firma_sha = procesar_firma_png(data_uri, max_bytes=FIRMA_REGISTRADA_MAX_BYTES)
        except FirmaInvalida as exc:
            return Response({"detail": str(exc)}, status=400)
        firmante = registro.user

        try:
            with transaction.atomic():
                contrato = Contrato.objects.select_for_update().get(pk=self.get_object().pk)
                if contrato.estado in ESTADOS_CERRADOS:
                    raise services.ContratoError("El contrato ya está cerrado.")
                if contrato.firmado_prestador_at:
                    raise services.ContratoError("El prestador ya firmó este contrato.")
                services.validar_listo_para_firma(contrato)
                visto = str(body.get("documento_sha256") or "").strip()
                sha = services.congelar(contrato)
                if visto and visto != sha:
                    raise services.ContratoError(
                        "El contrato cambió mientras lo revisabas. Vuelve a abrirlo antes de firmar.", status=409
                    )
                contrato.firma_prestador_png = png
                contrato.firma_prestador_sha256 = firma_sha
                contrato.firmado_prestador_por = firmante
                contrato.firmado_prestador_nombre = (
                    firmante.get_full_name() or contrato.prestador_datos.get("representante", "") or firmante.username
                )[:255]
                contrato.firmado_prestador_at = timezone.now()
                contrato.firmado_prestador_ip = ip_cliente(request)
                contrato.estado = services.estado_por_firmas(contrato)
                contrato.save()
                services.registrar_evento(
                    contrato,
                    "firmado_prestador",
                    request=request,
                    detalle={
                        "firmante_id": firmante.pk,
                        "firmante": firmante.username,
                        "aplicada_por": request.user.username,
                        "firma_public_id": registro.public_id,
                        "firma_sha256": firma_sha,
                    },
                )
        except services.ContratoError as exc:
            return _error(exc)

        services.sellar_si_completo(contrato.pk)
        contrato.refresh_from_db()
        return Response(ContratoSerializer(contrato, context={**self.get_serializer_context(), "incluir_firmas": True}).data)

    @action(detail=True, methods=["post"], url_path="cancelar")
    def cancelar(self, request, pk=None):
        with transaction.atomic():
            contrato = Contrato.objects.select_for_update().get(pk=self.get_object().pk)
            if contrato.estado == ESTADO_COMPLETADO:
                return Response({"detail": "Un contrato completado no se puede cancelar."}, status=400)
            if contrato.estado != ESTADO_CANCELADO:
                services.revocar_enlaces(contrato)
                contrato.estado = ESTADO_CANCELADO
                contrato.save(update_fields=["estado", "updated_at"])
                services.registrar_evento(contrato, "cancelado", request=request)
        return Response(ContratoSerializer(contrato, context=self.get_serializer_context()).data)

    def handle_exception(self, exc):
        if isinstance(exc, services.ContratoError):
            return _error(exc)
        return super().handle_exception(exc)
