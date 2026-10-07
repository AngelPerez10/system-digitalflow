from django.conf import settings
from django.db import models

from apps.common.document_folio import FOLIO_SERIE_CTR, format_document_folio

from .prestador import PRESTADOR_DEFAULTS

User = settings.AUTH_USER_MODEL

CONTRATO_IDX_START = 10001

TIPO_PERSONA_MORAL = "moral"
TIPO_PERSONA_FISICA = "fisica"
TIPO_PERSONA_CHOICES = [
    (TIPO_PERSONA_MORAL, "Persona moral"),
    (TIPO_PERSONA_FISICA, "Persona física"),
]

ESTADO_BORRADOR = "borrador"
ESTADO_ENVIADO = "enviado"
ESTADO_FIRMADO_CLIENTE = "firmado_cliente"
ESTADO_FIRMADO_PRESTADOR = "firmado_prestador"
ESTADO_COMPLETADO = "completado"
ESTADO_CANCELADO = "cancelado"
ESTADO_CHOICES = [
    (ESTADO_BORRADOR, "Borrador"),
    (ESTADO_ENVIADO, "Enviado a firma"),
    (ESTADO_FIRMADO_CLIENTE, "Firmado por el cliente"),
    (ESTADO_FIRMADO_PRESTADOR, "Firmado por el prestador"),
    (ESTADO_COMPLETADO, "Completado"),
    (ESTADO_CANCELADO, "Cancelado"),
]
ESTADOS_CERRADOS = (ESTADO_COMPLETADO, ESTADO_CANCELADO)


def _prestador_default():
    return dict(PRESTADOR_DEFAULTS)


class Contrato(models.Model):
    """Contrato de Internet Dedicado generado desde la plantilla fija."""

    idx = models.IntegerField(unique=True, db_index=True, null=True, blank=True)
    folio = models.CharField(max_length=50, unique=True, db_index=True, null=True, blank=True)

    # Solo para prellenar; el contrato usa siempre su propio snapshot.
    cliente = models.ForeignKey(
        "clientes.Cliente",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contratos",
    )
    cliente_tipo_persona = models.CharField(
        max_length=10, choices=TIPO_PERSONA_CHOICES, default=TIPO_PERSONA_MORAL
    )
    cliente_razon_social = models.CharField(max_length=255)
    cliente_rfc = models.CharField(max_length=13, blank=True, default="")
    cliente_regimen_fiscal = models.CharField(max_length=120, blank=True, default="")
    cliente_domicilio_fiscal = models.TextField(blank=True, default="")
    cliente_representante = models.CharField(max_length=255, blank=True, default="")
    cliente_clave_elector = models.CharField(max_length=18, blank=True, default="")
    cliente_curp = models.CharField(max_length=18, blank=True, default="")
    cliente_correo = models.EmailField(blank=True, default="")

    domicilio_instalacion = models.TextField(blank=True, default="")
    plan_mbps = models.PositiveIntegerField(default=100)
    precio_mensual = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    vigencia_meses = models.PositiveSmallIntegerField(default=36)
    fecha_firma = models.DateField(null=True, blank=True)
    ciudad_firma = models.CharField(max_length=120, blank=True, default="Manzanillo, Colima")

    prestador_datos = models.JSONField(default=_prestador_default, blank=True)

    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default=ESTADO_BORRADOR)

    # Hash del contenido congelado: se fija al enviar o al primer firmante.
    documento_sha256 = models.CharField(max_length=64, blank=True, default="")

    firma_prestador_png = models.TextField(blank=True, default="")
    firma_prestador_sha256 = models.CharField(max_length=64, blank=True, default="")
    firmado_prestador_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contratos_firmados_prestador",
    )
    firmado_prestador_nombre = models.CharField(max_length=255, blank=True, default="")
    firmado_prestador_at = models.DateTimeField(null=True, blank=True)
    firmado_prestador_ip = models.GenericIPAddressField(null=True, blank=True)

    firma_cliente_png = models.TextField(blank=True, default="")
    firma_cliente_sha256 = models.CharField(max_length=64, blank=True, default="")
    firma_cliente_nombre = models.CharField(max_length=255, blank=True, default="")
    firmado_cliente_at = models.DateTimeField(null=True, blank=True)
    firmado_cliente_ip = models.GenericIPAddressField(null=True, blank=True)
    firmado_cliente_user_agent = models.CharField(max_length=500, blank=True, default="")
    firmado_cliente_correo = models.EmailField(blank=True, default="")

    pdf_sellado = models.BinaryField(null=True, blank=True, editable=False)
    pdf_sellado_sha256 = models.CharField(max_length=64, blank=True, default="")
    sellado_at = models.DateTimeField(null=True, blank=True)

    creado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contratos_creados",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-idx"]
        verbose_name = "Contrato"
        verbose_name_plural = "Contratos"
        indexes = [
            models.Index(fields=["estado"], name="contratos_estado_idx"),
            models.Index(fields=["cliente_razon_social"], name="contratos_cliente_rs_idx"),
        ]

    @property
    def cerrado(self) -> bool:
        return self.estado in ESTADOS_CERRADOS

    def save(self, *args, **kwargs):
        if not self.idx:
            current_max = Contrato.objects.aggregate(models.Max("idx"))["idx__max"]
            base = max(current_max or 0, CONTRATO_IDX_START - 1)
            idx = int(base) + 1
            while Contrato.objects.filter(idx=idx).exists():
                idx += 1
            self.idx = idx
        if self.idx and not (self.folio or "").strip():
            candidate = format_document_folio(FOLIO_SERIE_CTR, self.idx, empty="")
            if candidate and not Contrato.objects.filter(folio=candidate).exclude(pk=self.pk).exists():
                self.folio = candidate
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Contrato {self.folio or self.idx} - {self.cliente_razon_social}"


class ContratoEnlaceFirma(models.Model):
    """Link de firma del cliente. Nunca se guarda el token en claro, solo su hash."""

    contrato = models.ForeignKey(Contrato, on_delete=models.CASCADE, related_name="enlaces")
    token_hash = models.CharField(max_length=64, unique=True)
    correo_destino = models.EmailField()
    documento_sha256 = models.CharField(max_length=64)
    expira_at = models.DateTimeField()
    revocado_at = models.DateTimeField(null=True, blank=True)
    usado_at = models.DateTimeField(null=True, blank=True)

    otp_hash = models.CharField(max_length=64, blank=True, default="")
    otp_expira_at = models.DateTimeField(null=True, blank=True)
    otp_intentos = models.PositiveSmallIntegerField(default=0)
    otp_enviados = models.PositiveSmallIntegerField(default=0)
    otp_ultimo_envio_at = models.DateTimeField(null=True, blank=True)
    verificado_at = models.DateTimeField(null=True, blank=True)

    sesion_hash = models.CharField(max_length=64, blank=True, default="")
    sesion_expira_at = models.DateTimeField(null=True, blank=True)

    creado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contratos_enlaces_creados",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Enlace de firma"
        verbose_name_plural = "Enlaces de firma"

    def __str__(self):
        return f"Enlace {self.pk} de {self.contrato_id}"


EVENTO_CHOICES = [
    ("creado", "Contrato creado"),
    ("editado", "Contrato editado"),
    ("enviado", "Enlace de firma generado"),
    ("enlace_correo", "Enlace enviado por correo"),
    ("revocado", "Enlace revocado"),
    ("link_abierto", "Enlace abierto"),
    ("otp_enviado", "Código enviado"),
    ("otp_fallido", "Código incorrecto"),
    ("otp_bloqueado", "Enlace bloqueado por intentos"),
    ("otp_verificado", "Identidad verificada"),
    ("documento_visto", "Documento consultado"),
    ("firmado_cliente", "Firmado por el cliente"),
    ("firmado_prestador", "Firmado por el prestador"),
    ("sellado", "Documento sellado"),
    ("cancelado", "Contrato cancelado"),
]


class ContratoEvento(models.Model):
    """Bitácora de auditoría: solo se agregan filas, nunca se editan."""

    contrato = models.ForeignKey(Contrato, on_delete=models.CASCADE, related_name="eventos")
    tipo = models.CharField(max_length=30, choices=EVENTO_CHOICES)
    ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True, default="")
    usuario = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contratos_eventos",
    )
    detalle = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]
        verbose_name = "Evento de contrato"
        verbose_name_plural = "Eventos de contrato"

    def __str__(self):
        return f"{self.get_tipo_display()} · {self.contrato_id}"
