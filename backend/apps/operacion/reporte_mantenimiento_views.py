"""CRUD de reportes de mantenimiento + PDF del servidor.

Alcance: con ``reportes_mantenimiento.own_only`` (default para no-staff) el
técnico solo lista/abre reportes de órdenes donde es ``tecnico_asignado`` o que
él creó. Admin / own_only=false ve todos.
"""
from __future__ import annotations

import json
import logging

from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.ordenes.image_services import (
    cloudinary,
    delete_cloudinary_resource,
    extract_public_id_from_url,
    upload_data_url,
)
from apps.users.permissions import (
    ReportesMantenimientoAttachmentPermission,
    ReportesMantenimientoPermission,
    user_module_own_only,
)

from .models import ReporteMantenimiento
from .pdf_templates.reporte_mantenimiento import (
    generate_reporte_mantenimiento_pdf_html,
    overlay_from_reporte,
)
from .reporte_scope import (
    filter_reportes_visible_to_user,
    user_can_access_reporte,
    user_can_use_orden_for_reporte,
)
from .serializers import ReporteMantenimientoSerializer
from .views import _pdf_response_from_html

logger = logging.getLogger(__name__)

REPORTE_UPLOAD_FOLDER = "reportes-mantenimiento"


class ReporteMantenimientoViewSet(viewsets.ModelViewSet):
    """CRUD de reportes de mantenimiento. Permisos del módulo `reportes_mantenimiento`."""

    permission_classes = [IsAuthenticated, ReportesMantenimientoPermission]
    pagination_class = None
    serializer_class = ReporteMantenimientoSerializer
    queryset = ReporteMantenimiento.objects.select_related(
        "creado_por", "orden", "orden__tecnico_asignado"
    ).all()
    filter_backends = [filters.SearchFilter]
    search_fields = ["folio", "tecnico_nombre", "orden_folio", "orden_cliente"]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_permissions(self):
        # Subir/borrar fotos al editar: basta con create o edit en el módulo.
        if self.action in ("upload_image", "delete_image"):
            return [IsAuthenticated(), ReportesMantenimientoAttachmentPermission()]
        return super().get_permissions()

    def get_queryset(self):
        qs = self.queryset.all().order_by("-idx", "-id")
        user = getattr(self.request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            return qs.none()
        if user_module_own_only(user, "reportes_mantenimiento"):
            return filter_reportes_visible_to_user(qs, user)
        return qs

    def get_object(self):
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs.get(lookup_url_kwarg)
        if lookup_value is None:
            raise NotFound()

        obj = (
            ReporteMantenimiento.objects.select_related("creado_por", "orden", "orden__tecnico_asignado")
            .filter(**{self.lookup_field: lookup_value})
            .first()
        )
        if not obj:
            raise NotFound()

        user = getattr(self.request, "user", None)
        if user_module_own_only(user, "reportes_mantenimiento") and not user_can_access_reporte(user, obj):
            raise PermissionDenied("No tienes acceso a este reporte de mantenimiento.")
        return obj

    def _assert_orden_in_scope(self, orden) -> None:
        user = getattr(self.request, "user", None)
        if not user_module_own_only(user, "reportes_mantenimiento"):
            return
        if not user_can_use_orden_for_reporte(user, orden):
            raise ValidationError(
                {
                    "orden_id": [
                        "Solo puedes usar órdenes de trabajo asignadas a ti."
                    ]
                }
            )

    def perform_create(self, serializer):
        user = self.request.user if getattr(self.request.user, "is_authenticated", False) else None
        orden = serializer.validated_data.get("orden")
        self._assert_orden_in_scope(orden)
        serializer.save(creado_por=user)

    def perform_update(self, serializer):
        orden = serializer.validated_data.get("orden", getattr(serializer.instance, "orden", None))
        self._assert_orden_in_scope(orden)
        serializer.save()

    @action(detail=True, methods=["get"], url_path="pdf")
    def pdf(self, request, pk=None):
        """Genera el PDF del reporte (HTML imprimible si no hay motor PDF)."""
        reporte = self.get_object()
        html = generate_reporte_mantenimiento_pdf_html(overlay_from_reporte(reporte))
        folio = str(getattr(reporte, "folio", "") or f"RM-{reporte.pk}")
        wants_html = str(request.query_params.get("html") or "").strip().lower() in (
            "1",
            "true",
            "yes",
        )
        return _pdf_response_from_html(html, f"Reporte_{folio}.pdf", wants_html=wants_html)

    @action(detail=False, methods=["post"], url_path="upload-image")
    def upload_image(self, request):
        """Sube imagen a Cloudinary. Body: { data_url }."""
        if not cloudinary:
            return Response(
                {"detail": "Cloudinary no está configurado en el servidor."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        try:
            payload = request.data if isinstance(request.data, dict) else json.loads(request.body.decode("utf-8"))
        except Exception:
            logger.exception("Failed to parse reporte upload_image payload")
            payload = {}
        data_url = payload.get("data_url")
        if not isinstance(data_url, str) or ";base64," not in data_url:
            return Response({"detail": "data_url inválido"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            url = upload_data_url(data_url, folder=REPORTE_UPLOAD_FOLDER, max_size_kb=80)
            return Response({"url": url}, status=status.HTTP_200_OK)
        except Exception:
            logger.exception("Cloudinary reporte upload-image failed")
            return Response(
                {"detail": "Error subiendo imagen a Cloudinary"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

    @action(detail=False, methods=["post"], url_path="delete-image")
    def delete_image(self, request):
        """Elimina imagen Cloudinary de reportes. Body: { url } o { public_id }."""
        if not cloudinary:
            return Response(
                {"detail": "Cloudinary no está configurado en el servidor."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        try:
            payload = request.data if isinstance(request.data, dict) else json.loads(request.body.decode("utf-8"))
        except Exception:
            logger.exception("Failed to parse reporte delete_image payload")
            payload = {}

        url = payload.get("url")
        public_id = payload.get("public_id")
        if isinstance(url, str) and url.strip():
            public_id = extract_public_id_from_url(url.strip())
        elif isinstance(public_id, str):
            public_id = public_id.strip()
        else:
            public_id = ""

        if not public_id or not public_id.startswith(f"{REPORTE_UPLOAD_FOLDER}/"):
            return Response({"detail": "URL o public_id inválido"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            if isinstance(url, str) and url.strip():
                delete_cloudinary_resource(url.strip())
            else:
                cloudinary.uploader.destroy(public_id, resource_type="image")
            return Response({"ok": True, "public_id": public_id}, status=status.HTTP_200_OK)
        except Exception:
            logger.exception("Cloudinary reporte delete-image failed for public_id=%s", public_id)
            return Response(
                {"detail": "Error eliminando imagen en Cloudinary"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
