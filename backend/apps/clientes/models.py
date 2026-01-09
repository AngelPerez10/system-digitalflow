from django.db import models


class Cliente(models.Model):
    idx = models.IntegerField(unique=True, db_index=True)
    nombre = models.CharField(max_length=100, unique=True)
    direccion = models.TextField(blank=True, default='')
    telefono = models.CharField(max_length=15, blank=True, default='')

    # Datos generales
    giro = models.CharField(max_length=150, blank=True, default='')
    correo = models.EmailField(blank=True, default='')
    calle = models.CharField(max_length=200, blank=True, default='')
    numero_exterior = models.CharField(max_length=50, blank=True, default='')
    interior = models.CharField(max_length=50, blank=True, default='')
    colonia = models.CharField(max_length=150, blank=True, default='')
    codigo_postal = models.CharField(max_length=20, blank=True, default='')
    ciudad = models.CharField(max_length=120, blank=True, default='')
    pais = models.CharField(max_length=120, blank=True, default='')
    estado = models.CharField(max_length=120, blank=True, default='')
    notas = models.TextField(blank=True, default='')
    descuento_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    # Más información
    portal_web = models.CharField(max_length=255, blank=True, default='')

    # Facturación
    nombre_facturacion = models.CharField(max_length=200, blank=True, default='')
    numero_facturacion = models.CharField(max_length=50, blank=True, default='')
    domicilio_facturacion = models.TextField(blank=True, default='')

    # Envío
    calle_envio = models.CharField(max_length=200, blank=True, default='')
    numero_envio = models.CharField(max_length=50, blank=True, default='')
    colonia_envio = models.CharField(max_length=150, blank=True, default='')
    codigo_postal_envio = models.CharField(max_length=20, blank=True, default='')
    pais_envio = models.CharField(max_length=120, blank=True, default='')
    estado_envio = models.CharField(max_length=120, blank=True, default='')
    ciudad_envio = models.CharField(max_length=120, blank=True, default='')
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


class ClienteContacto(models.Model):
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='contactos')
    nombre_apellido = models.CharField(max_length=200)
    titulo = models.CharField(max_length=120, blank=True, default='')
    area_puesto = models.CharField(max_length=150, blank=True, default='')
    celular = models.CharField(max_length=25)
    correo = models.EmailField(blank=True, default='')
    is_principal = models.BooleanField(default=False)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Asegura que el primer contacto sea el principal automáticamente
        if not self.pk and self.cliente_id and not ClienteContacto.objects.filter(cliente_id=self.cliente_id).exists():
            self.is_principal = True
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = 'Contacto de Cliente'
        verbose_name_plural = 'Contactos de Cliente'
        ordering = ['-is_principal', 'id']
        indexes = [
            models.Index(fields=['cliente']),
            models.Index(fields=['is_principal']),
        ]


class ClienteDocumento(models.Model):
    cliente = models.OneToOneField(Cliente, on_delete=models.CASCADE, related_name='documento')
    url = models.URLField(blank=True, default='')
    public_id = models.CharField(max_length=255, blank=True, default='')
    nombre_original = models.CharField(max_length=255, blank=True, default='')
    size_bytes = models.BigIntegerField(null=True, blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Documento de Cliente'
        verbose_name_plural = 'Documentos de Cliente'
