from django.db import models


class Cliente(models.Model):
    idx = models.IntegerField(unique=True, db_index=True)
    nombre = models.CharField(max_length=100, unique=True)
    direccion = models.TextField()
    telefono = models.CharField(max_length=15)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True, null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.idx:
            # Buscar el primer idx disponible
            used_idxs = set(Cliente.objects.values_list('idx', flat=True))
            idx = 1
            while idx in used_idxs:
                idx += 1
            self.idx = idx
        super().save(*args, **kwargs)

    def __str__(self):
        return f"#{self.idx} - {self.nombre}"

    class Meta:
        ordering = ['idx']
        verbose_name = 'Cliente'
        verbose_name_plural = 'Clientes'
        indexes = [
            models.Index(fields=['idx']),
            models.Index(fields=['nombre']),
        ]
