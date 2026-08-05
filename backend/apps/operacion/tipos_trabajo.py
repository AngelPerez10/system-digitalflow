"""Helpers para tipos de trabajo múltiples y restricciones del técnico asignado."""

from __future__ import annotations


TECNICO_LOCK_MSG = "Como técnico asignado no puedes modificar este campo."


def normalize_tipos_trabajo(raw) -> list[dict]:
    """Normaliza a lista de {id: int, nombre: str} sin duplicar por id."""
    if raw is None:
        return []
    items = raw if isinstance(raw, list) else []
    seen: set[int] = set()
    out: list[dict] = []
    for item in items:
        tipo_id: int | None = None
        nombre = ""
        if isinstance(item, dict):
            try:
                tipo_id = int(item.get("id"))
            except (TypeError, ValueError):
                tipo_id = None
            nombre = str(item.get("nombre") or "").strip()
        else:
            try:
                tipo_id = int(item)
            except (TypeError, ValueError):
                tipo_id = None
        if tipo_id is None or tipo_id <= 0 or tipo_id in seen:
            continue
        seen.add(tipo_id)
        out.append({"id": tipo_id, "nombre": nombre})
    return out


def sync_legacy_tipo_trabajo(tipos: list[dict]) -> tuple[int | None, str]:
    if not tipos:
        return None, ""
    first = tipos[0]
    tipo_id = first.get("id")
    try:
        tipo_id_int = int(tipo_id) if tipo_id is not None else None
    except (TypeError, ValueError):
        tipo_id_int = None
    nombre = str(first.get("nombre") or "").strip()
    return tipo_id_int if tipo_id_int and tipo_id_int > 0 else None, nombre


def merge_tipos_trabajo(*groups) -> list[dict]:
    merged: list[dict] = []
    for group in groups:
        merged = normalize_tipos_trabajo([*merged, *(group or [])])
    return merged


def is_assigned_technician_actor(user, proyecto) -> bool:
    """True si el usuario es el técnico del proyecto y no es admin."""
    if user is None or proyecto is None:
        return False
    if getattr(user, "is_staff", False) or getattr(user, "is_superuser", False):
        return False
    return getattr(proyecto, "tecnico_id", None) == getattr(user, "id", None)


def _cotizacion_ids(cotizaciones) -> list[str]:
    bloques = cotizaciones if isinstance(cotizaciones, list) else []
    ids: list[str] = []
    for b in bloques:
        if not isinstance(b, dict):
            continue
        cot = b.get("cotizacion") if isinstance(b.get("cotizacion"), dict) else {}
        cid = str(cot.get("id") or b.get("vinculoId") or "").strip()
        if cid:
            ids.append(cid)
    return ids


def assert_tecnico_locked_fields(instance, attrs: dict) -> dict[str, list[str]]:
    """
    Devuelve errores de validación si el técnico asignado intenta cambiar
    cotizaciones (vincular o quitar), tipos de trabajo o fecha de autorización.
    La entrega de equipos sí la puede marcar el técnico.
    """
    errors: dict[str, list[str]] = {}

    if "tipos_trabajo" in attrs or "tipo_trabajo_id" in attrs or "tipo_trabajo_nombre" in attrs:
        current = normalize_tipos_trabajo(getattr(instance, "tipos_trabajo", None))
        if not current and getattr(instance, "tipo_trabajo_id", None):
            current = normalize_tipos_trabajo(
                [
                    {
                        "id": instance.tipo_trabajo_id,
                        "nombre": getattr(instance, "tipo_trabajo_nombre", "") or "",
                    }
                ]
            )
        incoming = None
        if "tipos_trabajo" in attrs:
            incoming = normalize_tipos_trabajo(attrs.get("tipos_trabajo"))
        elif "tipo_trabajo_id" in attrs or "tipo_trabajo_nombre" in attrs:
            tid = attrs.get("tipo_trabajo_id", getattr(instance, "tipo_trabajo_id", None))
            tname = attrs.get(
                "tipo_trabajo_nombre", getattr(instance, "tipo_trabajo_nombre", "") or ""
            )
            incoming = normalize_tipos_trabajo(
                [{"id": tid, "nombre": tname}] if tid else []
            )
        if incoming is not None and incoming != current:
            errors["tipos_trabajo"] = [TECNICO_LOCK_MSG]

    if "fecha_autorizacion" in attrs:
        current_fecha = getattr(instance, "fecha_autorizacion", None)
        incoming_fecha = attrs.get("fecha_autorizacion")
        # Comparar como strings ISO cuando hay date objects
        cur_s = str(current_fecha) if current_fecha else ""
        inc_s = str(incoming_fecha) if incoming_fecha else ""
        if cur_s != inc_s:
            errors["fecha_autorizacion"] = [TECNICO_LOCK_MSG]

    if "cotizaciones" in attrs:
        current_ids = set(_cotizacion_ids(getattr(instance, "cotizaciones", None)))
        incoming_ids = set(_cotizacion_ids(attrs.get("cotizaciones")))
        if incoming_ids != current_ids:
            errors["cotizaciones"] = [TECNICO_LOCK_MSG]

    return errors
