"""Plantilla HTML de póliza de mantenimiento preventivo — Videovigilancia CCTV."""
from __future__ import annotations

import re
import unicodedata
from typing import Any
from xml.etree.ElementTree import Element, SubElement, tostring

from apps.common.document_folio import FOLIO_SERIE_COT, format_document_folio
from apps.common.marca import get_marca_nombre, logo_data_uri_for_pdf
from apps.common.pdf_html import (
    IVA_MX_DISPLAY,
    esc,
    load_public_image_data_uri,
    subtotal_iva_display_split,
)
from apps.common.pdf_images import safe_pdf_thumbnail_src
from apps.cotizaciones.categorias_productos import (
    categorias_nombres_por_id,
    normalize_categorias_productos,
)

POLIZA_CCTV_TIPO = "cctv"

# Datos de demostración tomados del PDF de referencia (MCT Logistic).
# Se sustituirán por el modelo de póliza cuando exista el CRUD.
POLIZA_CCTV_DEMO: dict[str, Any] = {
    "titulo": "Póliza de garantía de mantenimiento preventivo para videovigilancia CCTV",
    "rfc_emisor": "IMA200110CI4",
    "ssp": "SSP/DsPv/270/20v",
    "correo_emisor": "soporte@sertel.mx",
    "telefono_emisor": "3141420811",
    "direccion_emisor": (
        "Av. Elías Zamora Verduzco No. 149, Col. Valle de las Garzas, "
        "Barrio 2, C.P. 20219, Manzanillo, Colima, México"
    ),
    "razon_social_emisor": "INTERPRO DE MANZANILLO S DE RL DE CV",
    "tagline": "Tecnología Segura",
    "cliente_nombre": "MCT LOGISTIC S.A. DE C.V.",
    "cliente_rfc": "MLO061220TJA",
    "cliente_domicilio": (
        "Carretera Manzanillo Minatitlán Km 2, Col. Tapeixtles, "
        "C.P. 28239, Manzanillo, Colima"
    ),
    "fecha": "13/08/2026",
    "contacto_tel": "",
    "contacto_cel": "",
    "folio": "POL-CCTV-0002",
    "cliente_correo": "",
    "cliente_web": "",
    "intro": (
        "En nombre de INTERPRO DE MANZANILLO S DE RL DE CV, nos complace informarle "
        "que la ejecución del servicio de mantenimiento preventivo para videovigilancia "
        "CCTV ha sido realizada satisfactoriamente. Valoramos la preferencia de nuestros "
        "clientes y nos enorgullece ofrecer las siguientes condiciones de servicio y garantía."
    ),
    "servicio": {
        "tipo": "Mantenimiento Preventivo para 6 DVR y 63 cámaras",
        "equipos": "6 DVR y 63 cámaras",
        "cotizacion_ref": "Cotización No. 10261",
        "cotizacion_fecha": "13/08/2026",
        "frecuencia": "Cada 4 meses (3 visitas al año)",
        "soporte": (
            "Remoto (WhatsApp/teléfono) y presencial por fallas funcionales "
            "dentro del período amparado"
        ),
    },
    "conceptos": [
        {
            "seccion": "Mano de obra",
            "cantidad": "63",
            "unidad": "",
            "descripcion": (
                "Servicio de Mantenimiento Preventivo y Diagnóstico Integral "
                "para Sistema de Videovigilancia (CCTV)."
            ),
            "detalle": "",
            "precio_unitario": 250.00,
            "descuento_pct": 0.0,
            "importe": 15750.00,
        },
        {
            "seccion": "Mano de obra",
            "cantidad": "6",
            "unidad": "",
            "descripcion": (
                "Servicio de Mantenimiento Preventivo, Diagnóstico y "
                "Optimización para Centro de Grabación (DVR / NVR)."
            ),
            "detalle": "",
            "precio_unitario": 450.00,
            "descuento_pct": 0.0,
            "importe": 2700.00,
        },
        {
            "seccion": "Materiales",
            "cantidad": "13",
            "unidad": "PZA",
            "descripcion": (
                "Espuma Limpiadora para Todo Tipo de Superficies Plásticas y Metálicas "
                "de Sistemas de Vídeo, Audio, Telefonía y Equipo de Cómputo, "
                "Contiene Protectores de Rayos UV, 454 ml."
            ),
            "detalle": "SILIMEX · SILIMPO",
            "precio_unitario": 155.95,
            "descuento_pct": 0.0,
            "importe": 2027.33,
        },
        {
            "seccion": "Materiales",
            "cantidad": "13",
            "unidad": "PZA",
            "descripcion": (
                "Removedor de Polvo y Residuos (Aire Comprimido) para Limpieza "
                "de Equipos Electrónicos, 440 ml."
            ),
            "detalle": "SILIMEX · AEROJET-440",
            "precio_unitario": 216.91,
            "descuento_pct": 0.0,
            "importe": 2819.88,
        },
    ],
    "subtotal": 23297.21,
    "iva": 3727.55,
    "total": 27024.76,
    "nota_preventivo": (
        "La presente cotización (No. 10261) corresponde exclusivamente al servicio de "
        "MANTENIMIENTO PREVENTIVO de 6 DVR y 63 cámaras, el cual comprende la revisión, "
        "limpieza y ajuste general de los equipos bajo condiciones normales de operación."
    ),
    "nota_altura": (
        "El cliente (MCT LOGISTIC S.A. DE C.V.) deberá suministrar el equipo necesario "
        "para poder realizar el mantenimiento en altura (grúa, montacarga, plataforma "
        "tijera jenie etc.). El alcance será de 7 metros."
    ),
    "nota_correctivo": (
        "Si se determina que la falla se debe a mal uso, golpes, humedad, variaciones "
        "de voltaje o manipulación por terceros no autorizados, dicha intervención se "
        "clasificará como MANTENIMIENTO CORRECTIVO y generará un costo adicional, "
        "el cual será cotizado y acordado con el cliente previamente a su ejecución."
    ),
    "equipos_ref": "COT-10261",
    "equipos": [
        ("DVR ISD-7216HQHI (16 canales)", "1"),
        ("Cámaras conectadas (7 digitales + 3 IP)", "10"),
        ("DVR Operaciones (4 canales)", "1"),
        ("Cámaras conectadas (3 digitales + 2 IP)", "5"),
        ("DVR DS-7732NXI-K4 (32 canales)", "1"),
        ("Cámaras IP conectadas", "24"),
        ("DVR DS-7732NI-K4 (32 canales)", "1"),
        ("Cámaras IP conectadas", "16"),
        ("DVR DS-7732NXL-K4 (32 canales)", "1"),
        ("Cámaras dobles conectadas", "4"),
        ("DVR Máquina", "1"),
        ("Cámaras conectadas (en máquina)", "4"),
        ("TOTAL DVR", "6"),
        ("TOTAL CÁMARAS", "63"),
    ],
    "alcance_camaras": [
        "Limpieza de lente y carcasa (interior y exterior)",
        "Verificación de enfoque e imagen (nitidez, balance de blancos, WDR/IR nocturno)",
        "Revisión de sellos e IP66/IP67 en cámaras exteriores (evitar filtración de humedad)",
        "Inspección de soportes y bases (fijación, orientación, ángulo de visión)",
        "Verificación de micrófono/bocina integrados (si aplica, como en las Dual Light)",
        "Revisión de funcionamiento de IR y luz estroboscópica/sirena (en los domos PTZ)",
    ],
    "alcance_dvr": [
        "Limpieza interna (polvo, ventiladores) y externa del gabinete",
        "Verificación de disco duro (salud S.M.A.R.T., espacio disponible, ciclo de grabación)",
        "Revisión de fuente de alimentación y respaldo (UPS si aplica)",
        "Verificación de que todos los canales estén grabando correctamente",
        "Prueba de reproducción de grabaciones (local y remota)",
        "Actualización de firmware si aplica",
    ],
    "alcance_red": [
        "Revisión de conectores RJ45 y estado del cable UTP/PoE",
        "Verificación de switches PoE (temperatura, carga, puertos activos)",
        "Prueba de conectividad remota (acceso vía app/NVR desde fuera de la red)",
        "Revisión de tubería Liquidtight y conectores (sellado, corrosión)",
    ],
    "alcance_software": [
        "Verificación de fecha/hora sincronizada en todos los equipos",
        "Revisión de usuarios y contraseñas (seguridad de acceso)",
        "Confirmación de alertas y notificaciones (movimiento, ACUSENSE, etc.)",
        "Reporte fotográfico del estado de cada equipo (antes/después)",
    ],
    "no_incluye": (
        "Cableado nuevo, tubería, refacciones, reemplazo de piezas mecánicas o "
        "electrónicas dañadas, ni equipos de videovigilancia CCTV adicionales."
    ),
    "calendario_intro": (
        "INTERPRO recomienda realizar el mantenimiento preventivo cada 4 meses, "
        "con el objetivo de garantizar el correcto funcionamiento de los equipos "
        "de videovigilancia y prolongar su vida útil. Las fechas programadas serán "
        "acordadas con el cliente:"
    ),
    "garantia_intro": (
        "INTERPRO garantiza la calidad de la mano de obra y procedimientos ejecutados "
        "durante el mantenimiento preventivo bajo las siguientes condiciones:"
    ),
    "garantias": [
        ("Trabajos de mantenimiento realizados", "30 días naturales a partir de la fecha de servicio"),
        ("Reinstalación de componentes ajustados", "30 días naturales"),
    ],
    "no_cubre": [
        "Daños ocasionados por mal uso del equipo.",
        "Golpes o daño físico ocasionado a los equipos.",
        "Humedad o exposición a condiciones ambientales extremas.",
        "Variaciones de voltaje o descargas eléctricas.",
        "Manipulación o intervención por terceros no autorizados.",
    ],
    "reclamo": [
        (
            "Contacte a nuestro servicio de atención: llame o envíe un WhatsApp al "
            "3141420811, o al correo soporte@sertel.mx para notificar el problema."
        ),
        (
            "Proporcione la información del reporte: describa la falla presentada e "
            "indique el número de póliza y fecha del servicio realizado."
        ),
        (
            "Evaluación: nuestro equipo técnico evaluará la falla y determinará si "
            "está cubierta por la garantía o si corresponde a mantenimiento "
            "correctivo con costo adicional."
        ),
        (
            "Atención: si la falla está cubierta, se programará visita sin costo. "
            "De lo contrario, se emitirá cotización previamente a cualquier intervención."
        ),
    ],
    "firmante_empresa": "Ing. Edgar Iván Cruz Sandoval",
    "firmante_cargo": "Gerente General",
}


def _money(value: Any) -> str:
    try:
        amount = float(value or 0)
    except (TypeError, ValueError):
        amount = 0.0
    formatted = f"{amount:,.2f}"
    return f"${formatted}"


def _dato(value: object) -> str:
    text = str(value or "").strip()
    return esc(text) if text else "—"


def _payload(data: dict[str, Any] | None) -> dict[str, Any]:
    merged = dict(POLIZA_CCTV_DEMO)
    merged["servicio"] = dict(POLIZA_CCTV_DEMO.get("servicio") or {})
    if data:
        merged.update(data)
        if isinstance(data.get("servicio"), dict):
            servicio = dict(POLIZA_CCTV_DEMO.get("servicio") or {})
            servicio.update(data["servicio"])
            merged["servicio"] = servicio
    return merged


def _join_es(parts: list[str]) -> str:
    items = [p for p in parts if str(p).strip()]
    if not items:
        return ""
    if len(items) == 1:
        return items[0]
    if len(items) == 2:
        return f"{items[0]} y {items[1]}"
    return f"{', '.join(items[:-1])} y {items[-1]}"


def _fold_ascii(value: object) -> str:
    text = unicodedata.normalize("NFKD", str(value or "").lower())
    return "".join(ch for ch in text if not unicodedata.combining(ch))


def _cctv_item_kind(nombre: object) -> str:
    text = _fold_ascii(nombre)
    if re.search(r"\bcamaras?\b|\bcameras?\b", text):
        return "camara"
    if re.search(r"\b(dvr|nvr|xvr|hvr|videograbador(?:es)?)\b", text):
        return "dvr"
    return "equipo"


def _qty_label(qty: float, singular: str, plural: str) -> str:
    n = int(qty) if float(qty).is_integer() else qty
    word = singular if n == 1 else plural
    return f"{n} {word}"


def _equipos_atendidos_label(items: list[Any]) -> str:
    cams = 0.0
    dvrs = 0.0
    otros = 0.0
    for it in items:
        try:
            qty = float(getattr(it, "cantidad", 0) or 0)
        except (TypeError, ValueError):
            qty = 0.0
        if qty <= 0:
            continue
        kind = _cctv_item_kind(getattr(it, "producto_nombre", ""))
        if kind == "camara":
            cams += qty
        elif kind == "dvr":
            dvrs += qty
        elif str(getattr(it, "producto_externo_id", "") or "").strip():
            otros += qty
    parts: list[str] = []
    if dvrs:
        parts.append(_qty_label(dvrs, "DVR", "DVR"))
    if cams:
        parts.append(_qty_label(cams, "cámara", "cámaras"))
    if otros:
        parts.append(_qty_label(otros, "equipo", "equipos"))
    return _join_es(parts)


def _tipo_servicio_label(cotizacion) -> str:
    related = getattr(cotizacion, "tipo_trabajo", None)
    if related is None:
        return ""
    rows = list(related.all()) if hasattr(related, "all") else list(related)
    nombres = [str(getattr(row, "nombre", "") or "").strip() for row in rows]
    return _join_es([n for n in nombres if n])


def overlay_from_cotizacion(cotizacion) -> dict[str, Any]:
    """Líneas, totales e imagen de la cotización DigitalFlow ligada."""
    if cotizacion is None:
        return {}
    folio = format_document_folio(FOLIO_SERIE_COT, getattr(cotizacion, "idx", None), empty="")
    if not folio:
        folio = format_document_folio(FOLIO_SERIE_COT, getattr(cotizacion, "id", None), empty="")
    cat_names = categorias_nombres_por_id(
        normalize_categorias_productos(getattr(cotizacion, "categorias_productos", None))
    )
    default_img = load_public_image_data_uri("images/logo/defect_concept.png")
    items = []
    related = getattr(cotizacion, "items", None)
    if related is not None:
        items = list(related.all()) if hasattr(related, "all") else list(related)

    conceptos: list[dict[str, Any]] = []
    for it in items:
        cat_id = str(getattr(it, "categoria_id", "") or "").strip()
        try:
            qty = float(getattr(it, "cantidad", 0) or 0)
        except (TypeError, ValueError):
            qty = 0.0
        try:
            precio = float(getattr(it, "precio_lista", 0) or 0)
        except (TypeError, ValueError):
            precio = 0.0
        try:
            desc_pct = float(getattr(it, "descuento_pct", 0) or 0)
        except (TypeError, ValueError):
            desc_pct = 0.0
        solo_concepto = not str(getattr(it, "producto_externo_id", "") or "").strip()
        pu_sin_iva = precio if solo_concepto else (precio / IVA_MX_DISPLAY)
        importe = round(qty * pu_sin_iva * (1 - desc_pct / 100.0), 2)
        cantidad_str = str(int(qty)) if qty.is_integer() else str(qty)
        thumb = safe_pdf_thumbnail_src(getattr(it, "thumbnail_url", "") or "")
        if not thumb:
            thumb = default_img or ""
        detalle = (
            str(getattr(it, "pdf_descripcion_corta", "") or "").strip()
            or str(getattr(it, "producto_descripcion", "") or "").strip()
        )
        conceptos.append(
            {
                "seccion": cat_names.get(cat_id, ""),
                "cantidad": cantidad_str,
                "unidad": str(getattr(it, "unidad", "") or "").strip(),
                "descripcion": str(getattr(it, "producto_nombre", "") or "").strip(),
                "detalle": detalle,
                "precio_unitario": round(pu_sin_iva, 2),
                "descuento_pct": desc_pct,
                "importe": importe,
                "imagen": thumb,
            }
        )

    try:
        total = float(getattr(cotizacion, "total", 0) or 0)
    except (TypeError, ValueError):
        total = 0.0
    if total <= 0:
        try:
            total = float(getattr(cotizacion, "subtotal", 0) or 0)
        except (TypeError, ValueError):
            total = 0.0
    subtotal, iva = subtotal_iva_display_split(total)
    try:
        iva_pct = float(getattr(cotizacion, "iva_pct", None) or 0)
    except (TypeError, ValueError):
        iva_pct = 0.0
    if iva_pct <= 0:
        iva_pct = 16.0
    data: dict[str, Any] = {
        "conceptos": conceptos,
        "subtotal": subtotal,
        "iva": iva,
        "total": total,
        "iva_pct": iva_pct,
        "equipos_ref": folio,
    }
    servicio: dict[str, Any] = {
        "tipo": (
            _tipo_servicio_label(cotizacion)
            or "Mantenimiento preventivo para videovigilancia CCTV"
        ),
        "equipos": (
            _equipos_atendidos_label(items)
            or "Equipos de videovigilancia CCTV de la cotización ligada"
        ),
    }
    if folio:
        num = folio[4:] if folio.upper().startswith("COT-") else folio
        servicio["cotizacion_ref"] = f"Cotización No. {num}"
    fecha = getattr(cotizacion, "fecha", None)
    if fecha:
        if hasattr(fecha, "strftime"):
            data["fecha"] = fecha.strftime("%d/%m/%Y")
        else:
            raw = str(fecha)
            data["fecha"] = (
                f"{raw[8:10]}/{raw[5:7]}/{raw[0:4]}"
                if len(raw) >= 10 and raw[4] == "-"
                else raw
            )
        servicio["cotizacion_fecha"] = data["fecha"]
    data["servicio"] = servicio
    return data


def _el(parent: Element, tag: str, text: object = "", **attrs: str) -> Element:
    node = SubElement(parent, tag, {k: v for k, v in attrs.items() if v})
    if text is not None and text != "":
        node.text = str(text)
    return node


def generate_poliza_cctv_xml(data: dict[str, Any] | None = None) -> str:
    """XML del documento de póliza (no es un CFDI)."""
    p = _payload(data)
    servicio = p.get("servicio") if isinstance(p.get("servicio"), dict) else {}
    root = Element("PolizaMantenimiento", {"tipo": POLIZA_CCTV_TIPO, "folio": str(p.get("folio") or "")})
    emisor = _el(root, "Emisor")
    _el(emisor, "RazonSocial", p.get("razon_social_emisor"))
    _el(emisor, "RFC", p.get("rfc_emisor"))
    _el(emisor, "SSP", p.get("ssp"))
    _el(emisor, "Correo", p.get("correo_emisor"))
    _el(emisor, "Telefono", p.get("telefono_emisor"))
    _el(emisor, "Direccion", p.get("direccion_emisor"))
    cliente = _el(root, "Cliente")
    _el(cliente, "RazonSocial", p.get("cliente_nombre"))
    _el(cliente, "RFC", p.get("cliente_rfc"))
    _el(cliente, "Domicilio", p.get("cliente_domicilio"))
    _el(cliente, "Telefono", p.get("contacto_tel"))
    _el(cliente, "Celular", p.get("contacto_cel"))
    _el(cliente, "Correo", p.get("cliente_correo"))
    _el(cliente, "Web", p.get("cliente_web"))
    _el(root, "Fecha", p.get("fecha"))
    srv = _el(root, "Servicio")
    _el(srv, "Tipo", servicio.get("tipo"))
    _el(srv, "Equipos", servicio.get("equipos"))
    _el(srv, "Cotizacion", servicio.get("cotizacion_ref"))
    _el(srv, "Frecuencia", servicio.get("frecuencia"))
    visitas = _el(root, "Visitas")
    visit_list = p.get("visitas") if isinstance(p.get("visitas"), list) else []
    for idx, fecha in enumerate(visit_list, start=1):
        if str(fecha).strip():
            _el(visitas, "Visita", fecha, numero=str(idx))
    conceptos_el = _el(root, "Conceptos")
    conceptos = p.get("conceptos") if isinstance(p.get("conceptos"), list) else []
    for item in conceptos:
        if not isinstance(item, dict):
            continue
        row = _el(conceptos_el, "Concepto", seccion=str(item.get("seccion") or ""))
        _el(row, "Cantidad", item.get("cantidad"))
        _el(row, "Unidad", item.get("unidad"))
        _el(row, "Descripcion", item.get("descripcion"))
        _el(row, "Detalle", item.get("detalle"))
        _el(row, "PrecioUnitario", item.get("precio_unitario"))
        _el(row, "DescuentoPct", item.get("descuento_pct"))
        _el(row, "Importe", item.get("importe"))
    tot = _el(root, "Totales")
    _el(tot, "Subtotal", p.get("subtotal"))
    _el(tot, "IVA", p.get("iva"))
    _el(tot, "Total", p.get("total"))
    xml = tostring(root, encoding="unicode")
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + xml


def _ul(items: list[str]) -> str:
    lis = "".join(f"<li>{esc(item)}</li>" for item in items if str(item).strip())
    return f"<ul class='bullets'>{lis}</ul>"


def _letterhead(
    *,
    logo_src: str,
    marca: str,
    tagline: str,
    titulo: str,
    rfc: str,
    ssp: str,
    correo: str,
) -> str:
    logo = (
        f"<img src='{esc(logo_src)}' alt='' />"
        if logo_src
        else f"<div class='logo-fallback'>{esc(marca[:2].upper() or 'IP')}</div>"
    )
    return f"""
    <header class="letterhead">
      <div class="letterhead-top">
        <div class="brand">
          <div class="logo">{logo}</div>
          <div>
            <div class="brand-name">{esc(marca)}</div>
            <div class="brand-tag">{esc(tagline)}</div>
          </div>
        </div>
        <div class="doc-title">
          <h1>{esc(titulo)}</h1>
          <p><b>RFC:</b> {esc(rfc)} &nbsp;&nbsp; {esc(ssp)}</p>
          <p>{esc(correo)}</p>
        </div>
      </div>
    </header>
    """


def _quote_rows(conceptos: list[dict[str, Any]]) -> str:
    rows: list[str] = []
    last_section = ""
    for item in conceptos:
        section = str(item.get("seccion") or "").strip()
        if section and section != last_section:
            rows.append(
                "<tr class='cat-row'><td colspan='8'>"
                f"{esc(section.upper())}</td></tr>"
            )
            last_section = section
        thumb = str(item.get("imagen") or "").strip()
        img_html = (
            f"<img src='{esc(thumb)}' alt='' />" if thumb else ""
        )
        rows.append(
            "<tr>"
            f"<td class='imgcell'>{img_html}</td>"
            f"<td class='num'>{esc(item.get('cantidad') or '')}</td>"
            f"<td>{esc(item.get('unidad') or '')}</td>"
            f"<td>{esc(item.get('descripcion') or '')}</td>"
            f"<td>{esc(item.get('detalle') or '')}</td>"
            f"<td class='num'>{_money(item.get('precio_unitario'))}</td>"
            f"<td class='num'>{esc(f'{float(item.get("descuento_pct") or 0):.2f}')}</td>"
            f"<td class='num'>{_money(item.get('importe'))}</td>"
            "</tr>"
        )
    if not rows:
        return "<tr><td colspan='8'>Sin conceptos en la cotización ligada.</td></tr>"
    return "".join(rows)


def generate_poliza_cctv_pdf_html(data: dict[str, Any] | None = None) -> str:
    """HTML imprimible de la póliza CCTV. `data` sustituye claves del demo."""
    p = _payload(data)
    logo_src = logo_data_uri_for_pdf()
    marca = get_marca_nombre()
    servicio = p.get("servicio") if isinstance(p.get("servicio"), dict) else {}
    conceptos = p.get("conceptos") if isinstance(p.get("conceptos"), list) else []
    equipos = p.get("equipos") if isinstance(p.get("equipos"), list) else []
    garantias = p.get("garantias") if isinstance(p.get("garantias"), list) else []

    head = _letterhead(
        logo_src=logo_src,
        marca=marca,
        tagline=str(p.get("tagline") or ""),
        titulo=str(p.get("titulo") or ""),
        rfc=str(p.get("rfc_emisor") or ""),
        ssp=str(p.get("ssp") or ""),
        correo=str(p.get("correo_emisor") or ""),
    )

    equipo_cells: list[str] = []
    for item in equipos:
        if not isinstance(item, (list, tuple)) or len(item) < 2:
            continue
        desc, cant = item[0], item[1]
        row_class = "total-row" if str(desc).upper().startswith("TOTAL") else ""
        equipo_cells.append(
            f"<tr class='{row_class}'><td>{esc(desc)}</td><td class='num'>{esc(cant)}</td></tr>"
        )
    equipos_rows = "".join(equipo_cells)

    garantia_rows = "".join(
        f"<tr><td>{esc(item[0])}</td><td>{esc(item[1])}</td></tr>"
        for item in garantias
        if isinstance(item, (list, tuple)) and len(item) >= 2
    )

    reclamo_items = p.get("reclamo") if isinstance(p.get("reclamo"), list) else []
    reclamo_html = "".join(
        f"<li><span class='step'>{idx}</span> {esc(texto)}</li>"
        for idx, texto in enumerate(reclamo_items, start=1)
        if str(texto).strip()
    )

    visit_list = p.get("visitas") if isinstance(p.get("visitas"), list) else []

    def _fecha_cell(index: int) -> str:
        if index < len(visit_list) and str(visit_list[index] or "").strip():
            return f"<td class='date'>{esc(visit_list[index])}</td>"
        return "<td class='date'><span class='blank'></span></td>"

    correo_cli = str(p.get("cliente_correo") or "").strip()
    web_cli = str(p.get("cliente_web") or "").strip()
    correo_linea = " | ".join(part for part in (correo_cli, web_cli) if part)
    try:
        iva_pct_label = f"{float(p.get('iva_pct') or 16):g}"
    except (TypeError, ValueError):
        iva_pct_label = "16"

    html = f"""<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{esc(p.get("folio") or "Póliza CCTV")}</title>
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
    }}
    h1, h2, h3 {{ margin: 0; font-weight: 700; }}
    h1 {{
      font-size: 13.5px;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      line-height: 1.25;
      color: #1e3a5f;
    }}
    h2 {{
      font-size: 12px;
      margin: 14px 0 8px;
      padding: 5px 8px;
      background: #1e3a5f;
      color: #fff;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }}
    h3 {{ font-size: 11px; margin: 10px 0 4px; color: #1e3a5f; }}
    p {{ margin: 0 0 8px; }}
    .letterhead {{
      margin-bottom: 10px;
      border-bottom: 2.5px solid #1e3a5f;
    }}
    .letterhead-top {{
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      padding-bottom: 8px;
    }}
    .brand {{ display: flex; gap: 10px; align-items: center; min-width: 170px; }}
    .logo {{ width: 78px; height: 78px; display: flex; align-items: center; justify-content: center; }}
    .logo img {{ max-width: 78px; max-height: 78px; object-fit: contain; }}
    .logo-fallback {{
      width: 70px; height: 70px; background: #1e3a5f; color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; font-weight: 700; letter-spacing: 0.08em;
    }}
    .brand-name {{ font-size: 18px; font-weight: 700; color: #1e3a5f; letter-spacing: 0.02em; }}
    .brand-tag {{
      font-size: 9.5px; letter-spacing: 0.16em; text-transform: uppercase;
      color: #c4a35a; font-weight: 700; margin-top: 2px;
    }}
    .doc-title {{ text-align: right; max-width: 62%; font-size: 10px; color: #333; line-height: 1.4; }}
    .doc-title h1 {{ margin-bottom: 6px; }}
    table {{ width: 100%; border-collapse: collapse; font-size: 10px; }}
    th, td {{ border: 1px solid #8a8a8a; padding: 5px 7px; vertical-align: top; }}
    th {{
      background: #1e3a5f;
      color: #fff;
      font-weight: 700;
      text-align: left;
    }}
    td.imgcell {{ width: 56px; text-align: center; vertical-align: middle; }}
    td.imgcell img {{ max-width: 48px; max-height: 48px; object-fit: contain; }}
    .client-table th {{
      background: #eef2f6;
      color: #1e3a5f;
      width: 22%;
      font-weight: 700;
      white-space: nowrap;
    }}
    .client-table td {{ background: #fff; font-weight: 600; }}
    .cat-row td {{
      background: #d9e2ec;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #1e3a5f;
    }}
    .total-row td {{ font-weight: 700; background: #eef2f6; }}
    .totals {{
      width: 280px;
      margin-left: auto;
      margin-top: 8px;
      border: 1px solid #8a8a8a;
    }}
    .totals .row {{
      display: flex;
      justify-content: space-between;
      padding: 6px 10px;
      border-top: 1px solid #8a8a8a;
      font-size: 10.5px;
    }}
    .totals .row:first-child {{ border-top: none; }}
    .totals .grand {{ background: #1e3a5f; color: #fff; font-weight: 700; }}
    .callout {{
      border: 1px solid #1e3a5f;
      background: #f7f9fc;
      padding: 10px 12px;
      margin: 10px 0 12px;
    }}
    .callout .label {{
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #1e3a5f;
      font-size: 10px;
      margin-bottom: 6px;
    }}
    .bullets {{ margin: 4px 0 10px 18px; padding: 0; }}
    .bullets li {{ margin: 2px 0; }}
    .steps {{ list-style: none; margin: 0; padding: 0; }}
    .steps li {{ display: flex; gap: 8px; margin: 8px 0; }}
    .step {{
      flex: 0 0 18px; height: 18px; border-radius: 999px;
      background: #1e3a5f; color: #fff; font-weight: 700;
      font-size: 9px; display: flex; align-items: center; justify-content: center;
    }}
    .signs {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 36px;
    }}
    .sign {{ text-align: center; padding-top: 48px; }}
    .sign .line {{ border-top: 1px solid #1a1a1a; margin: 0 12px 8px; }}
    .sign .name {{ font-weight: 700; text-transform: uppercase; font-size: 11px; }}
    .sign .muted {{ color: #444; font-size: 10px; }}
    .pagebreak {{ page-break-before: always; }}
    .blank {{
      display: inline-block;
      min-width: 90px;
      border-bottom: 1px solid #1a1a1a;
      height: 13px;
    }}
  </style>
</head>
<body>
  {head}

  <h2>Datos del cliente</h2>
  <table class="client-table">
    <tbody>
      <tr>
        <th>Nombre / Razón social:</th>
        <td>{_dato(p.get("cliente_nombre"))}</td>
        <th>RFC:</th>
        <td>{_dato(p.get("cliente_rfc"))}</td>
      </tr>
      <tr>
        <th>Domicilio:</th>
        <td>{_dato(p.get("cliente_domicilio"))}</td>
        <th>Fecha:</th>
        <td>{_dato(p.get("fecha"))}</td>
      </tr>
      <tr>
        <th>Contacto:</th>
        <td>Tel: {_dato(p.get("contacto_tel"))} &nbsp; Cel: {_dato(p.get("contacto_cel"))}</td>
        <th>No. Póliza:</th>
        <td>{_dato(p.get("folio"))}</td>
      </tr>
      <tr>
        <th>Correo:</th>
        <td colspan="3">{esc(correo_linea) if correo_linea else "—"}</td>
      </tr>
    </tbody>
  </table>

  <h2>Descripción del servicio</h2>
  <p>{esc(p.get("intro"))}</p>
  <table>
    <thead><tr><th style="width:32%">Concepto</th><th>Detalle</th></tr></thead>
    <tbody>
      <tr><td>Tipo de servicio</td><td>{esc(servicio.get("tipo"))}</td></tr>
      <tr><td>Equipos atendidos</td><td>{esc(servicio.get("equipos"))}</td></tr>
      <tr><td>Referencia de cotización</td><td>{esc(servicio.get("cotizacion_ref"))} Fecha: {esc(servicio.get("cotizacion_fecha"))}</td></tr>
      <tr><td>Frecuencia recomendada</td><td>{esc(servicio.get("frecuencia"))}</td></tr>
      <tr><td>Soporte incluido</td><td>{esc(servicio.get("soporte"))}</td></tr>
    </tbody>
  </table>

  <h2>Cotización</h2>
  <table>
    <thead>
      <tr>
        <th style="width:56px">Foto</th>
        <th>Cantidad</th>
        <th>Unidad</th>
        <th>Descripción</th>
        <th>Detalle</th>
        <th>Precio unitario</th>
        <th>Descuento (%)</th>
        <th>Importe total</th>
      </tr>
    </thead>
    <tbody>
      {_quote_rows(conceptos)}
    </tbody>
  </table>
  <div class="totals">
    <div class="row"><span>Subtotal</span><strong>{_money(p.get("subtotal"))}</strong></div>
    <div class="row"><span>IVA ({esc(iva_pct_label)}%)</span><strong>{_money(p.get("iva"))}</strong></div>
    <div class="row grand"><span>Total</span><strong>{_money(p.get("total"))}</strong></div>
  </div>

  <div class="pagebreak"></div>
  {head}

  <h2>Nota importante: mantenimiento preventivo vs. correctivo</h2>
  <div class="callout">
    <div class="label">Importante</div>
    <p>{esc(p.get("nota_preventivo"))}</p>
    <p>{esc(p.get("nota_altura"))}</p>
    <p>{esc(p.get("nota_correctivo"))}</p>
  </div>

  <h2>Equipos instalados y amparados por esta póliza</h2>
  <p>Con base en la Cotización No. {esc(p.get("equipos_ref"))}, la presente póliza ampara los siguientes equipos:</p>
  <table>
    <thead><tr><th>Equipo / Descripción</th><th style="width:18%">Cantidad</th></tr></thead>
    <tbody>{equipos_rows}</tbody>
  </table>

  <h2>Alcance del mantenimiento preventivo amparado</h2>
  <p>Esta póliza ampara los siguientes puntos de revisión y mantenimiento en cada visita programada:</p>
  <h3>Cámaras</h3>
  {_ul(list(p.get("alcance_camaras") or []))}
  <h3>DVR/NVR</h3>
  {_ul(list(p.get("alcance_dvr") or []))}

  <div class="pagebreak"></div>
  {head}

  <h3>Red y cableado</h3>
  {_ul(list(p.get("alcance_red") or []))}
  <h3>Configuración/software</h3>
  {_ul(list(p.get("alcance_software") or []))}
  <p><b>Esta póliza NO incluye:</b> {esc(p.get("no_incluye"))}</p>

  <h2>Calendario de mantenimientos recomendado</h2>
  <p>{esc(p.get("calendario_intro"))}</p>
  <table>
    <thead>
      <tr>
        <th>Visita</th>
        <th>1er Mantenimiento</th>
        <th>2do Mantenimiento</th>
        <th>3er Mantenimiento</th>
        <th>Observaciones</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Año 1</td>
        {_fecha_cell(0)}
        {_fecha_cell(1)}
        {_fecha_cell(2)}
        <td></td>
      </tr>
    </tbody>
  </table>

  <h2>Condiciones de garantía del servicio</h2>
  <p>{esc(p.get("garantia_intro"))}</p>
  <table>
    <thead><tr><th>Garantía de mano de obra</th><th>Período de validez</th></tr></thead>
    <tbody>{garantia_rows}</tbody>
  </table>
  <h3>La póliza de garantía NO cubre:</h3>
  {_ul(list(p.get("no_cubre") or []))}

  <h2>Proceso de reclamo y atención</h2>
  <ol class="steps">{reclamo_html}</ol>

  <div class="pagebreak"></div>
  {head}

  <h2>Aceptación y firmas de conformidad</h2>
  <div class="signs">
    <div class="sign">
      <div class="line"></div>
      <div class="name">{esc(p.get("firmante_empresa"))}</div>
      <div class="muted">{esc(p.get("firmante_cargo"))}</div>
      <div class="muted">{esc(p.get("razon_social_emisor"))}</div>
    </div>
    <div class="sign">
      <div class="line"></div>
      <div class="name">Representante autorizado</div>
      <div class="muted">Cargo: ______________________________</div>
      <div class="muted">{esc(p.get("cliente_nombre"))}</div>
      <div class="muted">Fecha de firma: ___________________________</div>
    </div>
  </div>
</body>
</html>
"""
    return html
