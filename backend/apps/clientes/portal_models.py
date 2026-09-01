from django.conf import settings
from django.db import models


class PortalUsernameSequence(models.Model):
    """Contador atómico para usernames numéricos del portal cliente."""

    last_value = models.BigIntegerField(default=0)

    class Meta:
        verbose_name = 'Secuencia username portal cliente'
        verbose_name_plural = 'Secuencia username portal cliente'


class ClientePortalAccount(models.Model):
    STATUS_ACTIVE = 'active'
    STATUS_PENDING_REVIEW = 'pending_review'
    STATUS_SUSPENDED = 'suspended'
    STATUS_CHOICES = [
        (STATUS_ACTIVE, 'Activo'),
        (STATUS_PENDING_REVIEW, 'Pendiente de revisión'),
        (STATUS_SUSPENDED, 'Suspendido'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='cliente_portal_account',
    )
    cliente = models.ForeignKey(
        'clientes.Cliente',
        on_delete=models.PROTECT,
        related_name='portal_accounts',
    )
    portal_username = models.CharField(max_length=32, unique=True, db_index=True)
    must_change_password = models.BooleanField(default=True)
    password_changed_at = models.DateTimeField(null=True, blank=True)
    temp_password_issued_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_ACTIVE,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Cuenta portal cliente'
        verbose_name_plural = 'Cuentas portal cliente'
        constraints = [
            models.UniqueConstraint(fields=['cliente', 'user'], name='uniq_portal_user_cliente'),
        ]

    def __str__(self):
        return f'{self.portal_username} → Cliente #{self.cliente_id}'


class ClienteRegistroSolicitud(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_APPROVED = 'approved'
    STATUS_REJECTED = 'rejected'
    STATUS_AUTO_APPROVED = 'auto_approved'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pendiente'),
        (STATUS_APPROVED, 'Aprobada'),
        (STATUS_REJECTED, 'Rechazada'),
        (STATUS_AUTO_APPROVED, 'Aprobada automáticamente'),
    ]

    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.EmailField(db_index=True)
    telefono = models.CharField(max_length=25, blank=True, default='')
    razon_social = models.CharField(max_length=255, blank=True, default='')
    rfc = models.CharField(max_length=50, blank=True, default='')
    codigo_postal = models.CharField(max_length=50, blank=True, default='')
    acepto_privacidad = models.BooleanField(default=False)
    dedup_result = models.JSONField(default=dict, blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        db_index=True,
    )
    cliente = models.ForeignKey(
        'clientes.Cliente',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='registro_solicitudes',
    )
    portal_account = models.ForeignKey(
        ClientePortalAccount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='solicitud_origen',
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='registro_solicitudes_revisadas',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Solicitud registro portal cliente'
        verbose_name_plural = 'Solicitudes registro portal cliente'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.email} ({self.get_status_display()})'
