"""Helpers para productos manuales en cotizaciones y exportaciones."""
from __future__ import annotations

import logging
import re

logger = logging.getLogger(__name__)

_MANUAL_EXT_RE = re.compile(r"^manual:(\d+)$", re.IGNORECASE)


def build_manual_producto_descripcion(
    marca: str = "",
    modelo: str = "",
    caracteristicas: str = "",
) -> str:
    parts: list[str] = []
    meta = " · ".join(
        p for p in (str(marca or "").strip(), str(modelo or "").strip()) if p
    )
    if meta:
        parts.append(meta)
    chars = str(caracteristicas or "").strip()
    if chars:
        parts.append(chars)
    return "\n\n".join(parts)


def manual_producto_id_from_externo(producto_externo_id: str) -> int | None:
    match = _MANUAL_EXT_RE.match(str(producto_externo_id or "").strip())
    if not match:
        return None
    try:
        return int(match.group(1))
    except (TypeError, ValueError):
        return None


def manual_producto_descripcion_map(producto_externo_ids: list[str]) -> dict[int, str]:
    """Mapa id → descripción (marca/modelo + características) para líneas manual:N."""
    manual_ids: list[int] = []
    for ext_id in producto_externo_ids:
        parsed = manual_producto_id_from_externo(ext_id)
        if parsed is not None:
            manual_ids.append(parsed)
    if not manual_ids:
        return {}

    from .models import ProductoManual

    result: dict[int, str] = {}
    for pm in ProductoManual.objects.filter(pk__in=manual_ids).only(
        "id", "marca", "modelo", "caracteristicas"
    ):
        built = build_manual_producto_descripcion(pm.marca, pm.modelo, pm.caracteristicas)
        if built:
            result[pm.id] = built
    return result


def resolve_item_descripcion(producto_externo_id: str, stored_descripcion: str, catalog_map: dict[int, str]) -> str:
    stored = str(stored_descripcion or "").strip()
    manual_id = manual_producto_id_from_externo(producto_externo_id)
    if manual_id is None:
        return stored
    from_catalog = catalog_map.get(manual_id, "").strip()
    if from_catalog:
        return from_catalog
    return stored
