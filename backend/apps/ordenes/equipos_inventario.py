"""Sincroniza equipos de inventario en órdenes: normaliza payload y mueve stock."""

from __future__ import annotations

import uuid
from typing import Any

from django.db import transaction
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.inventario.models import InventarioItem, InventarioMovimiento

ALLOWED_INSTALL = frozenset({'no_instalado', 'instalado'})

_MSG_ADMIN_ONLY = (
    'Solo un administrador puede agregar o marcar entrega de equipos.'
)
_MSG_CANTIDAD_ENTREGADA = (
    'Desmarca Entregado antes de cambiar la cantidad.'
)
_MSG_DUPLICADOS = (
    'No se permiten líneas duplicadas del mismo ítem de inventario.'
)
_MSG_LISTA = 'equipos_inventario debe ser una lista.'
_MSG_ITEM_REQUERIDO = 'inventarioItemId es obligatorio en cada línea de equipos.'
_MSG_CANTIDAD = 'La cantidad de cada equipo debe ser un entero mayor o igual a 1.'
_MSG_INSTALACION = (
    'estadoInstalacion debe ser "no_instalado" o "instalado".'
)
_MSG_ITEM_INEXISTENTE = 'El ítem de inventario no existe.'
_MSG_SWAP_ITEM = (
    'No se puede cambiar el producto de una línea existente; quítala y agrega otra.'
)


def _is_admin(user) -> bool:
    return bool(user and (user.is_staff or user.is_superuser))


def _can_edit_instalacion(user, orden) -> bool:
    if _is_admin(user):
        return True
    if not user or not getattr(user, 'id', None):
        return False
    return (
        orden.tecnico_asignado_id == user.id
        or orden.creado_por_id == user.id
    )


def _as_bool(value: Any, default: bool = False) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)) and value in (0, 1):
        return bool(value)
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in ('true', '1', 'si', 'sí', 'yes'):
            return True
        if lowered in ('false', '0', 'no'):
            return False
    return bool(value)


def _as_int_id(value: Any) -> int | None:
    if value is None or value == '':
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def normalize_equipos_payload(raw) -> list[dict]:
    """Valida y limpia el payload de equipos; el cliente no controla movimientoSalidaId."""
    if raw is None:
        return []
    if not isinstance(raw, list):
        raise ValidationError(_MSG_LISTA)

    seen_item_ids: set[int] = set()
    cleaned: list[dict] = []

    for entry in raw:
        if not isinstance(entry, dict):
            raise ValidationError('Cada línea de equipos debe ser un objeto.')

        item_id = _as_int_id(entry.get('inventarioItemId'))
        if item_id is None:
            raise ValidationError(_MSG_ITEM_REQUERIDO)
        if item_id in seen_item_ids:
            raise ValidationError(_MSG_DUPLICADOS)
        seen_item_ids.add(item_id)

        cantidad_raw = entry.get('cantidad', 1)
        try:
            cantidad = int(cantidad_raw)
        except (TypeError, ValueError):
            raise ValidationError(_MSG_CANTIDAD) from None
        if cantidad < 1:
            raise ValidationError(_MSG_CANTIDAD)

        estado = entry.get('estadoInstalacion') or 'no_instalado'
        if estado not in ALLOWED_INSTALL:
            raise ValidationError(_MSG_INSTALACION)

        linea_id = str(entry.get('lineaId') or '').strip() or str(uuid.uuid4())

        cleaned.append(
            {
                'lineaId': linea_id,
                'inventarioItemId': item_id,
                'codigoBarras': str(entry.get('codigoBarras') or ''),
                'nombre': str(entry.get('nombre') or ''),
                'marca': str(entry.get('marca') or ''),
                'modelo': str(entry.get('modelo') or ''),
                'imagenUrl': str(entry.get('imagenUrl') or ''),
                'cantidad': cantidad,
                'equipoEntregado': _as_bool(entry.get('equipoEntregado'), False),
                'estadoInstalacion': estado,
                # movimientoSalidaId intentionally omitted — server-owned
            }
        )

    return cleaned


def _index_by_linea(lines: list[dict]) -> dict[str, dict]:
    return {str(line.get('lineaId') or ''): line for line in lines if line.get('lineaId')}


def _index_by_item(lines: list[dict]) -> dict[int, dict]:
    out: dict[int, dict] = {}
    for line in lines:
        item_id = _as_int_id(line.get('inventarioItemId'))
        if item_id is not None:
            out[item_id] = line
    return out


def _orden_folio_label(orden) -> str:
    if getattr(orden, 'folio', None):
        return str(orden.folio)
    if getattr(orden, 'idx', None) is not None:
        return f'ORD-{orden.idx}'
    return f'orden-{orden.pk}'


def _nota_movimiento(orden, linea_id: str, accion: str) -> str:
    return f'Orden {_orden_folio_label(orden)} · línea {linea_id} · {accion}'[:255]


def _assert_non_admin_allowed(
    *,
    user,
    orden,
    previous: list[dict],
    incoming: list[dict],
) -> None:
    """Técnico asignado/creador: solo estadoInstalacion; resto → PermissionDenied."""
    if _is_admin(user):
        return

    prev_by_linea = _index_by_linea(previous)
    prev_by_item = _index_by_item(previous)
    inc_by_linea = _index_by_linea(incoming)
    inc_by_item = _index_by_item(incoming)

    if set(prev_by_item.keys()) != set(inc_by_item.keys()):
        raise PermissionDenied(_MSG_ADMIN_ONLY)
    if set(prev_by_linea.keys()) != set(inc_by_linea.keys()):
        raise PermissionDenied(_MSG_ADMIN_ONLY)

    for linea_id, prev in prev_by_linea.items():
        inc = inc_by_linea.get(linea_id)
        if inc is None:
            raise PermissionDenied(_MSG_ADMIN_ONLY)
        if (
            prev.get('inventarioItemId') != inc.get('inventarioItemId')
            or int(prev.get('cantidad') or 0) != int(inc.get('cantidad') or 0)
            or bool(prev.get('equipoEntregado')) != bool(inc.get('equipoEntregado'))
        ):
            raise PermissionDenied(_MSG_ADMIN_ONLY)

    if not _can_edit_instalacion(user, orden):
        for linea_id, prev in prev_by_linea.items():
            inc = inc_by_linea[linea_id]
            if prev.get('estadoInstalacion') != inc.get('estadoInstalacion'):
                raise PermissionDenied(_MSG_ADMIN_ONLY)


def _revert_salida(*, item, orden, line, user) -> None:
    """Crea entrada de reversión y restaura stock. El movimiento de salida histórico se conserva."""
    qty = int(line.get('cantidad') or 1)
    InventarioMovimiento.objects.create(
        item=item,
        tipo=InventarioMovimiento.Tipo.ENTRADA,
        cantidad=qty,
        usuario=user if getattr(user, 'is_authenticated', False) else None,
        orden=orden,
        orden_linea_id=str(line.get('lineaId') or ''),
        nota=_nota_movimiento(orden, str(line.get('lineaId') or ''), 'reversión entrega'),
    )
    item.cantidad += qty
    item.save(update_fields=['cantidad'])


def _apply_salida(*, item, orden, line, user) -> int:
    qty = int(line.get('cantidad') or 1)
    label = line.get('nombre') or line.get('modelo') or item.modelo or item.nombre or str(item.id)
    if item.cantidad < qty:
        raise ValidationError(
            f'Stock insuficiente para {label}: hay {item.cantidad}, se piden {qty}.'
        )
    item.cantidad -= qty
    item.save(update_fields=['cantidad'])
    mov = InventarioMovimiento.objects.create(
        item=item,
        tipo=InventarioMovimiento.Tipo.SALIDA,
        cantidad=qty,
        usuario=user if getattr(user, 'is_authenticated', False) else None,
        orden=orden,
        orden_linea_id=str(line.get('lineaId') or ''),
        nota=_nota_movimiento(orden, str(line.get('lineaId') or ''), 'entrega'),
    )
    return mov.id


def sync_orden_equipos_inventario(
    *,
    orden,
    incoming,
    user,
    previous,
) -> list[dict]:
    """
    Compara previous vs incoming, aplica permisos y crea/revierte movimientos.

    Devuelve la lista final (con movimientoSalidaId escrito por el servidor)
    para asignar a orden.equipos_inventario. No guarda la orden.
    """
    previous_list = list(previous or [])
    # Normalize may strip movimientoSalidaId; keep previous as source of truth for ids.
    incoming_norm = normalize_equipos_payload(incoming)

    _assert_non_admin_allowed(
        user=user,
        orden=orden,
        previous=previous_list,
        incoming=incoming_norm,
    )

    prev_by_linea = _index_by_linea(previous_list)
    prev_by_item = _index_by_item(previous_list)

    with transaction.atomic():
        # Revert stock for removed lines that had a salida.
        for prev in previous_list:
            linea_id = str(prev.get('lineaId') or '')
            item_id = _as_int_id(prev.get('inventarioItemId'))
            still_present = any(
                str(inc.get('lineaId') or '') == linea_id
                or _as_int_id(inc.get('inventarioItemId')) == item_id
                for inc in incoming_norm
            )
            if still_present:
                continue
            if not prev.get('equipoEntregado') and not prev.get('movimientoSalidaId'):
                continue
            locked = (
                InventarioItem.objects.select_for_update()
                .filter(pk=item_id)
                .first()
            )
            if locked is None:
                raise ValidationError(_MSG_ITEM_INEXISTENTE)
            _revert_salida(item=locked, orden=orden, line=prev, user=user)

        result: list[dict] = []
        for inc in incoming_norm:
            linea_id = str(inc['lineaId'])
            item_id = inc['inventarioItemId']
            prev = prev_by_linea.get(linea_id) or prev_by_item.get(item_id)

            # Preserve server movimientoSalidaId from previous when still delivered.
            prev_entregado = bool(prev.get('equipoEntregado')) if prev else False
            prev_mov = prev.get('movimientoSalidaId') if prev else None
            prev_qty = int(prev.get('cantidad') or 0) if prev else None
            new_entregado = bool(inc['equipoEntregado'])
            new_qty = int(inc['cantidad'])

            if (
                prev
                and prev_entregado
                and new_entregado
                and prev_qty is not None
                and prev_qty != new_qty
            ):
                raise ValidationError(_MSG_CANTIDAD_ENTREGADA)

            out = {
                **inc,
                'movimientoSalidaId': prev_mov if (prev and prev_entregado and new_entregado) else None,
            }

            if not _is_admin(user):
                # Technician path: keep previous sensitive fields; only instalacion from incoming.
                if prev is None:
                    raise PermissionDenied(_MSG_ADMIN_ONLY)
                out = {
                    **prev,
                    'estadoInstalacion': inc['estadoInstalacion'],
                    'movimientoSalidaId': prev.get('movimientoSalidaId'),
                }
                result.append(out)
                continue

            prev_same_linea = prev_by_linea.get(linea_id)
            if prev_same_linea is not None:
                prev_item_id = _as_int_id(prev_same_linea.get('inventarioItemId'))
                if prev_item_id is not None and prev_item_id != item_id:
                    raise ValidationError(_MSG_SWAP_ITEM)

            locked = (
                InventarioItem.objects.select_for_update()
                .filter(pk=item_id)
                .first()
            )
            if locked is None:
                raise ValidationError(_MSG_ITEM_INEXISTENTE)

            # Un-deliver: restore stock.
            if prev_entregado and not new_entregado:
                _revert_salida(item=locked, orden=orden, line={**prev, **inc, 'movimientoSalidaId': prev_mov, 'cantidad': prev_qty or new_qty}, user=user)
                out['movimientoSalidaId'] = None
                out['equipoEntregado'] = False
                result.append(out)
                continue

            # Deliver (new or transition to entregado without movimiento).
            needs_salida = new_entregado and (
                not prev_entregado or not prev_mov
            )
            if needs_salida:
                mov_id = _apply_salida(item=locked, orden=orden, line=inc, user=user)
                out['movimientoSalidaId'] = mov_id
                out['equipoEntregado'] = True
            elif new_entregado and prev_mov:
                out['movimientoSalidaId'] = prev_mov
                out['equipoEntregado'] = True
            else:
                out['movimientoSalidaId'] = None
                out['equipoEntregado'] = False

            result.append(out)

        return result
