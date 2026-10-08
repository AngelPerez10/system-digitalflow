"""Agregados livianos para el panel admin (evita serializar órdenes/cotizaciones completas)."""

from __future__ import annotations

from datetime import date

from django.db.models import Avg, Count, Sum
from django.db.models.functions import Coalesce, ExtractMonth, ExtractYear, TruncDate
from django.utils import timezone

from apps.cotizaciones.models import Cotizacion
from apps.operacion.models import Proyecto
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


def _status_counts(qs) -> dict[str, int]:
    return {str(row["status"] or ""): int(row["c"] or 0) for row in qs.values("status").annotate(c=Count("id"))}


# Proyectos que aún piden atención: en obra, detenidos o con saldo por cobrar.
_SEGUIMIENTO = ("en_proceso", "pausado", "saldo_pendiente")


def _proyectos_stats(year: int) -> dict:
    """Estado del portafolio de proyectos (sin cargar el detalle de cada uno)."""
    por_status = _status_counts(Proyecto.objects.all())
    creados_rows = list(
        Proyecto.objects.filter(created_at__year=year)
        .annotate(y=ExtractYear("created_at"), m=ExtractMonth("created_at"))
        .values("y", "m")
        .annotate(c=Count("id"))
    )
    en_proceso = Proyecto.objects.filter(status="en_proceso")
    avance = en_proceso.aggregate(v=Avg("porcentaje_avance"))["v"]
    activos = [
        {
            "id": p.id,
            "folio": (p.folio or "").strip() or (str(p.idx) if p.idx is not None else ""),
            "cliente": p.cliente_nombre or "",
            "tecnico": p.tecnico_nombre or "",
            "avance": int(p.porcentaje_avance or 0),
            "status": p.status,
            "actualizado": p.updated_at.isoformat() if p.updated_at else None,
        }
        for p in Proyecto.objects.filter(status__in=_SEGUIMIENTO)
        .order_by("-updated_at")
        .only(
            "id", "folio", "idx", "cliente_nombre", "tecnico_nombre", "porcentaje_avance", "status", "updated_at"
        )[:5]
    ]
    return {
        "por_status": por_status,
        "creados_meses": _fill_month_counts(creados_rows, year),
        "avance_promedio": round(float(avance), 1) if avance is not None else 0,
        "liquidados": Proyecto.objects.filter(liquidado=True).count(),
        "activos": activos,
    }


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

    cot_year = cot_base.filter(ref_date__year=year)
    cot_status = {
        str(row["status"] or "PENDIENTE"): {"count": int(row["c"] or 0), "monto": float(row["t"] or 0)}
        for row in cot_year.values("status").annotate(c=Count("id"), t=Sum("total"))
    }
    monto_rows = list(
        cot_year.filter(status="AUTORIZADA")
        .annotate(m=ExtractMonth("ref_date"))
        .values("m")
        .annotate(t=Sum("total"))
    )
    monto_meses = [0.0] * 12
    for row in monto_rows:
        m = row.get("m")
        if m and 1 <= int(m) <= 12:
            monto_meses[int(m) - 1] = float(row.get("t") or 0)

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
        "cotizaciones_status": cot_status,
        "cotizaciones_monto_autorizado_meses": monto_meses,
        "ordenes_status": _status_counts(ord_base.filter(ref_date__year=year)),
        "proyectos": _proyectos_stats(year),
    }
