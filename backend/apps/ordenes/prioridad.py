"""Escalado automático de la prioridad de bolsa (`prioridad_pool`).

La prioridad que fija el admin es el punto de partida. Si la orden lleva
demasiado tiempo sin resolverse (contado desde `fecha_creacion`), sube de nivel
automáticamente:

*   < 72 h            → prioridad base
*   72 h – 96 h       → +1 nivel (baja→media, media→alta)
*   ≥ 96 h            → +2 niveles (→ alta)

No escala si la orden ya está resuelta, ni si la prioridad base no es una de
{baja, media, alta} (p. ej. órdenes antiguas sin prioridad).

El valor es *derivado*: no se persiste. Serializers y ordenamiento de la bolsa
lo calculan al vuelo, así siempre es exacto sin depender de un cron.
"""

from __future__ import annotations

from datetime import datetime

from django.utils import timezone

PRIORIDAD_NIVEL = {"baja": 0, "media": 1, "alta": 2}
NIVEL_PRIORIDAD = ["baja", "media", "alta"]

# Horas desde la creación para escalar 1 y 2 niveles.
ESCALA_1_HORAS = 72
ESCALA_2_HORAS = 96

_ESTADOS_RESUELTA = {"resuelto", "completado", "completada"}


def _norm(value) -> str:
    return str(value or "").strip().lower()


def pasos_escalado(fecha_creacion: datetime | None, ahora: datetime | None = None) -> int:
    """Cuántos niveles subir según la antigüedad. 0, 1 o 2."""
    if not fecha_creacion:
        return 0
    ahora = ahora or timezone.now()
    horas = (ahora - fecha_creacion).total_seconds() / 3600.0
    if horas >= ESCALA_2_HORAS:
        return 2
    if horas >= ESCALA_1_HORAS:
        return 1
    return 0


def prioridad_pool_efectiva(
    base,
    fecha_creacion: datetime | None,
    status,
    ahora: datetime | None = None,
) -> str:
    """Prioridad de bolsa efectiva (base escalada por antigüedad)."""
    base_key = _norm(base)
    nivel = PRIORIDAD_NIVEL.get(base_key)
    if nivel is None:
        return base_key
    if _norm(status) in _ESTADOS_RESUELTA:
        return base_key
    nivel_efectivo = min(2, nivel + pasos_escalado(fecha_creacion, ahora))
    return NIVEL_PRIORIDAD[nivel_efectivo]


def orden_prioridad_pool_efectiva(orden, ahora: datetime | None = None) -> str:
    return prioridad_pool_efectiva(
        orden.prioridad_pool, orden.fecha_creacion, orden.status, ahora
    )
