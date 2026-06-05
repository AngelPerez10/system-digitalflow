"""HTML template for orden de servicio PDF."""
import logging

from apps.common.pdf_html import esc, load_public_image_data_uri
from apps.common.pdf_images import img_url_to_data_uri
from apps.ordenes.pdf_limits import orden_max_fotos

logger = logging.getLogger(__name__)


def generate_orden_pdf_html(orden) -> str:
    """Genera el HTML para el PDF de la orden."""
    tecnico = orden.tecnico_asignado
    tecnico_nombre = None
    if tecnico:
        tecnico_nombre = (f"{tecnico.first_name} {tecnico.last_name}".strip() or getattr(tecnico, 'email', None) or getattr(tecnico, 'username', None))
    if not tecnico_nombre:
        tecnico_nombre = getattr(orden, 'nombre_encargado', None) or None

    servicios = orden.servicios_realizados if isinstance(orden.servicios_realizados, list) else []
    fotos = orden.fotos_urls if isinstance(orden.fotos_urls, list) else []
    fotos = fotos[:orden_max_fotos(fotos_extra_max=orden.fotos_extra_max)]
    fotos_limpias = [url for url in fotos if url]
    fotos_embedded = [img_url_to_data_uri(url) for url in fotos_limpias]
    fotos_embedded = [src for src in fotos_embedded if src]
    has_photos = bool(fotos_embedded)

    firma_tecnico = img_url_to_data_uri(getattr(orden, 'firma_encargado_url', None) or '')
    firma_cliente = img_url_to_data_uri(getattr(orden, 'firma_cliente_url', None) or '')

    status_text = "RESUELTO" if orden.status == "resuelto" else "PENDIENTE"
    status_bg = "#dcfce7" if orden.status == "resuelto" else "#fef3c7"
    status_border = "#86efac" if orden.status == "resuelto" else "#fcd34d"
    status_fg = "#166534" if orden.status == "resuelto" else "#92400e"

    folio_display = getattr(orden, 'folio', None) or getattr(orden, 'idx', None) or '-'

    servicios_pills_html = "".join(
        f"<span class='service-pill'>{esc(s)}</span>" for s in servicios if s
    ) or "<span class='muted'>-</span>"

    fotos_grid_html = "".join(
        f"<div class='photo-box'><img src='{esc(src)}' /></div>" for src in fotos_embedded
    ) or "<div class='muted'>No hay fotos adjuntas.</div>"

    logo_data_uri = load_public_image_data_uri("images/logo/intrax-logo.png")

    evidencias_html = ""
    if has_photos:
        evidencias_html = f"""

    <div class='pagebreak'></div>
    <div class='page'>
      <div class='content'>
    <div class='section'>
      <div class='section-title'>Evidencias</div>
      <div class='box'>
        <div class='photos'>
          {fotos_grid_html}
        </div>
      </div>
    </div>
      </div>
    </div>
"""

    html = f"""<!doctype html>
<html>
  <head>
    <meta charset='utf-8' />
    <meta name='viewport' content='width=device-width, initial-scale=1' />
    <style>
      :root {{
    --blue-900: #1e3a8a;
    --blue-700: #1d4ed8;
    --blue-600: #2563eb;
    --blue-100: #dbeafe;
    --blue-50: #eff6ff;
    --text: #0f172a;
    --muted: #64748b;
    --border: #dbeafe;
    --bg: #ffffff;
    --green: #16a34a;
    --amber: #f59e0b;
      }}
      @page {{
    size: A4;
    margin-left: 12mm;
    margin-right: 16mm;
    margin-top: 12mm;
    margin-bottom: 14mm;
      }}
      * {{ box-sizing: border-box; }}
      body {{ font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; font-size: 14px; color: var(--text); background: var(--bg); margin: 0; }}
      .page {{ width: 210mm; min-height: 297mm; padding: 0; margin: 0 auto; }}
      .content {{ padding: 0; }}
      .topbar {{ display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 14px; }}
      .brandwrap {{ display: flex; align-items: flex-start; gap: 12px; min-width: 0; }}
      .logo {{ width: 96px; height: 96px; border-radius: 0; background: transparent; border: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; flex: 0 0 auto; }}
      .logo img {{ width: 100%; height: 100%; object-fit: contain; }}
      .brand {{ min-width: 0; }}
      .brand .name {{ font-size: 15px; font-weight: 700; color: var(--blue-900); letter-spacing: -0.2px; }}
      .brand .meta {{ margin-top: 6px; font-size: 11px; line-height: 1.25; color: var(--muted); max-width: 330px; }}
      .brand .meta b {{ color: var(--text); font-weight: 600; }}
      .status {{ text-align: right; max-width: 45%; margin-left: auto; }}
      .status .pill {{ display: inline-block; font-size: 12px; font-weight: 600; letter-spacing: .7px; padding: 6px 12px; border-radius: 999px; border: 1px solid var(--border); }}
      .status .dates {{ margin-top: 8px; font-size: 12px; color: var(--muted); line-height: 1.35; }}
      .status .folio {{ font-size: 17px; color: var(--muted); margin-bottom: 6px; font-weight: 600; }}
      .status .folio .num {{ color: #dc2626; font-weight: 700; }}
      .hero {{ border: 1px solid var(--border); border-left: 6px solid var(--blue-700); border-radius: 14px; padding: 14px 14px 12px 14px; background: #eff6ff; margin-bottom: 14px; }}
      .hero .title {{ font-size: 19px; font-weight: 700; color: var(--blue-900); letter-spacing: -0.3px; }}
      .hero .sub {{ margin-top: 5px; font-size: 11px; color: var(--muted); }}
      .grid2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }}
      .card {{ border: 1px solid var(--border); border-radius: 14px; padding: 12px; background: #fff; }}
      .card h3 {{ margin: 0 0 10px 0; font-size: 13px; font-weight: 700; color: var(--blue-900); letter-spacing: .3px; text-transform: uppercase; }}
      .row {{ display: flex; gap: 12px; }}
      .col {{ flex: 1; min-width: 0; }}
      .label {{ font-size: 11px; font-weight: 600; color: var(--muted); letter-spacing: .5px; text-transform: uppercase; }}
      .value {{ margin-top: 4px; font-size: 13px; color: var(--text); }}
      .pre {{ white-space: pre-wrap; overflow-wrap: anywhere; }}
      .muted {{ color: var(--muted); font-size: 13px; }}
      .services {{ margin-top: 6px; }}
      .service-pill {{ display: inline-block; font-size: 11px; font-weight: 600; color: #fff; padding: 4px 10px; border-radius: 999px; background: #2563eb; margin: 4px 6px 0 0; }}
      .section {{ margin-top: 12px; }}
      .section-title {{ margin: 0 0 10px 0; font-size: 13px; font-weight: 700; color: var(--blue-900); letter-spacing: .3px; text-transform: uppercase; }}
      .box {{ border: 1px solid var(--border); border-radius: 14px; padding: 12px; background: #fff; }}
      .photos {{ display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }}
      .photo-box {{ border: 1px solid var(--border); border-radius: 14px; overflow: hidden; background: var(--blue-50); height: 260px; display: flex; align-items: center; justify-content: center; }}
      .photo-box img {{ width: 100%; height: 100%; object-fit: cover; }}
      .pagebreak {{ page-break-before: always; }}
      .sigs {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }}
      .sigbox {{ border: 1px solid var(--border); border-radius: 14px; padding: 12px; background: #fff; }}
      .sigimgwrap {{ height: 105px; border-radius: 12px; border: 1px dashed var(--border); display: flex; align-items: center; justify-content: center; overflow: hidden; background: var(--blue-50); margin-top: 8px; }}
      .sigimgwrap img {{ width: 100%; height: 100%; object-fit: contain; }}
      .sigline {{ margin-top: 10px; border-top: 1px solid var(--border); padding-top: 8px; font-size: 12px; color: var(--muted); }}
      .sigline b {{ font-weight: 700; color: var(--text); }}
    </style>
  </head>
  <body>
    <div class='page'>
      <div class='content'>
      <div class='topbar'>
    <div class='brandwrap'>
      <div class='logo'>
        {f"<img src='{logo_data_uri}' />" if logo_data_uri else ""}
      </div>
      <div class='brand'>
        <div class='name'>GRUPO INTRAX SEGURIDAD Y RASTREO</div>
        <div class='meta'>
          <b>RFC:</b> IMA200110CI4<br/>
          Av. Elias Zamora Verduzco No. 149 Barrio 2, Valle de las garzas. #149<br/>
          Col: Valle de las Garzas C.P.: 20219 Barrio 2, Manzanillo, Colima, México<br/>
          <b>Tel:</b> 3141130469 &nbsp;|&nbsp; <b>Cel:</b> 3141245830 &nbsp;|&nbsp; <b>Mail:</b> hola@intrax.mx
        </div>
      </div>
    </div>
    <div class='status'>
      <div class='folio'><b>FOLIO:</b> <span class='num'>{esc(folio_display)}</span></div>
      <div class='pill' style='background: {status_bg}; border-color: {status_border}; color: {status_fg};'>
        {esc(status_text)}
      </div>
      <div class='dates'>
        <div><b>Inicio:</b> {esc(orden.fecha_inicio or '-') } {esc(orden.hora_inicio or '')}</div>
        <div><b>Término:</b> {esc(orden.fecha_finalizacion or '-') } {esc(orden.hora_termino or '')}</div>
      </div>
    </div>
      </div>

      <div class='hero'>
    <div class='title'>Orden de Servicio</div>
    <div class='sub'>Cliente: {esc(orden.cliente or getattr(orden.cliente_id, 'nombre', '') or '-')}</div>
      </div>

      <div class='grid2'>
    <div class='card'>
      <h3>Datos del cliente</h3>
      <div class='label'>Dirección</div>
      <div class='value pre'>{esc(orden.direccion or '-')}</div>
      <div class='row' style='margin-top: 10px;'>
        <div class='col'>
          <div class='label'>Teléfono</div>
          <div class='value'>{esc(orden.telefono_cliente or '-')}</div>
        </div>
        <div class='col'>
          <div class='label'>Contacto</div>
          <div class='value'>{esc(orden.nombre_cliente or '-')}</div>
        </div>
      </div>
    </div>

    <div class='card'>
      <h3>Servicio</h3>
      <div class='label'>Técnico</div>
      <div class='value'>{esc(tecnico_nombre or orden.nombre_encargado or '-')}</div>
      <div class='label' style='margin-top: 10px;'>Servicios realizados</div>
      <div class='value services'>{servicios_pills_html}</div>
    </div>
      </div>

      <div class='section'>
    <div class='section-title'>Detalle del servicio</div>
    <div class='box'>
      <div class='label'>Problemática</div>
      <div class='value pre'>{esc(orden.problematica or '-')}</div>
      <div class='label' style='margin-top: 10px;'>Comentario del técnico</div>
      <div class='value pre'>{esc(orden.comentario_tecnico or '-')}</div>
    </div>
      </div>

      <div class='section'>
    <div class='section-title'>Firmas</div>
    <div class='sigs'>
      <div class='sigbox'>
        <div class='label'>Firma técnico</div>
        <div class='sigimgwrap'>
          {f"<img src='{firma_tecnico}' />" if firma_tecnico else "<div class='muted'>Sin firma</div>"}
        </div>
        <div class='sigline'><b>Nombre:</b> {esc(tecnico_nombre or orden.nombre_encargado or '-') }</div>
      </div>
      <div class='sigbox'>
        <div class='label'>Firma cliente</div>
        <div class='sigimgwrap'>
          {f"<img src='{firma_cliente}' />" if firma_cliente else "<div class='muted'>Sin firma</div>"}
        </div>
        <div class='sigline'><b>Nombre:</b> {esc(orden.nombre_cliente or '-') }</div>
      </div>
    </div>
      </div>

      </div>
    </div>

    {evidencias_html}
  </body>
</html>"""

    return html
