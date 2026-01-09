from django.db import models


class KpiVenta(models.Model):
    idx = models.IntegerField(unique=True, db_index=True)
    no_cliente = models.IntegerField(null=True, blank=True)
    fecha_lead = models.DateField(null=True, blank=True)
    nombre_cliente = models.CharField(max_length=150)
    telefono = models.CharField(max_length=25, blank=True, default='')
    correo = models.EmailField(blank=True, default='')
    canal_contacto = models.CharField(max_length=100, blank=True, default='')
    linea_sistema = models.CharField(max_length=120, blank=True, default='')
    producto_servicio = models.CharField(max_length=200, blank=True, default='')
    no_cotizacion = models.CharField(max_length=100, blank=True, default='')
    levantamiento = models.CharField(max_length=150, blank=True, default='')
    monto_cotizado = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=80, blank=True, default='')
    probabilidad = models.PositiveSmallIntegerField(null=True, blank=True)
    responsable = models.CharField(max_length=150, blank=True, default='')
    fecha_cierre = models.DateField(null=True, blank=True)
    monto_vendido = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    motivo_perdida = models.TextField(blank=True, default='')
    proxima_accion = models.CharField(max_length=200, blank=True, default='')
    fecha_proxima_accion = models.DateField(null=True, blank=True)
    notas = models.TextField(blank=True, default='')

    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.idx:
            used_idxs = set(KpiVenta.objects.values_list('idx', flat=True))
            idx = 1
            while idx in used_idxs:
                idx += 1
            self.idx = idx
        super().save(*args, **kwargs)

    def __str__(self):
        return f"KPI Venta - {self.nombre_cliente}"

    class Meta:
        verbose_name = 'KPI de Ventas'
        verbose_name_plural = 'KPI de Ventas'
        ordering = ['idx']
        indexes = [
            models.Index(fields=['idx']),
            models.Index(fields=['nombre_cliente']),
            models.Index(fields=['fecha_lead']),
            models.Index(fields=['status']),
        ]
