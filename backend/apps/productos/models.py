from django.db import models


class Producto(models.Model):
    idx = models.IntegerField(unique=True, db_index=True)
    nombre = models.CharField(max_length=200, blank=True, default='')

    # Datos generales
    categoria = models.CharField(max_length=200, blank=True, default='')
    unidad = models.CharField(max_length=100, blank=True, default='')
    descripcion = models.TextField(blank=True, default='')
    precio_venta = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    precio_venta_2 = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    precio_venta_3 = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    iva_pct = models.DecimalField(max_digits=5, decimal_places=2, default=16.00)
    
    modelo = models.CharField(max_length=200, blank=True, default='')
    codigo_fabrica = models.CharField(max_length=200, blank=True, default='')
    proveedor = models.CharField(max_length=200, blank=True, default='')
    fabricante_marca = models.CharField(max_length=200, blank=True, default='')

    punto_pedido = models.IntegerField(null=True, blank=True)
    stock_inicial = models.IntegerField(null=True, blank=True)
    stock_minimo = models.IntegerField(null=True, blank=True)
    stock = models.IntegerField(null=True, blank=True)

    # Más información
    sku = models.CharField(max_length=200, blank=True, default='')
    codigo_sat = models.CharField(max_length=200, blank=True, default='')

    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True, null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.idx:
            used_idxs = set(Producto.objects.values_list('idx', flat=True))
            idx = 1
            while idx in used_idxs:
                idx += 1
            self.idx = idx
        super().save(*args, **kwargs)

    def __str__(self):
        return f"#{self.idx} - {self.nombre}"

    class Meta:
        ordering = ['idx']
        verbose_name = 'Producto'
        verbose_name_plural = 'Productos'
        indexes = [
            models.Index(fields=['idx']),
            models.Index(fields=['nombre']),
        ]


class ProductoImagen(models.Model):
    producto = models.OneToOneField(Producto, on_delete=models.CASCADE, related_name='imagen')
    url = models.URLField(blank=True, default='')
    public_id = models.CharField(max_length=255, blank=True, default='')
    nombre_original = models.CharField(max_length=255, blank=True, default='')
    size_bytes = models.BigIntegerField(null=True, blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Imagen de Producto'
        verbose_name_plural = 'Imágenes de Producto'



