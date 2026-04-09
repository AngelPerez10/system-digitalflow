from django.db import models


class Servicio(models.Model):
    idx = models.IntegerField(unique=True, db_index=True)
    nombre = models.CharField(max_length=200, blank=False, default='')
    descripcion = models.TextField(blank=True, default='')
    activo = models.BooleanField(default=True)
    categoria = models.CharField(max_length=200, blank=True, default='')

    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True, null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.idx:
            used_idxs = set(Servicio.objects.values_list('idx', flat=True))
            idx = 1
            while idx in used_idxs:
                idx += 1
            self.idx = idx
        super().save(*args, **kwargs)

    def __str__(self):
        return f"#{self.idx} - {self.nombre}"

    class Meta:
        ordering = ['idx']
        verbose_name = 'Servicio'
        verbose_name_plural = 'Servicios'
        indexes = [
            models.Index(fields=['idx']),
            models.Index(fields=['nombre']),
            models.Index(fields=['activo']),
            models.Index(fields=['categoria']),
        ]


class Concepto(models.Model):
    folio = models.CharField(max_length=50, unique=True, db_index=True)
    concepto = models.CharField(max_length=255, blank=False, default='')
    precio1 = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    imagen_url = models.CharField(max_length=500, blank=True, default='')

    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True, null=True, blank=True)

    def __str__(self):
        return f"{self.folio} - {self.concepto}"

    class Meta:
        ordering = ['folio']
        verbose_name = 'Concepto'
        verbose_name_plural = 'Conceptos'
        indexes = [
            models.Index(fields=['folio']),
            models.Index(fields=['concepto']),
            models.Index(fields=['precio1']),
        ]

