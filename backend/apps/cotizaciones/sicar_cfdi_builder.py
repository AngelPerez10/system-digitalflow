"""Generación de XML CFDI 4.0 (ingreso) para timbrado."""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from lxml import etree

CFDI_NS = "http://www.sat.gob.mx/cfd/4"
NSMAP = {None: CFDI_NS}


def _q(value: Decimal | float | int | str, places: int = 2) -> str:
    d = Decimal(str(value)).quantize(Decimal(10) ** -places, rounding=ROUND_HALF_UP)
    return format(d, "f")


def _clave_only(label: str) -> str:
    text = str(label or "").strip()
    if "-" in text:
        return text.split("-", 1)[0].strip()
    return text


def build_cfdi_xml(
    *,
    emisor: dict[str, Any],
    receptor: dict[str, Any],
    conceptos: list[dict[str, Any]],
    forma_pago: str,
    metodo_pago: str,
    lugar_expedicion: str,
    serie: str,
    folio: int,
    fecha: datetime | None = None,
    moneda: str = "MXN",
    tipo_cambio: str = "1",
    exportacion: str = "01",
) -> tuple[bytes, dict]:
    fecha = fecha or datetime.now()
    fecha_str = fecha.strftime("%Y-%m-%dT%H:%M:%S")

    subtotal = Decimal("0")
    total_iva = Decimal("0")
    concepto_nodes: list[etree.Element] = []

    for idx, item in enumerate(conceptos, start=1):
        cantidad = Decimal(str(item.get("cantidad") or 1))
        precio_sin = Decimal(str(item.get("precio_sin") or item.get("valor_unitario") or 0))
        importe_sin = (cantidad * precio_sin).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        tasa_iva = Decimal(str(item.get("tasa_iva", "0.16")))
        iva_line = (importe_sin * tasa_iva).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        subtotal += importe_sin
        total_iva += iva_line

        concepto = etree.Element(f"{{{CFDI_NS}}}Concepto")
        concepto.set("ClaveProdServ", str(item.get("clave_prod_serv") or "01010101"))
        concepto.set("Cantidad", _q(cantidad, 4))
        concepto.set("ClaveUnidad", str(item.get("clave_unidad") or "E48"))
        concepto.set("Unidad", str(item.get("unidad") or "SERV"))
        concepto.set("Descripcion", str(item.get("descripcion") or "Servicio")[:1000])
        concepto.set("ValorUnitario", _q(precio_sin, 6))
        concepto.set("Importe", _q(importe_sin))
        concepto.set("ObjetoImp", "02")

        traslados = etree.SubElement(concepto, f"{{{CFDI_NS}}}Impuestos")
        traslado_wrap = etree.SubElement(traslados, f"{{{CFDI_NS}}}Traslados")
        traslado = etree.SubElement(traslado_wrap, f"{{{CFDI_NS}}}Traslado")
        traslado.set("Base", _q(importe_sin))
        traslado.set("Impuesto", "002")
        traslado.set("TipoFactor", "Tasa")
        traslado.set("TasaOCuota", _q(tasa_iva, 6))
        traslado.set("Importe", _q(iva_line))

        concepto_nodes.append(concepto)

    total = subtotal + total_iva

    comprobante = etree.Element(f"{{{CFDI_NS}}}Comprobante", nsmap=NSMAP)
    comprobante.set("Version", "4.0")
    comprobante.set("Serie", serie or "")
    comprobante.set("Folio", str(folio))
    comprobante.set("Fecha", fecha_str)
    comprobante.set("SubTotal", _q(subtotal))
    comprobante.set("Moneda", moneda)
    if moneda != "MXN":
        comprobante.set("TipoCambio", tipo_cambio)
    comprobante.set("Total", _q(total))
    comprobante.set("TipoDeComprobante", "I")
    comprobante.set("Exportacion", exportacion)
    comprobante.set("MetodoPago", _clave_only(metodo_pago))
    comprobante.set("FormaPago", _clave_only(forma_pago))
    comprobante.set("LugarExpedicion", str(lugar_expedicion or emisor.get("codigo_postal") or "00000"))

    emisor_el = etree.SubElement(comprobante, f"{{{CFDI_NS}}}Emisor")
    emisor_el.set("Rfc", str(emisor["rfc"]))
    emisor_el.set("Nombre", str(emisor["nombre"])[:254])
    emisor_el.set("RegimenFiscal", _clave_only(str(emisor.get("regimen") or "601")))

    receptor_el = etree.SubElement(comprobante, f"{{{CFDI_NS}}}Receptor")
    receptor_el.set("Rfc", str(receptor["rfc"]))
    receptor_el.set("Nombre", str(receptor["nombre"])[:254])
    receptor_el.set("DomicilioFiscalReceptor", str(receptor.get("codigo_postal") or "00000"))
    receptor_el.set("RegimenFiscalReceptor", _clave_only(str(receptor.get("regimen") or "616")))
    receptor_el.set("UsoCFDI", _clave_only(str(receptor.get("uso_cfdi") or "G03")))

    conceptos_el = etree.SubElement(comprobante, f"{{{CFDI_NS}}}Conceptos")
    for node in concepto_nodes:
        conceptos_el.append(node)

    impuestos = etree.SubElement(comprobante, f"{{{CFDI_NS}}}Impuestos")
    impuestos.set("TotalImpuestosTrasladados", _q(total_iva))
    traslados = etree.SubElement(impuestos, f"{{{CFDI_NS}}}Traslados")
    traslado = etree.SubElement(traslados, f"{{{CFDI_NS}}}Traslado")
    traslado.set("Base", _q(subtotal))
    traslado.set("Impuesto", "002")
    traslado.set("TipoFactor", "Tasa")
    traslado.set("TasaOCuota", _q(Decimal("0.160000"), 6))
    traslado.set("Importe", _q(total_iva))

    xml_bytes = etree.tostring(
        comprobante,
        xml_declaration=True,
        encoding="UTF-8",
        pretty_print=False,
    )
    return xml_bytes, {
        "subtotal": subtotal,
        "iva": total_iva,
        "total": total,
        "fecha": fecha,
    }
