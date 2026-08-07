from django.conf import settings
from django.db import models


class InventarioItem(models.Model):
    class Fuente(models.TextChoices):
        DESCONOCIDO = 'desconocido', 'Desconocido'
        SYSCOM = 'syscom', 'SYSCOM'
        TVC = 'tvc', 'TVC'

    codigo_barras = models.CharField(max_length=64, unique=True, db_index=True)
    nombre = models.CharField(max_length=255, blank=True, default='')
    marca = models.CharField(max_length=120, blank=True, default='')
    modelo = models.CharField(max_length=120, blank=True, default='')
    notas = models.TextField(blank=True, default='')
    fuente = models.CharField(
        max_length=20, choices=Fuente.choices, default=Fuente.DESCONOCIDO
    )
    ref_externa = models.CharField(max_length=120, blank=True, default='')
    imagen_url = models.URLField(max_length=500, blank=True, default='')
    cantidad = models.PositiveIntegerField(default=0)
    # Última compra (importación de factura): se sobrescribe en cada import.
    folio_factura = models.CharField(max_length=64, blank=True, default='')
    proveedor = models.ForeignKey(
        'clientes.Cliente',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='inventario_items',
        limit_choices_to={'tipo': 'PROVEEDOR'},
    )
    precio_unitario = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-fecha_actualizacion']
        verbose_name = 'Ítem de inventario'
        verbose_name_plural = 'Ítems de inventario'

    def __str__(self):
        return f'{self.codigo_barras} ({self.cantidad})'


class InventarioMovimiento(models.Model):
    class Tipo(models.TextChoices):
        ENTRADA = 'entrada', 'Entrada'
        SALIDA = 'salida', 'Salida'

    item = models.ForeignKey(
        InventarioItem, on_delete=models.CASCADE, related_name='movimientos'
    )
    tipo = models.CharField(max_length=10, choices=Tipo.choices)
    cantidad = models.PositiveIntegerField(default=1)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='inventario_movimientos',
    )
    nota = models.CharField(max_length=255, blank=True, default='')
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creado_en']
        verbose_name = 'Movimiento de inventario'
        verbose_name_plural = 'Movimientos de inventario'


class InventarioImportacion(models.Model):
    """Registro de facturas ya importadas (bloquea reimportar el mismo folio)."""

    class Proveedor(models.TextChoices):
        SYSCOM = 'syscom', 'SYSCOM'
        TVC = 'tvc', 'TVC'

    proveedor = models.CharField(max_length=20, choices=Proveedor.choices)
    folio = models.CharField(max_length=64)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='inventario_importaciones',
    )
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['proveedor', 'folio'],
                name='inventario_importacion_proveedor_folio_uniq',
            )
        ]
        ordering = ['-creado_en']
        verbose_name = 'Importación de factura'
        verbose_name_plural = 'Importaciones de factura'

    def __str__(self):
        return f'{self.proveedor}:{self.folio}'
