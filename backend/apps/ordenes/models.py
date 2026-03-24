from django.db import models
from django.utils import timezone
from django.contrib.auth import get_user_model

User = get_user_model()

STATUS_CHOICES = [
    ('pendiente', 'Pendiente'),
    ('resuelto', 'Resuelto'),
]

PRIORIDAD_CHOICES = [
    ('baja', 'Baja'),
    ('media', 'Media'),
    ('alta', 'Alta'),
]


class Orden(models.Model):
    idx = models.IntegerField(unique=True, db_index=True, null=True, blank=True)

    folio = models.CharField(max_length=50, unique=True, db_index=True, null=True, blank=True)

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
    prioridad = models.CharField(max_length=10, choices=PRIORIDAD_CHOICES, default='media')
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
    quien_instalo = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ordenes_instaladas',
    )
    quien_entrego = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ordenes_entregadas',
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
            # Optimize: Use aggregate to find max idx instead of loading all
            current_max = Orden.objects.aggregate(models.Max('idx'))['idx__max'] or 0

            # Logic request: "apartir de la orden 564 el siguiente sea 5000"
            # If we are below 564, continue sequential (1, 2, ... 564)
            # Once we reach 564, jump to 5000.
            # If we are already at 5000+, continue sequential (5000, 5001...)
            
            if current_max >= 588 and current_max < 5000:
                idx = 5000
            else:
                idx = current_max + 1
            
            # Asegurar que no exista (collision check)
            while Orden.objects.filter(idx=idx).exists():
                idx += 1
            
            self.idx = idx
        super().save(*args, **kwargs)

    def __str__(self):
        display = self.folio or self.idx
        return f"Orden #{display} - {self.cliente or 'Sin cliente'}"

    class Meta:
        ordering = ['idx']
        verbose_name = 'Orden'
        verbose_name_plural = 'Órdenes'
        indexes = [
            models.Index(fields=['idx']),
            models.Index(fields=['cliente']),
            models.Index(fields=['fecha_inicio']),
        ]


class OrdenLevantamiento(models.Model):
    orden = models.OneToOneField(Orden, on_delete=models.CASCADE, related_name='levantamiento')
    payload = models.JSONField(default=dict, blank=True)
    dibujo_url = models.TextField(blank=True, default='')
    creado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='levantamientos_creados',
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Levantamiento Orden #{self.orden_id}"

    class Meta:
        verbose_name = 'Levantamiento'
        verbose_name_plural = 'Levantamientos'


class ReporteSemanal(models.Model):
    tecnico = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='reportes_semanales',
    )
    semana_inicio = models.DateField()
    semana_fin = models.DateField()
    ordenes = models.JSONField(default=list, blank=True)
    total_ordenes = models.PositiveIntegerField(default=0)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-fecha_creacion']
        verbose_name = 'Reporte semanal'
        verbose_name_plural = 'Reportes semanales'
        indexes = [
            models.Index(fields=['tecnico', 'semana_inicio', 'semana_fin']),
            models.Index(fields=['fecha_creacion']),
        ]

    def __str__(self):
        tecnico_nombre = (
            f"{self.tecnico.first_name} {self.tecnico.last_name}".strip()
            or self.tecnico.username
            or self.tecnico.email
            or f"#{self.tecnico_id}"
        )
        return f"Reporte {tecnico_nombre} ({self.semana_inicio} a {self.semana_fin})"
