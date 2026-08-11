import json
import logging

from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import HttpResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError as DRFValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.cotizaciones.pdf_render import PdfRenderError, any_provider_configured, render_html_to_pdf
from apps.ordenes.image_services import (
    ALLOWED_CLOUDINARY_PUBLIC_ID_PREFIXES,
    cloudinary,
    upload_data_url,
)
from apps.users.permissions import ProyectosAttachmentPermission, ProyectosPermission, user_module_own_only

from .asignados import (
    filter_proyectos_visible_to_user,
    user_on_proyecto_team,
)
from .models import Proyecto, ProyectoInstalacion
from .serializers import ProyectoInstalacionSerializer, ProyectoSerializer

logger = logging.getLogger(__name__)

PROYECTO_UPLOAD_FOLDERS = frozenset(
    {
        "proyectos/evidencias",
        "proyectos/bitacora",
        "proyectos/firmas",
        "proyectos/instalacion/dibujos",
    }
)


def _raise_drf_validation(exc: DjangoValidationError) -> None:
    if hasattr(exc, "message_dict"):
        raise DRFValidationError(exc.message_dict) from exc
    raise DRFValidationError(list(exc.messages)) from exc


def _is_data_url(value: str) -> bool:
    return isinstance(value, str) and value.startswith("data:") and ";base64," in value


def _firma_cloudinary_overrides(validated_data: dict) -> dict:
    """Convierte data URLs de firmas a Cloudinary (mismo patrón que órdenes)."""
    overrides: dict = {}
    for field in ("firma_cliente_url", "firma_tecnico_url"):
        if field not in validated_data:
            continue
        raw = validated_data.get(field)
        if isinstance(raw, str) and _is_data_url(raw):
            try:
                overrides[field] = upload_data_url(raw, folder="proyectos/firmas", max_size_kb=80)
            except DRFValidationError:
                raise
            except Exception:
                logger.exception("Failed uploading proyecto %s", field)
                raise DRFValidationError({field: ["No se pudo subir la firma."]}) from None
    return overrides


def _pdf_response_from_html(html: str, filename: str, *, wants_html: bool = False):
    """HTML → PDF; si no hay motor o se pide HTML, regresa HTML imprimible."""
    if not html:
        return Response({"detail": "No se pudo generar el HTML del PDF."}, status=500)

    # Preferir HTML explícito (query) o fallback sin motor PDF.
    if wants_html or not any_provider_configured():
        response = HttpResponse(html, content_type="text/html; charset=utf-8")
        stem = filename[:-4] if filename.lower().endswith(".pdf") else filename
        response["Content-Disposition"] = f'inline; filename="{stem}.html"'
        return response

    try:
        pdf_bytes = render_html_to_pdf(
            html, size="A4", landscape=False, timeout=45, prefer_local=True
        )
    except PdfRenderError as e:
        logger.exception("Proyecto PDF render failed: %s", e.detail)
        # Fallback útil en local sin Chromium/Playwright instalado.
        response = HttpResponse(html, content_type="text/html; charset=utf-8")
        stem = filename[:-4] if filename.lower().endswith(".pdf") else filename
        response["Content-Disposition"] = f'inline; filename="{stem}.html"'
        return response

    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    response["Content-Disposition"] = f'inline; filename="{filename}"'
    return response


class ProyectoViewSet(viewsets.ModelViewSet):
    """CRUD de proyectos de operación. Permisos del módulo `proyectos`."""

    permission_classes = [IsAuthenticated, ProyectosPermission]
    pagination_class = None
    queryset = Proyecto.objects.select_related(
        "cliente", "tecnico", "auxiliar", "creado_por"
    ).all()
    serializer_class = ProyectoSerializer

    def get_permissions(self):
        # Técnicos suelen tener edit sin create; adjuntos no deben exigir create.
        if self.action in ("upload_image", "delete_image"):
            return [IsAuthenticated(), ProyectosAttachmentPermission()]
        return super().get_permissions()

    def get_queryset(self):
        qs = (
            self.queryset.all()
            .select_related("cliente", "tecnico", "auxiliar", "creado_por")
            .order_by("-idx", "-id")
        )
        user = getattr(self.request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            return qs.none()
        if user_module_own_only(user, "proyectos"):
            return filter_proyectos_visible_to_user(qs, user)
        return qs

    def get_object(self):
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs.get(lookup_url_kwarg)
        if lookup_value is None:
            raise NotFound()

        obj = (
            Proyecto.objects.select_related("cliente")
            .prefetch_related("cliente__contactos")
            .filter(**{self.lookup_field: lookup_value})
            .first()
        )
        if not obj:
            raise NotFound()

        user = getattr(self.request, "user", None)
        if user_module_own_only(user, "proyectos"):
            if not user_on_proyecto_team(user, obj):
                raise PermissionDenied("No tienes acceso a este proyecto.")
        return obj

    def perform_create(self, serializer):
        try:
            firma_overrides = _firma_cloudinary_overrides(serializer.validated_data)
            serializer.save(creado_por=self.request.user, **firma_overrides)
        except DjangoValidationError as exc:
            _raise_drf_validation(exc)

    def perform_update(self, serializer):
        try:
            firma_overrides = _firma_cloudinary_overrides(serializer.validated_data)
            serializer.save(**firma_overrides)
        except DjangoValidationError as exc:
            _raise_drf_validation(exc)

    def _generate_pdf_html(self, proyecto: Proyecto) -> str:
        from .pdf_templates import generate_proyecto_pdf_html

        return generate_proyecto_pdf_html(proyecto)

    @action(detail=True, methods=["get"], url_path="pdf")
    def pdf(self, request, pk=None):
        """PDF del proyecto (híbrido operativo + equipos sin precios)."""
        proyecto = self.get_object()
        html = self._generate_pdf_html(proyecto)
        folio = getattr(proyecto, "folio", None) or getattr(proyecto, "idx", None) or proyecto.id
        filename = f"Proyecto_{folio}.pdf"
        wants_html = (request.query_params.get("format") or "").lower() == "html"
        return _pdf_response_from_html(html, filename, wants_html=wants_html)

    @action(detail=False, methods=["post"], url_path="upload-image")
    def upload_image(self, request):
        """Sube imagen a Cloudinary. Body: { data_url, folder: proyectos/... }."""
        if not cloudinary:
            return Response(
                {"detail": "Cloudinary no está configurado en el servidor."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        try:
            payload = request.data if isinstance(request.data, dict) else json.loads(request.body.decode("utf-8"))
        except Exception:
            logger.exception("Failed to parse proyectos upload_image payload")
            payload = {}
        data_url = payload.get("data_url")
        folder = payload.get("folder") or "proyectos/evidencias"
        if not isinstance(folder, str) or folder not in PROYECTO_UPLOAD_FOLDERS:
            return Response({"detail": "folder inválido"}, status=status.HTTP_400_BAD_REQUEST)
        if not isinstance(data_url, str) or ";base64," not in data_url:
            return Response({"detail": "data_url inválido"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            url = upload_data_url(data_url, folder=folder, max_size_kb=80)
            return Response({"url": url}, status=status.HTTP_200_OK)
        except DRFValidationError:
            return Response({"detail": "data_url inválido"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            logger.exception("Cloudinary proyectos upload-image failed")
            return Response(
                {"detail": "Error subiendo imagen a Cloudinary"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

    @action(detail=False, methods=["post"], url_path="delete-image")
    def delete_image(self, request):
        """Elimina imagen Cloudinary. Body: { public_id } bajo proyectos/…."""
        if not cloudinary:
            return Response(
                {"detail": "Cloudinary no está configurado en el servidor."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        try:
            payload = request.data if isinstance(request.data, dict) else json.loads(request.body.decode("utf-8"))
        except Exception:
            logger.exception("Failed to parse proyectos delete_image payload")
            payload = {}
        public_id = payload.get("public_id")
        if not isinstance(public_id, str) or not public_id:
            return Response({"detail": "public_id inválido"}, status=status.HTTP_400_BAD_REQUEST)
        allowed = tuple(f"{f}/" for f in PROYECTO_UPLOAD_FOLDERS)
        # También acepta prefijos globales si ya están en image_services
        if not (
            any(public_id.startswith(p) for p in allowed)
            or any(public_id.startswith(p) for p in ALLOWED_CLOUDINARY_PUBLIC_ID_PREFIXES if p.startswith("proyectos/"))
        ):
            return Response({"detail": "public_id fuera de alcance"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            res = cloudinary.uploader.destroy(public_id, resource_type="image")
            return Response(res, status=status.HTTP_200_OK)
        except Exception:
            logger.exception("Cloudinary proyectos delete-image failed for public_id=%s", public_id)
            return Response(
                {"detail": "Error eliminando imagen en Cloudinary"},
                status=status.HTTP_502_BAD_GATEWAY,
            )


class ProyectoInstalacionViewSet(viewsets.ModelViewSet):
    """CRUD de instalaciones ligadas a proyectos. Permisos módulo `proyectos`."""

    permission_classes = [IsAuthenticated, ProyectosPermission]
    pagination_class = None
    serializer_class = ProyectoInstalacionSerializer
    queryset = ProyectoInstalacion.objects.select_related(
        "proyecto", "proyecto__cliente", "creado_por"
    ).all()
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = (
            self.queryset.all()
            .select_related("proyecto", "proyecto__cliente", "creado_por")
            .order_by("-idx", "-id")
        )
        user = getattr(self.request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            return qs.none()
        if user_module_own_only(user, "proyectos"):
            visible_proyecto_ids = filter_proyectos_visible_to_user(
                Proyecto.objects.all(), user
            ).values_list("id", flat=True)
            qs = qs.filter(proyecto_id__in=visible_proyecto_ids)
        proyecto_id = self.request.query_params.get("proyecto")
        if proyecto_id not in (None, ""):
            try:
                qs = qs.filter(proyecto_id=int(proyecto_id))
            except (TypeError, ValueError):
                qs = qs.none()
        return qs

    def perform_create(self, serializer):
        validated = dict(serializer.validated_data)
        dibujo_url = validated.get("dibujo_url") or ""
        if _is_data_url(dibujo_url):
            dibujo_url = upload_data_url(
                dibujo_url,
                folder="proyectos/instalacion/dibujos",
                max_size_kb=200,
            )
        serializer.save(
            creado_por=self.request.user if self.request.user.is_authenticated else None,
            dibujo_url=dibujo_url,
        )

    def perform_update(self, serializer):
        validated = dict(serializer.validated_data)
        dibujo_url = validated.get("dibujo_url")
        if dibujo_url is not None and _is_data_url(dibujo_url):
            dibujo_url = upload_data_url(
                dibujo_url,
                folder="proyectos/instalacion/dibujos",
                max_size_kb=200,
            )
            serializer.save(dibujo_url=dibujo_url)
            return
        serializer.save()
