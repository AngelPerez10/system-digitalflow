"""Agregados livianos para el panel admin (evita serializar órdenes/cotizaciones completas)."""

from __future__ import annotations

from datetime import date

from django.db.models import Count
from django.db.models.functions import Coalesce, ExtractMonth, ExtractYear, TruncDate
from django.utils import timezone

from apps.cotizaciones.models import Cotizacion
from apps.ordenes.models import Orden

_MESES_ES = (
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
)


def _empty_year() -> list[int]:
    return [0] * 12


def _fill_month_counts(rows, year: int) -> list[int]:
    counts = _empty_year()
    for row in rows:
        y = row.get("y")
        m = row.get("m")
        if y != year or not m or not (1 <= int(m) <= 12):
            continue
        counts[int(m) - 1] = int(row.get("c") or 0)
    return counts


def _month_label(today: date) -> str:
    return f"{_MESES_ES[today.month - 1]} de {today.year}"


def build_dashboard_stats(*, today: date | None = None) -> dict:
    """
    Series mensuales + métricas del mes actual.

    Fechas alineadas al frontend (`dashboardStats.ts`):
    - Cotizaciones: Coalesce(fecha, fecha_creacion::date)
    - Órdenes: Coalesce(fecha_finalizacion, fecha_inicio, fecha_creacion::date)
    """
    today = today or timezone.localdate()
    year = today.year
    prev_year = year - 1

    cot_ref = Coalesce("fecha", TruncDate("fecha_creacion"))
    cot_base = Cotizacion.objects.annotate(ref_date=cot_ref).filter(ref_date__isnull=False)
    cot_rows = list(
        cot_base.filter(ref_date__year__in=[year, prev_year])
        .annotate(y=ExtractYear("ref_date"), m=ExtractMonth("ref_date"))
        .values("y", "m")
        .annotate(c=Count("id"))
    )
    cotizaciones_mes = cot_base.filter(
        ref_date__year=year,
        ref_date__month=today.month,
    ).count()

    ord_ref = Coalesce(
        "fecha_finalizacion",
        "fecha_inicio",
        TruncDate("fecha_creacion"),
    )
    ord_base = Orden.objects.annotate(ref_date=ord_ref).filter(ref_date__isnull=False)
    ordenes_mes = ord_base.filter(
        ref_date__year=year,
        ref_date__month=today.month,
    ).count()

    resuelto_rows = list(
        ord_base.filter(status="resuelto", ref_date__year=year)
        .annotate(y=ExtractYear("ref_date"), m=ExtractMonth("ref_date"))
        .values("y", "m")
        .annotate(c=Count("id"))
    )

    return {
        "mes_actual": {
            "cotizaciones_mes": cotizaciones_mes,
            "ordenes_mes": ordenes_mes,
            "month_label": _month_label(today),
        },
        "cotizaciones_years": {
            "year": year,
            "previous_year": prev_year,
            "current": _fill_month_counts(cot_rows, year),
            "previous": _fill_month_counts(cot_rows, prev_year),
        },
        "ordenes_completadas_meses": _fill_month_counts(resuelto_rows, year),
    }
