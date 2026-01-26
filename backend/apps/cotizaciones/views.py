"""ViewSets for cotizaciones app."""
import base64
import json
import os
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.db.models import Prefetch
from django.http import HttpResponse
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.users.permissions import ModulePermission

from .models import Cotizacion
from .serializers import CotizacionSerializer


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
    ordering_fields = ['idx', 'fecha', 'vencimiento', 'fecha_creacion', 'total']
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
        queryset = queryset.select_related('cliente_id', 'creado_por')
        return queryset.order_by('-idx')

    def _generate_pdf_html(self, cotizacion: Cotizacion) -> str:
        """Genera el HTML para el PDF de la cotización (usado por el endpoint /pdf)."""

        def esc(v):
            return (
                str(v if v is not None else '')
                .replace('&', '&amp;')
                .replace('<', '&lt;')
                .replace('>', '&gt;')
                .replace('"', '&quot;')
                .replace("'", '&#39;')
            )

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

        cliente_obj = getattr(cotizacion, 'cliente_id', None)
        cliente_nombre = (getattr(cliente_obj, 'nombre', None) or cotizacion.cliente or '').strip() or '-'
        cliente_dir = (getattr(cliente_obj, 'direccion', None) or '').strip() or '-'
        cliente_tel = (getattr(cliente_obj, 'telefono', None) or '').strip() or '-'

        folio = cotizacion.idx or cotizacion.id
        fecha = cotizacion.fecha.strftime('%d/%m/%Y') if cotizacion.fecha else '-'
        moneda = 'MXN'

        rows = []
        for it in list(getattr(cotizacion, 'items', []).all()):
            try:
                cantidad = float(it.cantidad or 0)
                precio_lista = float(it.precio_lista or 0)
                descuento = float(it.descuento_pct or 0)
                pu = precio_lista * (1 - (descuento / 100.0))
                importe = cantidad * pu
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
        iva = float(cotizacion.iva or 0)
        total = float(cotizacion.total or 0)
        iva_pct = float(cotizacion.iva_pct or 0)

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
    .logo {{ width: 150px; height: 90px; display: flex; align-items: center; }}
    .logo img {{ max-width: 150px; max-height: 90px; object-fit: contain; }}
    .company {{ font-size: 11px; line-height: 1.35; color: #374151; }}
    .company .title {{ font-size: 13px; font-weight: 800; color: #111827; }}
    .box {{ border: 1px solid #e5e7eb; width: 220px; }}
    .box .r {{ padding: 8px 10px; border-top: 1px solid #e5e7eb; text-align: right; }}
    .box .r:first-child {{ border-top: none; background: #f3f4f6; }}
    .box .lbl {{ font-size: 13px; font-weight: 800; }}
    .box .val {{ font-size: 13px; font-weight: 700; }}
    .box .folio {{ font-size: 16px; font-weight: 950; color: #dc2626; }}
    .hr {{ height: 1px; background: #e5e7eb; margin: 14px 0; }}
    .grid2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }}
    .k {{ font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #9ca3af; font-weight: 800; }}
    .kv {{ margin-top: 6px; display: grid; grid-template-columns: 78px 1fr; gap: 4px 10px; font-size: 11px; }}
    .kv .l {{ color: #6b7280; }}
    .kv .v {{ color: #111827; }}
    .kv .v b {{ font-weight: 800; }}
    .note {{ font-size: 11px; color: #374151; }}
    table {{ width: 100%; border-collapse: collapse; }}
    th, td {{ border-top: 1px solid #e5e7eb; padding: 8px 6px; vertical-align: top; }}
    th {{ border-top: none; background: #f3f4f6; font-size: 11px; text-transform: uppercase; letter-spacing: .02em; }}
    td {{ font-size: 11px; }}
    .center {{ text-align: center; }}
    .right {{ text-align: right; }}
    .img {{ width: 54px; height: 54px; border-radius: 6px; border: 1px solid #e5e7eb; object-fit: cover; }}
    .img.ph {{ background: #f9fafb; border-style: dashed; }}
    .name {{ font-weight: 800; color: #111827; }}
    .desc {{ color: #4b5563; }}
    .totals {{ margin-top: 14px; width: 100%; max-width: 340px; margin-left: auto; border-top: 1px solid #e5e7eb; padding-top: 10px; }}
    .totals .row {{ display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }}
    .totals .row strong {{ font-weight: 950; }}
    .terms {{ margin-top: 14px; border-top: 1px solid #e5e7eb; padding-top: 10px; font-size: 11px; color: #374151; white-space: pre-line; }}
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
      </div>
    </div>
    <div style='text-align: right;'>
      <div class='k'>&nbsp;</div>
      <div class='kv' style='grid-template-columns: 60px 1fr; justify-content: end;'>
        <div class='l'>Tel:</div><div class='v'>{esc(cliente_tel)}</div>
        <div class='l'>Vence:</div><div class='v'>{esc(cotizacion.vencimiento.strftime('%d/%m/%Y') if cotizacion.vencimiento else '-')}</div>
      </div>
    </div>
  </div>

  <div class='hr'></div>

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
    <div class='row'><span>Subtotal</span><strong>$ {subtotal:,.2f}</strong></div>
    <div class='row'><span>IVA ({iva_pct:,.2f}%)</span><strong>$ {iva:,.2f}</strong></div>
    <div class='row'><span>Total</span><strong>$ {total:,.2f}</strong></div>
  </div>

  <div class='terms'>{esc(cotizacion.terminos or '')}</div>
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

        filename = f"Cotizacion_{cotizacion.id}.pdf"
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response
