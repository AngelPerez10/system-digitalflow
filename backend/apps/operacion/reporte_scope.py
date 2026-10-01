"""Alcance own_only de reportes de mantenimiento (orden/proyecto asignado o creador)."""
from __future__ import annotations

from django.db.models import Q, QuerySet


def filter_reportes_visible_to_user(qs: QuerySet, user) -> QuerySet:
    """Reportes que el usuario creó, de órdenes donde es técnico o de proyectos de su equipo."""
    if not user or not getattr(user, "is_authenticated", False):
        return qs.none()
    from .asignados import filter_proyectos_visible_to_user
    from .models import Proyecto

    proyecto_ids = list(filter_proyectos_visible_to_user(Proyecto.objects.all(), user).values_list("id", flat=True))
    return qs.filter(
        Q(creado_por=user) | Q(orden__tecnico_asignado=user) | Q(proyecto_id__in=proyecto_ids)
    ).distinct()


def user_can_access_reporte(user, reporte) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(reporte, "creado_por_id", None) == getattr(user, "id", None):
        return True
    orden = getattr(reporte, "orden", None)
    if orden is not None and getattr(orden, "tecnico_asignado_id", None) == getattr(user, "id", None):
        return True
    return user_can_use_proyecto_for_reporte(user, getattr(reporte, "proyecto", None))


def user_can_use_orden_for_reporte(user, orden) -> bool:
    """Con own_only, solo órdenes donde el usuario es el técnico asignado."""
    if not user or not getattr(user, "is_authenticated", False) or orden is None:
        return False
    return getattr(orden, "tecnico_asignado_id", None) == getattr(user, "id", None)


def user_can_use_proyecto_for_reporte(user, proyecto) -> bool:
    """Con own_only, solo proyectos donde el usuario es parte del equipo (técnico, auxiliar o creador)."""
    if not user or not getattr(user, "is_authenticated", False) or proyecto is None:
        return False
    from .asignados import user_on_proyecto_team

    return user_on_proyecto_team(user, proyecto)
