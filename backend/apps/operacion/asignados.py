"""Normalización y visibilidad de técnicos/auxiliares múltiples en Proyecto."""

from __future__ import annotations

from typing import Any

from django.db.models import Q, QuerySet


def _as_int(value: Any) -> int | None:
    try:
        n = int(value)
    except (TypeError, ValueError):
        return None
    return n if n > 0 else None


def _as_bool(value: Any, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized == "true":
            return True
        if normalized == "false":
            return False
    return default


def normalize_tecnicos(raw: Any) -> list[dict]:
    """
    Lista canónica: [{id, nombre, responsable}].
    Exactamente un responsable si hay ≥1 técnico.
    """
    items = raw if isinstance(raw, list) else []
    seen: set[int] = set()
    out: list[dict] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        tid = _as_int(item.get("id"))
        if tid is None or tid in seen:
            continue
        seen.add(tid)
        nombre = str(item.get("nombre") or "").strip()
        out.append(
            {
                "id": tid,
                "nombre": nombre,
                "responsable": _as_bool(item.get("responsable"), False),
            }
        )

    if not out:
        return []

    responsables = [t for t in out if t["responsable"]]
    if len(responsables) == 0:
        out[0]["responsable"] = True
    elif len(responsables) > 1:
        first_resp_id = responsables[0]["id"]
        for t in out:
            t["responsable"] = t["id"] == first_resp_id
    return out


def normalize_auxiliares(raw: Any) -> list[dict]:
    """Lista canónica: [{id, nombre}]."""
    items = raw if isinstance(raw, list) else []
    seen: set[int] = set()
    out: list[dict] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        tid = _as_int(item.get("id"))
        if tid is None or tid in seen:
            continue
        seen.add(tid)
        out.append({"id": tid, "nombre": str(item.get("nombre") or "").strip()})
    return out


def hydrate_tecnicos_from_legacy(tecnicos: list[dict], tecnico_id: Any, tecnico_nombre: str) -> list[dict]:
    if tecnicos:
        return tecnicos
    tid = _as_int(tecnico_id)
    if tid is None:
        return []
    return [{"id": tid, "nombre": str(tecnico_nombre or "").strip(), "responsable": True}]


def hydrate_auxiliares_from_legacy(auxiliares: list[dict], auxiliar_id: Any, auxiliar_nombre: str) -> list[dict]:
    if auxiliares:
        return auxiliares
    aid = _as_int(auxiliar_id)
    if aid is None:
        return []
    return [{"id": aid, "nombre": str(auxiliar_nombre or "").strip()}]


def sync_legacy_from_tecnicos(tecnicos: list[dict]) -> tuple[int | None, str]:
    for t in tecnicos:
        if t.get("responsable"):
            return _as_int(t.get("id")), str(t.get("nombre") or "").strip()
    if tecnicos:
        t = tecnicos[0]
        return _as_int(t.get("id")), str(t.get("nombre") or "").strip()
    return None, ""


def sync_legacy_from_auxiliares(auxiliares: list[dict]) -> tuple[int | None, str]:
    if not auxiliares:
        return None, ""
    a = auxiliares[0]
    return _as_int(a.get("id")), str(a.get("nombre") or "").strip()


def ids_from_asignados(lista: Any) -> set[int]:
    items = lista if isinstance(lista, list) else []
    out: set[int] = set()
    for item in items:
        if not isinstance(item, dict):
            continue
        tid = _as_int(item.get("id"))
        if tid is not None:
            out.add(tid)
    return out


def user_on_proyecto_team(user, proyecto) -> bool:
    """True si el usuario es creador, técnico (lista/FK) o auxiliar (lista/FK)."""
    if user is None or proyecto is None:
        return False
    uid = getattr(user, "id", None)
    if uid is None:
        return False
    if getattr(proyecto, "creado_por_id", None) == uid:
        return True
    if getattr(proyecto, "tecnico_id", None) == uid:
        return True
    if getattr(proyecto, "auxiliar_id", None) == uid:
        return True
    tecnicos = hydrate_tecnicos_from_legacy(
        normalize_tecnicos(getattr(proyecto, "tecnicos", None)),
        getattr(proyecto, "tecnico_id", None),
        getattr(proyecto, "tecnico_nombre", "") or "",
    )
    if uid in ids_from_asignados(tecnicos):
        return True
    auxiliares = hydrate_auxiliares_from_legacy(
        normalize_auxiliares(getattr(proyecto, "auxiliares", None)),
        getattr(proyecto, "auxiliar_id", None),
        getattr(proyecto, "auxiliar_nombre", "") or "",
    )
    return uid in ids_from_asignados(auxiliares)


def user_is_assigned_technician(user, proyecto) -> bool:
    """True si el usuario está en la lista de técnicos (o FK legacy)."""
    if user is None or proyecto is None:
        return False
    uid = getattr(user, "id", None)
    if uid is None:
        return False
    if getattr(proyecto, "tecnico_id", None) == uid:
        return True
    tecnicos = hydrate_tecnicos_from_legacy(
        normalize_tecnicos(getattr(proyecto, "tecnicos", None)),
        getattr(proyecto, "tecnico_id", None),
        getattr(proyecto, "tecnico_nombre", "") or "",
    )
    return uid in ids_from_asignados(tecnicos)


def filter_proyectos_visible_to_user(qs: QuerySet, user) -> QuerySet:
    """Filtra proyectos visibles con own_only (FK + listas JSON)."""
    if not user or not getattr(user, "is_authenticated", False):
        return qs.none()
    uid = getattr(user, "id", None)
    if uid is None:
        return qs.none()

    # Quitar select_related para poder usar only() en el escaneo JSON.
    scan = qs.order_by().select_related(None)
    fk_ids = list(
        scan.filter(Q(tecnico=user) | Q(auxiliar=user) | Q(creado_por=user)).values_list("id", flat=True)
    )
    extra_ids: list[int] = []
    for row in (
        scan.exclude(id__in=fk_ids)
        .only("id", "tecnicos", "auxiliares", "tecnico_id", "auxiliar_id", "creado_por_id")
        .iterator(chunk_size=250)
    ):
        if user_on_proyecto_team(user, row):
            extra_ids.append(row.id)
    return qs.filter(id__in=[*fk_ids, *extra_ids])
