"""HTML template for proyecto PDF (híbrido operativo + bitácora por jornada)."""
from __future__ import annotations

import logging
from typing import Any

from apps.common.document_folio import FOLIO_SERIE_PRJ, resolve_document_folio
from apps.common.pdf_html import esc, load_public_image_data_uri
from apps.common.pdf_images import embed_remote_images

logger = logging.getLogger(__name__)

_STATUS_LABELS = {
    "en_proceso": "EN PROCESO",
    "pausado": "PAUSADO",
    "cerrado": "CERRADO",
}

_STATUS_STYLES = {
    "en_proceso": ("#dbeafe", "#93c5fd", "#1e40af"),
    "pausado": ("#fef3c7", "#fcd34d", "#92400e"),
    "cerrado": ("#dcfce7", "#86efac", "#166534"),
}


def _fmt_date(value: Any) -> str:
    if value is None:
        return "-"
    if hasattr(value, "strftime"):
        try:
            return value.strftime("%d/%m/%Y")
        except Exception:
            logger.exception("Failed formatting proyecto PDF date")
            return "-"
    raw = str(value).strip()
    if not raw:
        return "-"
    if len(raw) >= 10 and raw[4] == "-" and raw[7] == "-":
        y, m, d = raw[:10].split("-")
        return f"{d}/{m}/{y}"
    return raw


def _person_name(item: dict | None) -> str:
    if not isinstance(item, dict):
        return ""
    return str(item.get("nombre") or "").strip()


def _is_maps_url(value: str) -> bool:
    low = value.lower()
    return (
        "google.com/maps" in low
        or "maps.app.goo.gl" in low
        or "goo.gl/maps" in low
        or "maps.google." in low
    )


def _compose_cliente_direccion(cliente) -> str:
    calle = str(getattr(cliente, "calle", "") or "").strip()
    num = str(getattr(cliente, "numero_exterior", "") or "").strip()
    interior = str(getattr(cliente, "interior", "") or "").strip()
    colonia = str(getattr(cliente, "colonia", "") or "").strip()
    ciudad = (
        str(getattr(cliente, "ciudad", "") or "").strip()
        or str(getattr(cliente, "municipio", "") or "").strip()
    )
    estado = str(getattr(cliente, "estado", "") or "").strip()
    cp = str(getattr(cliente, "codigo_postal", "") or "").strip()

    linea = " ".join(p for p in (calle, num) if p)
    if interior:
        linea = f"{linea} Int. {interior}".strip()
    parts = [p for p in (linea, colonia, ciudad, estado) if p]
    if cp:
        parts.append(f"C.P. {cp}")
    return ", ".join(parts)


def _resolve_cliente(proyecto):
    cliente = getattr(proyecto, "cliente", None)
    if cliente is not None:
        return cliente
    nombre = str(getattr(proyecto, "cliente_nombre", "") or "").strip()
    if not nombre:
        return None
    from apps.clientes.models import Cliente

    return (
        Cliente.objects.filter(nombre__iexact=nombre)
        .prefetch_related("contactos")
        .first()
    )


def _cliente_telefono(cliente) -> str:
    if cliente is None:
        return "-"
    for attr in ("telefono", "celular"):
        val = str(getattr(cliente, attr, "") or "").strip()
        if val:
            return val
    contactos = getattr(cliente, "contactos", None)
    if contactos is None:
        return "-"
    try:
        items = list(contactos.all())
    except Exception:
        logger.exception("Failed reading contactos of cliente for proyecto PDF")
        return "-"
    pick = next((c for c in items if getattr(c, "is_principal", False)), None) or (
        items[0] if items else None
    )
    if pick:
        cel = str(getattr(pick, "celular", "") or "").strip()
        if cel:
            return cel
    return "-"


def _cliente_direccion(cliente) -> str:
    if cliente is None:
        return "-"
    raw = str(getattr(cliente, "direccion", "") or "").strip()
    composed = _compose_cliente_direccion(cliente)
    if raw and not _is_maps_url(raw):
        return raw
    if composed:
        return composed
    return raw or "-"


def _fecha_extremos(fechas: list[Any]) -> tuple[str, str]:
    raws: list[str] = []
    for f in fechas:
        if not f:
            continue
        s = str(f).strip()
        if s:
            raws.append(s[:10] if len(s) >= 10 else s)
    if not raws:
        return "-", "-"
    raws.sort()
    return _fmt_date(raws[0]), _fmt_date(raws[-1])


def _nota_fotos(item: dict) -> list[str]:
    raw = item.get("imagenesUrls")
    if raw is None:
        raw = item.get("imagenes_urls")
    if not isinstance(raw, list):
        return []
    urls: list[str] = []
    for u in raw:
        if isinstance(u, str) and u.strip():
            urls.append(u.strip())
        if len(urls) >= 2:
            break
    return urls


def _bitacora_entries(notas: Any, fechas_inicio: list[Any]) -> list[dict[str, Any]]:
    items = notas if isinstance(notas, list) else []
    entries: list[dict[str, Any]] = []
    for idx, item in enumerate(items):
        if not isinstance(item, dict):
            continue
        texto = str(item.get("nota") or "").strip()
        fotos = _nota_fotos(item)
        if not texto and not fotos:
            continue
        fecha_raw = fechas_inicio[idx] if idx < len(fechas_inicio) else None
        entries.append(
            {
                "dia": idx + 1,
                "fecha": _fmt_date(fecha_raw) if fecha_raw else "",
                "nota": texto,
                "fotos": fotos,
            }
        )
    return entries


def generate_proyecto_pdf_html(proyecto) -> str:
    """Genera el HTML para el PDF del proyecto (sin precios)."""
    status = str(getattr(proyecto, "status", "") or "en_proceso").strip().lower()
    status_text = _STATUS_LABELS.get(status, status.upper() or "EN PROCESO")
    status_bg, status_border, status_fg = _STATUS_STYLES.get(
        status, ("#e2e8f0", "#cbd5e1", "#334155")
    )

    folio_display = resolve_document_folio(
        FOLIO_SERIE_PRJ,
        getattr(proyecto, "folio", None),
        getattr(proyecto, "idx", None) or getattr(proyecto, "id", None),
        empty="-",
    )

    cliente_obj = _resolve_cliente(proyecto)
    cliente_nombre = (
        str(getattr(proyecto, "cliente_nombre", "") or "").strip()
        or getattr(cliente_obj, "nombre", None)
        or "-"
    )
    cliente_tel = _cliente_telefono(cliente_obj)
    cliente_dir = _cliente_direccion(cliente_obj)

    tecnicos = getattr(proyecto, "tecnicos", None)
    if not isinstance(tecnicos, list):
        tecnicos = []
    auxiliares = getattr(proyecto, "auxiliares", None)
    if not isinstance(auxiliares, list):
        auxiliares = []

    responsable = next(
        (t for t in tecnicos if isinstance(t, dict) and t.get("responsable")),
        tecnicos[0] if tecnicos else None,
    )
    responsable_nombre = _person_name(responsable) or str(
        getattr(proyecto, "tecnico_nombre", "") or ""
    ).strip() or "-"

    otros_tecnicos = [
        _person_name(t)
        for t in tecnicos
        if isinstance(t, dict) and t is not responsable and _person_name(t)
    ]
    if not otros_tecnicos and getattr(proyecto, "tecnico_nombre", None):
        legacy = str(proyecto.tecnico_nombre).strip()
        if legacy and legacy != responsable_nombre:
            otros_tecnicos = [legacy]

    auxiliares_nombres = [_person_name(a) for a in auxiliares if _person_name(a)]
    if not auxiliares_nombres and getattr(proyecto, "auxiliar_nombre", None):
        aux_legacy = str(proyecto.auxiliar_nombre).strip()
        if aux_legacy:
            auxiliares_nombres = [aux_legacy]

    tipos = getattr(proyecto, "tipos_trabajo", None)
    if not isinstance(tipos, list):
        tipos = []
    tipo_labels = []
    for t in tipos:
        if isinstance(t, dict):
            n = str(t.get("nombre") or "").strip()
            if n:
                tipo_labels.append(n)
        elif isinstance(t, str) and t.strip():
            tipo_labels.append(t.strip())
    if not tipo_labels:
        legacy_tipo = str(getattr(proyecto, "tipo_trabajo_nombre", "") or "").strip()
        if legacy_tipo:
            tipo_labels = [legacy_tipo]

    tipos_pills = (
        "".join(f"<span class='service-pill'>{esc(n)}</span>" for n in tipo_labels)
        or "<span class='muted'>-</span>"
    )

    fechas_inicio = getattr(proyecto, "fechas_inicio", None)
    if not isinstance(fechas_inicio, list):
        fechas_inicio = []
    fecha_inicio_txt, fecha_fin_txt = _fecha_extremos(fechas_inicio)

    bitacora = _bitacora_entries(getattr(proyecto, "notas_por_dia", None), fechas_inicio)
    evidencias = getattr(proyecto, "evidencias_urls", None)
    if not isinstance(evidencias, list):
        evidencias = []
    evidencias = [u for u in evidencias if isinstance(u, str) and u.strip()][:12]
    firma_tecnico_url = str(getattr(proyecto, "firma_tecnico_url", "") or "").strip()
    firma_cliente_url = str(getattr(proyecto, "firma_cliente_url", "") or "").strip()
    image_urls = [
        *[u for entry in bitacora for u in entry["fotos"]],
        *evidencias,
        *([firma_tecnico_url] if firma_tecnico_url else []),
        *([firma_cliente_url] if firma_cliente_url else []),
    ]
    embedded = embed_remote_images(image_urls)

    if bitacora:
        bitacora_cards = []
        for entry in bitacora:
            fecha_suffix = f" · {esc(entry['fecha'])}" if entry["fecha"] and entry["fecha"] != "-" else ""
            nota_html = (
                f"<div class='value pre'>{esc(entry['nota'])}</div>"
                if entry["nota"]
                else "<div class='muted'>Sin texto en esta jornada.</div>"
            )
            fotos_src = [embedded[u] for u in entry["fotos"] if u in embedded]
            fotos_html = ""
            if fotos_src:
                thumbs = "".join(
                    f"<div class='bitacora-photo'><img src='{esc(src)}' alt='Foto jornada {entry['dia']}' /></div>"
                    for src in fotos_src
                )
                fotos_html = f"<div class='bitacora-photos'>{thumbs}</div>"
            bitacora_cards.append(
                "<article class='bitacora-day'>"
                f"<h4>Día {entry['dia']}{fecha_suffix}</h4>"
                f"{nota_html}{fotos_html}"
                "</article>"
            )
        bitacora_html = "".join(bitacora_cards)
    else:
        bitacora_html = "<div class='muted'>Sin bitácora registrada.</div>"

    fotos_embedded = [embedded[u] for u in evidencias if u in embedded]
    has_photos = bool(fotos_embedded)
    fotos_grid = (
        "".join(
            f"<div class='photo-box'><img src='{esc(src)}' alt='Evidencia {i}' /></div>"
            for i, src in enumerate(fotos_embedded, start=1)
        )
        if has_photos
        else ""
    )

    firma_tecnico = embedded.get(firma_tecnico_url, "")
    firma_cliente = embedded.get(firma_cliente_url, "")
    logo_data_uri = load_public_image_data_uri("images/logo/intrax-logo.png")

    vehiculo = str(getattr(proyecto, "vehiculo_asignado", "") or "").strip() or "-"
    herramientas = str(getattr(proyecto, "herramientas_generales", "") or "").strip() or "-"
    avance = getattr(proyecto, "porcentaje_avance", 0) or 0
    fecha_auth = _fmt_date(getattr(proyecto, "fecha_autorizacion", None))
    hora_llegada = str(getattr(proyecto, "hora_llegada", "") or "").strip() or "-"
    hora_salida = str(getattr(proyecto, "hora_salida", "") or "").strip() or "-"

    otros_tecnicos_block = ""
    if otros_tecnicos:
        otros_tecnicos_block = (
            "<div class='label' style='margin-top: 10px;'>Otros técnicos</div>"
            f"<div class='value'>{', '.join(esc(n) for n in otros_tecnicos)}</div>"
        )
    auxiliares_block = ""
    if auxiliares_nombres:
        auxiliares_block = (
            "<div class='label' style='margin-top: 10px;'>Auxiliares</div>"
            f"<div class='value'>{', '.join(esc(n) for n in auxiliares_nombres)}</div>"
        )

    evidencias_page = ""
    if has_photos:
        evidencias_page = f"""
    <div class='pagebreak'></div>
    <div class='page'>
      <div class='content'>
        <div class='section'>
          <div class='section-title'>Evidencias</div>
          <div class='box'>
            <div class='photos'>{fotos_grid}</div>
          </div>
        </div>
      </div>
    </div>
"""

    html = f"""<!doctype html>
<html lang="es">
  <head>
    <meta charset='utf-8' />
    <meta name='viewport' content='width=device-width, initial-scale=1' />
    <title>Proyecto {esc(folio_display)}</title>
    <style>
      :root {{
        --blue-900: #1e3a8a;
        --blue-700: #1d4ed8;
        --blue-600: #2563eb;
        --blue-50: #eff6ff;
        --text: #0f172a;
        --muted: #64748b;
        --border: #dbeafe;
        --bg: #ffffff;
      }}
      @page {{
        size: A4;
        margin-left: 12mm;
        margin-right: 16mm;
        margin-top: 12mm;
        margin-bottom: 14mm;
      }}
      * {{ box-sizing: border-box; }}
      /* Arial en Windows y Liberation/Arimo en Linux (Playwright).
         Evitar system-ui/Segoe: en producción se ve más alta y grande. */
      @font-face {{
        font-family: 'PdfSans';
        src: local('Arial'), local('Helvetica'), local('Liberation Sans'), local('Arimo'), local('Nimbus Sans');
        font-style: normal;
        font-weight: 400;
      }}
      @font-face {{
        font-family: 'PdfSans';
        src: local('Arial Bold'), local('Helvetica Bold'), local('Liberation Sans Bold'), local('Arimo Bold'), local('Nimbus Sans Bold');
        font-style: normal;
        font-weight: 700;
      }}
      html {{ -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }}
      body {{
        font-family: PdfSans, Arial, Helvetica, sans-serif;
        font-size: 10.5px;
        line-height: 1.3;
        letter-spacing: 0;
        font-synthesis: none;
        color: var(--text); background: var(--bg); margin: 0;
      }}
      .page {{ width: 210mm; min-height: 297mm; padding: 0; margin: 0 auto; }}
      @media print {{
        .page {{ width: auto; min-height: 0; }}
      }}
      .content {{ padding: 0; }}
      .topbar {{ display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 14px; }}
      .brandwrap {{ display: flex; align-items: flex-start; gap: 12px; min-width: 0; }}
      .logo {{ width: 96px; height: 96px; display: flex; align-items: center; justify-content: center; overflow: hidden; flex: 0 0 auto; }}
      .logo img {{ width: 100%; height: 100%; object-fit: contain; }}
      .brand .name {{ font-size: 13px; font-weight: 700; color: var(--blue-900); letter-spacing: -0.2px; }}
      .brand .meta {{ margin-top: 6px; font-size: 9.5px; line-height: 1.25; color: var(--muted); max-width: 330px; }}
      .brand .meta b {{ color: var(--text); font-weight: 600; }}
      .status {{ text-align: right; max-width: 45%; margin-left: auto; }}
      .status .pill {{
        display: inline-block; font-size: 10px; font-weight: 600; letter-spacing: .7px;
        padding: 6px 12px; border-radius: 999px; border: 1px solid var(--border);
      }}
      .status .dates {{ margin-top: 8px; font-size: 10px; color: var(--muted); line-height: 1.35; }}
      .status .folio {{ font-size: 14px; color: var(--muted); margin-bottom: 6px; font-weight: 600; }}
      .status .folio .num {{ color: #dc2626; font-weight: 700; }}
      .hero {{
        border: 1px solid var(--border); border-left: 6px solid var(--blue-700);
        border-radius: 14px; padding: 14px 14px 12px; background: #eff6ff; margin-bottom: 14px;
      }}
      .hero .title {{ font-size: 16px; font-weight: 700; color: var(--blue-900); letter-spacing: -0.3px; }}
      .hero .sub {{ margin-top: 5px; font-size: 10px; color: var(--muted); }}
      .grid2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }}
      .card {{ border: 1px solid var(--border); border-radius: 14px; padding: 12px; background: #fff; }}
      .card h3 {{
        margin: 0 0 10px 0; font-size: 11px; font-weight: 700; color: var(--blue-900);
        letter-spacing: .3px; text-transform: uppercase;
      }}
      .row {{ display: flex; gap: 12px; }}
      .col {{ flex: 1; min-width: 0; }}
      .label {{ font-size: 9.5px; font-weight: 600; color: var(--muted); letter-spacing: .5px; text-transform: uppercase; }}
      .value {{ margin-top: 4px; font-size: 11px; color: var(--text); }}
      .pre {{ white-space: pre-wrap; overflow-wrap: anywhere; }}
      .muted {{ color: var(--muted); font-size: 11px; }}
      .services {{ margin-top: 6px; }}
      .service-pill {{
        display: inline-block; font-size: 9.5px; font-weight: 600; color: #fff;
        padding: 4px 10px; border-radius: 999px; background: #2563eb; margin: 4px 6px 0 0;
      }}
      .section {{ margin-top: 12px; }}
      .section-title {{
        margin: 0 0 10px 0; font-size: 11px; font-weight: 700; color: var(--blue-900);
        letter-spacing: .3px; text-transform: uppercase;
      }}
      .box {{ border: 1px solid var(--border); border-radius: 14px; padding: 12px; background: #fff; }}
      .bitacora-day {{
        border: 1px solid var(--border); border-radius: 12px; padding: 10px 12px;
        margin-bottom: 10px; background: #fff; page-break-inside: avoid;
      }}
      .bitacora-day:last-child {{ margin-bottom: 0; }}
      .bitacora-day h4 {{
        margin: 0 0 6px 0; font-size: 11px; font-weight: 700; color: var(--blue-900);
      }}
      .bitacora-photos {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }}
      .bitacora-photo {{
        border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
        background: var(--blue-50); height: 120px;
      }}
      .bitacora-photo img {{ width: 100%; height: 100%; object-fit: cover; }}
      .photos {{ display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }}
      .photo-box {{
        border: 1px solid var(--border); border-radius: 14px; overflow: hidden;
        background: var(--blue-50); height: 260px; display: flex; align-items: center; justify-content: center;
      }}
      .photo-box img {{ width: 100%; height: 100%; object-fit: cover; }}
      .pagebreak {{ page-break-before: always; }}
      .sigs {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }}
      .sigbox {{ border: 1px solid var(--border); border-radius: 14px; padding: 12px; background: #fff; }}
      .sigimgwrap {{
        height: 105px; border-radius: 12px; border: 1px dashed var(--border);
        display: flex; align-items: center; justify-content: center; overflow: hidden;
        background: var(--blue-50); margin-top: 8px;
      }}
      .sigimgwrap img {{ width: 100%; height: 100%; object-fit: contain; }}
      .sigline {{ margin-top: 10px; border-top: 1px solid var(--border); padding-top: 8px; font-size: 10px; color: var(--muted); }}
      .sigline b {{ font-weight: 700; color: var(--text); }}
    </style>
  </head>
  <body>
    <div class='page'>
      <div class='content'>
        <div class='topbar'>
          <div class='brandwrap'>
            <div class='logo'>
              {f"<img src='{logo_data_uri}' alt='Intrax' />" if logo_data_uri else ""}
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
              <div><b>Autorización:</b> {esc(fecha_auth)}</div>
              <div><b>Avance:</b> {esc(str(avance))}%</div>
            </div>
          </div>
        </div>

        <div class='hero'>
          <div class='title'>Proyecto</div>
          <div class='sub'>Cliente: {esc(cliente_nombre)}</div>
        </div>

        <div class='grid2'>
          <div class='card'>
            <h3>Datos del cliente</h3>
            <div class='label'>Dirección</div>
            <div class='value pre'>{esc(cliente_dir)}</div>
            <div class='row' style='margin-top: 10px;'>
              <div class='col'>
                <div class='label'>Teléfono</div>
                <div class='value'>{esc(cliente_tel)}</div>
              </div>
              <div class='col'>
                <div class='label'>Cliente</div>
                <div class='value'>{esc(cliente_nombre)}</div>
              </div>
            </div>
          </div>

          <div class='card'>
            <h3>Equipo de campo</h3>
            <div class='label'>Responsable</div>
            <div class='value'>{esc(responsable_nombre)}</div>
            {otros_tecnicos_block}
            {auxiliares_block}
          </div>
        </div>

        <div class='section'>
          <div class='section-title'>Operación</div>
          <div class='box'>
            <div class='grid2'>
              <div>
                <div class='label'>Tipos de trabajo</div>
                <div class='value services'>{tipos_pills}</div>
                <div class='label' style='margin-top: 10px;'>Fecha de inicio</div>
                <div class='value'>{esc(fecha_inicio_txt)}</div>
                <div class='label' style='margin-top: 10px;'>Fecha de finalización</div>
                <div class='value'>{esc(fecha_fin_txt)}</div>
                <div class='row' style='margin-top: 10px;'>
                  <div class='col'>
                    <div class='label'>Hora llegada</div>
                    <div class='value'>{esc(hora_llegada)}</div>
                  </div>
                  <div class='col'>
                    <div class='label'>Hora salida</div>
                    <div class='value'>{esc(hora_salida)}</div>
                  </div>
                </div>
              </div>
              <div>
                <div class='label'>Vehículo</div>
                <div class='value pre'>{esc(vehiculo)}</div>
                <div class='label' style='margin-top: 10px;'>Herramientas generales</div>
                <div class='value pre'>{esc(herramientas)}</div>
              </div>
            </div>
          </div>
        </div>

        <div class='section'>
          <div class='section-title'>Bitácora por jornada</div>
          <div class='box'>{bitacora_html}</div>
        </div>

        <div class='section'>
          <div class='section-title'>Firmas</div>
          <div class='sigs'>
            <div class='sigbox'>
              <div class='label'>Firma técnico</div>
              <div class='sigimgwrap'>
                {f"<img src='{firma_tecnico}' alt='Firma técnico' />" if firma_tecnico else "<div class='muted'>Sin firma</div>"}
              </div>
              <div class='sigline'><b>Nombre:</b> {esc(responsable_nombre)}</div>
            </div>
            <div class='sigbox'>
              <div class='label'>Firma cliente</div>
              <div class='sigimgwrap'>
                {f"<img src='{firma_cliente}' alt='Firma cliente' />" if firma_cliente else "<div class='muted'>Sin firma</div>"}
              </div>
              <div class='sigline'><b>Nombre:</b> {esc(cliente_nombre)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    {evidencias_page}
  </body>
</html>"""
    return html
