"""Autorizar cotizaciones DigitalFlow al guardar un proyecto."""

from __future__ import annotations

from django.db.models import Q

from apps.cotizaciones.models import Cotizacion


def digitalflow_cotizacion_pks(cotizaciones) -> list[int]:
    """IDs numéricos de cotizaciones DigitalFlow embebidas en el JSON del proyecto."""
    bloques = cotizaciones if isinstance(cotizaciones, list) else []
    pks: list[int] = []
    seen: set[int] = set()
    for bloque in bloques:
        if not isinstance(bloque, dict):
            continue
        cot = bloque.get("cotizacion")
        if not isinstance(cot, dict):
            continue
        origen = str(cot.get("origen") or "").strip().lower()
        if origen != "digitalflow":
            continue
        raw = str(cot.get("id") or "").strip()
        if raw.lower().startswith("df-"):
            raw = raw[3:]
        try:
            pk = int(raw)
        except (TypeError, ValueError):
            continue
        if pk <= 0 or pk in seen:
            continue
        seen.add(pk)
        pks.append(pk)
    return pks


def authorize_pending_digitalflow_cotizaciones(cotizaciones) -> int:
    """
    Pasa a AUTORIZADA las cotizaciones DigitalFlow en estado pendiente
    (PENDIENTE o status vacío). No toca CANCELADA ni AUTORIZADA.
    Retorna cuántas se actualizaron.
    """
    pks = digitalflow_cotizacion_pks(cotizaciones)
    if not pks:
        return 0
    pending = Q(status="PENDIENTE") | Q(status="") | Q(status__isnull=True)
    return Cotizacion.objects.filter(pending, pk__in=pks).update(status="AUTORIZADA")
