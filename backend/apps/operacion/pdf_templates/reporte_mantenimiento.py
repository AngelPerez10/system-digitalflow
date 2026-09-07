"""Plantilla HTML del reporte de mantenimiento.

Mismo lenguaje visual que el PDF de Póliza CCTV (`poliza_cctv.py`): membrete
con regla azul marina de 2.5 px, encabezados de sección en barra sólida
`#1e3a5f`, tablas de datos con borde gris. Sin firmas. Sin nombre comercial
ni tagline en el membrete (solo logo + datos del documento).
"""
from __future__ import annotations

from typing import Any

from apps.common.document_folio import FOLIO_SERIE_RM, format_document_folio, resolve_document_folio
from apps.common.marca import get_marca_nombre, logo_data_uri_for_pdf
from apps.common.pdf_html import esc, load_public_image_data_uri
from apps.common.pdf_images import img_url_to_data_uri

EMPRESA_RFC = "IMA200110CI4"
EMPRESA_DIRECCION = "Av. Elías Zamora Verduzco 149, Barrio 2, Valle de las Garzas, Manzanillo, Colima"
EMPRESA_CONTACTO = "Tel. 3141130469 · Cel. 3141245830 · hola@intrax.mx"


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

    secciones = [s for s in (payload.get("secciones") or []) if isinstance(s, dict)]

    # --- Reunir imágenes ------------------------------------------------
    image_urls: list[str] = []
    if foto_orden:
        image_urls.append(foto_orden)
    for sec in secciones:
        for key in ("fotos_antes", "fotos_despues"):
            raw = sec.get(key)
            if isinstance(raw, list):
                for u in raw:
                    s = str(u or "").strip()
                    if s and s not in image_urls:
                        image_urls.append(s)
        for key in ("foto_antes_url", "foto_despues_url"):
            url = str(sec.get(key) or "").strip()
            if url and url not in image_urls:
                image_urls.append(url)

    # Embebido a resolución nativa (igual que el PDF de órdenes): la foto que
    # llega de Cloudinary ya viene optimizada; no se vuelve a reducir.
    def _embed(u: str) -> str:
        if not u:
            return ""
        if u.startswith("data:"):
            return u
        return img_url_to_data_uri(u) or load_public_image_data_uri(u) or ""

    thumbs = {u: _embed(u) for u in image_urls}

    total_antes = 0
    total_despues = 0

    def _gallery_html(urls: list[str], lado: str) -> str:
        """Galería tipada Antes/Después con marco, pie y layout por cantidad."""
        frames: list[str] = []
        n = len(urls)
        for i, url in enumerate(urls):
            src = esc(thumbs.get(url) or "")
            if not src:
                continue
            num = i + 1
            alt = f"{lado}, foto {num} de {n}" if n > 1 else f"{lado}"
            cap = f"Foto {num}" if n > 1 else lado
            frames.append(
                f'<figure class="shot">'
                f'<div class="shot-frame"><img src="{src}" alt="{esc(alt)}" /></div>'
                f'<figcaption>{esc(cap)}</figcaption>'
                f"</figure>"
            )
        if not frames:
            return (
                f'<div class="gallery empty" role="status">'
                f'<span class="none">Sin registro fotográfico — {esc(lado)}</span>'
                f"</div>"
            )
        count_cls = "one" if len(frames) == 1 else ("two" if len(frames) == 2 else "many")
        return f'<div class="gallery {count_cls}">{"".join(frames)}</div>'

    zonas_html = []
    for idx, sec in enumerate(secciones, start=1):
        titulo = esc(str(sec.get("titulo") or "Sin título"))
        antes = _seccion_foto_list(sec, array_key="fotos_antes", legacy_key="foto_antes_url")
        despues = _seccion_foto_list(sec, array_key="fotos_despues", legacy_key="foto_despues_url")
        total_antes += len(antes)
        total_despues += len(despues)
        zonas_html.append(
            f"""
            <section class="zona" aria-labelledby="zona-{idx}">
              <div class="zona-h" id="zona-{idx}">
                <span class="zn">{idx:02d}</span>
                <span class="zt">{titulo}</span>
                <span class="zc">{len(antes) + len(despues)} foto{'s' if (len(antes) + len(despues)) != 1 else ''}</span>
              </div>
              <div class="compare">
                <div class="panel panel-antes">
                  <div class="panel-h"><span class="pill">Antes</span></div>
                  {_gallery_html(antes, "Antes")}
                </div>
                <div class="panel panel-despues">
                  <div class="panel-h"><span class="pill">Después</span></div>
                  {_gallery_html(despues, "Después")}
                </div>
              </div>
            </section>
            """
        )

    n_zonas = len(secciones)
    total_fotos = total_antes + total_despues
    if zonas_html:
        evi_note = (
            f"<p class=\"note\">{n_zonas} {'zona documentada' if n_zonas == 1 else 'zonas documentadas'} · "
            f"{total_fotos} {'imagen' if total_fotos == 1 else 'imágenes'} de evidencia "
            f"({total_antes} antes · {total_despues} después).</p>"
        )
        body_zonas = evi_note + "".join(zonas_html)
    else:
        body_zonas = '<p class="note">Este reporte no incluye evidencia fotográfica.</p>'

    logo_html = (
        f'<img src="{esc(logo_uri)}" alt="" />'
        if logo_uri
        else f'<div class="logo-fallback" aria-hidden="true">{esc((marca or "IP")[:2].upper())}</div>'
    )

    foto_orden_src = thumbs.get(foto_orden) if foto_orden else ""
    foto_orden_block = ""
    if foto_orden_src:
        foto_orden_block = (
            '<div class="callout">'
            '<div class="label">Imagen adjunta de la orden</div>'
            f'<div class="ordenimg"><img src="{esc(foto_orden_src)}" alt="Foto de la orden de trabajo" /></div>'
            "</div>"
        )

    folio = esc(payload.get("folio") or "—")
    fecha = esc(payload.get("fecha_servicio") or "—")
    tecnico = esc(payload.get("tecnico_nombre") or "—")
    orden_folio = esc(payload.get("orden_folio") or "—")
    orden_cliente = esc(payload.get("orden_cliente") or "—")

    return f"""<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Reporte de mantenimiento {folio}</title>
  <style>
    @page {{ size: A4; margin: 14mm 16mm 16mm 16mm; }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      color: #1a1a1a;
      background: #fff;
      font-family: Calibri, "Segoe UI", Arial, Helvetica, sans-serif;
      font-size: 11px;
      line-height: 1.38;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }}
    h1, h2 {{ margin: 0; font-weight: 700; }}
    h1 {{
      font-size: 13.5px; letter-spacing: 0.02em; text-transform: uppercase;
      line-height: 1.25; color: #1e3a5f;
    }}
    h2 {{
      font-size: 12px; margin: 16px 0 8px; padding: 5px 8px;
      background: #1e3a5f; color: #fff;
      text-transform: uppercase; letter-spacing: 0.04em;
    }}
    p {{ margin: 0 0 8px; }}
    .note {{ font-size: 10px; color: #444; margin: 4px 0 10px; }}

    .letterhead {{ margin-bottom: 4px; border-bottom: 2.5px solid #1e3a5f; }}
    .letterhead-top {{
      display: flex; justify-content: space-between; gap: 16px;
      align-items: flex-start; padding-bottom: 8px;
    }}
    .brand {{ display: flex; align-items: center; min-width: 78px; }}
    .logo {{ width: 78px; height: 78px; display: flex; align-items: center; justify-content: center; }}
    .logo img {{ max-width: 78px; max-height: 78px; object-fit: contain; }}
    .logo-fallback {{
      width: 70px; height: 70px; background: #1e3a5f; color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; font-weight: 700; letter-spacing: 0.08em;
    }}
    .doc-title {{ text-align: right; max-width: 72%; font-size: 10px; color: #333; line-height: 1.45; }}
    .doc-title h1 {{ margin-bottom: 6px; }}
    .doc-title p {{ margin: 0 0 2px; }}
    .doc-title .folio-num {{ color: #1e3a5f; font-weight: 700; }}

    table {{ width: 100%; border-collapse: collapse; font-size: 10px; }}
    th, td {{ border: 1px solid #8a8a8a; padding: 5px 7px; vertical-align: top; text-align: left; }}
    th {{ background: #1e3a5f; color: #fff; font-weight: 700; }}

    .client-table th {{
      background: #eef2f6; color: #1e3a5f; width: 20%;
      font-weight: 700; white-space: nowrap;
    }}
    .client-table td {{ background: #fff; font-weight: 600; width: 30%; }}

    .callout {{
      border: 1px solid #1e3a5f; background: #f7f9fc;
      padding: 10px 12px; margin: 10px 0 4px;
    }}
    .callout .label {{
      font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
      color: #1e3a5f; font-size: 10px; margin-bottom: 6px;
    }}
    .ordenimg {{
      border: 1px solid #c5ced8; max-width: 320px; background: #fff;
      padding: 4px;
    }}
    .ordenimg img {{ display: block; width: 100%; max-height: 190px; object-fit: cover; }}

    /* —— Evidencia Antes / Después —— */
    .zona {{
      page-break-inside: avoid; break-inside: avoid;
      margin-bottom: 14px;
      border: 1px solid #c5ced8;
      background: #fff;
    }}
    .zona-h {{
      display: flex; align-items: center; gap: 8px;
      background: #1e3a5f; color: #fff;
      font-weight: 700; font-size: 10px; letter-spacing: 0.04em; text-transform: uppercase;
      padding: 7px 10px;
    }}
    .zona-h .zn {{
      background: #c4a35a; color: #1a1a1a; font-size: 9px; font-weight: 700;
      letter-spacing: 0.04em; padding: 2px 7px; flex-shrink: 0;
    }}
    .zona-h .zt {{ flex: 1; min-width: 0; }}
    .zona-h .zc {{
      font-size: 9px; font-weight: 600; letter-spacing: 0.02em;
      text-transform: none; color: rgba(255,255,255,0.72); flex-shrink: 0;
    }}

    .compare {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      border-top: 1px solid #c5ced8;
    }}
    .panel {{
      min-width: 0;
      background: #f7f9fc;
    }}
    .panel + .panel {{ border-left: 1px solid #c5ced8; }}
    .panel-h {{
      padding: 6px 8px 0;
      text-align: center;
    }}
    .panel-h .pill {{
      display: inline-block;
      font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
      padding: 3px 10px;
      border: 1px solid transparent;
    }}
    .panel-antes .pill {{
      color: #7a4510; background: #f3e6d4; border-color: #e0c9a8;
    }}
    .panel-despues .pill {{
      color: #0f4a2f; background: #d9eee4; border-color: #a8d4c0;
    }}

    .gallery {{
      padding: 8px;
      min-height: 168px;
    }}
    .gallery.empty {{
      display: flex; align-items: center; justify-content: center;
      min-height: 168px;
      border: 1px dashed #c5ced8;
      margin: 8px;
      background: #fff;
    }}
    .gallery .none {{
      color: #6b7280; font-style: italic; font-size: 10px; text-align: center;
      padding: 8px;
    }}

    .shot {{
      margin: 0;
      background: #fff;
      border: 1px solid #c5ced8;
      overflow: hidden;
    }}
    .shot-frame {{
      background: #0f172a;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden;
    }}
    .shot-frame img {{
      display: block; width: 100%; height: 100%;
      object-fit: cover; object-position: center;
    }}
    .shot figcaption {{
      font-size: 8.5px; font-weight: 600; letter-spacing: 0.06em;
      text-transform: uppercase; color: #4b5563;
      text-align: center; padding: 4px 6px;
      background: #fff; border-top: 1px solid #e5e7eb;
    }}

    .gallery.one .shot-frame {{ height: 200px; }}
    .gallery.two {{
      display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
    }}
    .gallery.two .shot-frame {{ height: 118px; }}
    .gallery.many {{
      display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
    }}
    .gallery.many .shot-frame {{ height: 96px; }}
  </style>
</head>
<body>
  <header class="letterhead">
    <div class="letterhead-top">
      <div class="brand">
        <div class="logo">{logo_html}</div>
      </div>
      <div class="doc-title">
        <h1>Reporte de mantenimiento</h1>
        <p><b>Folio:</b> <span class="folio-num">{folio}</span></p>
        <p><b>RFC:</b> {esc(EMPRESA_RFC)}</p>
        <p>{esc(EMPRESA_DIRECCION)}</p>
        <p>{esc(EMPRESA_CONTACTO)}</p>
      </div>
    </div>
  </header>

  <h2>Datos del servicio</h2>
  <table class="client-table">
    <tbody>
      <tr>
        <th>Orden de trabajo:</th><td>{orden_folio}</td>
        <th>Cliente:</th><td>{orden_cliente}</td>
      </tr>
      <tr>
        <th>Fecha de servicio:</th><td>{fecha}</td>
        <th>Técnico:</th><td>{tecnico}</td>
      </tr>
    </tbody>
  </table>
  {foto_orden_block}

  <h2>Evidencia fotográfica · Antes / Después</h2>
  {body_zonas}
</body>
</html>
"""
