from django.db import models
from django.utils import timezone
from django.contrib.auth import get_user_model

User = get_user_model()


class Tarea(models.Model):
    usuario_asignado = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tareas_asignadas',
    )
    descripcion = models.TextField(blank=True, null=True)
    fotos_urls = models.JSONField(default=list, blank=True)
    
    fecha_creacion = models.DateTimeField(default=timezone.now)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    creado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tareas_creadas',
    )

    class Meta:
        ordering = ['-fecha_creacion']
        verbose_name = 'Tarea'
        verbose_name_plural = 'Tareas'

    def __str__(self):
        usuario_nombre = self.usuario_asignado.username if self.usuario_asignado else 'Sin asignar'
        return f"Tarea #{self.id} - {usuario_nombre}"
