"""HTML template for cotizacion PDF."""
import logging

from apps.common.pdf_html import (
    esc,
    load_public_image_data_uri,
    normalize_text,
    render_terms_html,
    subtotal_iva_display_split,
)
from apps.common.pdf_images import safe_pdf_thumbnail_src
from apps.cotizaciones.categorias_productos import categorias_nombres_por_id, normalize_categorias_productos
from apps.cotizaciones.pdf_opciones import CotizacionPdfOpciones

logger = logging.getLogger(__name__)

IVA_MX_DISPLAY = 1.16
ANTICIPO_PCT = 60
EXPORT_BRAND_COLOR = "#3160e3"


def generate_cotizacion_pdf_html(cotizacion, pdf_opciones: CotizacionPdfOpciones | None = None) -> str:
    """Genera el HTML para el PDF de la cotización."""
    opts = pdf_opciones or CotizacionPdfOpciones()
    show_pu = not opts.ocultar_precios_unitarios
    show_importe = not opts.ocultar_importes_linea
    show_totales = not opts.ocultar_totales

    def iter_items(obj):
        items = getattr(obj, 'items', None)
        if items is None:
            return []
        if hasattr(items, 'all'):
            try:
                return list(items.all())
            except Exception:
                logger.exception("Failed to load cotizacion items for PDF generation")
                return []
        if isinstance(items, (list, tuple)):
            return list(items)
        return []

    logo_data_uri = load_public_image_data_uri("images/logo/intrax-logo.png")
    santander_data_uri = load_public_image_data_uri("images/logo/santander.png")

    cliente_obj = getattr(cotizacion, 'cliente_id', None)
    if cliente_obj and not hasattr(cliente_obj, 'nombre'):
        try:
            from apps.clientes.models import Cliente

            cliente_obj = Cliente.objects.filter(id=cliente_obj).first() or None
        except Exception:
            logger.exception("Failed to load Cliente for cotizacion PDF")
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

    col_count = 4 + (2 if show_pu else 0) + (1 if show_importe else 0)
    cat_names = categorias_nombres_por_id(
        normalize_categorias_productos(getattr(cotizacion, 'categorias_productos', None))
    )
    last_cat_id = None

    rows = []
    net_subtotal_sin_iva = 0.0
    gross_subtotal_sin_iva = 0.0
    net_subtotal_con_iva = 0.0
    has_manual_concept_lines = False
    has_product_lines = False
    for it in iter_items(cotizacion):
        cat_id = str(getattr(it, 'categoria_id', '') or '').strip()
        if cat_id and cat_id in cat_names and cat_id != last_cat_id:
            rows.append(
                f"""
            <tr class='cat-row'>
              <td colspan='{col_count}' style='padding:10px 8px 6px; font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:0.04em; color:{EXPORT_BRAND_COLOR}; border-bottom:none;'>
                {esc(cat_names[cat_id])}
              </td>
            </tr>
            """
            )
            last_cat_id = cat_id
        try:
            cantidad = float(it.cantidad or 0)
            precio_lista = float(it.precio_lista or 0)
            descuento = float(it.descuento_pct or 0)
            producto_externo_id = str(getattr(it, "producto_externo_id", "") or "").strip()
            solo_concepto_manual = producto_externo_id == ""
            if solo_concepto_manual:
                has_manual_concept_lines = True
            else:
                has_product_lines = True
            # Si es solo concepto manual (sin producto), el precio se captura sin IVA y aquí se suma.
            # Si viene de producto, se conserva el comportamiento actual (precio_lista ya con IVA).
            pu_base = precio_lista if solo_concepto_manual else (precio_lista / IVA_MX_DISPLAY)
            pu_desc = pu_base * (1 - (descuento / 100.0))
            precio_con_iva = (
                (precio_lista * IVA_MX_DISPLAY) * (1 - (descuento / 100.0))
                if solo_concepto_manual
                else (precio_lista * (1 - (descuento / 100.0)))
            )
            importe = cantidad * pu_desc
            gross_subtotal_sin_iva += cantidad * pu_base
            net_subtotal_sin_iva += importe
            net_subtotal_con_iva += cantidad * precio_con_iva
        except Exception:
            logger.exception("Failed to parse cotizacion item values for PDF")
            pu_base = 0
            importe = 0
            descuento = 0
            cantidad = 0

        try:
            cantidad_str = str(int(cantidad)) if float(cantidad).is_integer() else str(cantidad)
        except Exception:
            logger.exception("Failed to format cotizacion item cantidad")
            cantidad_str = str(cantidad)

        thumb_src = safe_pdf_thumbnail_src(getattr(it, "thumbnail_url", "") or "")
        nombre = str(getattr(it, 'producto_nombre', '') or '-').strip() or '-'
        if opts.simplificar_descripcion:
            corta = str(getattr(it, 'pdf_descripcion_corta', '') or '').strip()
            desc_html = f"<div class='desc'>{esc(corta)}</div>" if corta else ""
        else:
            desc_html = f"<div class='desc'>{esc(getattr(it, 'producto_descripcion', '') or '')}</div>"

        price_cells = ""
        if show_pu:
            price_cells += f"<td class='right'>$ {pu_base:,.2f}</td><td class='right'>{descuento:,.2f}%</td>"
        if show_importe:
            price_cells += f"<td class='right'>$ {importe:,.2f}</td>"

        rows.append(
            f"""
            <tr>
              <td class='imgcell'>
                {f"<img class='img' src='{esc(thumb_src)}' />" if thumb_src else "<div class='img ph'></div>"}
              </td>
              <td class='center'>{esc(cantidad_str)}</td>
              <td>{esc(getattr(it, 'unidad', '') or '-')}</td>
              <td>
                <div class='name'>{esc(nombre)}</div>
                {desc_html}
              </td>
              {price_cells}
            </tr>
            """
        )

    rows_html = ''.join(rows) or (
        f"<tr><td colspan='{col_count}' class='muted center' style='padding: 14px;'>Sin conceptos</td></tr>"
    )

    thead_price_cols = ""
    if show_pu:
        thead_price_cols += "<th style='width:90px; text-align:right;'>P. UNIT.</th><th style='width:90px; text-align:right;'>DESC</th>"
    if show_importe:
        thead_price_cols += "<th style='width:100px; text-align:right;'>IMPORTE</th>"

    subtotal = float(cotizacion.subtotal or 0)
    total_guardado = float(cotizacion.total or 0)

    descuento_cliente_pct = 0.0
    try:
        descuento_cliente_pct = float(getattr(cotizacion, 'descuento_cliente_pct', 0) or 0)
    except Exception:
        logger.exception("Failed to parse descuento_cliente_pct for PDF")
        descuento_cliente_pct = 0.0

    # Descuento cliente sobre suma con IVA (misma regla que serializers).
    subtotal_lineas = net_subtotal_con_iva if net_subtotal_con_iva else subtotal
    if subtotal_lineas < 0:
        subtotal_lineas = 0.0

    if descuento_cliente_pct < 0:
        descuento_cliente_pct = 0.0
    if descuento_cliente_pct > 100:
        descuento_cliente_pct = 100.0
    # Si la cotización solo tiene conceptos manuales, no aplicar descuento automático de cliente en PDF.
    if has_manual_concept_lines and not has_product_lines:
        descuento_cliente_pct = 0.0

    # Recalcular total del PDF desde líneas para reflejar IVA en conceptos manuales.
    descuento_cliente_monto = subtotal_lineas * (descuento_cliente_pct / 100.0)
    total_estimado = max(0.0, subtotal_lineas - descuento_cliente_monto)
    total = total_estimado
    if not (has_manual_concept_lines and not has_product_lines):
        total = total_guardado if total_guardado > 0 else total_estimado
    if total > subtotal_lineas:
        total = subtotal_lineas
    descuento_monto_visible = max(0.0, subtotal_lineas - total)
    # Evita mostrar descuentos fantasma por ruido de coma flotante/redondeo.
    descuento_monto_visible = round(descuento_monto_visible, 2)
    base_sin_iva, iva_display = subtotal_iva_display_split(total)
    descuento_lineas_visible = max(0.0, round(gross_subtotal_sin_iva - net_subtotal_sin_iva, 2))
    descuento_base_visible = max(0.0, round(net_subtotal_sin_iva - base_sin_iva, 2))
    show_descuento_lineas = descuento_lineas_visible >= 0.01
    show_descuento_cliente = descuento_monto_visible >= 0.01 and descuento_cliente_pct > 0 and descuento_base_visible >= 0.01
    subtotal_display = gross_subtotal_sin_iva if show_descuento_lineas else net_subtotal_sin_iva
    discount_rows = ""
    if show_descuento_lineas:
        discount_rows += f"""
    <div class='row'><span>Descuento conceptos</span><strong>-$ {descuento_lineas_visible:,.2f}</strong></div>
"""
    if show_descuento_cliente:
        discount_rows += f"""
    <div class='row'><span>Descuento cliente ({descuento_cliente_pct:,.2f}%)</span><strong>-$ {descuento_base_visible:,.2f}</strong></div>
"""

    anticipo_monto = round(total * (ANTICIPO_PCT / 100.0), 2)
    saldo_monto = round(max(0.0, total - anticipo_monto), 2)

    totals_block = ""
    if show_totales:
        totals_block = f"""
    <div class='totals'>
    <div class='row'><span>Subtotal</span><strong>$ {subtotal_display:,.2f}</strong></div>
    {discount_rows}
    <div class='row'><span>IVA (16%)</span><strong>$ {iva_display:,.2f}</strong></div>
    <div class='row'><span>Total</span><strong>$ {total:,.2f}</strong></div>
  </div>"""

    deposit_total_cell = ""
    if show_totales:
        deposit_total_cell = f"""
                <div class='kvbox'>
                  <div class='k'>Total</div>
                  <div class='totalv'>$ {total:,.2f} {esc(moneda)}</div>
                </div>"""

    anticipos_block = ""
    if show_totales:
        anticipos_block = f"""
  <div class='totals anticipos-after-deposit'>
    <div class='row anticipo'><span>Anticipo ({ANTICIPO_PCT}%)</span><strong>$ {anticipo_monto:,.2f}</strong></div>
    <div class='row anticipo'><span>Saldo al finalizar ({100 - ANTICIPO_PCT}%)</span><strong>$ {saldo_monto:,.2f}</strong></div>
  </div>"""

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
    .box .r:first-child {{ border-top: none; background: {EXPORT_BRAND_COLOR}; }}
    .box .r:first-child .lbl,
    .box .r:first-child .folio {{ color: #ffffff; }}
    .box .lbl {{ font-size: 13px; font-weight: 600; }}
    .box .val {{ font-size: 13px; font-weight: 500; }}
    .box .folio {{ font-size: 16px; font-weight: 800; color: {EXPORT_BRAND_COLOR}; }}
    .hr {{ height: 1px; background: #e5e7eb; margin: 14px 0; }}
    .grid2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }}
    .k {{ font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #9ca3af; font-weight: 600; }}
    .kv {{ margin-top: 6px; display: grid; grid-template-columns: 78px 1fr; gap: 4px 10px; font-size: 11px; }}
    .kv .l {{ color: #6b7280; }}
    .kv .v {{ color: #111827; }}
    .kv .v b {{ font-weight: 500; }}
    .kv .v.muted {{ color: #6b7280; }}
    .note {{ font-size: 11px; color: #374151; }}
    .auth {{ margin: 10px 0 8px; font-size: 11px; font-weight: 600; color: #111827; padding: 8px 10px; background: #f9fafb; border: 1px solid #e5e7eb; border-left: 4px solid {EXPORT_BRAND_COLOR}; }}
    table {{ width: 100%; border-collapse: collapse; }}
    th, td {{ border-top: 1px solid #e5e7eb; padding: 8px 6px; vertical-align: top; }}
    th {{ border-top: none; background: {EXPORT_BRAND_COLOR}; color: #ffffff; font-size: 11px; text-transform: uppercase; letter-spacing: .02em; }}
    td {{ font-size: 11px; }}
    .center {{ text-align: center; }}
    .right {{ text-align: right; }}
    .img {{ width: 70px; height: 70px; border-radius: 6px; border: 1px solid #e5e7eb; object-fit: cover; }}
    .img.ph {{ background: #f9fafb; border-style: dashed; }}
    .name {{ font-weight: 600; color: #111827; }}
    .desc {{ color: #4b5563; }}
    .totals {{ margin-top: 14px; width: 100%; max-width: 340px; margin-left: auto; margin-right: 16px; border-top: 1px solid #e5e7eb; padding-top: 10px; }}
    .totals .row {{ display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }}
    .totals .row strong {{ font-weight: 600; }}
    .totals .row.anticipo {{ margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb; color: #374151; }}
    .totals .row.anticipo strong {{ color: #111827; }}
    .terms {{ margin-top: 14px; border-top: 1px solid #e5e7eb; padding-top: 10px; font-size: 9px; line-height: 1.35; color: #374151; }}
    .terms .terms-title {{ font-size: 10px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: #111827; margin-bottom: 6px; }}
    .terms ul {{ margin: 0; padding-left: 16px; }}
    .terms li {{ margin: 0 0 4px 0; }}
    .terms .terms-text {{ white-space: pre-line; }}
    .terms-spacer {{ height: 96px; }}
    .pagebreak {{ page-break-before: always; }}
    .anticipos-after-deposit {{ margin-top: 18px; width: 100%; max-width: 340px; margin-left: auto; margin-right: 16px; border-top: 1px solid #e5e7eb; padding-top: 10px; }}
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
    .boxx .hd {{ background: {EXPORT_BRAND_COLOR}; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: .10em; font-weight: 600; color: #ffffff; }}
    .boxx .bd {{ padding: 12px; font-size: 12px; }}

    .rs-name {{ margin-top: 6px; font-size: 14px; font-weight: 600; color: #111827; }}

    .bank-top {{ display: grid; grid-template-columns: 130px 1fr; gap: 10px; align-items: center; }}
    .bank-logo {{ display: flex; justify-content: center; align-items: center; max-width: 130px; overflow: hidden; }}
    .bank-logo img {{ display: block; width: 120px; height: auto; max-height: 42px; object-fit: contain; }}
    .bank-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }}
    .kvbox {{ border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; }}
    .kvbox .k {{ background: {EXPORT_BRAND_COLOR}; padding: 8px 10px; font-size: 11px; font-weight: 500; color: #ffffff; text-transform: uppercase; letter-spacing: .08em; text-align: center; }}
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
    <div class='l'>Tel. contacto:</div><div class='v'>{esc(getattr(cotizacion, "contacto_telefono", "") or '-')}</div>
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
      <th style='width:104px; text-align:left;'>IMG</th>
      <th style='width:56px; text-align:center;'>CANT</th>
      <th style='width:70px; text-align:left;'>UNIDAD</th>
      <th style='text-align:left;'>DESCRIPCIÓN</th>
      {thead_price_cols}
    </tr>
      </thead>
      <tbody>
    {rows_html}
      </tbody>
    </table>
  </div>

    {totals_block}

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
            {deposit_total_cell}
          </div>
        </div>
      </div>
    </div>
      </div>
    </div>
  </div>

  {anticipos_block}
</body>
</html>"""

    return html
