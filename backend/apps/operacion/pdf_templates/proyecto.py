"""HTML template for proyecto PDF (híbrido operativo + bitácora por jornada)."""
from __future__ import annotations

import logging
from typing import Any

from apps.common.document_folio import FOLIO_SERIE_COT, FOLIO_SERIE_PRJ, resolve_document_folio
from apps.common.marca import logo_data_uri_for_pdf
from apps.common.pdf_html import esc
from apps.common.pdf_images import embed_remote_images, firma_url_to_data_uri

logger = logging.getLogger(__name__)

_STATUS_LABELS = {
    "en_proceso": "EN PROCESO",
    "pausado": "PAUSADO",
    "saldo_pendiente": "SALDO PENDIENTE",
    "cerrado": "CERRADO",
    "cancelado": "CANCELADO",
}

# (fondo, borde, texto, punto): mismos tonos que las píldoras de estado de la app.
_STATUS_STYLES = {
    "en_proceso": ("#EEF3FF", "#D7E3FF", "#1244D1", "#1B5CFF"),
    "pausado": ("#FFF8EB", "#F0D7A3", "#8A5D0F", "#D08A1E"),
    "saldo_pendiente": ("#FDF4FF", "#F5D0FE", "#86198F", "#A21CAF"),
    "cerrado": ("#E9F8F0", "#BFE6D4", "#04724D", "#0E8A5F"),
    "cancelado": ("#FEF2F2", "#F6CFCF", "#B42323", "#C22B2B"),
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


def _display_cotizacion_folio(folio: Any, origen: str) -> str:
    origen_norm = str(origen or "digitalflow").strip().lower()
    raw = str(folio or "").strip()
    if not raw:
        return "-"
    if origen_norm == "sicar":
        return raw
    return resolve_document_folio(FOLIO_SERIE_COT, raw, raw, empty="-")


def _normalize_cotizacion_adjunta(
    cot: dict,
    *,
    orden: int | None = None,
) -> dict[str, Any] | None:
    if not isinstance(cot, dict):
        return None
    folio_raw = cot.get("folio")
    cot_id = str(cot.get("id") or "").strip()
    if not folio_raw and not cot_id:
        return None
    origen = str(cot.get("origen") or "digitalflow").strip().lower()
    return {
        "orden": orden,
        "folio": _display_cotizacion_folio(folio_raw, origen),
        "fecha": _fmt_date(cot.get("fecha")),
    }


def _cotizaciones_adjuntas(proyecto) -> list[dict[str, Any]]:
    """Cotizaciones vinculadas al proyecto (folio y fecha únicamente)."""
    entries: list[dict[str, Any]] = []
    seen: set[str] = set()

    bloques = getattr(proyecto, "cotizaciones", None)
    if isinstance(bloques, list):
        for bloque in bloques:
            if not isinstance(bloque, dict):
                continue
            cot = bloque.get("cotizacion")
            if not isinstance(cot, dict):
                continue
            try:
                orden = int(bloque.get("orden") or len(entries) + 1)
            except (TypeError, ValueError):
                orden = len(entries) + 1
            row = _normalize_cotizacion_adjunta(cot, orden=orden)
            if not row:
                continue
            folio = row["folio"]
            if folio in seen:
                continue
            seen.add(folio)
            entries.append(row)

    adicional = getattr(proyecto, "cotizacion_adicional", None)
    if isinstance(adicional, dict):
        row = _normalize_cotizacion_adjunta(adicional, orden=len(entries) + 1)
        if row and row["folio"] not in seen:
            entries.append(row)

    return entries


def _render_cotizaciones_adjuntas_html(entries: list[dict[str, Any]]) -> str:
    if not entries:
        return "<div class='muted'>Sin cotizaciones vinculadas.</div>"

    rows: list[str] = []
    for row in entries:
        rows.append(
            "<tr>"
            f"<td class='cot-num'>{esc(str(row.get('orden') or '-'))}</td>"
            f"<td class='cot-folio'><b>{esc(row.get('folio') or '-')}</b></td>"
            f"<td class='cot-date'>{esc(row.get('fecha') or '-')}</td>"
            "</tr>"
        )

    return (
        "<table class='cot-table'>"
        "<thead><tr>"
        "<th scope='col'>#</th>"
        "<th scope='col'>Folio</th>"
        "<th scope='col'>Fecha</th>"
        "</tr></thead>"
        f"<tbody>{''.join(rows)}</tbody>"
        "</table>"
    )


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


_EMPRESA_NOMBRE = "GRUPO INTRAX SEGURIDAD Y RASTREO"

# CSS del documento (cadena normal: sin llaves dobles de f-string).
# Paleta de la app: marino #17235B + dorado #E6A23C, líneas de 1 px.
_PDF_CSS = """
      :root {
        --navy: #17235B;
        --navy-soft: #EEF0F7;
        --gold: #E6A23C;
        --gold-ink: #8A5D0F;
        --blue: #1B5CFF;
        --ink: #0B1020;
        --body: #2E3446;
        --muted: #6B7183;
        --hair: #E3E5EC;
        --soft: #F7F8FB;
      }
      @page {
        size: A4;
        margin-left: 14mm;
        margin-right: 14mm;
        margin-top: 12mm;
        margin-bottom: 16mm;
      }
      * { box-sizing: border-box; }
      /* Arial en Windows y Liberation/Arimo en Linux (Playwright).
         Evitar system-ui/Segoe: en producción se ve más alta y grande. */
      @font-face {
        font-family: 'PdfSans';
        src: local('Arial'), local('Helvetica'), local('Liberation Sans'), local('Arimo'), local('Nimbus Sans');
        font-style: normal;
        font-weight: 400;
      }
      @font-face {
        font-family: 'PdfSans';
        src: local('Arial Bold'), local('Helvetica Bold'), local('Liberation Sans Bold'), local('Arimo Bold'), local('Nimbus Sans Bold');
        font-style: normal;
        font-weight: 700;
      }
      html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
      body {
        font-family: PdfSans, Arial, Helvetica, sans-serif;
        font-size: 10.5px;
        line-height: 1.4;
        letter-spacing: 0;
        font-synthesis: none;
        color: var(--body); background: #fff; margin: 0;
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
      .doc { width: 100%; }
      .pagebreak { page-break-before: always; break-before: page; }
      .avoid { page-break-inside: avoid; break-inside: avoid; }

      /* ---------- Encabezado ---------- */
      .head { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
      .brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
      .logo { width: 70px; height: 70px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; }
      .logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
      .brand .name { font-size: 12.5px; font-weight: 700; color: var(--navy); letter-spacing: .2px; }
      .brand .meta { margin-top: 4px; font-size: 8.8px; line-height: 1.45; color: var(--muted); }
      .brand .meta b { color: var(--body); font-weight: 700; }
      .docbox { flex: 0 0 auto; min-width: 190px; text-align: right; }
      .docbox .kind { font-size: 8.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--gold-ink); }
      .docbox .folio { margin-top: 3px; font-size: 22px; font-weight: 700; color: var(--navy); letter-spacing: -.3px; line-height: 1.05; }
      .docbox .emitido { margin-top: 5px; font-size: 9px; color: var(--muted); }
      .pill {
        display: inline-block; margin-top: 7px; padding: 3px 10px 3px 8px; border-radius: 999px;
        border: 1px solid; font-size: 8.5px; font-weight: 700; letter-spacing: .8px;
      }
      .pill .dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 5px; vertical-align: 1px; }
      .rule { margin: 12px 0 14px; height: 3px; background: linear-gradient(90deg, var(--gold) 0, var(--gold) 64px, var(--navy) 64px, var(--navy) 100%); border-radius: 2px; }

      /* ---------- Título ---------- */
      .title-eyebrow { font-size: 8.5px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; color: var(--muted); }
      .title { margin-top: 3px; font-size: 19px; font-weight: 700; color: var(--ink); letter-spacing: -.4px; line-height: 1.15; }
      .tags { margin-top: 7px; }
      .tag {
        display: inline-block; margin: 0 5px 4px 0; padding: 3px 9px; border-radius: 999px;
        background: var(--navy-soft); color: var(--navy); font-size: 8.8px; font-weight: 700;
      }

      /* ---------- Indicadores ---------- */
      .kpis { display: flex; margin-top: 12px; border: 1px solid var(--hair); border-radius: 10px; overflow: hidden; }
      .kpi { flex: 1; padding: 9px 12px; border-left: 1px solid var(--hair); background: var(--soft); min-width: 0; }
      .kpi:first-child { border-left: 0; }
      .kpi .k { font-size: 8px; font-weight: 700; letter-spacing: .9px; text-transform: uppercase; color: var(--muted); }
      .kpi .v { margin-top: 3px; font-size: 12.5px; font-weight: 700; color: var(--ink); white-space: nowrap; }
      .kpi.avance { flex: 1.3; background: #fff; }
      .bar { margin-top: 5px; height: 4px; border-radius: 99px; background: var(--hair); overflow: hidden; }
      .bar > span { display: block; height: 100%; border-radius: 99px; background: var(--navy); }

      /* ---------- Secciones ---------- */
      .section { margin-top: 18px; }
      .sec-head { display: flex; align-items: baseline; gap: 8px; padding-bottom: 6px; border-bottom: 1px solid var(--hair); margin-bottom: 8px; }
      .sec-num { font-size: 9px; font-weight: 700; color: var(--gold-ink); letter-spacing: .5px; }
      .sec-title { font-size: 10.5px; font-weight: 700; color: var(--navy); letter-spacing: 1.1px; text-transform: uppercase; }
      .cols { display: flex; gap: 22px; }
      .cols > .col { flex: 1; min-width: 0; }
      .muted { color: var(--muted); font-size: 10px; }
      .pre { white-space: pre-wrap; overflow-wrap: anywhere; }

      .kv { width: 100%; border-collapse: collapse; }
      .kv th, .kv td { text-align: left; vertical-align: top; padding: 5px 0; border-bottom: 1px solid #EFF0F4; }
      .kv tr:last-child th, .kv tr:last-child td { border-bottom: 0; }
      .kv th { width: 40%; padding-right: 10px; font-size: 8.8px; font-weight: 700; color: var(--muted); letter-spacing: .4px; text-transform: uppercase; }
      .kv td { font-size: 10.5px; color: var(--ink); }
      .kv .strong { font-weight: 700; }
      .role { display: inline-block; margin-left: 6px; padding: 1px 7px; border-radius: 999px; background: #FFF4E0; color: var(--gold-ink); font-size: 8px; font-weight: 700; letter-spacing: .4px; vertical-align: 1px; }

      /* ---------- Cotizaciones ---------- */
      .cot-table { width: 100%; border-collapse: collapse; font-size: 10px; }
      .cot-table th {
        text-align: left; padding: 6px 10px; background: var(--navy); color: #fff;
        font-size: 8.5px; font-weight: 700; letter-spacing: .8px; text-transform: uppercase;
      }
      .cot-table th:first-child { border-top-left-radius: 6px; }
      .cot-table th:last-child { border-top-right-radius: 6px; }
      .cot-table td { padding: 6px 10px; border-bottom: 1px solid var(--hair); color: var(--ink); }
      .cot-table tbody tr:nth-child(even) td { background: var(--soft); }
      .cot-table .cot-num { width: 44px; text-align: center; color: var(--muted); }
      .cot-table .cot-folio { white-space: nowrap; color: var(--navy); }
      .cot-table .cot-date { width: 110px; white-space: nowrap; text-align: right; }
      .cot-table th.cot-date { text-align: right; }

      /* ---------- Bitácora (línea de tiempo) ---------- */
      .timeline { position: relative; }
      .bitacora-day { display: flex; gap: 14px; page-break-inside: avoid; break-inside: avoid; }
      .bitacora-day .when { flex: 0 0 74px; text-align: right; padding-top: 1px; }
      .bitacora-day .when .d { font-size: 10.5px; font-weight: 700; color: var(--navy); }
      .bitacora-day .when .f { margin-top: 1px; font-size: 8.8px; color: var(--muted); }
      .bitacora-day .rail { flex: 0 0 12px; position: relative; }
      .bitacora-day .rail::before { content: ""; position: absolute; left: 5px; top: 0; bottom: 0; width: 2px; background: var(--hair); }
      .bitacora-day:first-child .rail::before { top: 5px; }
      .bitacora-day:last-child .rail::before { bottom: auto; height: 6px; }
      .bitacora-day .rail::after {
        content: ""; position: absolute; left: 1px; top: 3px; width: 10px; height: 10px; border-radius: 50%;
        background: #fff; border: 2px solid var(--gold); box-sizing: border-box;
      }
      .bitacora-day .body { flex: 1; min-width: 0; padding-bottom: 14px; }
      .bitacora-day:last-child .body { padding-bottom: 0; }
      .bitacora-day .nota { font-size: 10.5px; color: var(--ink); }
      .bitacora-photos { display: flex; gap: 8px; margin-top: 7px; }
      .bitacora-photo { flex: 1; max-width: 50%; height: 118px; border-radius: 6px; overflow: hidden; background: var(--soft); border: 1px solid var(--hair); }
      .bitacora-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }

      /* ---------- Firmas ---------- */
      .signatures-section { page-break-inside: avoid; break-inside: avoid; }
      .sigs { display: flex; gap: 22px; page-break-inside: avoid; break-inside: avoid; }
      .sigbox { flex: 1; min-width: 0; page-break-inside: avoid; break-inside: avoid; }
      .sigimgwrap {
        height: 120px; padding: 8px; display: flex; align-items: flex-end; justify-content: center;
        overflow: hidden; background: var(--soft); border-radius: 8px 8px 0 0;
      }
      .sigimgwrap img { display: block; max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; }
      .sigimgwrap .muted { align-self: center; }
      .sigline { border-top: 1.5px solid var(--navy); padding-top: 6px; text-align: center; }
      .sigline .who { font-size: 10.5px; font-weight: 700; color: var(--ink); }
      .sigline .as { margin-top: 1px; font-size: 8.5px; color: var(--muted); letter-spacing: .6px; text-transform: uppercase; }
      .legal { margin-top: 10px; font-size: 8.8px; color: var(--muted); text-align: center; }

      /* ---------- Evidencias ---------- */
      .minihead { display: flex; justify-content: space-between; align-items: baseline; padding-bottom: 7px; border-bottom: 3px solid var(--navy); margin-bottom: 14px; }
      .minihead .l { font-size: 10px; font-weight: 700; color: var(--navy); letter-spacing: 1px; text-transform: uppercase; }
      .minihead .r { font-size: 9px; color: var(--muted); }
      .minihead .r b { color: var(--navy); }
      .photos { display: flex; flex-wrap: wrap; gap: 12px; }
      .photo-card { width: calc(50% - 6px); page-break-inside: avoid; break-inside: avoid; }
      .photo-box { height: 230px; border-radius: 8px; overflow: hidden; background: var(--soft); border: 1px solid var(--hair); }
      .photo-box img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .photo-cap { margin-top: 4px; font-size: 8.8px; color: var(--muted); }
      .photo-cap b { color: var(--navy); }

      .endnote { margin-top: 18px; padding-top: 8px; border-top: 1px solid var(--hair); font-size: 8.5px; color: var(--muted); display: flex; justify-content: space-between; }
"""


def _kv_rows(rows: list[tuple[str, str]]) -> str:
    """Tabla etiqueta/valor; los valores ya vienen escapados."""
    body = "".join(f"<tr><th scope='row'>{esc(k)}</th><td>{v}</td></tr>" for k, v in rows)
    return f"<table class='kv'>{body}</table>"


def _section(num: int, title: str, body: str, extra_class: str = "") -> str:
    cls = f"section {extra_class}".strip()
    return (
        f"<section class='{cls}'>"
        f"<div class='sec-head'><span class='sec-num'>{num:02d}</span>"
        f"<span class='sec-title'>{esc(title)}</span></div>"
        f"{body}</section>"
    )


def generate_proyecto_pdf_html(proyecto) -> str:
    """Genera el HTML para el PDF del proyecto (sin precios)."""
    from django.utils import timezone

    status = str(getattr(proyecto, "status", "") or "en_proceso").strip().lower()
    status_text = _STATUS_LABELS.get(status, status.replace("_", " ").upper() or "EN PROCESO")
    status_bg, status_border, status_fg, status_dot = _STATUS_STYLES.get(
        status, ("#F4F4F5", "#E4E4E7", "#3F3F46", "#71717A")
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
    tags_html = "".join(f"<span class='tag'>{esc(n)}</span>" for n in tipo_labels)

    fechas_inicio = getattr(proyecto, "fechas_inicio", None)
    if not isinstance(fechas_inicio, list):
        fechas_inicio = []
    fecha_inicio_txt, fecha_fin_txt = _fecha_extremos(fechas_inicio)
    jornadas = len([f for f in fechas_inicio if f and str(f).strip()])

    cotizaciones_html = _render_cotizaciones_adjuntas_html(_cotizaciones_adjuntas(proyecto))

    bitacora = _bitacora_entries(getattr(proyecto, "notas_por_dia", None), fechas_inicio)
    evidencias = getattr(proyecto, "evidencias_urls", None)
    if not isinstance(evidencias, list):
        evidencias = []
    evidencias = [u for u in evidencias if isinstance(u, str) and u.strip()][:12]
    firma_tecnico_url = str(getattr(proyecto, "firma_tecnico_url", "") or "").strip()
    firma_cliente_url = str(getattr(proyecto, "firma_cliente_url", "") or "").strip()
    embedded = embed_remote_images(
        [*[u for entry in bitacora for u in entry["fotos"]], *evidencias]
    )

    # ---------- Bitácora ----------
    if bitacora:
        days = []
        for entry in bitacora:
            fecha_html = (
                f"<div class='f'>{esc(entry['fecha'])}</div>"
                if entry["fecha"] and entry["fecha"] != "-"
                else ""
            )
            nota_html = (
                f"<div class='nota pre'>{esc(entry['nota'])}</div>"
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
            days.append(
                "<article class='bitacora-day'>"
                f"<div class='when'><div class='d'>Día {entry['dia']}</div>{fecha_html}</div>"
                "<div class='rail'></div>"
                f"<div class='body'>{nota_html}{fotos_html}</div>"
                "</article>"
            )
        bitacora_html = f"<div class='timeline'>{''.join(days)}</div>"
    else:
        bitacora_html = "<div class='muted'>Sin bitácora registrada.</div>"

    # ---------- Evidencias ----------
    fotos_embedded = [embedded[u] for u in evidencias if u in embedded]
    evidencias_page = ""
    if fotos_embedded:
        cards = "".join(
            "<figure class='photo-card' style='margin:0'>"
            f"<div class='photo-box'><img src='{esc(src)}' alt='Evidencia {i}' /></div>"
            f"<figcaption class='photo-cap'><b>Evidencia {i:02d}</b> · {esc(folio_display)}</figcaption>"
            "</figure>"
            for i, src in enumerate(fotos_embedded, start=1)
        )
        evidencias_page = f"""
    <div class='pagebreak'></div>
    <div class='doc'>
      <div class='minihead'>
        <span class='l'>Evidencias fotográficas</span>
        <span class='r'><b>{esc(folio_display)}</b> · {esc(cliente_nombre)} · {len(fotos_embedded)} {'foto' if len(fotos_embedded) == 1 else 'fotos'}</span>
      </div>
      <div class='photos'>{cards}</div>
    </div>
"""

    firma_tecnico = firma_url_to_data_uri(firma_tecnico_url) if firma_tecnico_url else ""
    firma_cliente = firma_url_to_data_uri(firma_cliente_url) if firma_cliente_url else ""
    logo_data_uri = logo_data_uri_for_pdf()

    vehiculo = str(getattr(proyecto, "vehiculo_asignado", "") or "").strip() or "-"
    herramientas = str(getattr(proyecto, "herramientas_generales", "") or "").strip() or "-"
    try:
        avance = max(0, min(100, int(round(float(getattr(proyecto, "porcentaje_avance", 0) or 0)))))
    except (TypeError, ValueError):
        avance = 0
    fecha_auth = _fmt_date(getattr(proyecto, "fecha_autorizacion", None))
    hora_llegada = str(getattr(proyecto, "hora_llegada", "") or "").strip() or "-"
    hora_salida = str(getattr(proyecto, "hora_salida", "") or "").strip() or "-"
    emitido = _fmt_date(timezone.localdate())

    # ---------- Bloques de datos ----------
    cliente_kv = _kv_rows(
        [
            ("Cliente", f"<span class='strong'>{esc(cliente_nombre)}</span>"),
            ("Dirección", f"<span class='pre'>{esc(cliente_dir)}</span>"),
            ("Teléfono", esc(cliente_tel)),
        ]
    )
    equipo_rows = [
        ("Responsable", f"<span class='strong'>{esc(responsable_nombre)}</span>"
         if responsable_nombre != "-" else "-"),
    ]
    if otros_tecnicos:
        equipo_rows.append(("Otros técnicos", ", ".join(esc(n) for n in otros_tecnicos)))
    if auxiliares_nombres:
        equipo_rows.append(("Auxiliares", ", ".join(esc(n) for n in auxiliares_nombres)))
    equipo_rows.append(("Vehículo", f"<span class='pre'>{esc(vehiculo)}</span>"))
    equipo_kv = _kv_rows(equipo_rows)

    operacion_left = _kv_rows(
        [
            ("Fecha de inicio", esc(fecha_inicio_txt)),
            ("Fecha de finalización", esc(fecha_fin_txt)),
            ("Hora llegada", esc(hora_llegada)),
            ("Hora salida", esc(hora_salida)),
        ]
    )
    operacion_right = _kv_rows(
        [("Herramientas generales", f"<span class='pre'>{esc(herramientas)}</span>")]
    )

    firmas_html = f"""
          <div class='sigs'>
            <div class='sigbox'>
              <div class='sigimgwrap'>
                {f"<img src='{firma_tecnico}' alt='Firma técnico' />" if firma_tecnico else "<div class='muted'>Sin firma</div>"}
              </div>
              <div class='sigline'>
                <div class='who'>{esc(responsable_nombre)}</div>
                <div class='as'>Firma técnico responsable</div>
              </div>
            </div>
            <div class='sigbox'>
              <div class='sigimgwrap'>
                {f"<img src='{firma_cliente}' alt='Firma cliente' />" if firma_cliente else "<div class='muted'>Sin firma</div>"}
              </div>
              <div class='sigline'>
                <div class='who'>{esc(cliente_nombre)}</div>
                <div class='as'>Firma cliente · conformidad</div>
              </div>
            </div>
          </div>
          <div class='legal'>Con su firma, el cliente confirma la recepción de los trabajos descritos en este documento.</div>
"""

    html = f"""<!doctype html>
<html lang="es">
  <head>
    <meta charset='utf-8' />
    <meta name='viewport' content='width=device-width, initial-scale=1' />
    <title>Proyecto {esc(folio_display)}</title>
    <style>{_PDF_CSS}</style>
  </head>
  <body>
    <div class='doc'>
      <header class='head'>
        <div class='brand'>
          <div class='logo'>
            {f"<img src='{logo_data_uri}' alt='Intrax' />" if logo_data_uri else ""}
          </div>
          <div>
            <div class='name'>{_EMPRESA_NOMBRE}</div>
            <div class='meta'>
              <b>RFC:</b> IMA200110CI4<br/>
              Av. Elias Zamora Verduzco No. 149 Barrio 2, Valle de las garzas. #149<br/>
              Col: Valle de las Garzas C.P.: 20219 Barrio 2, Manzanillo, Colima, México<br/>
              <b>Tel:</b> 3141130469 &nbsp;·&nbsp; <b>Cel:</b> 3141245830 &nbsp;·&nbsp; <b>Mail:</b> hola@intrax.mx
            </div>
          </div>
        </div>
        <div class='docbox'>
          <div class='kind'>Reporte de proyecto</div>
          <div class='folio'>{esc(folio_display)}</div>
          <div class='pill' style='background: {status_bg}; border-color: {status_border}; color: {status_fg};'>
            <span class='dot' style='background: {status_dot};'></span>{esc(status_text)}
          </div>
          <div class='emitido'>Emitido el {esc(emitido)}</div>
        </div>
      </header>

      <div class='rule'></div>

      <div class='title-eyebrow'>Proyecto</div>
      <div class='title'>{esc(cliente_nombre)}</div>
      {f"<div class='tags'>{tags_html}</div>" if tags_html else ""}

      <div class='kpis avoid'>
        <div class='kpi'><div class='k'>Autorización</div><div class='v'>{esc(fecha_auth)}</div></div>
        <div class='kpi'><div class='k'>Inicio</div><div class='v'>{esc(fecha_inicio_txt)}</div></div>
        <div class='kpi'><div class='k'>Finalización</div><div class='v'>{esc(fecha_fin_txt)}</div></div>
        <div class='kpi'><div class='k'>Jornadas</div><div class='v'>{jornadas}</div></div>
        <div class='kpi avance'>
          <div class='k'>Avance</div><div class='v'>{avance}%</div>
          <div class='bar'><span style='width: {avance}%;'></span></div>
        </div>
      </div>

      <div class='cols avoid'>
        <div class='col'>{_section(1, "Datos del cliente", cliente_kv)}</div>
        <div class='col'>{_section(2, "Equipo de campo", equipo_kv)}</div>
      </div>

      {_section(3, "Operación", f"<div class='cols'><div class='col'>{operacion_left}</div><div class='col'>{operacion_right}</div></div>", "avoid")}

      {_section(4, "Cotizaciones adjuntas", cotizaciones_html, "avoid")}

      {_section(5, "Bitácora por jornada", bitacora_html)}

      {_section(6, "Firmas", firmas_html, "signatures-section")}

      <div class='endnote'>
        <span>{_EMPRESA_NOMBRE} · Proyecto {esc(folio_display)}</span>
        <span>Documento operativo sin precios · Emitido el {esc(emitido)}</span>
      </div>
    </div>
    {evidencias_page}
  </body>
</html>"""
    return html
