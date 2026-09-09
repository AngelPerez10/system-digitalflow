import re

from django.conf import settings
from django.db import models

# `ExponentPushToken[xxxx]` es el formato actual; `ExpoPushToken[...]` aparece en
# builds viejos. Se valida en el serializer para no guardar basura que Expo
# rechazaría lote a lote.
EXPO_TOKEN_RE = re.compile(r'^Expo(nent)?PushToken\[[A-Za-z0-9_\-]+\]$')


class PushDevice(models.Model):
    """Un dispositivo con la app instalada y push habilitado.

    `ForeignKey` y no `OneToOne` a propósito: un técnico puede traer teléfono y
    tablet, y el mismo token puede cambiar de dueño si dos personas comparten
    equipo (por eso `expo_token` es único y el registro hace upsert por token,
    reasignando `user`).

    `disabled_at` lo marca el envío cuando Expo responde `DeviceNotRegistered`
    (app desinstalada o permiso revocado). No se borra la fila para conservar el
    historial y evitar recrearla en cada intento.
    """

    PLATAFORMAS = (
        ('ios', 'iOS'),
        ('android', 'Android'),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='push_devices',
    )
    expo_token = models.CharField(max_length=255, unique=True)
    platform = models.CharField(max_length=16, choices=PLATAFORMAS, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(auto_now=True)
    disabled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Dispositivo push'
        verbose_name_plural = 'Dispositivos push'
        indexes = [
            models.Index(fields=['user', 'disabled_at']),
        ]

    def __str__(self) -> str:
        estado = 'baja' if self.disabled_at else 'activo'
        return f'{self.user_id} · {self.platform or "?"} · {estado}'

    @property
    def activo(self) -> bool:
        return self.disabled_at is None
