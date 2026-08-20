"""CRUD y PDF de pólizas de mantenimiento (solo admin)."""
from __future__ import annotations

import re

from django.db.models import Q
from django.http import HttpResponse
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clientes.models import Cliente
from apps.common.document_folio import FOLIO_SERIE_COT, format_document_folio
from apps.cotizaciones.models import Cotizacion

from .models import PolizaMantenimiento
from .pdf_templates.poliza_cctv import (
    POLIZA_CCTV_DEMO,
    POLIZA_CCTV_TIPO,
    generate_poliza_cctv_pdf_html,
    generate_poliza_cctv_xml,
    overlay_from_cotizacion,
)
from .serializers import PolizaMantenimientoSerializer
from .views import _pdf_response_from_html

TIPOS_POLIZA = frozenset({POLIZA_CCTV_TIPO})
_FOLIO_RE = re.compile(r"^[A-Za-z]{3}-\d{1,8}$")
_ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _clean_text(value: object, max_len: int) -> str:
    raw = " ".join(str(value or "").replace("\x00", " ").split())
    return raw[:max_len]


def _format_iso_date(value: str) -> str:
    if not _ISO_DATE_RE.match(value):
        return value
    year, month, day = value.split("-")
    return f"{day}/{month}/{year}"


def overlay_from_cliente(cliente) -> dict:
    """Teléfono, correo y domicilio del cliente (nunca el demo de MCT)."""
    if cliente is None:
        return {}
    data = {
        "contacto_tel": (getattr(cliente, "telefono", None) or "").strip(),
        "contacto_cel": (getattr(cliente, "celular", None) or "").strip(),
        "cliente_correo": (getattr(cliente, "correo", None) or "").strip(),
        "cliente_web": (getattr(cliente, "portal_web", None) or "").strip(),
        "cliente_rfc": (getattr(cliente, "rfc", None) or "").strip(),
        "cliente_domicilio": "",
    }
    nombre = (getattr(cliente, "nombre", None) or "").strip()
    if nombre:
        data["cliente_nombre"] = nombre
    domicilio = (getattr(cliente, "direccion", None) or "").strip()
    if not domicilio:
        parts = [
            (getattr(cliente, "calle", None) or "").strip(),
            (getattr(cliente, "numero_exterior", None) or "").strip(),
            (getattr(cliente, "colonia", None) or "").strip(),
            (getattr(cliente, "ciudad", None) or "").strip(),
            (getattr(cliente, "estado", None) or "").strip(),
        ]
        cp = (getattr(cliente, "codigo_postal", None) or "").strip()
        if cp:
            parts.append(f"C.P. {cp}")
        domicilio = ", ".join(p for p in parts if p)
    data["cliente_domicilio"] = domicilio
    return data


def _parse_intervalo_meses(raw) -> int:
    try:
        intervalo = int(str(raw or "").strip() or 4)
    except (TypeError, ValueError):
        intervalo = 4
    return 2 if intervalo == 2 else 4


def overlay_from_query(params) -> dict:
    """Cubre folio/cliente/cotización/visitas del listado sobre la plantilla CCTV."""
    folio = _clean_text(params.get("folio"), 32)
    cliente = _clean_text(params.get("cliente"), 160)
    cotizacion = _clean_text(params.get("cotizacion"), 32)
    servicio_tipo = _clean_text(params.get("servicio_tipo"), 255)
    equipos_atendidos = _clean_text(params.get("equipos_atendidos"), 255)
    intervalo_meses = _parse_intervalo_meses(params.get("intervalo_meses"))
    visitas = [_clean_text(params.get(key), 10) for key in ("v1", "v2", "v3")]
    visitas = [v for v in visitas if v]

    data: dict = {}
    if folio and _FOLIO_RE.match(folio):
        data["folio"] = folio.upper()
    if cliente:
        data["cliente_nombre"] = cliente
        data.update(
            {
                "contacto_tel": "",
                "contacto_cel": "",
                "cliente_correo": "",
                "cliente_web": "",
                "cliente_rfc": "",
                "cliente_domicilio": "",
            }
        )

    raw_cliente_id = str(params.get("cliente_id") or "").strip()
    if raw_cliente_id.isdigit():
        row = Cliente.objects.filter(pk=int(raw_cliente_id)).first()
        if row is not None:
            data.update(overlay_from_cliente(row))

    servicio = dict(POLIZA_CCTV_DEMO.get("servicio") or {})
    servicio_changed = False
    if cotizacion:
        cot_key = cotizacion.upper()
        cot_num = cot_key[4:] if cot_key.startswith("COT-") else cot_key
        servicio["cotizacion_ref"] = f"Cotización No. {cot_num}"
        data["equipos_ref"] = cot_key if cot_key.startswith("COT-") else f"COT-{cot_num}"
        servicio_changed = True
    if visitas:
        fechas = ", ".join(_format_iso_date(v) for v in visitas)
        servicio["frecuencia"] = (
            f"Cada {intervalo_meses} meses (3 visitas al año): {fechas}"
        )
        servicio_changed = True
        data["visitas"] = [_format_iso_date(v) for v in visitas]
        data["intervalo_meses"] = intervalo_meses
    if servicio_changed:
        data["servicio"] = servicio
    raw_cot_id = str(params.get("cotizacion_id") or "").strip()
    if raw_cot_id.isdigit():
        cot = (
            Cotizacion.objects.prefetch_related("items", "tipo_trabajo")
            .filter(pk=int(raw_cot_id))
            .first()
        )
        if cot is not None:
            data = _apply_cotizacion_overlay(data, cot)
    if servicio_tipo or equipos_atendidos:
        servicio = dict(data.get("servicio") or POLIZA_CCTV_DEMO.get("servicio") or {})
        if servicio_tipo:
            servicio["tipo"] = servicio_tipo
        if equipos_atendidos:
            servicio["equipos"] = equipos_atendidos
        data["servicio"] = servicio
    return data


def _apply_cotizacion_overlay(data: dict, cotizacion) -> dict:
    extra = overlay_from_cotizacion(cotizacion)
    if not extra:
        return data
    servicio_extra = extra.pop("servicio", None) or {}
    data.update(extra)
    if servicio_extra:
        servicio = dict(data.get("servicio") or POLIZA_CCTV_DEMO.get("servicio") or {})
        servicio.update(servicio_extra)
        data["servicio"] = servicio
    return data


def overlay_from_poliza(poliza: PolizaMantenimiento) -> dict:
    """Overlay desde la póliza guardada (fuente de verdad, no query string)."""
    visitas = []
    for attr in ("fecha1", "fecha2", "fecha3"):
        value = getattr(poliza, attr, None)
        if value:
            visitas.append(value.isoformat())
    params = {
        "folio": poliza.folio or "",
        "cliente": poliza.cliente_nombre or "",
        "cotizacion": poliza.cotizacion_folio or "",
        "intervalo_meses": str(getattr(poliza, "intervalo_meses", 4) or 4),
        "v1": visitas[0] if len(visitas) > 0 else "",
        "v2": visitas[1] if len(visitas) > 1 else "",
        "v3": visitas[2] if len(visitas) > 2 else "",
    }
    data = overlay_from_query(params)
    data.update(overlay_from_cliente(getattr(poliza, "cliente", None)))
    data = _apply_cotizacion_overlay(data, getattr(poliza, "cotizacion", None))
    servicio_tipo = str(getattr(poliza, "servicio_tipo", "") or "").strip()
    equipos_atendidos = str(getattr(poliza, "equipos_atendidos", "") or "").strip()
    if servicio_tipo or equipos_atendidos:
        servicio = dict(data.get("servicio") or POLIZA_CCTV_DEMO.get("servicio") or {})
        if servicio_tipo:
            servicio["tipo"] = servicio_tipo
        if equipos_atendidos:
            servicio["equipos"] = equipos_atendidos
        data["servicio"] = servicio
    return data


def _poliza_tipo_error(tipo: str):
    if tipo not in TIPOS_POLIZA:
        return Response(
            {
                "detail": "Tipo de póliza no soportado. Use tipo=cctv.",
                "tipos": sorted(TIPOS_POLIZA),
            },
            status=400,
        )
    return None


def _xml_response(xml: str, filename: str):
    response = HttpResponse(xml, content_type="application/xml; charset=utf-8")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


class PolizaMantenimientoPdfView(APIView):
    """GET /api/polizas-mantenimiento/pdf/?tipo=cctv — plantilla (admin)."""

    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        tipo = (request.query_params.get("tipo") or "").strip().lower()
        err = _poliza_tipo_error(tipo)
        if err is not None:
            return err

        overlay = overlay_from_query(request.query_params)
        html = generate_poliza_cctv_pdf_html(overlay or None)
        folio = str(overlay.get("folio") or POLIZA_CCTV_DEMO.get("folio") or "POL-CCTV")
        filename = f"Poliza_{folio}.pdf"
        wants_html = (request.query_params.get("format") or "").lower() == "html"
        return _pdf_response_from_html(html, filename, wants_html=wants_html)


class PolizaMantenimientoXmlView(APIView):
    """GET /api/polizas-mantenimiento/xml/?tipo=cctv — XML del documento (admin)."""

    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        tipo = (request.query_params.get("tipo") or "").strip().lower()
        err = _poliza_tipo_error(tipo)
        if err is not None:
            return err

        overlay = overlay_from_query(request.query_params)
        xml = generate_poliza_cctv_xml(overlay or None)
        folio = str(overlay.get("folio") or POLIZA_CCTV_DEMO.get("folio") or "POL-CCTV")
        return _xml_response(xml, f"Poliza_{folio}.xml")


class PolizaMantenimientoViewSet(viewsets.ModelViewSet):
    """CRUD de pólizas de mantenimiento. Solo admin."""

    permission_classes = [IsAuthenticated, IsAdminUser]
    pagination_class = None
    serializer_class = PolizaMantenimientoSerializer
    queryset = PolizaMantenimiento.objects.select_related(
        "cliente", "cotizacion", "creado_por"
    ).prefetch_related("cotizacion__items", "cotizacion__tipo_trabajo")
    filter_backends = [filters.SearchFilter]
    search_fields = ["folio", "cliente_nombre", "cotizacion_folio"]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def perform_create(self, serializer):
        user = self.request.user if getattr(self.request.user, "is_authenticated", False) else None
        serializer.save(creado_por=user)

    @action(detail=False, methods=["get"], url_path="cotizaciones")
    def cotizaciones(self, request):
        """Picker liviano: cotizaciones DigitalFlow del cliente (FK o misma razón social)."""
        raw_id = (request.query_params.get("cliente_id") or "").strip()
        if not raw_id.isdigit():
            return Response({"detail": "Indique cliente_id."}, status=400)
        cliente = Cliente.objects.filter(pk=int(raw_id)).first()
        if cliente is None:
            return Response([])

        nombre_db = (cliente.nombre or "").strip()
        filtros = Q(cliente_id_id=cliente.id)
        if nombre_db:
            filtros |= Q(cliente__iexact=nombre_db)
        rows = (
            Cotizacion.objects.filter(filtros)
            .order_by("-idx")
            .values("id", "idx", "fecha", "status")[:200]
        )
        payload = []
        for row in rows:
            idx = row.get("idx")
            payload.append(
                {
                    "id": row["id"],
                    "idx": idx,
                    "folio": format_document_folio(FOLIO_SERIE_COT, idx, empty=""),
                    "fecha": row["fecha"].isoformat() if row.get("fecha") else None,
                    "status": row.get("status") or "",
                }
            )
        return Response(payload)

    def perform_content_negotiation(self, request, force=False):
        # El visor pide ?format=html; sin HTMLRenderer DRF responde 404 antes de la vista.
        if getattr(self, "action", None) in {"pdf", "xml"}:
            renderer = JSONRenderer()
            return (renderer, renderer.media_type)
        return super().perform_content_negotiation(request, force=force)

    @action(detail=True, methods=["get"], url_path="pdf")
    def pdf(self, request, pk=None):
        poliza = self.get_object()
        overlay = overlay_from_poliza(poliza)
        html = generate_poliza_cctv_pdf_html(overlay or None)
        folio = poliza.folio or f"POL-{poliza.idx or poliza.id}"
        filename = f"Poliza_{folio}.pdf"
        wants_html = (request.query_params.get("format") or "").lower() == "html"
        return _pdf_response_from_html(html, filename, wants_html=wants_html)

    @action(detail=True, methods=["get"], url_path="xml")
    def xml(self, request, pk=None):
        poliza = self.get_object()
        overlay = overlay_from_poliza(poliza)
        xml_body = generate_poliza_cctv_xml(overlay or None)
        folio = poliza.folio or f"POL-{poliza.idx or poliza.id}"
        return _xml_response(xml_body, f"Poliza_{folio}.xml")
