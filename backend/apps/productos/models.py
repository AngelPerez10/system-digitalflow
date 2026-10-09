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
    descripcion = models.TextField(blank=True, default='')
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


class ProductoManual(models.Model):
    producto = models.CharField(max_length=255, blank=False, default='')
    marca = models.CharField(max_length=120, blank=False, default='')
    modelo = models.CharField(max_length=120, blank=False, default='')
    caracteristicas = models.TextField(blank=True, default='')
    # Clave del producto/servicio del SAT (CFDI), misma idea que SYSCOM/TVC `sat_key`.
    sat_key = models.CharField(max_length=32, blank=True, default='')
    imagen_url = models.CharField(max_length=500, blank=True, default='')
    fuente = models.CharField(max_length=20, blank=False, default='manual')
    # Cuánto le costó a la empresa (sin IVA). Base para la utilidad de cada precio.
    costo = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    # `precio` es el precio 1 (el que usan cotizaciones); 2-4 son listas alternas.
    precio = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    precio_2 = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    precio_3 = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    precio_4 = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    # Porcentaje de utilidad sobre el costo de cada precio.
    utilidad_1 = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    utilidad_2 = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    utilidad_3 = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    utilidad_4 = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    # Los precios se capturan sin IVA; marca si al producto se le traslada IVA.
    aplica_iva = models.BooleanField(default=False, db_default=False)
    stock = models.IntegerField(default=0)
    # Solo contactos ya dados de alta como proveedor (Contactos de negocio).
    proveedor = models.ForeignKey(
        'clientes.Cliente',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='productos_manuales',
        limit_choices_to={'tipo': 'PROVEEDOR'},
    )
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True, null=True, blank=True)

    def __str__(self):
        return f"{self.producto} ({self.marca} {self.modelo})"

    class Meta:
        ordering = ['-fecha_creacion']
        verbose_name = 'Producto manual'
        verbose_name_plural = 'Productos manuales'
        indexes = [
            models.Index(fields=['producto']),
            models.Index(fields=['marca']),
            models.Index(fields=['modelo']),
            models.Index(fields=['fuente']),
            models.Index(fields=['activo']),
        ]

