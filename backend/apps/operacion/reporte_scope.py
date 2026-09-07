"""Alcance own_only de reportes de mantenimiento (orden asignada o creador)."""
from __future__ import annotations

from django.db.models import Q, QuerySet


def filter_reportes_visible_to_user(qs: QuerySet, user) -> QuerySet:
    """Reportes cuya orden tiene al usuario como técnico, o que él creó."""
    if not user or not getattr(user, "is_authenticated", False):
        return qs.none()
    return qs.filter(Q(creado_por=user) | Q(orden__tecnico_asignado=user)).distinct()


def user_can_access_reporte(user, reporte) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(reporte, "creado_por_id", None) == getattr(user, "id", None):
        return True
    orden = getattr(reporte, "orden", None)
    if orden is not None and getattr(orden, "tecnico_asignado_id", None) == getattr(user, "id", None):
        return True
    return False


def user_can_use_orden_for_reporte(user, orden) -> bool:
    """Con own_only, solo órdenes donde el usuario es el técnico asignado."""
    if not user or not getattr(user, "is_authenticated", False) or orden is None:
        return False
    return getattr(orden, "tecnico_asignado_id", None) == getattr(user, "id", None)
