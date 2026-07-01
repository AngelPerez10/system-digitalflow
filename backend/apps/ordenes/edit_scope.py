from datetime import date, datetime, time

from rest_framework.exceptions import PermissionDenied

from apps.ordenes.pdf_limits import normalize_fotos_extra_max


LIMITED_ORDEN_EDIT_FIELDS = frozenset({
    'problematica',
    'status',
    'fecha_inicio',
    'hora_inicio',
    'fecha_finalizacion',
    'hora_termino',
    'fotos_urls',
    'fotos_extra_max',
})


def orden_user_owns(user, orden) -> bool:
    uid = getattr(user, 'id', None)
    if not uid:
        return False
    return orden.tecnico_asignado_id == uid or orden.creado_por_id == uid


def user_has_full_orden_edit(user, orden) -> bool:
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    if getattr(user, 'is_staff', False) or getattr(user, 'is_superuser', False):
        return True
    return orden_user_owns(user, orden)


def _normalize_orden_compare_value(value):
    if value is None:
        return None
    if isinstance(value, (date, datetime)):
        return value.isoformat() if hasattr(value, 'isoformat') else str(value)
    if isinstance(value, time):
        return value.strftime('%H:%M:%S')
    if hasattr(value, 'pk'):
        return value.pk
    if isinstance(value, list):
        return list(value)
    return value


def _orden_field_values_differ(instance, field_name: str, new_value) -> bool:
    current = getattr(instance, field_name, None)
    if field_name == 'fotos_urls':
        old = list(current or [])
        new = list(new_value or []) if isinstance(new_value, list) else []
        return old != new
    if field_name == 'fotos_extra_max':
        return normalize_fotos_extra_max(current) != normalize_fotos_extra_max(new_value)
    return _normalize_orden_compare_value(current) != _normalize_orden_compare_value(new_value)


def filter_limited_orden_update(user, instance, data: dict) -> dict:
    if user_has_full_orden_edit(user, instance):
        return data
    disallowed = []
    allowed_data = {}
    for key, value in data.items():
        if key in LIMITED_ORDEN_EDIT_FIELDS:
            allowed_data[key] = value
            continue
        if _orden_field_values_differ(instance, key, value):
            disallowed.append(key)
    if disallowed:
        raise PermissionDenied(
            'No puede modificar estos campos en órdenes de otros técnicos: '
            + ', '.join(sorted(disallowed))
        )
    return allowed_data
