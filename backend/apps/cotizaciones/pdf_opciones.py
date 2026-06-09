"""Opciones de visualización para PDF de cotización."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping


@dataclass(frozen=True)
class CotizacionPdfOpciones:
    ocultar_precios_unitarios: bool = False
    ocultar_importes_linea: bool = False
    ocultar_totales: bool = False
    simplificar_descripcion: bool = False


def _as_bool(value: Any, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        s = value.strip().lower()
        if s in ("true", "1", "yes", "on"):
            return True
        if s in ("false", "0", "no", "off", ""):
            return False
    if isinstance(value, (int, float)):
        return bool(value)
    return default


def parse_pdf_opciones(raw: Any) -> CotizacionPdfOpciones:
    if not isinstance(raw, Mapping):
        return CotizacionPdfOpciones()
    return CotizacionPdfOpciones(
        ocultar_precios_unitarios=_as_bool(raw.get("ocultar_precios_unitarios")),
        ocultar_importes_linea=_as_bool(raw.get("ocultar_importes_linea")),
        ocultar_totales=_as_bool(raw.get("ocultar_totales")),
        simplificar_descripcion=_as_bool(raw.get("simplificar_descripcion")),
    )


def parse_pdf_opciones_from_request_data(data: Any) -> CotizacionPdfOpciones:
    if not isinstance(data, Mapping):
        return CotizacionPdfOpciones()
    return parse_pdf_opciones(data.get("pdf_opciones"))


def pdf_opciones_to_dict(opts: CotizacionPdfOpciones) -> dict[str, bool]:
    return {
        "ocultar_precios_unitarios": opts.ocultar_precios_unitarios,
        "ocultar_importes_linea": opts.ocultar_importes_linea,
        "ocultar_totales": opts.ocultar_totales,
        "simplificar_descripcion": opts.simplificar_descripcion,
    }


def parse_pdf_opciones_from_cotizacion(cotizacion) -> CotizacionPdfOpciones:
    return parse_pdf_opciones(getattr(cotizacion, "pdf_opciones", None))


def parse_pdf_opciones_from_query(query_params: Mapping[str, str]) -> CotizacionPdfOpciones:
    prefix = "pdf_"
    return CotizacionPdfOpciones(
        ocultar_precios_unitarios=_as_bool(query_params.get(f"{prefix}ocultar_precios_unitarios")),
        ocultar_importes_linea=_as_bool(query_params.get(f"{prefix}ocultar_importes_linea")),
        ocultar_totales=_as_bool(query_params.get(f"{prefix}ocultar_totales")),
        simplificar_descripcion=_as_bool(query_params.get(f"{prefix}simplificar_descripcion")),
    )
