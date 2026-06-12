"""HTML para PDF de CFDI a partir de datos SICAR (solo lectura)."""
from __future__ import annotations

import base64
import re
import xml.etree.ElementTree as ET
from decimal import Decimal

from apps.common.pdf_html import esc, normalize_text


def _as_money(value) -> str:
    if value is None or value == "":
        return "—"
    try:
        n = Decimal(str(value))
        return f"${n:,.2f}"
    except Exception:
        return esc(value)


def _local_tag(tag: str) -> str:
    return tag.rsplit("}", 1)[-1] if "}" in tag else tag


def _parse_conceptos(xml_bytes: bytes | bytearray | None) -> list[dict]:
    if not xml_bytes:
        return []
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError:
        return []

    rows: list[dict] = []
    for elem in root.iter():
        if _local_tag(elem.tag) != "Concepto":
            continue
        attrs = elem.attrib
        rows.append(
            {
                "cantidad": attrs.get("Cantidad", ""),
                "unidad": attrs.get("Unidad") or attrs.get("ClaveUnidad", ""),
                "descripcion": normalize_text(attrs.get("Descripcion", "")),
                "precio": attrs.get("ValorUnitario", ""),
                "importe": attrs.get("Importe", ""),
                "clave": attrs.get("ClaveProdServ", ""),
            }
        )
    return rows


def _comprobante_attrs(xml_bytes: bytes | bytearray | None) -> dict:
    if not xml_bytes:
        return {}
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError:
        return {}
    if _local_tag(root.tag) != "Comprobante":
        return {}
    return dict(root.attrib)


def _safe_filename_part(value: str) -> str:
    cleaned = re.sub(r"[^\w.\-]+", "_", (value or "").strip())
    return cleaned.strip("._") or "CFDI"


def cfdi_download_filename(serie_folio: str, uuid: str, ext: str) -> str:
    base = _safe_filename_part(serie_folio or uuid or "CFDI")
    uid = _safe_filename_part(uuid) if uuid else ""
    name = f"{base}_{uid}" if uid else base
    return f"{name}.{ext.lstrip('.')}"


def generate_cfdi_pdf_html(
    factura: dict,
    *,
    xml_bytes: bytes | bytearray | None,
    cbb_png: bytes | bytearray | None,
    impuestos: list[dict] | None = None,
) -> str:
    """Representación imprimible del CFDI (XML timbrado + datos facturacfdi)."""
    comp = _comprobante_attrs(xml_bytes)
    conceptos = _parse_conceptos(xml_bytes)

    serie_folio = normalize_text(factura.get("serieFolio") or factura.get("serie_folio") or "")
    folio = factura.get("folio") or comp.get("Folio") or ""
    uuid = normalize_text(factura.get("uuid") or "")
    emisor = normalize_text(factura.get("nombreE") or "")
    rfc_e = normalize_text(factura.get("rfcE") or "")
    receptor = normalize_text(factura.get("nombreC") or factura.get("nombre_c") or "")
    rfc_c = normalize_text(factura.get("rfcC") or factura.get("rfc_c") or "")
    subtotal = factura.get("subtotal") or comp.get("SubTotal")
    total = factura.get("total") or comp.get("Total")
    descuento = factura.get("descuento") or comp.get("Descuento")
    letra = normalize_text(factura.get("letra") or "")
    forma = normalize_text(factura.get("formaPago") or factura.get("forma_pago") or comp.get("FormaPago", ""))
    metodo = normalize_text(factura.get("metodoPago") or factura.get("metodo_pago") or comp.get("MetodoPago", ""))
    moneda = normalize_text(factura.get("moneda") or comp.get("Moneda") or "MXN")
    fecha = normalize_text(str(factura.get("fecha") or comp.get("Fecha") or ""))
    sello = normalize_text(str(factura.get("selloDigital") or comp.get("Sello") or ""))
    sello_sat = normalize_text(str(factura.get("selloSat") or ""))
    no_cert = normalize_text(str(factura.get("noCertificado") or comp.get("NoCertificado") or ""))

    qr_src = ""
    if cbb_png:
        qr_src = "data:image/png;base64," + base64.b64encode(bytes(cbb_png)).decode("ascii")

    concept_rows = ""
    if conceptos:
        for row in conceptos:
            concept_rows += f"""
            <tr>
              <td class="num">{esc(row.get('cantidad'))}</td>
              <td>{esc(row.get('unidad'))}</td>
              <td>{esc(row.get('clave'))}</td>
              <td class="desc">{esc(row.get('descripcion'))}</td>
              <td class="num">{esc(row.get('precio'))}</td>
              <td class="num">{esc(row.get('importe'))}</td>
            </tr>"""
    else:
        concept_rows = '<tr><td colspan="6" class="empty">Sin conceptos en el XML.</td></tr>'

    imp_rows = ""
    for imp in impuestos or []:
        nombre = normalize_text(imp.get("nombreImp") or "Impuesto")
        valor = imp.get("valor")
        total_imp = imp.get("total")
        imp_rows += f"""
        <tr>
          <td>{esc(nombre)}</td>
          <td class="num">{esc(valor)}</td>
          <td class="num">{_as_money(total_imp)}</td>
        </tr>"""

    imp_block = ""
    if imp_rows:
        imp_block = f"""
        <h2>Impuestos</h2>
        <table class="tbl">
          <thead><tr><th>Impuesto</th><th>Tasa</th><th>Importe</th></tr></thead>
          <tbody>{imp_rows}</tbody>
        </table>"""

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>{esc(serie_folio or f'CFDI {folio}')}</title>
  <style>
    @page {{ size: A4; margin: 14mm; }}
    * {{ box-sizing: border-box; }}
    body {{ font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1c1917; line-height: 1.45; }}
    h1 {{ font-size: 18px; margin: 0 0 4px; color: #cc785c; }}
    h2 {{ font-size: 12px; margin: 18px 0 8px; text-transform: uppercase; letter-spacing: 0.06em; color: #57534e; }}
    .header {{ display: flex; justify-content: space-between; gap: 16px; border-bottom: 2px solid #cc785c; padding-bottom: 12px; }}
    .party {{ flex: 1; }}
    .party h3 {{ margin: 0 0 6px; font-size: 11px; text-transform: uppercase; color: #78716c; }}
    .party p {{ margin: 2px 0; }}
    .meta {{ text-align: right; min-width: 180px; }}
    .meta .folio {{ font-size: 16px; font-weight: 700; }}
    .meta .uuid {{ font-size: 9px; word-break: break-all; color: #57534e; margin-top: 6px; }}
    .totals {{ margin-top: 12px; width: 100%; max-width: 280px; margin-left: auto; }}
    .totals td {{ padding: 4px 0; }}
    .totals .label {{ color: #57534e; }}
    .totals .amount {{ text-align: right; font-weight: 600; }}
    .totals .grand {{ font-size: 14px; color: #cc785c; border-top: 1px solid #e7ded0; padding-top: 6px; }}
    .tbl {{ width: 100%; border-collapse: collapse; margin-top: 6px; }}
    .tbl th, .tbl td {{ border: 1px solid #e7ded0; padding: 6px 8px; vertical-align: top; }}
    .tbl th {{ background: #fcfaf6; font-size: 10px; text-transform: uppercase; color: #57534e; }}
    .tbl .num {{ text-align: right; white-space: nowrap; }}
    .tbl .desc {{ min-width: 180px; }}
    .tbl .empty {{ text-align: center; color: #78716c; padding: 16px; }}
    .footer {{ margin-top: 20px; display: flex; gap: 16px; align-items: flex-start; }}
    .qr {{ width: 120px; height: 120px; object-fit: contain; border: 1px solid #e7ded0; padding: 4px; }}
    .sellos {{ flex: 1; font-size: 8px; word-break: break-all; color: #57534e; }}
    .sellos p {{ margin: 0 0 8px; }}
    .letra {{ margin-top: 8px; font-style: italic; color: #44403c; }}
    .note {{ margin-top: 14px; font-size: 9px; color: #78716c; }}
  </style>
</head>
<body>
  <div class="header">
    <div class="party">
      <h3>Emisor</h3>
      <p><strong>{esc(emisor)}</strong></p>
      <p>RFC: {esc(rfc_e)}</p>
    </div>
    <div class="party">
      <h3>Receptor</h3>
      <p><strong>{esc(receptor)}</strong></p>
      <p>RFC: {esc(rfc_c)}</p>
    </div>
    <div class="meta">
      <h1>Factura CFDI</h1>
      <p class="folio">{esc(serie_folio or folio)}</p>
      <p>{esc(fecha)}</p>
      <p>{esc(forma)}</p>
      <p>{esc(metodo)}</p>
      <p>{esc(moneda)}</p>
      <p class="uuid">UUID: {esc(uuid)}</p>
    </div>
  </div>

  <h2>Conceptos</h2>
  <table class="tbl">
    <thead>
      <tr>
        <th>Cant.</th><th>Unidad</th><th>Clave</th><th>Descripción</th><th>P. unit.</th><th>Importe</th>
      </tr>
    </thead>
    <tbody>{concept_rows}</tbody>
  </table>

  {imp_block}

  <table class="totals">
    <tr><td class="label">Subtotal</td><td class="amount">{_as_money(subtotal)}</td></tr>
    {'<tr><td class="label">Descuento</td><td class="amount">' + _as_money(descuento) + '</td></tr>' if descuento not in (None, '', 0, '0', '0.00') else ''}
    <tr><td class="label grand">Total</td><td class="amount grand">{_as_money(total)}</td></tr>
  </table>
  {'<p class="letra">' + esc(letra) + '</p>' if letra else ''}

  <div class="footer">
    {'<img class="qr" src="' + qr_src + '" alt="Código QR CFDI" />' if qr_src else ''}
    <div class="sellos">
      {'<p><strong>No. certificado:</strong> ' + esc(no_cert) + '</p>' if no_cert else ''}
      {'<p><strong>Sello digital CFDI:</strong> ' + esc(sello[:240]) + ('…' if len(sello) > 240 else '') + '</p>' if sello else ''}
      {'<p><strong>Sello SAT:</strong> ' + esc(sello_sat[:240]) + ('…' if len(sello_sat) > 240 else '') + '</p>' if sello_sat else ''}
    </div>
  </div>

  <p class="note">Documento generado desde XML timbrado almacenado en SICAR. El archivo XML descargable es el comprobante fiscal original.</p>
</body>
</html>"""
