"""ViewSets for cotizaciones app."""
import base64
import io
import json
import os
from pathlib import Path
from types import SimpleNamespace
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from django.db import models as django_models
from django.db.models import Prefetch
from django.http import HttpResponse
from openpyxl import Workbook
from openpyxl.drawing.image import Image as XLImage
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from PIL import Image as PILImage
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.users.permissions import ModulePermission

from .models import Cotizacion
from .serializers import CotizacionSerializer

IVA_MX_DISPLAY = 1.16


def _safe_http_image_bytes(url: str, max_bytes: int = 2_500_000) -> bytes | None:
    """Fetch remote image bytes for Excel embedding (basic SSRF guard)."""
    if not isinstance(url, str):
        return None
    u = url.strip()
    if not u:
        return None
    try:
        parsed = urlparse(u)
    except Exception:
        return None
    if parsed.scheme not in ("http", "https"):
        return None
    host = (parsed.hostname or "").lower()
    if not host or host in ("localhost", "127.0.0.1", "::1"):
        return None

    req = Request(
        url=u,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; system-digitalflow/1.0)",
            "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
        method="GET",
    )
    try:
        with urlopen(req, timeout=20) as resp:
            data = resp.read(max_bytes + 1)
    except Exception:
        return None
    if not data or len(data) > max_bytes:
        return None
    return data


def _user_display(user) -> str:
    if not user:
        return "—"
    try:
        first = getattr(user, "first_name", "") or ""
        last = getattr(user, "last_name", "") or ""
        full = f"{first} {last}".strip()
        if full:
            return full
        return getattr(user, "username", None) or getattr(user, "email", None) or str(getattr(user, "pk", ""))
    except Exception:
        return "—"


def _medio_label(raw: str) -> str:
    s = str(raw or "").strip().upper().replace(" ", "_")
    m = {
        "BNI": "BNI",
        "REFERIDO": "Referido",
        "WEB": "Web",
        "TIENDA_ONLINE": "Tienda Online",
        "FACEBOOK": "Facebook",
        "INSTAGRAM": "Instagram",
        "TIKTOK": "Tiktok",
        "GOOGLE_MAPS": "Google Maps",
        "YOUTUBE": "Youtube",
        "TIENDA_FISICA": "Tienda Fisica",
        "OTRO": "Otro",
    }
    return m.get(s, str(raw or "").strip() or "—")


def _status_label(raw: str) -> str:
    s = str(raw or "").strip().upper()
    if s == "AUTORIZADA":
        return "Autorizada"
    if s == "CANCELADA":
        return "Cancelada"
    if s == "PENDIENTE" or not s:
        return "Pendiente"
    return str(raw or "").strip() or "—"


def _build_cotizacion_excel_bytes(cotizacion: Cotizacion) -> bytes:
    """Genera un .xlsx con encabezado, líneas (con miniatura) y totales."""
    wb = Workbook()
    ws = wb.active
    ws.title = "Cotización"

    title_font = Font(bold=True, color="FFFFFF", size=13)
    title_fill = PatternFill("solid", fgColor="374151")
    header_font = Font(bold=True, color="FFFFFF", size=10)
    header_fill = PatternFill("solid", fgColor="4B5563")
    label_font = Font(bold=True, color="111827", size=10)
    wrap = Alignment(wrap_text=True, vertical="top")
    center_wrap = Alignment(wrap_text=True, horizontal="center", vertical="center")
    thin = Side(style="thin", color="D1D5DB")
    table_border = Border(left=thin, right=thin, top=thin, bottom=thin)
    zebra_fill = PatternFill("solid", fgColor="F9FAFB")
    label_fill = PatternFill("solid", fgColor="F3F4F6")
    value_fill = PatternFill("solid", fgColor="FFFFFF")

    cliente_obj = getattr(cotizacion, "cliente_id", None)
    if cliente_obj is not None and not isinstance(cliente_obj, django_models.Model):
        try:
            from apps.clientes.models import Cliente

            cliente_obj = Cliente.objects.filter(id=cliente_obj).first() or None
        except Exception:
            cliente_obj = None

    cliente_nombre = (getattr(cliente_obj, "nombre", None) or cotizacion.cliente or "").strip() or "—"
    folio = getattr(cotizacion, "idx", None) or cotizacion.id
    fecha = cotizacion.fecha.strftime("%d/%m/%Y") if cotizacion.fecha else "—"

    r = 1
    ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=10)
    title_cell = ws.cell(row=r, column=1, value="COTIZACIÓN")
    title_cell.font = title_font
    title_cell.fill = title_fill
    title_cell.alignment = Alignment(horizontal="center", vertical="center")
    title_cell.border = table_border
    ws.row_dimensions[r].height = 28
    r += 2

    meta_pairs = [
        ("Folio", folio),
        ("Fecha", fecha),
        ("Medio de contacto", _medio_label(getattr(cotizacion, "medio_contacto", "") or "")),
        ("Status", _status_label(getattr(cotizacion, "status", "") or "")),
        ("Creada por", _user_display(getattr(cotizacion, "creado_por", None))),
        ("Editada por", _user_display(getattr(cotizacion, "actualizado_por", None))),
        ("Cliente", cliente_nombre),
        ("Contacto", str(cotizacion.contacto or "").strip() or "—"),
    ]
    try:
        dcp = float(cotizacion.descuento_cliente_pct or 0)
    except Exception:
        dcp = 0.0
    meta_pairs.extend(
        [
            ("Descuento de Cliente (%)", f"{dcp:.2f}"),
            ("Moneda", "MXN"),
        ]
    )
    try:
        fc = cotizacion.fecha_creacion.strftime("%d/%m/%Y %H:%M") if getattr(cotizacion, "fecha_creacion", None) else "—"
    except Exception:
        fc = "—"
    try:
        fa = cotizacion.fecha_actualizacion.strftime("%d/%m/%Y %H:%M") if getattr(cotizacion, "fecha_actualizacion", None) else "—"
    except Exception:
        fa = "—"
    meta_pairs.extend(
        [
            ("Fecha creación", fc),
            ("Fecha última actualización", fa),
        ]
    )

    # Bloque horizontal: etiqueta/valor de izquierda a derecha (4 pares por fila)
    pair_cols = [(1, 2), (3, 4), (5, 6), (7, 8)]
    block_row = r
    for i, (label, value) in enumerate(meta_pairs):
        pair_idx = i % len(pair_cols)
        if pair_idx == 0 and i > 0:
            block_row += 1
        c_label, c_value = pair_cols[pair_idx]

        cl = ws.cell(row=block_row, column=c_label, value=label)
        cv = ws.cell(row=block_row, column=c_value, value=value)
        cl.font = label_font
        cl.fill = label_fill
        cl.alignment = Alignment(vertical="center")
        cl.border = table_border
        cv.fill = value_fill
        cv.alignment = wrap
        cv.border = table_border
    # Bordes suaves en columnas no usadas (9-10)
    for rr in range(r, block_row + 1):
        for cc in (9, 10):
            ws.cell(row=rr, column=cc).border = table_border
            ws.cell(row=rr, column=cc).fill = value_fill

    r = block_row + 2

    # Tabla de conceptos
    headers = [
        "Imagen",
        "Cantidad",
        "Unidad",
        "Descripción",
        "Detalle",
        "Precio unitario",
        "Descuento (%)",
        "Importe total",
    ]
    for col, h in enumerate(headers, start=1):
        cell = ws.cell(row=r, column=col, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center_wrap
        cell.border = table_border
    ws.row_dimensions[r].height = 24
    r += 1
    first_data_row = r

    items_rel = getattr(cotizacion, "items", None)
    if items_rel is None:
        items = []
    elif hasattr(items_rel, "all"):
        try:
            items = list(items_rel.all())
        except Exception:
            items = []
    elif isinstance(items_rel, (list, tuple)):
        items = list(items_rel)
    else:
        items = []

    net_subtotal_sin_iva = 0.0
    net_subtotal_con_iva = 0.0
    for it in items:
        try:
            cantidad = float(it.cantidad or 0)
            precio_lista = float(it.precio_lista or 0)
            descuento = float(it.descuento_pct or 0)
            precio_con_iva = precio_lista * (1 - (descuento / 100.0))
            pu = precio_con_iva / IVA_MX_DISPLAY
            importe = cantidad * pu
            net_subtotal_sin_iva += importe
            net_subtotal_con_iva += cantidad * precio_con_iva
        except Exception:
            cantidad = 0.0
            precio_lista = 0.0
            descuento = 0.0
            pu = 0.0
            importe = 0.0

        ws.row_dimensions[r].height = 64
        ws.cell(row=r, column=2, value=cantidad)
        ws.cell(row=r, column=3, value=str(getattr(it, "unidad", "") or ""))
        ws.cell(row=r, column=4, value=str(getattr(it, "producto_nombre", "") or "")).alignment = wrap
        ws.cell(row=r, column=5, value=str(getattr(it, "producto_descripcion", "") or "")).alignment = wrap
        ws.cell(row=r, column=6, value=round(pu, 2))
        ws.cell(row=r, column=7, value=round(descuento, 2))
        ws.cell(row=r, column=8, value=round(importe, 2))
        if (r - first_data_row) % 2 == 1:
            for cidx in range(1, 9):
                ws.cell(row=r, column=cidx).fill = zebra_fill
        for cidx in range(1, 9):
            ws.cell(row=r, column=cidx).border = table_border

        thumb = str(getattr(it, "thumbnail_url", "") or "").strip()
        if thumb:
            raw = _safe_http_image_bytes(thumb)
            if raw:
                try:
                    with PILImage.open(io.BytesIO(raw)) as pil_im:
                        out = io.BytesIO()
                        pil_im.save(out, format="PNG")
                        out.seek(0)
                    img = XLImage(out)
                    img.width = 54
                    img.height = 54
                    ws.add_image(img, f"A{r}")
                except Exception:
                    pass

        r += 1

    last_data_row = max(first_data_row, r - 1)

    # Totales (misma lógica de presentación que PDF)
    subtotal_lineas = net_subtotal_con_iva if net_subtotal_con_iva else float(cotizacion.subtotal or 0)
    if subtotal_lineas < 0:
        subtotal_lineas = 0.0

    descuento_cliente_pct = dcp
    if descuento_cliente_pct < 0:
        descuento_cliente_pct = 0.0
    if descuento_cliente_pct > 100:
        descuento_cliente_pct = 100.0

    descuento_cliente_monto = subtotal_lineas * (descuento_cliente_pct / 100.0)
    total_con_iva = max(0.0, subtotal_lineas - descuento_cliente_monto)
    base_sin_iva, iva_display = _subtotal_iva_display_split(total_con_iva)

    r += 1
    ws.cell(row=r, column=7, value="Importe conceptos (sin IVA)").font = Font(bold=True, color="111827")
    ws.cell(row=r, column=8, value=round(net_subtotal_sin_iva, 2))
    ws.cell(row=r, column=8).number_format = '$#,##0.00'
    r += 1
    if descuento_cliente_pct:
        ws.cell(row=r, column=7, value=f"Descuento cliente ({descuento_cliente_pct:.2f}%)").font = Font(bold=True, color="111827")
        ws.cell(row=r, column=8, value=round(descuento_cliente_monto, 2))
        ws.cell(row=r, column=8).number_format = '$#,##0.00'
        r += 1

    ws.cell(row=r, column=7, value="Subtotal").font = Font(bold=True, color="111827")
    ws.cell(row=r, column=8, value=round(base_sin_iva, 2))
    ws.cell(row=r, column=8).number_format = '$#,##0.00'
    r += 1
    ws.cell(row=r, column=7, value="IVA (16%)").font = Font(bold=True, color="111827")
    ws.cell(row=r, column=8, value=round(iva_display, 2))
    ws.cell(row=r, column=8).number_format = '$#,##0.00'
    r += 1
    ws.cell(row=r, column=7, value="Total").font = Font(bold=True, color="FFFFFF")
    ws.cell(row=r, column=7).fill = PatternFill("solid", fgColor="374151")
    ws.cell(row=r, column=8, value=round(total_con_iva, 2))
    ws.cell(row=r, column=8).number_format = '$#,##0.00'
    ws.cell(row=r, column=8).font = Font(bold=True, color="FFFFFF")
    ws.cell(row=r, column=8).fill = PatternFill("solid", fgColor="374151")
    for rr in range(r - (3 if descuento_cliente_pct else 2), r + 1):
        ws.cell(row=rr, column=7).border = table_border
        ws.cell(row=rr, column=8).border = table_border

    ws.column_dimensions["A"].width = 12
    ws.column_dimensions["B"].width = 18
    ws.column_dimensions["C"].width = 12
    ws.column_dimensions["D"].width = 30
    ws.column_dimensions["E"].width = 34
    ws.column_dimensions["F"].width = 18
    ws.column_dimensions["G"].width = 14
    ws.column_dimensions["H"].width = 16
    ws.column_dimensions["J"].width = 12

    for rr in range(first_data_row, last_data_row + 1):
        for cc in range(2, 9):
            ws.cell(row=rr, column=cc).alignment = wrap
        ws.cell(row=rr, column=2).alignment = center_wrap
        ws.cell(row=rr, column=3).alignment = center_wrap
        ws.cell(row=rr, column=6).number_format = '$#,##0.00'
        ws.cell(row=rr, column=7).number_format = '0.00'
        ws.cell(row=rr, column=8).number_format = '$#,##0.00'

    ws.freeze_panes = f"A{first_data_row}"

    bio = io.BytesIO()
    wb.save(bio)
    return bio.getvalue()


def _subtotal_iva_display_split(total_con_iva: float) -> tuple[float, float]:
    """Solo presentación en PDF: precios ya incluyen IVA; se muestra base + IVA 16 %."""
    t = max(0.0, float(total_con_iva or 0))
    base = round(t / IVA_MX_DISPLAY, 2)
    iva = round(t - base, 2)
    return base, iva


class CotizacionesPermission(ModulePermission):
    """Permission class for cotizaciones module."""
    module_key = 'cotizaciones'


class CotizacionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Cotizacion instances.
    
    Provides CRUD operations for quotations with permission-based access control.
    Supports both client-based and prospect-based quotations.
    """
    queryset = Cotizacion.objects.all()
    serializer_class = CotizacionSerializer
    permission_classes = [CotizacionesPermission]
    pagination_class = None

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        'idx',
        'cliente',
        'contacto',
        'creado_por__username',
        'creado_por__first_name',
        'creado_por__last_name',
    ]
    ordering_fields = ['idx', 'fecha', 'medio_contacto', 'status', 'fecha_creacion', 'total']
    ordering = ['-idx']

    def get_queryset(self):
        """
        Get optimized queryset with prefetched items and related objects.
        
        Returns:
            QuerySet: Cotizacion queryset ordered by idx descending
        """
        queryset = super().get_queryset()
        queryset = queryset.prefetch_related(
            Prefetch(
                'items',
                queryset=Cotizacion.items.rel.related_model.objects.order_by('orden')
            )
        )
        queryset = queryset.select_related('cliente_id', 'creado_por', 'actualizado_por')
        return queryset.order_by('-idx')

    def _generate_pdf_html(self, cotizacion: Cotizacion) -> str:
        """Genera el HTML para el PDF de la cotización (usado por el endpoint /pdf)."""

        def iter_items(obj):
            items = getattr(obj, 'items', None)
            if items is None:
                return []
            if hasattr(items, 'all'):
                try:
                    return list(items.all())
                except Exception:
                    return []
            if isinstance(items, (list, tuple)):
                return list(items)
            return []

        def esc(v):
            return (
                str(v if v is not None else '')
                .replace('&', '&amp;')
                .replace('<', '&lt;')
                .replace('>', '&gt;')
                .replace('"', '&quot;')
                .replace("'", '&#39;')
            )

        def normalize_text(v):
            s = str(v or '')
            if not s:
                return s
            s = s.replace('M®xico', 'México')
            s = s.replace('MÃ©xico', 'México')
            return s

        def render_terms_html(raw_terms: str) -> str:
            text = str(raw_terms or '').strip()
            if not text:
                return ""

            lines = [ln.strip() for ln in text.splitlines()]
            lines = [ln for ln in lines if ln]
            if not lines:
                return ""

            title = lines[0]
            rest = lines[1:]

            items = []
            for ln in rest:
                if ln.startswith('- '):
                    items.append(ln[2:].strip())
                else:
                    items.append(ln)

            items_html = "".join([f"<li>{esc(x)}</li>" for x in items if str(x).strip()])
            if items_html:
                body_html = f"<ul>{items_html}</ul>"
            else:
                body_html = f"<div class='terms-text'>{esc(text)}</div>"

            return f"<div class='terms-title'>{esc(title)}</div>{body_html}"

        # Embed logo as data URI (same pattern used in ordenes/views.py)
        logo_data_uri = ""
        try:
            repo_root = Path(__file__).resolve().parents[3]
            logo_path = repo_root / "frontend" / "public" / "images" / "logo" / "intrax-logo.png"
            if logo_path.exists():
                b64 = base64.b64encode(logo_path.read_bytes()).decode("ascii")
                logo_data_uri = f"data:image/png;base64,{b64}"
        except Exception:
            logo_data_uri = ""

        santander_data_uri = ""
        try:
            repo_root = Path(__file__).resolve().parents[3]
            santander_path = repo_root / "frontend" / "public" / "images" / "logo" / "santander.png"
            if santander_path.exists():
                b64 = base64.b64encode(santander_path.read_bytes()).decode("ascii")
                santander_data_uri = f"data:image/png;base64,{b64}"
        except Exception:
            santander_data_uri = ""

        cliente_obj = getattr(cotizacion, 'cliente_id', None)
        if cliente_obj and not hasattr(cliente_obj, 'nombre'):
            try:
                from apps.clientes.models import Cliente

                cliente_obj = Cliente.objects.filter(id=cliente_obj).first() or None
            except Exception:
                pass
        cliente_nombre = (getattr(cliente_obj, 'nombre', None) or cotizacion.cliente or '').strip() or '-'
        cliente_dir = (getattr(cliente_obj, 'direccion', None) or '').strip() or '-'
        cliente_tel = (getattr(cliente_obj, 'telefono', None) or '').strip() or '-'
        cliente_mail = (getattr(cliente_obj, 'correo', None) or '').strip() or ''
        cliente_rfc = (getattr(cliente_obj, 'rfc', None) or '').strip() or ''
        cliente_ciudad = normalize_text((getattr(cliente_obj, 'ciudad', None) or '').strip() or '')
        cliente_estado = normalize_text((getattr(cliente_obj, 'estado', None) or '').strip() or '')

        ciudad_parts = [p for p in [cliente_ciudad, cliente_estado] if p]
        cliente_ubicacion = ', '.join(ciudad_parts).strip()

        deposit_razon_social = 'INTERPRO MANZANILLO'

        folio = cotizacion.idx or cotizacion.id
        fecha = cotizacion.fecha.strftime('%d/%m/%Y') if cotizacion.fecha else '-'
        moneda = 'MXN'

        rows = []
        net_subtotal_sin_iva = 0.0
        net_subtotal_con_iva = 0.0
        for it in iter_items(cotizacion):
            try:
                cantidad = float(it.cantidad or 0)
                precio_lista = float(it.precio_lista or 0)
                descuento = float(it.descuento_pct or 0)
                # precio_lista (Syscom) ya incluye IVA; descuento de línea se aplica sobre ese monto.
                precio_con_iva = precio_lista * (1 - (descuento / 100.0))
                # P. UNIT. e importe de línea en PDF: sin IVA; el IVA va en el bloque de totales.
                pu = precio_con_iva / IVA_MX_DISPLAY
                importe = cantidad * pu
                net_subtotal_sin_iva += importe
                net_subtotal_con_iva += cantidad * precio_con_iva
            except Exception:
                pu = 0
                importe = 0
                descuento = 0
                cantidad = 0

            try:
                cantidad_str = str(int(cantidad)) if float(cantidad).is_integer() else str(cantidad)
            except Exception:
                cantidad_str = str(cantidad)

            rows.append(
                f"""
                <tr>
                  <td class='imgcell'>
                    {f"<img class='img' src='{esc(it.thumbnail_url)}' />" if getattr(it, 'thumbnail_url', '') else "<div class='img ph'></div>"}
                  </td>
                  <td class='center'>{esc(cantidad_str)}</td>
                  <td>{esc(getattr(it, 'unidad', '') or '-')}</td>
                  <td>
                    <div class='name'>{esc(getattr(it, 'producto_nombre', '') or '-') }</div>
                    <div class='desc'>{esc(getattr(it, 'producto_descripcion', '') or '')}</div>
                  </td>
                  <td class='right'>$ {pu:,.2f}</td>
                  <td class='right'>{descuento:,.2f}%</td>
                  <td class='right'>$ {importe:,.2f}</td>
                </tr>
                """
            )

        rows_html = ''.join(rows) or "<tr><td colspan='7' class='muted center' style='padding: 14px;'>Sin conceptos</td></tr>"

        subtotal = float(cotizacion.subtotal or 0)
        total = float(cotizacion.total or 0)

        descuento_cliente_pct = 0.0
        try:
            descuento_cliente_pct = float(getattr(cotizacion, 'descuento_cliente_pct', 0) or 0)
        except Exception:
            descuento_cliente_pct = 0.0

        # Descuento cliente sobre suma con IVA (misma regla que serializers).
        subtotal_lineas = net_subtotal_con_iva if net_subtotal_con_iva else subtotal
        if subtotal_lineas < 0:
            subtotal_lineas = 0.0

        if descuento_cliente_pct < 0:
            descuento_cliente_pct = 0.0
        if descuento_cliente_pct > 100:
            descuento_cliente_pct = 100.0

        descuento_cliente_monto = subtotal_lineas * (descuento_cliente_pct / 100.0)
        subtotal_con_descuento_cliente = max(0.0, subtotal_lineas - descuento_cliente_monto)
        total = subtotal_con_descuento_cliente
        base_sin_iva, iva_display = _subtotal_iva_display_split(total)
        discount_rows = ""
        if descuento_cliente_pct:
            discount_rows = f"""
    <div class='row'><span>Importe conceptos</span><strong>$ {net_subtotal_sin_iva:,.2f}</strong></div>
    <div class='row'><span>Descuento ({descuento_cliente_pct:,.2f}%)</span><strong>-$ {descuento_cliente_monto:,.2f}</strong></div>
"""

        html = f"""<!doctype html>
<html lang='es'>
<head>
  <meta charset='utf-8' />
  <meta name='viewport' content='width=device-width, initial-scale=1' />
  <title>Cotización</title>
  <style>
    @page {{ size: A4; margin: 12mm; }}
    * {{ box-sizing: border-box; }}
    body {{ font-family: Arial, Helvetica, sans-serif; color: #111827; margin: 0; }}
    .top {{ display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; }}
    .brand {{ display: flex; gap: 14px; align-items: flex-start; }}
    .logo {{ width: 240px; height: 130px; display: flex; align-items: center; }}
    .logo img {{ max-width: 240px; max-height: 130px; object-fit: contain; }}
    .company {{ font-size: 11px; line-height: 1.35; color: #374151; }}
    .company .title {{ font-size: 13px; font-weight: 600; color: #111827; }}
    .box {{ border: 1px solid #e5e7eb; width: 220px; }}
    .box .r {{ padding: 8px 10px; border-top: 1px solid #e5e7eb; text-align: right; }}
    .box .r:first-child {{ border-top: none; background: #f3f4f6; }}
    .box .lbl {{ font-size: 13px; font-weight: 600; }}
    .box .val {{ font-size: 13px; font-weight: 500; }}
    .box .folio {{ font-size: 16px; font-weight: 800; color: #dc2626; }}
    .hr {{ height: 1px; background: #e5e7eb; margin: 14px 0; }}
    .grid2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }}
    .k {{ font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #9ca3af; font-weight: 600; }}
    .kv {{ margin-top: 6px; display: grid; grid-template-columns: 78px 1fr; gap: 4px 10px; font-size: 11px; }}
    .kv .l {{ color: #6b7280; }}
    .kv .v {{ color: #111827; }}
    .kv .v b {{ font-weight: 500; }}
    .kv .v.muted {{ color: #6b7280; }}
    .note {{ font-size: 11px; color: #374151; }}
    .auth {{ margin: 10px 0 8px; font-size: 11px; font-weight: 600; color: #111827; padding: 8px 10px; background: #f9fafb; border: 1px solid #e5e7eb; border-left: 4px solid #dc2626; }}
    table {{ width: 100%; border-collapse: collapse; }}
    th, td {{ border-top: 1px solid #e5e7eb; padding: 8px 6px; vertical-align: top; }}
    th {{ border-top: none; background: #f3f4f6; font-size: 11px; text-transform: uppercase; letter-spacing: .02em; }}
    td {{ font-size: 11px; }}
    .center {{ text-align: center; }}
    .right {{ text-align: right; }}
    .img {{ width: 54px; height: 54px; border-radius: 6px; border: 1px solid #e5e7eb; object-fit: cover; }}
    .img.ph {{ background: #f9fafb; border-style: dashed; }}
    .name {{ font-weight: 600; color: #111827; }}
    .desc {{ color: #4b5563; }}
    .totals {{ margin-top: 14px; width: 100%; max-width: 340px; margin-left: auto; margin-right: 16px; border-top: 1px solid #e5e7eb; padding-top: 10px; }}
    .totals .row {{ display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }}
    .totals .row strong {{ font-weight: 600; }}
    .terms {{ margin-top: 14px; border-top: 1px solid #e5e7eb; padding-top: 10px; font-size: 9px; line-height: 1.35; color: #374151; }}
    .terms .terms-title {{ font-size: 10px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: #111827; margin-bottom: 6px; }}
    .terms ul {{ margin: 0; padding-left: 16px; }}
    .terms li {{ margin: 0 0 4px 0; }}
    .terms .terms-text {{ white-space: pre-line; }}
    .terms-spacer {{ height: 96px; }}
    .pagebreak {{ page-break-before: always; }}
    .deposit {{ margin-top: 44px; }}
    .deposit-head {{ display: grid; grid-template-columns: 1fr; align-items: center; }}
    .deposit .title {{ font-size: 18px; font-weight: 600; text-align: center; letter-spacing: .06em; color: #111827; }}
    .deposit .sub {{ margin-top: 6px; text-align: center; font-size: 11px; color: #6b7280; }}

    .deposit-wrap {{ margin-top: 14px; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }}
    .deposit-layout {{ display: grid; grid-template-columns: 0.95fr 1.55fr; }}
    .deposit-left {{ padding: 14px; border-right: 1px solid #e5e7eb; }}
    .deposit-right {{ padding: 14px; }}

    .deposit-logo {{ display: flex; justify-content: center; align-items: center; min-height: 88px; }}
    .deposit-logo img {{ display: block; margin: 0 auto; max-height: 86px; object-fit: contain; }}

    .boxx {{ border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; background: #fff; }}
    .boxx .hd {{ background: #f3f4f6; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: .10em; font-weight: 600; color: #374151; }}
    .boxx .bd {{ padding: 12px; font-size: 12px; }}

    .rs-name {{ margin-top: 6px; font-size: 14px; font-weight: 600; color: #111827; }}

    .bank-top {{ display: grid; grid-template-columns: 130px 1fr; gap: 10px; align-items: center; }}
    .bank-logo {{ display: flex; justify-content: center; align-items: center; max-width: 130px; overflow: hidden; }}
    .bank-logo img {{ display: block; width: 120px; height: auto; max-height: 42px; object-fit: contain; }}
    .bank-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }}
    .kvbox {{ border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; }}
    .kvbox .k {{ background: #f3f4f6; padding: 8px 10px; font-size: 11px; font-weight: 500; color: #374151; text-transform: uppercase; letter-spacing: .08em; text-align: center; }}
    .kvbox .v {{ padding: 12px 10px; font-size: 16px; font-weight: 500; color: #111827; text-align: center; }}
    .kvbox .v.num {{ font-family: "Courier New", Courier, monospace; font-weight: 400; letter-spacing: .02em; font-size: 14px; line-height: 1.25; }}
    .kvbox .v.small {{ font-size: 14px; }}
    .kvbox .v.nowrap {{ white-space: nowrap; }}
    .kvbox .v.wrap {{ white-space: normal; word-break: break-word; }}

    .bottom-grid {{ margin-top: 12px; display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 10px; }}
    .concepto {{ padding: 10px; font-size: 13px; font-weight: 600; color: #111827; text-align: center; }}
    .totalv {{ padding: 10px; font-size: 13px; font-weight: 600; color: #111827; text-align: center; }}
  </style>
</head>
<body>
  <div class='top'>
    <div class='brand'>
      <div class='logo'>{f"<img src='{logo_data_uri}' />" if logo_data_uri else ''}</div>
      <div class='company'>
        <div class='title'>GRUPO INTRAX SEGURIDAD Y RASTREO</div>
        <div><b>RFC:</b> IMA200110CI4</div>
        <div>Av. Elias Zamora Verduzco No. 149 Barrio 2, Valle de las garzas. #149</div>
        <div>Col: Valle de las Garzas C.P.: 20219 Barrio 2, Manzanillo, Colima, México</div>
        <div><b>Tel:</b> 3141130469 &nbsp;|&nbsp; <b>Cel:</b> 3141245830 &nbsp;|&nbsp; <b>Mail:</b> hola@intrax.mx</div>
      </div>
    </div>

    <div class='box'>
      <div class='r'>
        <div class='lbl'>Cotización</div>
        <div class='folio'>{esc(folio)}</div>
      </div>
      <div class='r'>
        <div class='lbl'>Fecha</div>
        <div class='val'>{esc(fecha)}</div>
      </div>
      <div class='r'>
        <div class='lbl'>Moneda: {esc(moneda)}</div>
      </div>
    </div>
  </div>

  <div class='hr'></div>

  <div class='grid2'>
    <div>
      <div class='k'>Receptor</div>
      <div class='kv'>
        <div class='l'>Nombre:</div><div class='v'><b>{esc(cliente_nombre)}</b></div>
        <div class='l'>Domicilio:</div><div class='v'>{esc(cliente_dir)}</div>
        <div class='l'>Contacto:</div><div class='v'>{esc(cotizacion.contacto or '-')}</div>
        {f"<div class='l'>RFC:</div><div class='v'>{esc(cliente_rfc)}</div>" if cliente_rfc else ""}
        {f"<div class='l'>Mail:</div><div class='v'>{esc(cliente_mail)}</div>" if cliente_mail else ""}
        {f"<div class='l'>Ciudad:</div><div class='v'>{esc(cliente_ubicacion)}</div>" if cliente_ubicacion else ""}
      </div>
    </div>
    <div style='text-align: right;'>
      <div class='k'>&nbsp;</div>
      <div class='kv' style='grid-template-columns: 60px 1fr; justify-content: end;'>
        <div class='l'>Cel:</div><div class='v'>{esc(cliente_tel)}</div>
      </div>
    </div>
  </div>

  <div class='hr'></div>

  <div class='auth'>NO. AUTORIZACIÓN ANTE SEGURIDAD PUBLICA DEL ESTADO: SSP/DSPV/270/20V</div>

  <div class='note'>{esc(cotizacion.texto_arriba_precios or '')}</div>

  <div style='margin-top: 10px; border: 1px solid #e5e7eb;'>
    <table>
      <thead>
        <tr>
          <th style='width:84px; text-align:left;'>IMG</th>
          <th style='width:56px; text-align:center;'>CANT</th>
          <th style='width:70px; text-align:left;'>UNIDAD</th>
          <th style='text-align:left;'>DESCRIPCIÓN</th>
          <th style='width:90px; text-align:right;'>P. UNIT.</th>
          <th style='width:90px; text-align:right;'>DESC</th>
          <th style='width:100px; text-align:right;'>IMPORTE</th>
        </tr>
      </thead>
      <tbody>
        {rows_html}
      </tbody>
    </table>
  </div>

    <div class='totals'>
    {discount_rows}
    <div class='row'><span>Subtotal</span><strong>$ {base_sin_iva:,.2f}</strong></div>
    <div class='row'><span>IVA (16%)</span><strong>$ {iva_display:,.2f}</strong></div>
    <div class='row'><span>Total</span><strong>$ {total:,.2f}</strong></div>
  </div>

  <div class='pagebreak'></div>

  <div class='terms'>{render_terms_html(cotizacion.terminos or '')}</div>

  <div class='terms-spacer'></div>
  <div class='deposit'>
    <div class='deposit-head'>
      <div class='title'>FICHA DE DEPÓSITO</div>
    </div>
    <div class='sub'>Datos bancarios para realizar el pago</div>

    <div class='deposit-wrap'>
      <div class='deposit-layout'>
        <div class='deposit-left'>
          <div class='deposit-logo'>
            {f"<img src='{logo_data_uri}' alt='Intrax' />" if logo_data_uri else ""}
          </div>

          <div class='boxx'>
            <div class='hd'>Razón Social</div>
            <div class='bd'>
              <div class='rs-name'>{esc(deposit_razon_social)}</div>
              <div style='margin-top: 10px; font-size: 11px; color: #6b7280;'>
                Concepto: <span style='color:#111827; font-weight: 500;'>Cotizaciones No.{esc(folio)}</span>
              </div>
            </div>
          </div>
        </div>

        <div class='deposit-right'>
          <div class='boxx'>
            <div class='hd'>Datos bancarios</div>
            <div class='bd'>
              <div class='bank-top'>
                <div class='bank-logo'>
                  {f"<img src='{santander_data_uri}' alt='Santander' />" if santander_data_uri else ""}
                </div>

                <div class='bank-grid'>
                  <div class='kvbox'>
                    <div class='k'>Cuenta</div>
                    <div class='v num nowrap'>65508072048</div>
                  </div>
                  <div class='kvbox'>
                    <div class='k'>Sucursal</div>
                    <div class='v'>INTERPRO</div>
                  </div>
                  <div class='kvbox' style='grid-column: 1 / -1;'>
                    <div class='k'>CLABE</div>
                    <div class='v num small nowrap'>014095655080720484</div>
                  </div>
                </div>
              </div>

              <div class='bottom-grid'>
                <div class='kvbox'>
                  <div class='k'>Concepto</div>
                  <div class='concepto'>Cotizaciones No.{esc(folio)}</div>
                </div>
                <div class='kvbox'>
                  <div class='k'>Total</div>
                  <div class='totalv'>$ {total:,.2f} {esc(moneda)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>"""

        return html

    @action(detail=True, methods=['get'], url_path='pdf')
    def pdf(self, request, pk=None):
        cotizacion = self.get_object()

        html = self._generate_pdf_html(cotizacion)
        if not html:
            return Response({"detail": "No se pudo generar el HTML del PDF."}, status=500)

        api_key = os.environ.get('HTMLEDOCS_API_KEY')
        if not api_key:
            return HttpResponse(html, content_type="text/html; charset=utf-8")

        payload = {
            "html": html,
            "format": "pdf",
            "size": "A4",
            "orientation": "portrait",
        }

        req = Request(
            url="https://htmldocs.com/api/generate",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with urlopen(req, timeout=60) as resp:
                pdf_bytes = resp.read()
        except HTTPError as e:
            body = ""
            try:
                body = e.read().decode("utf-8", errors="ignore")
            except Exception:
                pass
            return Response({"detail": "Error generando PDF en htmldocs", "status": e.code, "body": body}, status=502)
        except URLError as e:
            return Response({"detail": "No se pudo conectar a htmldocs", "error": str(e)}, status=502)
        except Exception as e:
            return Response({"detail": "Error inesperado generando PDF", "error": str(e)}, status=500)

        idx = getattr(cotizacion, "idx", None) or cotizacion.id
        filename = f"Cotizacion_{idx}.pdf"
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response

    @action(detail=True, methods=['get'], url_path='excel')
    def excel(self, request, pk=None):
        cotizacion = self.get_object()
        try:
            xlsx_bytes = _build_cotizacion_excel_bytes(cotizacion)
        except Exception as e:
            return Response({"detail": "No se pudo generar el Excel.", "error": str(e)}, status=500)

        idx = getattr(cotizacion, "idx", None) or cotizacion.id
        filename = f"Cotizacion_{idx}.xlsx"
        response = HttpResponse(
            xlsx_bytes,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    @action(detail=False, methods=['post'], url_path='pdf-preview')
    def pdf_preview(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        items_data = data.pop('items', [])

        items = []
        for it in items_data or []:
            item = SimpleNamespace(
                cantidad=it.get('cantidad'),
                precio_lista=it.get('precio_lista'),
                descuento_pct=it.get('descuento_pct'),
                unidad=it.get('unidad'),
                producto_nombre=it.get('producto_nombre'),
                producto_descripcion=it.get('producto_descripcion'),
                thumbnail_url=it.get('thumbnail_url'),
            )
            items.append(item)

        preview = SimpleNamespace(
            id=0,
            idx='PREVIEW',
            cliente_id=data.get('cliente_id'),
            cliente=data.get('cliente', ''),
            contacto=data.get('contacto', ''),
            fecha=data.get('fecha'),
            vencimiento=data.get('vencimiento'),
            subtotal=data.get('subtotal', 0),
            descuento_cliente_pct=data.get('descuento_cliente_pct', 0),
            iva_pct=data.get('iva_pct', 0),
            iva=data.get('iva', 0),
            total=data.get('total', 0),
            texto_arriba_precios=data.get('texto_arriba_precios', ''),
            terminos=data.get('terminos', ''),
            items=items,
        )

        html = self._generate_pdf_html(preview)
        if not html:
            return Response({"detail": "No se pudo generar el HTML del PDF."}, status=500)

        api_key = os.environ.get('HTMLEDOCS_API_KEY')
        if not api_key:
            return HttpResponse(html, content_type="text/html; charset=utf-8")

        payload = {
            "html": html,
            "format": "pdf",
            "size": "A4",
            "orientation": "portrait",
        }

        req = Request(
            url="https://htmldocs.com/api/generate",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with urlopen(req, timeout=60) as resp:
                pdf_bytes = resp.read()
        except HTTPError as e:
            body = ""
            try:
                body = e.read().decode("utf-8", errors="ignore")
            except Exception:
                pass
            return Response({"detail": "Error generando PDF en htmldocs", "status": e.code, "body": body}, status=502)
        except URLError as e:
            return Response({"detail": "No se pudo conectar a htmldocs", "error": str(e)}, status=502)
        except Exception as e:
            return Response({"detail": "Error inesperado generando PDF", "error": str(e)}, status=500)

        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = 'inline; filename="Cotizacion_Preview.pdf"'
        return response
