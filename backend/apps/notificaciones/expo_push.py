"""Cliente mínimo del Expo Push Service.

https://docs.expo.dev/push-notifications/sending-notifications/

No requiere credenciales propias de FCM/APNs: EAS las provisiona por proyecto y
Expo enrutará a Android/iOS según el token. El único secreto opcional es
`EXPO_ACCESS_TOKEN`, que activa la verificación de remitente en la cuenta Expo
(recomendado en producción: sin él, cualquiera con un push token podría enviar
notificaciones en nombre del proyecto).
"""

from __future__ import annotations

import logging
import os

import requests
from django.utils import timezone

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
# Expo acepta hasta 100 mensajes por petición.
LOTE_MAX = 100
TIMEOUT_S = 10


def _headers() -> dict[str, str]:
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
    }
    access_token = (os.environ.get('EXPO_ACCESS_TOKEN') or '').strip()
    if access_token:
        headers['Authorization'] = f'Bearer {access_token}'
    return headers


def _lotes(mensajes: list[dict], tamano: int = LOTE_MAX):
    for i in range(0, len(mensajes), tamano):
        yield mensajes[i:i + tamano]


def _dar_de_baja(tokens: list[str]) -> None:
    """Marca `disabled_at` en los tokens que Expo ya no reconoce."""
    if not tokens:
        return
    from .models import PushDevice

    actualizados = PushDevice.objects.filter(
        expo_token__in=tokens, disabled_at__isnull=True
    ).update(disabled_at=timezone.now())
    if actualizados:
        logger.info('Push: %s dispositivo(s) dados de baja por DeviceNotRegistered', actualizados)


def enviar_push(mensajes: list[dict]) -> int:
    """Envía los mensajes a Expo en lotes. Devuelve cuántos se aceptaron.

    Nunca lanza: esta función corre fuera del ciclo request/response (hilo en
    segundo plano) y un fallo de red no debe tumbar nada. Los tokens que Expo
    reporta como `DeviceNotRegistered` quedan marcados para no reintentarlos.
    """
    if not mensajes:
        return 0

    aceptados = 0
    for lote in _lotes(mensajes):
        try:
            respuesta = requests.post(
                EXPO_PUSH_URL, json=lote, headers=_headers(), timeout=TIMEOUT_S
            )
        except requests.RequestException:
            logger.exception('Push: fallo de red al enviar un lote de %s mensajes', len(lote))
            continue

        if respuesta.status_code >= 400:
            logger.error(
                'Push: Expo respondió %s — %s',
                respuesta.status_code,
                respuesta.text[:500],
            )
            continue

        try:
            cuerpo = respuesta.json()
        except ValueError:
            logger.error('Push: respuesta de Expo no es JSON — %s', respuesta.text[:500])
            continue

        tickets = cuerpo.get('data') or []
        caducados: list[str] = []
        # `data` viene en el mismo orden que el lote enviado.
        for mensaje, ticket in zip(lote, tickets):
            if not isinstance(ticket, dict):
                continue
            if ticket.get('status') == 'ok':
                aceptados += 1
                continue
            detalles = ticket.get('details') or {}
            if detalles.get('error') == 'DeviceNotRegistered':
                caducados.append(mensaje.get('to', ''))
            else:
                logger.warning(
                    'Push: ticket con error — %s / %s',
                    ticket.get('message'),
                    detalles.get('error'),
                )
        _dar_de_baja([t for t in caducados if t])

    return aceptados
