from django.db import models


class Cliente(models.Model):
    idx = models.IntegerField(unique=True, db_index=True)
    nombre = models.CharField(max_length=255) # Relaxed unique constraint
    direccion = models.TextField(blank=True, default='')
    telefono = models.CharField(max_length=100, blank=True, default='')
    celular = models.CharField(max_length=100, blank=True, default='')
    clave = models.CharField(max_length=100, blank=True, default='')
    representante = models.CharField(max_length=255, blank=True, default='')

    # Datos generales
    rfc = models.CharField(max_length=50, blank=True, default='')
    curp = models.CharField(max_length=100, blank=True, default='')
    correo = models.EmailField(blank=True, default='')

    # Dirección
    calle = models.CharField(max_length=255, blank=True, default='')
    numero_exterior = models.CharField(max_length=100, blank=True, default='')
    interior = models.CharField(max_length=100, blank=True, default='')
    colonia = models.CharField(max_length=255, blank=True, default='')
    localidad = models.CharField(max_length=255, blank=True, default='')
    municipio = models.CharField(max_length=255, blank=True, default='')
    codigo_postal = models.CharField(max_length=50, blank=True, default='')
    ciudad = models.CharField(max_length=255, blank=True, default='')
    pais = models.CharField(max_length=255, blank=True, default='')
    estado = models.CharField(max_length=255, blank=True, default='')

    # Configuración Fiscal / Precios
    aplica_retenciones = models.BooleanField(default=False)
    desglosar_ieps = models.BooleanField(default=False)
    numero_precio = models.CharField(max_length=50, blank=True, default='1')

    # Crédito
    limite_credito = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    dias_credito = models.IntegerField(default=0)

    # Clasificación
    TIPO_CHOICES = [
        ('EMPRESA', 'Empresa'),
        ('PERSONA_FISICA', 'Persona Física'),
        ('PROVEEDOR', 'Proveedor'),
    ]
    tipo = models.CharField(
        max_length=50,
        choices=TIPO_CHOICES,
        default='EMPRESA',
        help_text='Identificador de tipo de cliente/entidad'
    )

    # Otros
    is_prospecto = models.BooleanField(default=False)
    notas = models.TextField(blank=True, default='')
    descuento_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    # Más información
    portal_web = models.CharField(max_length=255, blank=True, default='')

    # Facturación
    nombre_facturacion = models.CharField(max_length=255, blank=True, default='')
    numero_facturacion = models.CharField(max_length=100, blank=True, default='')
    domicilio_facturacion = models.TextField(blank=True, default='')
    idcif = models.CharField(max_length=100, blank=True, default='')
    curp_fiscal = models.CharField(max_length=100, blank=True, default='')
    regimen_fiscal = models.CharField(max_length=255, blank=True, default='')
    uso_cfdi = models.CharField(max_length=100, blank=True, default='')

    # Envío
    calle_envio = models.CharField(max_length=255, blank=True, default='')
    numero_envio = models.CharField(max_length=100, blank=True, default='')
    colonia_envio = models.CharField(max_length=255, blank=True, default='')
    codigo_postal_envio = models.CharField(max_length=50, blank=True, default='')
    pais_envio = models.CharField(max_length=255, blank=True, default='')
    estado_envio = models.CharField(max_length=255, blank=True, default='')
    ciudad_envio = models.CharField(max_length=255, blank=True, default='')
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
    celular = models.CharField(max_length=25, blank=True, default='')
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


class ClienteDireccion(models.Model):
    """
    Libreta de direcciones del cliente (estilo Mercado Libre / Amazon): un
    cliente puede tener varias sucursales/domicilios. La dirección marcada
    `is_principal` se refleja en los campos planos de `Cliente` para no
    romper a los consumidores existentes (PDFs, portal, CFDI).
    """
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='direcciones')
    etiqueta = models.CharField(max_length=100, blank=True, default='')
    direccion = models.TextField(blank=True, default='')
    calle = models.CharField(max_length=255, blank=True, default='')
    numero_exterior = models.CharField(max_length=100, blank=True, default='')
    interior = models.CharField(max_length=100, blank=True, default='')
    colonia = models.CharField(max_length=255, blank=True, default='')
    localidad = models.CharField(max_length=255, blank=True, default='')
    municipio = models.CharField(max_length=255, blank=True, default='')
    codigo_postal = models.CharField(max_length=50, blank=True, default='')
    ciudad = models.CharField(max_length=255, blank=True, default='')
    pais = models.CharField(max_length=255, blank=True, default='México')
    estado = models.CharField(max_length=255, blank=True, default='')
    is_principal = models.BooleanField(default=False)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    def _sync_legacy_cliente_fields(self):
        Cliente.objects.filter(pk=self.cliente_id).update(
            direccion=self.direccion,
            calle=self.calle,
            numero_exterior=self.numero_exterior,
            interior=self.interior,
            colonia=self.colonia,
            localidad=self.localidad,
            municipio=self.municipio,
            codigo_postal=self.codigo_postal,
            ciudad=self.ciudad,
            pais=self.pais,
            estado=self.estado,
        )

    def save(self, *args, **kwargs):
        # La primera dirección de un cliente siempre es la principal.
        if not self.pk and self.cliente_id and not ClienteDireccion.objects.filter(cliente_id=self.cliente_id).exists():
            self.is_principal = True
        if self.is_principal:
            # Solo puede haber una dirección principal por cliente.
            ClienteDireccion.objects.filter(cliente_id=self.cliente_id, is_principal=True).exclude(pk=self.pk).update(is_principal=False)
        super().save(*args, **kwargs)
        if self.is_principal:
            self._sync_legacy_cliente_fields()

    def delete(self, *args, **kwargs):
        cliente_id = self.cliente_id
        was_principal = self.is_principal
        result = super().delete(*args, **kwargs)
        if was_principal:
            # Promueve otra dirección a principal para no dejar al cliente sin
            # ninguna (y para que sus campos planos de compatibilidad no
            # queden apuntando a una dirección que ya no existe).
            siguiente = ClienteDireccion.objects.filter(cliente_id=cliente_id).order_by('id').first()
            if siguiente:
                siguiente.is_principal = True
                siguiente.save()
        return result

    class Meta:
        verbose_name = 'Dirección de Cliente'
        verbose_name_plural = 'Direcciones de Cliente'
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


from .portal_models import ClientePortalAccount, ClienteRegistroSolicitud, PortalUsernameSequence  # noqa: E402, F401
