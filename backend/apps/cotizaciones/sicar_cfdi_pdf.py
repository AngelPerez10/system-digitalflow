"""HTML para PDF de CFDI con formato SICAR (solo lectura de datos)."""
from __future__ import annotations

import base64
import re
import xml.etree.ElementTree as ET
from datetime import date, datetime, timedelta
from decimal import Decimal

from apps.common.pdf_html import esc, load_public_image_data_uri, normalize_text

_TIPO_COMPROBANTE = {
    "I": "I-Ingreso",
    "E": "E-Egreso",
    "T": "T-Traslado",
    "N": "N-Nómina",
    "P": "P-Pago",
}


def _local_tag(tag: str) -> str:
    return tag.rsplit("}", 1)[-1] if "}" in tag else tag


def _pick_str(factura: dict, *keys: str) -> str:
    for key in keys:
        value = factura.get(key)
        if value is not None and str(value).strip():
            return normalize_text(str(value))
    return ""


def _as_money_sicar(value) -> str:
    if value is None or value == "":
        return "$ 0.00"
    try:
        n = Decimal(str(value))
        return f"$ {n:,.2f}"
    except Exception:
        return esc(value)


def _as_unit_price(value) -> str:
    if value is None or value == "":
        return "$ 0.00"
    try:
        n = Decimal(str(value))
        formatted = f"{n:,.4f}".rstrip("0").rstrip(".")
        if "." in formatted:
            whole, frac = formatted.split(".", 1)
            frac = frac.ljust(2, "0")[:4]
            formatted = f"{whole}.{frac}"
        else:
            formatted = f"{formatted}.00"
        return f"$ {formatted}"
    except Exception:
        return esc(value)


def _fmt_iso_datetime(value) -> str:
    if value is None or value == "":
        return ""
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%dT%H:%M:%S")
    if isinstance(value, date):
        return value.strftime("%Y-%m-%dT00:00:00")
    text = str(value).strip()
    if " " in text and "T" not in text:
        return text.replace(" ", "T", 1)
    return text


def _fmt_pagare_date(value, dias_credito: int) -> str:
    if isinstance(value, datetime):
        base = value.date()
    elif isinstance(value, date):
        base = value
    else:
        text = str(value or "").strip()
        if not text:
            return ""
        try:
            if "T" in text:
                base = datetime.fromisoformat(text.replace("Z", "")).date()
            elif " " in text:
                base = datetime.strptime(text[:19], "%Y-%m-%d %H:%M:%S").date()
            else:
                base = datetime.strptime(text[:10], "%Y-%m-%d").date()
        except ValueError:
            return ""
    due = base + timedelta(days=max(0, int(dias_credito or 0)))
    return due.strftime("%d/%m/%Y")


def _parse_xml_root(xml_bytes: bytes | bytearray | None) -> ET.Element | None:
    if not xml_bytes:
        return None
    try:
        return ET.fromstring(xml_bytes)
    except ET.ParseError:
        return None


def _comprobante_attrs(root: ET.Element | None) -> dict:
    if root is None or _local_tag(root.tag) != "Comprobante":
        return {}
    return dict(root.attrib)


def _timbre_attrs(root: ET.Element | None) -> dict:
    if root is None:
        return {}
    for elem in root.iter():
        if _local_tag(elem.tag) == "TimbreFiscalDigital":
            return dict(elem.attrib)
    return {}


def _parse_conceptos(root: ET.Element | None) -> list[dict]:
    if root is None:
        return []
    rows: list[dict] = []
    for elem in root.iter():
        if _local_tag(elem.tag) != "Concepto":
            continue
        attrs = elem.attrib
        rows.append(
            {
                "clave": attrs.get("ClaveProdServ", ""),
                "cantidad": attrs.get("Cantidad", ""),
                "unidad": attrs.get("Unidad", ""),
                "clave_unidad": attrs.get("ClaveUnidad", ""),
                "descripcion": normalize_text(attrs.get("Descripcion", "")),
                "precio": attrs.get("ValorUnitario", ""),
                "importe": attrs.get("Importe", ""),
            }
        )
    return rows


def _safe_filename_part(value: str) -> str:
    cleaned = re.sub(r"[^\w.\-]+", "_", (value or "").strip())
    return cleaned.strip("._") or "CFDI"


def cfdi_download_filename(serie_folio: str, uuid: str, ext: str) -> str:
    base = _safe_filename_part(serie_folio or uuid or "CFDI")
    uid = _safe_filename_part(uuid) if uuid else ""
    name = f"{base}_{uid}" if uid else base
    return f"{name}.{ext.lstrip('.')}"


def _tipo_comprobante_label(code: str) -> str:
    code = (code or "").strip().upper()
    return _TIPO_COMPROBANTE.get(code, code or "—")


def _letra_sin_parentesis(letra: str) -> str:
    text = (letra or "").strip()
    if text.startswith("(") and text.endswith(")"):
        return text[1:-1].strip()
    return text


def _build_concept_rows(conceptos: list[dict]) -> str:
    """Filas de conceptos; espaciador solo en facturas cortas (≤6 líneas)."""
    if not conceptos:
        return '<tr><td colspan="6" class="empty">Sin conceptos en el XML.</td></tr>'

    rows: list[str] = []
    for idx, row in enumerate(conceptos):
        clave_u = esc(row.get("clave_unidad") or "")
        unidad_cell = esc(row.get("unidad") or "")
        if clave_u and unidad_cell:
            unidad_html = f"{clave_u}<br/><span class='muted'>{unidad_cell}</span>"
        else:
            unidad_html = clave_u or unidad_cell
        zebra = " even" if idx % 2 else ""
        rows.append(
            f"""
        <tr class="data-row{zebra}">
          <td class="c-clave ta-left">{esc(row.get('clave'))}</td>
          <td class="c-cant ta-center">{esc(row.get('cantidad'))}</td>
          <td class="c-unidad ta-center">{unidad_html}</td>
          <td class="c-desc ta-left">{esc(row.get('descripcion'))}</td>
          <td class="c-precio ta-right">{_as_unit_price(row.get('precio'))}</td>
          <td class="c-importe ta-right">{_as_money_sicar(row.get('importe'))}</td>
        </tr>"""
        )

    # Relleno en facturas cortas: la fila crece y empuja sellos al pie de la 1ª hoja.
    if len(conceptos) <= 6:
        spacer_h = max(28, (7 - len(conceptos)) * 22)
        rows.append(
            f'<tr class="concept-spacer"><td colspan="6" style="height:{spacer_h}px"></td></tr>'
        )
    return "".join(rows)


_ITEMS_COLGROUP = """
    <colgroup>
      <col class="col-clave" />
      <col class="col-cant" />
      <col class="col-unidad" />
      <col class="col-desc" />
      <col class="col-precio" />
      <col class="col-importe" />
    </colgroup>"""


def generate_cfdi_pdf_html(
    factura: dict,
    *,
    xml_bytes: bytes | bytearray | None,
    cbb_png: bytes | bytearray | None,
    impuestos: list[dict] | None = None,
) -> str:
    root = _parse_xml_root(xml_bytes)
    comp = _comprobante_attrs(root)
    timbre = _timbre_attrs(root)
    conceptos = _parse_conceptos(root)

    version = _pick_str(factura, "versionCfdi") or comp.get("Version", "4.0")
    telefono = _pick_str(factura, "telefonoE")
    celular = _pick_str(factura, "celularE")
    mail = _pick_str(factura, "mailE")

    nombre_e = _pick_str(factura, "nombreE")
    rfc_e = _pick_str(factura, "rfcE")
    domicilio_e = _pick_str(factura, "domicilioE")
    colonia_e = _pick_str(factura, "coloniaE")
    cod_pos_e = _pick_str(factura, "codPosE")
    ciudad_e = _pick_str(factura, "ciudadE")
    estado_e = _pick_str(factura, "estadoE")
    pais_e = _pick_str(factura, "paisE")

    serie_folio = _pick_str(factura, "serieFolio", "serie_folio")
    uuid = _pick_str(factura, "uuid") or timbre.get("UUID", "")
    no_cert = _pick_str(factura, "noCertificado") or comp.get("NoCertificado", "")
    no_cert_sat = _pick_str(factura, "noSerieCert") or timbre.get("NoCertificadoSAT", "")
    fecha_cert = _fmt_iso_datetime(_pick_str(factura, "fechaCert") or timbre.get("FechaTimbrado", ""))

    ciudad_ubi = _pick_str(factura, "ciudadUbi")
    estado_ubi = _pick_str(factura, "estadoUbi")
    fecha_emision = _fmt_iso_datetime(_pick_str(factura, "fecha") or comp.get("Fecha", ""))

    moneda = _pick_str(factura, "moneda", "monAbr") or comp.get("Moneda", "MXN")
    tipo_cambio = _pick_str(factura, "monTipoCambio") or "1.000000"
    forma_pago = _pick_str(factura, "formaPago", "forma_pago") or comp.get("FormaPago", "")
    metodo_pago = _pick_str(factura, "metodoPago", "metodo_pago") or comp.get("MetodoPago", "")
    regimen = _pick_str(factura, "regimen")
    tipo_comp = _tipo_comprobante_label(comp.get("TipoDeComprobante", "I"))
    exportacion = comp.get("Exportacion", "01")

    nombre_c = _pick_str(factura, "nombreC", "nombre_c")
    rfc_c = _pick_str(factura, "rfcC", "rfc_c")
    domicilio_c = _pick_str(factura, "domicilioC")
    colonia_c = _pick_str(factura, "coloniaC")
    localidad_c = _pick_str(factura, "localidadC") or "-"
    ciudad_c = _pick_str(factura, "ciudadC")
    estado_c = _pick_str(factura, "estadoC") or "-"
    cod_pos_c = _pick_str(factura, "codPosC")
    pais_c = _pick_str(factura, "paisC")
    uso_cfdi = _pick_str(factura, "usoCfdi")
    regimen_c = _pick_str(factura, "regimenC")
    reg_clave_c = factura.get("regClaveC")
    if reg_clave_c and regimen_c and "-" not in regimen_c[:4]:
        regimen_c = f"{reg_clave_c}-{regimen_c}"
    elif reg_clave_c and not regimen_c:
        regimen_c = str(reg_clave_c)

    subtotal = factura.get("subtotal") or comp.get("SubTotal")
    total = factura.get("total") or comp.get("Total")
    letra = _pick_str(factura, "letra")
    letra_plain = _letra_sin_parentesis(letra)

    sello = _pick_str(factura, "selloDigital") or comp.get("Sello", "") or timbre.get("SelloCFD", "")
    sello_sat = _pick_str(factura, "selloSat") or timbre.get("SelloSAT", "")
    cadena = _pick_str(factura, "cadenaOriginal")

    dias_credito = int(factura.get("diasCredito") or 0)
    pagare_fecha = _fmt_pagare_date(factura.get("fecha"), dias_credito)

    iva_total = None
    for imp in impuestos or []:
        nombre = normalize_text(str(imp.get("nombreImp") or ""))
        if "I.V.A" in nombre.upper() or nombre.upper() == "IVA":
            iva_total = imp.get("total")
            break
    if iva_total is None:
        for imp in impuestos or []:
            if imp.get("tras"):
                iva_total = imp.get("total")
                break

    qr_src = ""
    if cbb_png:
        qr_src = "data:image/png;base64," + base64.b64encode(bytes(cbb_png)).decode("ascii")

    logo_data_uri = load_public_image_data_uri("images/logo/intrax-logo.png")

    concept_rows = _build_concept_rows(conceptos)
    short_doc = len(conceptos) <= 6
    body_class = "short-doc" if short_doc else "long-doc"

    contact_parts = []
    if telefono:
        contact_parts.append(f"Tel: {esc(telefono)}")
    if celular:
        contact_parts.append(f"Cel: {esc(celular)}")
    if mail:
        contact_parts.append(f"eMail: {esc(mail)}")
    contact_line = " ".join(contact_parts)

    emisor_address = "<br/>".join(
        filter(
            None,
            [
                esc(domicilio_e),
                f"Col: {esc(colonia_e)} C.P.: {esc(cod_pos_e)}" if colonia_e or cod_pos_e else "",
                f"{esc(ciudad_e)}, {esc(ciudad_e)}, {esc(estado_e)} , {esc(pais_e)}".strip(" ,"),
            ],
        )
    )

    pagare_text = (
        f"DEBO Y PAGARE INCONDICIONALMENTE A LA ORDEN DE <strong>{esc(nombre_e.upper())}</strong> EN ESTA CIUDAD O EN "
        f"CUALQUIER OTRA QUE SE ME REQUIERA EL DIA <strong>{esc(pagare_fecha)}</strong> LA CANTIDAD DE "
        f"<strong>{_as_money_sicar(total)}</strong> "
        f"(<strong>{esc(letra_plain.upper())}</strong>) VALOR DE LAS MERCANCIAS O SERVICIOS RECIBIDOS A MI "
        f"ENTERA CONFORMIDAD. ESTE PAGARE ES MERCANTIL Y ESTA REGIDO POR LA LEY GENERAL DE TITULOS Y "
        f"OPERACIONES DE CREDITO EN SUS ARTICULOS 172 Y 173 PARTE FINAL POR NO SER PAGARE DOMICILIADO Y "
        f"ARTICULOS CORRELATIVOS QUEDA CONVENIDO QUE EN CASO DE MORA, EL PRESENTE TITULO CAUSARA UN "
        f"INTERES DEL 2.5% MENSUAL"
    )

    logo_img = f'<img class="logo" src="{logo_data_uri}" alt="Intrax" />' if logo_data_uri else ""

    expedido_line = (
        f"{esc(ciudad_ubi)}, {esc(estado_ubi)} Estado, a {esc(fecha_emision)}"
        if ciudad_ubi or estado_ubi
        else f"a {esc(fecha_emision)}"
    )

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>{esc(serie_folio)}</title>
  <style>
    :root {{
      --ink: #1c1c1e;
      --muted: #5c5c63;
      --line: #c8c8cc;
      --line-soft: #e4e4e7;
      --surface: #f4f4f5;
      --surface-strong: #e8e8ec;
      --accent: #b42318;
      --brand: #1e3a5f;
      --brand-accent: #3160e3;
      --brand-accent-soft: #e8edfc;
      --white: #ffffff;
    }}
    @page {{ size: letter; margin: 5mm 6mm; }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    html, body {{ height: auto; min-height: 0; }}
    body {{
      font-family: "Segoe UI", Arial, Helvetica, sans-serif;
      font-size: 8.5px;
      color: var(--ink);
      line-height: 1.3;
      width: 100%;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }}
    table {{ border-collapse: collapse; width: 100%; }}
    .ta-left {{ text-align: left; }}
    .ta-center {{ text-align: center; }}
    .ta-right {{ text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }}
    .muted {{ color: var(--muted); font-size: 7px; }}
    .section {{ margin-bottom: 4px; }}

    /* Encabezado */
    .hdr td {{ vertical-align: top; }}
    .hdr-logo {{ width: 15%; padding-right: 8px; }}
    .hdr-emisor {{ width: 50%; text-align: center; padding: 0 8px; }}
    .hdr-doc {{ width: 35%; }}
    .logo {{ width: 80px; height: auto; display: block; }}
    .emisor-name {{
      font-weight: 600; font-size: 10.5px; color: var(--brand);
      letter-spacing: 0.02em; margin-bottom: 2px;
    }}
    .emisor-rfc {{ font-size: 8.5px; color: var(--muted); margin-bottom: 3px; }}
    .emisor-addr, .contact {{ font-size: 8px; line-height: 1.4; color: var(--ink); }}
    .contact {{ margin-top: 3px; color: var(--muted); }}
    .doc-panel {{
      border: 1px solid var(--line);
      border-radius: 3px;
      padding: 6px 8px;
      background: var(--surface);
    }}
    .doc-title {{
      font-size: 9.5px; font-weight: 600; text-align: right;
      color: var(--brand); letter-spacing: 0.03em;
    }}
    .folio {{
      font-size: 17px; font-weight: 700; color: var(--accent);
      text-align: right; margin: 3px 0 5px; letter-spacing: 0.02em;
    }}
    .cert td {{ font-size: 7.5px; padding: 1px 0; vertical-align: top; }}
    .cert .lbl {{
      text-align: right; padding-right: 5px; font-weight: 600;
      color: var(--muted); white-space: nowrap; width: 46%;
    }}
    .cert .val {{ text-align: left; word-break: break-all; width: 54%; font-size: 7px; }}
    .cert .val.date {{ white-space: nowrap; word-break: normal; font-size: 7.5px; }}

    .divider {{ border-top: 1px solid var(--line); margin: 4px 0; }}

    /* Meta fiscal */
    .bar {{
      font-size: 8px; background: var(--surface-strong);
      border: 1px solid var(--line); border-radius: 2px;
    }}
    .bar td {{ padding: 4px 8px; }}
    .bar .l {{ width: 42%; font-weight: 600; color: var(--ink); }}
    .bar .r {{ width: 58%; text-align: right; white-space: nowrap; color: var(--ink); }}
    .info td {{ font-size: 8px; vertical-align: top; padding: 3px 0; width: 50%; }}
    .info .r {{ padding-left: 12px; }}
    .info .label {{ font-weight: 600; color: var(--muted); }}

    /* Receptor */
    .receptor {{
      border: 1px solid var(--line); border-radius: 2px;
      overflow: hidden; page-break-inside: avoid;
    }}
    .receptor .vlabel {{
      width: 16px; background: var(--surface-strong);
      border-right: 1px solid var(--line);
      text-align: center; font-weight: 700; font-size: 7.5px;
      color: var(--muted); letter-spacing: 0.08em;
      writing-mode: vertical-rl; transform: rotate(180deg);
    }}
    .receptor .data {{ padding: 5px 8px; font-size: 8px; background: var(--white); }}
    .receptor .data table {{ width: 100%; }}
    .receptor .data td {{ padding: 2px 8px 2px 0; vertical-align: top; }}
    .receptor .data .lbl {{ font-weight: 600; color: var(--muted); white-space: nowrap; width: 58px; }}

    /* Conceptos — anchos fijos vía colgroup */
    .items-wrap {{ margin-top: 3px; }}
    .grid {{
      font-size: 8px; table-layout: fixed;
      border: 1px solid var(--line); border-radius: 2px;
    }}
    .grid .col-clave {{ width: 11%; }}
    .grid .col-cant {{ width: 6%; }}
    .grid .col-unidad {{ width: 10%; }}
    .grid .col-desc {{ width: 44%; }}
    .grid .col-precio {{ width: 14%; }}
    .grid .col-importe {{ width: 15%; }}
    .grid thead {{ display: table-header-group; }}
    .grid th {{
      background: var(--surface-strong); font-size: 7px; font-weight: 700;
      padding: 4px 5px; color: var(--brand);
      border-bottom: 1px solid var(--line);
      letter-spacing: 0.03em; text-transform: uppercase;
      vertical-align: bottom;
    }}
    .grid td {{ padding: 3px 5px; vertical-align: top; }}
    .grid .data-row {{ page-break-inside: avoid; }}
    .grid .data-row.even td {{ background: var(--surface); }}
    .grid .c-desc {{
      overflow-wrap: anywhere; word-break: break-word; white-space: normal;
    }}
    .grid .c-importe {{ font-weight: 600; }}
    .grid .concept-spacer td {{
      border: none; padding: 0; line-height: 0; font-size: 0;
      background: transparent !important;
    }}
    .grid .empty {{ text-align: center; padding: 10px; color: var(--muted); }}

    /* Totales alineados con columnas precio/importe */
    .closing {{ margin-top: 4px; }}
    .letra-totals {{ border: none; }}
    .letra-totals-row {{ page-break-inside: avoid; }}
    .letra-totals-row td {{ vertical-align: top; padding: 0; }}
    .letra-cell {{ padding-right: 0; }}
    .totals-cell {{ padding-left: 0; vertical-align: top; }}
    .letra-box {{
      border: 1px solid var(--line); border-radius: 2px 0 0 2px;
      border-right: none; padding: 5px 7px; background: var(--white);
      height: 100%;
    }}
    .letra-title {{
      font-weight: 700; font-size: 7px; margin-bottom: 2px;
      color: var(--muted); letter-spacing: 0.05em; text-transform: uppercase;
    }}
    .letra-text {{ font-size: 8px; line-height: 1.35; }}
    .totals {{
      border: 1px solid var(--line); border-radius: 0 2px 2px 0;
      overflow: hidden; width: 100%;
    }}
    .totals td {{ padding: 4px 6px; font-size: 8px; border-bottom: 1px solid var(--line-soft); }}
    .totals tr:last-child td {{ border-bottom: none; }}
    .totals .lbl {{
      background: var(--surface); text-align: right; font-weight: 600;
      color: var(--muted); width: 48%;
    }}
    .totals .amt {{ text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }}
    .totals .total-row .lbl {{ background: var(--surface-strong); color: var(--ink); font-weight: 700; }}
    .totals .total-row .amt {{ font-weight: 700; font-size: 9px; color: var(--brand); }}

    /* Pagaré */
    .pagare {{
      border: 1px solid var(--line); border-radius: 2px;
      margin-top: 4px; overflow: hidden; page-break-inside: avoid;
    }}
    .pagare .vlabel {{
      width: 16px; background: var(--surface-strong);
      border-right: 1px solid var(--line);
      text-align: center; font-weight: 700; font-size: 7.5px; color: var(--muted);
      writing-mode: vertical-rl; transform: rotate(180deg); letter-spacing: 0.08em;
    }}
    .pagare .body {{
      padding: 7px 9px; font-size: 7px; text-align: justify;
      line-height: 1.4; background: var(--white); color: var(--ink);
    }}
    .pagare .firma {{
      margin-top: 10px; font-weight: 600; font-size: 7.5px;
      border-top: 1px solid var(--line); padding-top: 3px; width: 140px; color: var(--muted);
    }}

    /* Sellos */
    .stamps-block {{ margin-top: 4px; }}
    .stamps td {{ vertical-align: top; }}
    .qr-wrap {{ width: 110px; padding-right: 10px; }}
    .qr {{ width: 104px; height: 104px; display: block; border: 1px solid var(--line-soft); border-radius: 2px; }}
    .sellos {{ font-size: 6.5px; line-height: 1.2; }}
    .sellos .t {{ font-weight: 700; margin: 3px 0 1px; font-size: 7px; color: var(--brand); }}
    .sellos .v {{ word-break: break-all; color: var(--ink); }}
    .cadena {{
      margin-top: 5px; padding: 5px 6px;
      background: var(--surface); border: 1px solid var(--line-soft); border-radius: 2px;
    }}
    .cadena .t {{ font-weight: 700; font-size: 7px; color: var(--brand); }}
    .cadena .v {{ font-size: 6.5px; word-break: break-all; line-height: 1.15; margin-top: 2px; }}
    .cfdi-note {{
      text-align: center; font-size: 7px; margin-top: 4px; color: var(--muted);
    }}
    .foot td {{ font-size: 7px; padding-top: 3px; border-top: 1px solid var(--line-soft); }}
    .foot .l {{ text-align: left; font-weight: 600; width: 33%; color: var(--brand); }}
    .foot .c {{ text-align: center; width: 34%; font-weight: 600; color: var(--muted); }}
    .foot .r {{ text-align: right; width: 33%; color: var(--muted); }}

    /* SICAR-like print skin: compact, flat, and aligned to the reference sheet. */
    @page {{
      size: Letter;
      margin: 6mm 6mm 9mm;
      @bottom-right {{
        content: "Página " counter(page);
        font-family: Arial, Helvetica, sans-serif;
        font-size: 12.5px;
        font-weight: 700;
        color: #000;
      }}
    }}
    body {{
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10.5px;
      line-height: 1.28;
      color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }}
    body.short-doc .sheet {{
      display: flex;
      flex-direction: column;
      min-height: calc(279.4mm - 15mm);
    }}
    body.short-doc .cfdi-main {{ flex: 1 1 auto; }}
    body.short-doc .stamps-block {{
      flex: 0 0 auto;
      margin-top: auto;
      page-break-before: avoid;
    }}
    body.long-doc .sheet {{ display: block; }}
    body.long-doc .stamps-block {{ margin-top: 6px; }}
    .cfdi-main {{ flex: 0 1 auto; }}
    .section {{ margin-bottom: 2px; }}
    .muted {{ color: #4f4f4f; font-size: 8.8px; }}
    .hdr {{ margin-top: 1px; }}
    .hdr-logo {{ width: 27%; padding: 0 10px 0 28px; vertical-align: middle; }}
    .hdr-emisor {{ width: 37%; text-align: left; padding: 2px 12px 0 0; }}
    .hdr-doc {{ width: 36%; padding-left: 14px; border-left: 1px solid #cfcfcf; }}
    .logo {{ width: 125px; }}
    .emisor-name {{ color: #000; font-size: 12.5px; font-weight: 500; letter-spacing: 0; margin-bottom: 2px; }}
    .emisor-name strong {{ font-weight: 700; }}
    .emisor-rfc {{ color: #000; font-size: 10.5px; margin-bottom: 2px; }}
    .emisor-rfc strong {{ font-weight: 700; }}
    .emisor-addr, .contact {{ color: #000; font-size: 9.8px; line-height: 1.28; }}
    .contact {{ margin-top: 2px; }}
    .doc-panel {{ border: none; background: transparent; border-radius: 0; padding: 0; }}
    .doc-title {{ color: #000; font-size: 10.8px; font-weight: 700; text-align: right; letter-spacing: 0; }}
    .folio {{ color: #e60000; font-size: 15.5px; font-weight: 700; text-align: right; margin: 1px 0 3px; }}
    .cert td {{ font-size: 8.8px; padding: 0 0 1px; }}
    .cert .lbl {{ color: #333; width: 45%; padding-right: 4px; font-weight: 500; }}
    .cert .val {{ color: #000; width: 55%; font-size: 8.8px; text-align: right; word-break: break-word; }}
    .cert .val.date {{ font-size: 8.8px; text-align: right; }}
    .divider {{ border-top: 1px solid #bfbfbf; margin: 5px 0 3px; }}
    .bar {{ border: none; border-bottom: 1px solid #c6c6c6; background: transparent; border-radius: 0; font-size: 9px; }}
    .bar td {{ padding: 2px 0 3px; }}
    .bar .l {{ width: 45%; color: #000; font-weight: 500; }}
    .bar .r {{ width: 55%; color: #000; font-size: 9px; }}
    .info {{ border-bottom: 1px solid #d2d2d2; margin-bottom: 1px; }}
    .info td {{ font-size: 9px; padding: 2px 0 4px; }}
    .info .r {{ padding-left: 20px; text-align: right; }}
    .info .label {{ color: #222; font-weight: 600; display: inline-block; min-width: 58px; }}
    .receptor {{ border: none; border-radius: 0; margin-top: 1px; page-break-inside: avoid; }}
    .receptor .vlabel {{ width: 20px; background: var(--brand-accent-soft); border-right: none; color: #555; font-size: 12px; letter-spacing: .08em; }}
    .receptor .data {{ padding: 7px 0 7px 8px; border-bottom: 1px solid #cfcfcf; background: transparent; }}
    .receptor .data td {{ padding: 1px 6px 1px 0; font-size: 9.3px; }}
    .receptor .data .lbl {{ width: 54px; color: #555; font-weight: 500; text-align: right; padding-right: 7px; }}
    .items-wrap {{ margin-top: 2px; }}
    .grid {{ width: 100%; border: none; border-radius: 0; font-size: 9.5px; table-layout: fixed; }}
    .grid .col-clave {{ width: 9%; }}
    .grid .col-cant {{ width: 7%; }}
    .grid .col-unidad {{ width: 9%; }}
    .grid .col-desc {{ width: 48%; }}
    .grid .col-precio {{ width: 13.5%; }}
    .grid .col-importe {{ width: 13.5%; }}
    .grid th {{
      background: var(--brand-accent-soft); color: #000; font-size: 9.3px; padding: 3px 5px;
      border-top: 1px solid #c7c7c7; border-bottom: 1px solid #bfbfbf;
      letter-spacing: 0;
    }}
    .grid td {{ padding: 2.5px 5px; line-height: 1.2; }}
    .grid .data-row.even td {{ background: transparent; }}
    .grid .c-clave, .grid .c-cant, .grid .c-unidad {{ font-size: 9px; }}
    .grid .c-desc {{ font-size: 9.3px; overflow-wrap: anywhere; word-break: normal; hyphens: auto; white-space: normal; }}
    .grid .c-precio, .grid .c-importe {{ font-size: 9.2px; white-space: nowrap; }}
    .grid .concept-spacer td {{
      border: none; padding: 0; line-height: 0; font-size: 0;
      background: transparent !important; vertical-align: top;
    }}
    .closing {{ margin-top: 6px; }}
    .letra-totals {{ border-top: 1px solid #cfcfcf; }}
    .letra-cell {{ padding-right: 8px !important; }}
    .totals-cell {{ padding-left: 2px !important; }}
    .letra-box {{ border: none; border-radius: 0; border-right: none; padding: 0; background: transparent; }}
    .letra-title {{
      background: var(--brand-accent-soft); color: #000; text-align: center; font-size: 9.5px;
      padding: 3px 4px; margin-bottom: 5px;
    }}
    .letra-text {{ text-align: center; font-size: 9px; line-height: 1.28; }}
    .totals {{ border: none; border-radius: 0; }}
    .totals td {{ font-size: 10.2px; padding: 4px 5px; border-bottom: 1px solid #d5d5d5; }}
    .totals .lbl {{ background: var(--brand-accent-soft); color: #000; font-weight: 700; width: 58%; }}
    .totals .amt {{ background: #fff; color: #000; font-weight: 400; width: 42%; }}
    .totals .total-row .lbl, .totals .total-row .amt {{
      background: var(--brand-accent-soft); color: #000; font-size: 10.8px;
    }}
    .pagare {{ width: 52.5%; border: none; border-radius: 0; margin-top: 6px; page-break-inside: avoid; }}
    .pagare .vlabel {{
      width: 16px; background: var(--brand-accent-soft); border-right: 1px solid #cfcfcf;
      color: #555; font-size: 10px;
    }}
    .pagare .body {{ padding: 0 8px 2px; font-size: 8.2px; line-height: 1.16; }}
    .pagare .pagare-copy {{ margin: 0; }}
    .pagare .pagare-copy strong {{ font-weight: 700; }}
    .pagare .firma {{
      margin: 20px auto 0; width: 205px; color: #000; text-align: center; font-size: 8.8px;
      border-top: 1px solid #777; padding-top: 5px;
    }}
    .stamps-block {{ padding-top: 4px; }}
    .qr-wrap {{ width: 116px; padding: 0 8px 0 4px; }}
    .qr {{ width: 106px; height: 106px; border: none; border-radius: 0; }}
    .sellos {{ font-size: 7.8px; line-height: 1.18; }}
    .sellos .t {{ color: #000; font-size: 8.5px; margin: 0 0 1px; }}
    .sellos .v {{ color: #000; overflow-wrap: anywhere; word-break: break-word; }}
    .cadena {{ margin-top: 1px; padding: 0; background: transparent; border: none; border-radius: 0; }}
    .cadena .t {{ color: #000; font-size: 8.5px; }}
    .cadena .v {{ font-size: 7.8px; line-height: 1.18; overflow-wrap: anywhere; word-break: break-word; }}
    .cfdi-note-wrap {{ width: 100%; margin-top: 4px; }}
    .cfdi-note-wrap td {{ padding: 0; border: none; }}
    .cfdi-note {{
      text-align: right; color: #000; font-size: 9px; font-weight: 700;
      padding: 2px 0 4px; vertical-align: top;
    }}
    @media print {{
      .grid thead {{ display: table-header-group; }}
      .data-row, .letra-totals-row, .pagare {{ page-break-inside: avoid; }}
    }}
  </style>
</head>
<body class="{body_class}">
  <div class="sheet">
  <main class="cfdi-main">
  <div class="section hdr-wrap">
  <table class="hdr">
    <tr>
      <td class="hdr-logo">{logo_img}</td>
      <td class="hdr-emisor">
        <div class="emisor-name"><strong>{esc(nombre_e)}</strong></div>
        <div class="emisor-rfc"><strong>{esc(rfc_e)}</strong></div>
        <div class="emisor-addr">{emisor_address}</div>
        <div class="contact">{contact_line}</div>
      </td>
      <td class="hdr-doc">
        <div class="doc-panel">
          <div class="doc-title">FACTURA CFDI - VERSIÓN {esc(version)}</div>
          <div class="folio">{esc(serie_folio)}</div>
          <table class="cert">
            <tr>
              <td class="lbl">Folio Fiscal:</td>
              <td class="val">{esc(uuid)}</td>
            </tr>
            <tr>
              <td class="lbl">No. Certificado:</td>
              <td class="val">{esc(no_cert)}</td>
            </tr>
            <tr>
              <td class="lbl">No. Certificado SAT:</td>
              <td class="val">{esc(no_cert_sat)}</td>
            </tr>
            <tr>
              <td class="lbl">Fecha Certificación:</td>
              <td class="val date">{esc(fecha_cert)}</td>
            </tr>
          </table>
        </div>
      </td>
    </tr>
  </table>
  </div>

  <div class="divider"></div>

  <div class="section">
  <table class="bar">
    <tr>
      <td class="l">Tipo de Comprobante: {esc(tipo_comp)}</td>
      <td class="r">Expedido en: {expedido_line}</td>
    </tr>
  </table>
  </div>

  <div class="section">
  <table class="info">
    <tr>
      <td>
        <div><span class="label">Régimen:</span> {esc(regimen)}</div>
        <div><span class="label">Método de Pago:</span> {esc(metodo_pago)}</div>
        <div><span class="label">Forma de Pago:</span> {esc(forma_pago)}</div>
      </td>
      <td class="r">
        <div><span class="label">Exportación:</span> {esc(exportacion)}</div>
        <div><span class="label">Moneda:</span> {esc(moneda)}</div>
        <div><span class="label">Tipo de Cambio:</span> {esc(tipo_cambio)}</div>
      </td>
    </tr>
  </table>
  </div>

  <div class="section">
  <table class="receptor">
    <tr>
      <td class="vlabel">RECEPTOR</td>
      <td class="data">
        <table>
          <tr>
            <td class="lbl">Nombre:</td><td>{esc(nombre_c)}</td>
            <td class="lbl">R.F.C.:</td><td>{esc(rfc_c)}</td>
          </tr>
          <tr>
            <td class="lbl">Domicilio:</td><td>{esc(domicilio_c)}</td>
            <td class="lbl">Colonia:</td><td>{esc(colonia_c)}</td>
          </tr>
          <tr>
            <td class="lbl">Localidad:</td><td>{esc(localidad_c)}</td>
            <td class="lbl">Municipio:</td><td>{esc(ciudad_c)}</td>
          </tr>
          <tr>
            <td class="lbl">Estado:</td><td>{esc(estado_c)}</td>
            <td class="lbl">País:</td><td>{esc(pais_c)}</td>
          </tr>
          <tr>
            <td class="lbl">C.P.:</td><td>{esc(cod_pos_c)}</td>
            <td class="lbl">Uso CFDI:</td><td>{esc(uso_cfdi)}</td>
          </tr>
          <tr>
            <td class="lbl">Régimen:</td><td colspan="3">{esc(regimen_c)}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  </div>

  <div class="section items-wrap">
  <table class="grid items">
    {_ITEMS_COLGROUP}
    <thead>
      <tr>
        <th class="c-clave ta-left">Clave<br/>ProdServ</th>
        <th class="c-cant ta-center">Cant</th>
        <th class="c-unidad ta-center">Clave<br/>Unidad</th>
        <th class="c-desc ta-left">Descripción</th>
        <th class="c-precio ta-right">P. Unit.</th>
        <th class="c-importe ta-right">Importe</th>
      </tr>
    </thead>
    <tbody>{concept_rows}</tbody>
  </table>
  </div>

  <div class="closing">
  <table class="grid letra-totals">
    {_ITEMS_COLGROUP}
    <tr class="letra-totals-row">
      <td class="letra-cell" colspan="4">
        <div class="letra-box">
          <div class="letra-title">Cantidad con letra</div>
          <div class="letra-text">{esc(letra)}</div>
        </div>
      </td>
      <td class="totals-cell" colspan="2">
        <table class="totals">
          <tr>
            <td class="lbl">Subtotal</td>
            <td class="amt">{_as_money_sicar(subtotal)}</td>
          </tr>
          <tr>
            <td class="lbl">I.V.A.</td>
            <td class="amt">{_as_money_sicar(iva_total)}</td>
          </tr>
          <tr class="total-row">
            <td class="lbl">Total</td>
            <td class="amt">{_as_money_sicar(total)}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <table class="pagare">
    <tr>
      <td class="vlabel">PAGARÉ</td>
      <td class="body">
        <div class="pagare-copy">{pagare_text}</div>
        <div class="firma">FIRMA</div>
      </td>
    </tr>
  </table>
  </div>

  </main>
  <div class="stamps-block">
  <table class="stamps">
    <tr>
      <td class="qr-wrap">
        {'<img class="qr" src="' + qr_src + '" alt="QR" />' if qr_src else ''}
      </td>
      <td class="sellos">
        <div class="t">Sello Digital del CFDI</div>
        <div class="v">{esc(sello)}</div>
        <div class="t">Sello SAT</div>
        <div class="v">{esc(sello_sat)}</div>
        <div class="t">Cadena Original del Complemento de Certificación Digital del SAT</div>
        <div class="v">{esc(cadena)}</div>
      </td>
    </tr>
  </table>

  <table class="cfdi-note-wrap">
    <tr>
      <td class="cfdi-note">Este documento es una representación impresa de un CFDI</td>
    </tr>
  </table>
  </div>
  </div>
</body>
</html>"""
