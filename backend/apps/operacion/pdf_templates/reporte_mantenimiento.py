"""Plantilla HTML del reporte de mantenimiento (estilo operativo como proyecto/orden)."""
from __future__ import annotations

from typing import Any

from apps.common.document_folio import FOLIO_SERIE_RM, format_document_folio, resolve_document_folio
from apps.common.marca import get_marca_nombre, logo_data_uri_for_pdf
from apps.common.pdf_html import esc, load_public_image_data_uri
from apps.common.pdf_images import embed_remote_images, safe_pdf_thumbnail_src


def _format_fecha_mx(value) -> str:
    if value is None:
        return "—"
    raw = str(value).strip()
    if len(raw) >= 10 and raw[4] == "-" and raw[7] == "-":
        y, m, d = raw[:10].split("-")
        return f"{d}/{m}/{y}"
    try:
        return value.strftime("%d/%m/%Y")
    except Exception:
        return raw or "—"


def _seccion_foto_list(item: dict, *, array_key: str, legacy_key: str) -> list[str]:
    raw = item.get(array_key)
    urls: list[str] = []
    if isinstance(raw, list):
        for u in raw:
            s = str(u or "").strip()
            if s and s not in urls:
                urls.append(s)
    legacy = str(item.get(legacy_key) or "").strip()
    if legacy and legacy not in urls:
        urls.insert(0, legacy)
    return urls


def overlay_from_reporte(reporte) -> dict[str, Any]:
    secciones_raw = getattr(reporte, "secciones", None)
    if not isinstance(secciones_raw, list):
        secciones_raw = []
    secciones = []
    for item in secciones_raw:
        if not isinstance(item, dict):
            continue
        fotos_antes = _seccion_foto_list(item, array_key="fotos_antes", legacy_key="foto_antes_url")
        fotos_despues = _seccion_foto_list(
            item, array_key="fotos_despues", legacy_key="foto_despues_url"
        )
        secciones.append(
            {
                "titulo": str(item.get("titulo") or "").strip() or "Sin título",
                "fotos_antes": fotos_antes,
                "fotos_despues": fotos_despues,
                "foto_antes_url": fotos_antes[0] if fotos_antes else "",
                "foto_despues_url": fotos_despues[0] if fotos_despues else "",
            }
        )
    folio = resolve_document_folio(
        FOLIO_SERIE_RM,
        getattr(reporte, "folio", None),
        getattr(reporte, "idx", None) or getattr(reporte, "id", None),
        empty=format_document_folio(FOLIO_SERIE_RM, getattr(reporte, "id", None), empty="RM"),
    )
    return {
        "folio": folio,
        "fecha_servicio": _format_fecha_mx(getattr(reporte, "fecha_servicio", None)),
        "tecnico_nombre": str(getattr(reporte, "tecnico_nombre", "") or "").strip() or "—",
        "orden_folio": str(getattr(reporte, "orden_folio", "") or "").strip() or "—",
        "orden_cliente": str(getattr(reporte, "orden_cliente", "") or "").strip() or "—",
        "foto_orden_url": str(getattr(reporte, "foto_orden_url", "") or "").strip(),
        "secciones": secciones,
    }


def generate_reporte_mantenimiento_pdf_html(data: dict[str, Any] | None = None) -> str:
    payload = dict(data or {})
    marca = get_marca_nombre()
    logo_uri = logo_data_uri_for_pdf() or ""
    foto_orden = str(payload.get("foto_orden_url") or "").strip()

    image_urls: list[str] = []
    if foto_orden:
        image_urls.append(foto_orden)
    for sec in payload.get("secciones") or []:
        if not isinstance(sec, dict):
            continue
        for key in ("fotos_antes", "fotos_despues"):
            raw = sec.get(key)
            if isinstance(raw, list):
                for u in raw:
                    s = str(u or "").strip()
                    if s:
                        image_urls.append(s)
        for key in ("foto_antes_url", "foto_despues_url"):
            url = str(sec.get(key) or "").strip()
            if url and url not in image_urls:
                image_urls.append(url)

    embedded = embed_remote_images(image_urls)
    thumbs = {
        u: embedded.get(u)
        or safe_pdf_thumbnail_src(u)
        or load_public_image_data_uri(u)
        or u
        for u in image_urls
    }

    def _grid_html(urls: list[str], alt: str) -> str:
        if not urls:
            return '<div class="ph">Sin foto</div>'
        cells = []
        for i, url in enumerate(urls):
            src = esc(thumbs.get(url) or "")
            if not src:
                continue
            cells.append(f'<div class="photo-box"><img src="{src}" alt="{esc(alt)} {i + 1}" /></div>')
        if not cells:
            return '<div class="ph">Sin foto</div>'
        return f'<div class="photos">{"".join(cells)}</div>'

    secciones_html = []
    for sec in payload.get("secciones") or []:
        if not isinstance(sec, dict):
            continue
        titulo = esc(str(sec.get("titulo") or "Sin título"))
        fotos_antes = _seccion_foto_list(sec, array_key="fotos_antes", legacy_key="foto_antes_url")
        fotos_despues = _seccion_foto_list(
            sec, array_key="fotos_despues", legacy_key="foto_despues_url"
        )
        secciones_html.append(
            f"""
            <article class="sec">
              <h4>{titulo}</h4>
              <div class="pair">
                <div class="col">
                  <div class="figcap antes">Antes ({len(fotos_antes)})</div>
                  {_grid_html(fotos_antes, "Antes")}
                </div>
                <div class="col">
                  <div class="figcap despues">Después ({len(fotos_despues)})</div>
                  {_grid_html(fotos_despues, "Después")}
                </div>
              </div>
            </article>
            """
        )

    body_secs = "".join(secciones_html) or "<div class='muted'>Sin secciones fotográficas.</div>"

    logo_html = (
        f'<img src="{esc(logo_uri)}" alt="{esc(marca)}" />'
        if logo_uri
        else f'<div class="logo-fallback">{esc((marca or "DF")[:2].upper())}</div>'
    )

    foto_orden_src = thumbs.get(foto_orden) if foto_orden else ""
    foto_orden_block = ""
    if foto_orden_src:
        foto_orden_block = f"""
          <div class="label" style="margin-top:10px;">Imagen adjunta de la orden</div>
          <div class="orden-foto">
            <img src="{esc(foto_orden_src)}" alt="Foto de la orden" />
          </div>
        """

    folio = esc(payload.get("folio") or "—")
    fecha = esc(payload.get("fecha_servicio") or "—")
    tecnico = esc(payload.get("tecnico_nombre") or "—")
    orden_folio = esc(payload.get("orden_folio") or "—")
    orden_cliente = esc(payload.get("orden_cliente") or "—")
    marca_esc = esc(marca)

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Reporte de mantenimiento {folio}</title>
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
    color: var(--text);
    background: var(--bg);
    margin: 0;
  }}
  .page {{ width: 210mm; min-height: 297mm; padding: 0; margin: 0 auto; }}
  @media print {{
    .page {{ width: auto; min-height: 0; }}
  }}
  .content {{ padding: 0; }}
  .topbar {{
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 14px;
  }}
  .brandwrap {{ display: flex; align-items: flex-start; gap: 12px; min-width: 0; }}
  .logo {{
    width: 96px; height: 96px; display: flex; align-items: center;
    justify-content: center; overflow: hidden; flex: 0 0 auto;
  }}
  .logo img {{ width: 100%; height: 100%; object-fit: contain; }}
  .logo-fallback {{
    width: 72px; height: 72px; border-radius: 14px;
    background: var(--blue-50); color: var(--blue-900);
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 18px; border: 1px solid var(--border);
  }}
  .brand .name {{ font-size: 13px; font-weight: 700; color: var(--blue-900); letter-spacing: -0.2px; }}
  .brand .meta {{ margin-top: 6px; font-size: 9.5px; line-height: 1.25; color: var(--muted); max-width: 330px; }}
  .brand .meta b {{ color: var(--text); font-weight: 600; }}
  .status {{ text-align: right; max-width: 45%; margin-left: auto; }}
  .status .folio {{ font-size: 14px; color: var(--muted); margin-bottom: 6px; font-weight: 600; }}
  .status .folio .num {{ color: #dc2626; font-weight: 700; }}
  .status .dates {{ margin-top: 4px; font-size: 10px; color: var(--muted); line-height: 1.35; }}
  .hero {{
    border: 1px solid var(--border); border-left: 6px solid var(--blue-700);
    border-radius: 14px; padding: 14px 14px 12px; background: #eff6ff; margin-bottom: 14px;
  }}
  .hero .title {{ font-size: 16px; font-weight: 700; color: var(--blue-900); letter-spacing: -0.3px; }}
  .hero .sub {{ margin-top: 5px; font-size: 10px; color: var(--muted); }}
  .grid2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }}
  .card {{ border: 1px solid var(--border); border-radius: 14px; padding: 12px; background: #fff; }}
  .card h3 {{
    margin: 0 0 10px 0; font-size: 11px; font-weight: 700; color: var(--blue-900);
    letter-spacing: .3px; text-transform: uppercase;
  }}
  .label {{ font-size: 9.5px; font-weight: 600; color: var(--muted); letter-spacing: .5px; text-transform: uppercase; }}
  .value {{ margin-top: 4px; font-size: 11px; color: var(--text); }}
  .muted {{ color: var(--muted); font-size: 11px; }}
  .section {{ margin-bottom: 14px; }}
  .section-title {{
    font-size: 11px; font-weight: 700; color: var(--blue-900);
    letter-spacing: .3px; text-transform: uppercase; margin: 0 0 8px 0;
  }}
  .box {{ border: 1px solid var(--border); border-radius: 14px; padding: 12px; background: #fff; }}
  .orden-foto {{
    margin-top: 8px; border: 1px solid var(--border); border-radius: 10px;
    overflow: hidden; background: #f8fafc; max-width: 320px;
  }}
  .orden-foto img {{ display: block; width: 100%; max-height: 180px; object-fit: cover; }}
  .sec {{ margin-bottom: 12px; page-break-inside: avoid; }}
  .sec h4 {{
    margin: 0 0 8px 0; font-size: 12px; font-weight: 700; color: var(--text);
  }}
  .pair {{ display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }}
  .col {{ border: 1px solid var(--border); border-radius: 12px; overflow: hidden; background: #fff; }}
  .figcap {{
    text-align: center; font-size: 9px; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; padding: 5px 6px;
  }}
  .figcap.antes {{ background: #fff7ed; color: #c2410c; }}
  .figcap.despues {{ background: #ecfdf5; color: #166534; }}
  .photos {{
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 4px;
    padding: 6px;
    background: #f8fafc;
  }}
  .photo-box {{
    border-radius: 6px; overflow: hidden; background: #e2e8f0; min-height: 90px;
  }}
  .photo-box img {{
    display: block; width: 100%; height: 110px; object-fit: cover;
  }}
  .photos .photo-box:only-child {{
    grid-column: 1 / -1;
  }}
  .photos .photo-box:only-child img {{ height: 170px; }}
  .ph {{
    height: 140px; display: flex; align-items: center; justify-content: center;
    color: var(--muted); background: #f8fafc; font-size: 10px;
  }}
</style>
</head>
<body>
  <div class="page">
    <div class="content">
      <div class="topbar">
        <div class="brandwrap">
          <div class="logo">{logo_html}</div>
          <div class="brand">
            <div class="name">{marca_esc}</div>
            <div class="meta">
              Documento operativo de mantenimiento<br />
              <b>Orden:</b> {orden_folio}<br />
              <b>Cliente:</b> {orden_cliente}
            </div>
          </div>
        </div>
        <div class="status">
          <div class="folio">Folio <span class="num">{folio}</span></div>
          <div class="dates">Fecha de servicio: <b style="color:var(--text)">{fecha}</b></div>
          <div class="dates">Técnico: <b style="color:var(--text)">{tecnico}</b></div>
        </div>
      </div>

      <div class="hero">
        <div class="title">Reporte de mantenimiento</div>
        <div class="sub">Evidencia fotográfica Antes / Después vinculada a la orden de servicio.</div>
      </div>

      <div class="grid2">
        <div class="card">
          <h3>Orden de trabajo</h3>
          <div class="label">Folio</div>
          <div class="value">{orden_folio}</div>
          <div class="label" style="margin-top:10px;">Cliente</div>
          <div class="value">{orden_cliente}</div>
          {foto_orden_block}
        </div>
        <div class="card">
          <h3>Datos del servicio</h3>
          <div class="label">Fecha</div>
          <div class="value">{fecha}</div>
          <div class="label" style="margin-top:10px;">Técnico</div>
          <div class="value">{tecnico}</div>
          <div class="label" style="margin-top:10px;">Folio del reporte</div>
          <div class="value">{folio}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Evidencia fotográfica</div>
        <div class="box">
          {body_secs}
        </div>
      </div>
    </div>
  </div>
</body>
</html>
"""
