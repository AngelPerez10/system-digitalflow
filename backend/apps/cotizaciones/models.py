from django.contrib.auth import get_user_model
from django.db import models
from django.db.models import Max


User = get_user_model()


class Cotizacion(models.Model):
    idx = models.IntegerField(unique=True, db_index=True, null=True, blank=True)

    cliente_id = models.ForeignKey(
        'clientes.Cliente',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cotizaciones',
    )
    cliente = models.CharField(max_length=100, blank=True, default='')
    prospecto = models.BooleanField(default=False)
    contacto = models.CharField(max_length=200, blank=True, default='')

    MEDIO_CONTACTO_CHOICES = [
        ('BNI', 'BNI'),
        ('REFERIDO', 'Referido'),
        ('WEB', 'Web'),
        ('TIENDA_ONLINE', 'Tienda Online'),
        ('FACEBOOK', 'Facebook'),
        ('INSTAGRAM', 'Instagram'),
        ('TIKTOK', 'Tiktok'),
        ('GOOGLE_MAPS', 'Google Maps'),
        ('YOUTUBE', 'Youtube'),
        ('TIENDA_FISICA', 'Tienda Fisica'),
        ('OTRO', 'Otro'),
    ]

    STATUS_CHOICES = [
        ('AUTORIZADA', 'Autorizada'),
        ('PENDIENTE', 'Pendiente'),
        ('CANCELADA', 'Cancelada'),
    ]

    medio_contacto = models.CharField(
        max_length=30,
        choices=MEDIO_CONTACTO_CHOICES,
        blank=True,
        default='',
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        blank=True,
        default='PENDIENTE',
    )

    fecha = models.DateField(null=True, blank=True)
    vencimiento = models.DateField(null=True, blank=True)

    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    descuento_cliente_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    iva_pct = models.DecimalField(max_digits=5, decimal_places=2, default=16)
    iva = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    texto_arriba_precios = models.TextField(blank=True, default='')
    terminos = models.TextField(blank=True, default='')

    creado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cotizaciones_creadas',
    )
    actualizado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cotizaciones_actualizadas',
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.idx:
            current_max = Cotizacion.objects.aggregate(m=Max('idx')).get('m')
            base = current_max if current_max is not None else 4999
            if base < 4999:
                base = 4999
            next_idx = int(base) + 1
            self.idx = next_idx
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Cotización #{self.idx}"

    class Meta:
        ordering = ['idx']
        indexes = [
            models.Index(fields=['idx']),
            models.Index(fields=['cliente']),
            models.Index(fields=['fecha']),
        ]


class CotizacionItem(models.Model):
    cotizacion = models.ForeignKey(Cotizacion, on_delete=models.CASCADE, related_name='items')

    producto_id = models.ForeignKey(
        'productos.Producto',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cotizacion_items',
    )

    producto_nombre = models.CharField(max_length=255, blank=True, default='')
    producto_descripcion = models.TextField(blank=True, default='')
    unidad = models.CharField(max_length=50, blank=True, default='')
    thumbnail_url = models.URLField(blank=True, default='')

    cantidad = models.DecimalField(max_digits=12, decimal_places=2, default=1)
    precio_lista = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    descuento_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    orden = models.IntegerField(default=0)

    def __str__(self):
        return f"Item {self.id} de Cotización #{self.cotizacion_id}"

    class Meta:
        ordering = ['orden', 'id']
        indexes = [
            models.Index(fields=['cotizacion']),
            models.Index(fields=['producto_id']),
        ]
