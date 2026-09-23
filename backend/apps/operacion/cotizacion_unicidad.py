"""Unicidad de cotizaciones vinculadas a proyectos (JSON embebido).

Una misma cotización (DigitalFlow o SICAR), como principal o adicional,
solo puede vivir en un proyecto no cancelado a la vez.
"""

from __future__ import annotations

from typing import Any

from apps.common.document_folio import FOLIO_SERIE_PRJ, format_document_folio

from .models import Proyecto


def canonical_cotizacion_id(raw_id: Any, origen: Any = None) -> str | None:
    """Normaliza a `df-{n}` / `sicar-{n}` (o `raw-…` si no hay origen)."""
    cid = str(raw_id or "").strip()
    if not cid:
        return None
    lower = cid.lower()
    if lower.startswith("df-"):
        rest = cid[3:].strip()
        return f"df-{rest}" if rest else None
    if lower.startswith("sicar-"):
        rest = cid[6:].strip()
        return f"sicar-{rest}" if rest else None

    origen_norm = str(origen or "").strip().lower()
    if origen_norm in ("digitalflow", "df"):
        return f"df-{cid}"
    if origen_norm == "sicar":
        return f"sicar-{cid}"
    return f"raw-{lower}"


def _id_from_cotizacion_dict(cot: Any) -> str | None:
    if not isinstance(cot, dict):
        return None
    return canonical_cotizacion_id(cot.get("id"), cot.get("origen"))


def collect_proyecto_cotizacion_ids(
    cotizaciones: Any = None,
    cotizacion_adicional: Any = None,
) -> set[str]:
    """IDs canónicos de principales + adicional en un payload / instancia."""
    ids: set[str] = set()
    bloques = cotizaciones if isinstance(cotizaciones, list) else []
    for bloque in bloques:
        if not isinstance(bloque, dict):
            continue
        cot = bloque.get("cotizacion")
        cid = _id_from_cotizacion_dict(cot)
        if cid:
            ids.add(cid)
    adicional_id = _id_from_cotizacion_dict(cotizacion_adicional)
    if adicional_id:
        ids.add(adicional_id)
    return ids


def _proyecto_display_folio(proyecto: Proyecto) -> str:
    folio = str(getattr(proyecto, "folio", None) or "").strip()
    if folio:
        return folio
    idx = getattr(proyecto, "idx", None)
    if idx is not None:
        return format_document_folio(FOLIO_SERIE_PRJ, idx, empty="") or f"#{proyecto.pk}"
    return f"#{proyecto.pk}"


def build_ocupadas_index(
    *,
    exclude_proyecto_id: int | None = None,
) -> dict[str, dict[str, Any]]:
    """
    Mapa id_canónico → { id, folio } del proyecto no cancelado que la ocupa.
    El primero encontrado gana (orden por -idx).
    """
    qs = (
        Proyecto.objects.exclude(status="cancelado")
        .only("id", "idx", "folio", "status", "cotizaciones", "cotizacion_adicional")
        .order_by("-idx", "-id")
    )
    if exclude_proyecto_id is not None:
        qs = qs.exclude(pk=exclude_proyecto_id)

    by_id: dict[str, dict[str, Any]] = {}
    for proyecto in qs.iterator(chunk_size=200):
        for cid in collect_proyecto_cotizacion_ids(
            getattr(proyecto, "cotizaciones", None),
            getattr(proyecto, "cotizacion_adicional", None),
        ):
            if cid in by_id:
                continue
            by_id[cid] = {
                "id": proyecto.pk,
                "folio": _proyecto_display_folio(proyecto),
            }
    return by_id


def find_cotizacion_conflicts(
    ids: set[str] | list[str],
    *,
    exclude_proyecto_id: int | None = None,
) -> dict[str, dict[str, Any]]:
    """Subconjunto de `ids` que ya están en otro proyecto no cancelado."""
    wanted = {str(i) for i in ids if i}
    if not wanted:
        return {}
    ocupadas = build_ocupadas_index(exclude_proyecto_id=exclude_proyecto_id)
    return {cid: ocupadas[cid] for cid in wanted if cid in ocupadas}


def find_internal_duplicate_ids(
    cotizaciones: Any = None,
    cotizacion_adicional: Any = None,
) -> list[str]:
    """IDs que aparecen más de una vez en el mismo payload (principales y/o adicional)."""
    seen: set[str] = set()
    dupes: list[str] = []
    bloques = cotizaciones if isinstance(cotizaciones, list) else []
    for bloque in bloques:
        if not isinstance(bloque, dict):
            continue
        cid = _id_from_cotizacion_dict(bloque.get("cotizacion"))
        if not cid:
            continue
        if cid in seen and cid not in dupes:
            dupes.append(cid)
        seen.add(cid)
    adicional_id = _id_from_cotizacion_dict(cotizacion_adicional)
    if adicional_id and adicional_id in seen and adicional_id not in dupes:
        dupes.append(adicional_id)
    return dupes
