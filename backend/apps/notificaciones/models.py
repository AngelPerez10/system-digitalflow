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


class Notificacion(models.Model):
    """Aviso in-app para un usuario; se consulta desde la campanita del header.

    `clave_dedupe` evita repetir el mismo aviso: los escaneos periódicos
    (`escanear_notificaciones`) corren cada hora y harían `get_or_create` sobre
    la misma clave en lugar de crear filas nuevas. Cuando el aviso *debe* poder
    repetirse (una orden se libera dos veces) la clave incluye un discriminante
    (p. ej. `liberada_at`).
    """

    class Tipo(models.TextChoices):
        ORDEN_PRIORIDAD_ESCALADA = 'orden_prioridad_escalada', 'Prioridad de orden escalada'
        ORDEN_LIBERADA = 'orden_liberada', 'Orden liberada a la bolsa'
        ORDEN_ASIGNADA = 'orden_asignada', 'Orden asignada'
        ORDEN_TOMADA = 'orden_tomada', 'Orden tomada de la bolsa'
        ORDEN_PENDIENTE = 'orden_pendiente', 'Orden pendiente / vencida'
        POLIZA_MANTENIMIENTO_PROXIMO = 'poliza_mantenimiento_proximo', 'Mantenimiento de póliza próximo'

    destinatario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notificaciones',
    )
    tipo = models.CharField(max_length=40, choices=Tipo.choices)
    titulo = models.CharField(max_length=160)
    cuerpo = models.CharField(max_length=400, blank=True, default='')
    # Ruta del frontend a la que lleva el aviso (p. ej. `/ordenes?abrir=123`).
    url = models.CharField(max_length=300, blank=True, default='')
    ref_tipo = models.CharField(max_length=20, blank=True, default='')  # 'orden' | 'poliza'
    ref_id = models.PositiveIntegerField(null=True, blank=True)
    clave_dedupe = models.CharField(max_length=160, blank=True, default='')
    leida_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-id']
        verbose_name = 'Notificación'
        verbose_name_plural = 'Notificaciones'
        indexes = [
            models.Index(fields=['destinatario', 'leida_at', '-created_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['destinatario', 'clave_dedupe'],
                condition=models.Q(clave_dedupe__gt=''),
                name='notif_dedupe_por_usuario',
            ),
        ]

    def __str__(self) -> str:
        estado = 'leída' if self.leida_at else 'nueva'
        return f'{self.destinatario_id} · {self.tipo} · {estado}'

    @property
    def leida(self) -> bool:
        return self.leida_at is not None
