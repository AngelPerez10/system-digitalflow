from django.db import models
from django.utils import timezone
from django.contrib.auth import get_user_model

User = get_user_model()

STATUS_CHOICES = [
    ('pendiente', 'Pendiente'),
    ('resuelto', 'Resuelto'),
]


class Orden(models.Model):
    idx = models.IntegerField(unique=True, db_index=True, null=True, blank=True)

    cliente_id = models.ForeignKey(
        'clientes.Cliente',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ordenes',
    )
    cliente = models.CharField(max_length=100, blank=True, null=True)
    direccion = models.TextField(blank=True, null=True)
    telefono_cliente = models.CharField(max_length=15, blank=True, null=True)

    problematica = models.TextField(blank=True, null=True)
    servicios_realizados = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendiente')
    comentario_tecnico = models.TextField(blank=True, null=True)

    fecha_inicio = models.DateField(blank=True, null=True, default=timezone.now)
    hora_inicio = models.TimeField(blank=True, null=True)
    fecha_finalizacion = models.DateField(null=True, blank=True)
    hora_termino = models.TimeField(blank=True, null=True)

    nombre_encargado = models.CharField(max_length=100, blank=True, null=True)
    tecnico_asignado = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ordenes_asignadas',
    )
    nombre_cliente = models.CharField(max_length=100, blank=True, null=True)

    fotos_urls = models.JSONField(default=list, blank=True)
    pdf_generado = models.FileField(upload_to='pdfs/', null=True, blank=True)
    pdf_url = models.URLField(max_length=500, blank=True, null=True)
    firma_encargado_url = models.TextField(blank=True, null=True)
    firma_cliente_url = models.TextField(blank=True, null=True)

    creado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ordenes_creadas',
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.idx:
            used_idxs = set(Orden.objects.values_list('idx', flat=True))
            
            # Buscar el idx más alto
            max_idx = max(used_idxs) if used_idxs else 0
            
            # Si el máximo es <= 550, comenzar desde 5000
            if max_idx <= 550:
                idx = 5000
            else:
                idx = max_idx + 1
            
            # Asegurar que no exista
            while idx in used_idxs:
                idx += 1
            
            self.idx = idx
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Orden #{self.idx} - {self.cliente or 'Sin cliente'}"

    class Meta:
        ordering = ['idx']
        verbose_name = 'Orden'
        verbose_name_plural = 'Órdenes'
        indexes = [
            models.Index(fields=['idx']),
            models.Index(fields=['cliente']),
            models.Index(fields=['fecha_inicio']),
        ]
