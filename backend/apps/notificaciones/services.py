"""Reglas de negocio de las notificaciones push.

Hoy solo cubre «se liberó una orden a la lista de disponibles». La selección de
destinatarios reproduce exactamente el permiso que abre esa pantalla
(`OrdenesAnyAccessPermission`), para que nadie reciba un aviso sobre algo que
luego no podría ver.
"""

from __future__ import annotations

import logging
import threading

from django.conf import settings

from apps.users.permissions import user_has_any_ordenes_access

from .expo_push import enviar_push
from .models import PushDevice

logger = logging.getLogger(__name__)

CANAL_ORDENES = 'ordenes'


def _puede_ver_disponibles(user) -> bool:
    """Mismo criterio que `OrdenesAnyAccessPermission.has_permission`."""
    if not getattr(user, 'is_active', False):
        return False
    if getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False):
        return True
    perfil = getattr(user, 'permissions_profile', None)
    permisos = getattr(perfil, 'permissions', None) or {}
    return user_has_any_ordenes_access(permisos)


def dispositivos_para_orden_liberada(orden) -> list[PushDevice]:
    """Dispositivos activos de quienes pueden tomar la orden, menos el liberador.

    Se parte de `PushDevice` (no de `User`) porque acota la consulta a quienes
    tienen la app instalada; el filtro de permisos vive en un `JSONField` y no
    es indexable, así que se evalúa en Python sobre ese conjunto pequeño.
    """
    liberador_id = getattr(orden, 'liberada_por_id', None)

    dispositivos = (
        PushDevice.objects.filter(disabled_at__isnull=True)
        .exclude(user_id=liberador_id)
        .select_related('user', 'user__permissions_profile')
    )
    return [d for d in dispositivos if _puede_ver_disponibles(d.user)]


def _cuerpo_orden(orden) -> str:
    folio = (getattr(orden, 'folio', '') or '').strip() or f'#{getattr(orden, "idx", "") or orden.pk}'
    cliente = (getattr(orden, 'cliente', '') or '').strip()
    partes = [folio]
    if cliente:
        partes.append(cliente)
    prioridad = (getattr(orden, 'prioridad_pool', '') or '').strip().lower()
    if prioridad == 'alta':
        partes.append('Prioridad alta')
    return ' · '.join(partes)


def mensajes_orden_liberada(orden, dispositivos: list[PushDevice]) -> list[dict]:
    cuerpo = _cuerpo_orden(orden)
    return [
        {
            'to': d.expo_token,
            'title': 'Nueva orden disponible',
            'body': cuerpo,
            'data': {'tipo': 'orden_liberada', 'ordenId': orden.pk},
            'channelId': CANAL_ORDENES,
            'priority': 'high',
            'sound': 'default',
        }
        for d in dispositivos
    ]


def notificar_orden_liberada(orden_id: int) -> int:
    """Avisa a los técnicos que hay una orden nueva disponible.

    Recibe el `id` y no la instancia: corre en otro hilo y recargar evita
    arrastrar una conexión o un objeto a medio guardar.
    """
    from apps.ordenes.models import Orden

    orden = Orden.objects.filter(pk=orden_id).select_related('liberada_por').first()
    if orden is None or not orden.en_pool:
        return 0

    dispositivos = dispositivos_para_orden_liberada(orden)
    if not dispositivos:
        return 0

    mensajes = mensajes_orden_liberada(orden, dispositivos)
    enviados = enviar_push(mensajes)
    logger.info(
        'Push orden_liberada: orden=%s dispositivos=%s aceptados=%s',
        orden_id, len(dispositivos), enviados,
    )
    return enviados


def lanzar_notificacion_orden_liberada(orden_id: int) -> None:
    """Dispara el aviso sin bloquear la respuesta de `POST /ordenes/{id}/liberar/`.

    Un hilo suelto es suficiente a esta escala (decenas de técnicos): el coste
    es un POST a Expo y la pérdida en caso de reinicio es un aviso, no un dato.
    Si algún día hay Redis, esto se sustituye por una cola sin tocar el llamador.
    Con `PUSH_EN_SEGUNDO_PLANO=False` corre inline (tests).
    """
    if not getattr(settings, 'PUSH_EN_SEGUNDO_PLANO', True):
        try:
            notificar_orden_liberada(orden_id)
        except Exception:
            logger.exception('Push orden_liberada falló (inline) para orden=%s', orden_id)
        return

    def _correr() -> None:
        try:
            notificar_orden_liberada(orden_id)
        except Exception:
            logger.exception('Push orden_liberada falló para orden=%s', orden_id)

    threading.Thread(target=_correr, name=f'push-orden-{orden_id}', daemon=True).start()
