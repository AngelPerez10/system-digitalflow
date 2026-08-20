from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import models

from apps.common.document_folio import FOLIO_SERIE_POL, FOLIO_SERIE_PRJ, format_document_folio

from .close_validation import validate_proyecto_cierre

User = get_user_model()

PROYECTO_STATUS_CHOICES = [
    ("en_proceso", "En proceso"),
    ("pausado", "Pausado"),
    ("cerrado", "Cerrado"),
]


class Proyecto(models.Model):
    idx = models.IntegerField(unique=True, db_index=True, null=True, blank=True)
    folio = models.CharField(max_length=50, unique=True, db_index=True, null=True, blank=True)

    cliente = models.ForeignKey(
        "clientes.Cliente",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="proyectos",
    )
    cliente_nombre = models.CharField(max_length=255, blank=True, default="")

    status = models.CharField(
        max_length=20,
        choices=PROYECTO_STATUS_CHOICES,
        default="en_proceso",
    )
    motivo_pausa = models.TextField(blank=True, default="")

    tipo_trabajo_id = models.IntegerField(null=True, blank=True)
    tipo_trabajo_nombre = models.CharField(max_length=255, blank=True, default="")
    # Varios servicios; legacy id/nombre se sincronizan al primero.
    tipos_trabajo = models.JSONField(default=list, blank=True)

    fecha_autorizacion = models.DateField(null=True, blank=True)
    quien_autorizo = models.CharField(max_length=255, blank=True, default="")
    fechas_inicio = models.JSONField(default=list, blank=True)
    hora_llegada = models.CharField(max_length=10, blank=True, default="")
    hora_salida = models.CharField(max_length=10, blank=True, default="")

    tecnico = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="proyectos_como_tecnico",
    )
    tecnico_nombre = models.CharField(max_length=255, blank=True, default="")
    auxiliar = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="proyectos_como_auxiliar",
    )
    auxiliar_nombre = models.CharField(max_length=255, blank=True, default="")
    # Varios técnicos (uno responsable) y auxiliares; FKs arriba son legacy/sync.
    tecnicos = models.JSONField(default=list, blank=True)
    auxiliares = models.JSONField(default=list, blank=True)

    vehiculo_asignado = models.TextField(blank=True, default="")
    herramientas_generales = models.TextField(blank=True, default="")

    cotizaciones = models.JSONField(default=list, blank=True)
    cotizacion_adicional = models.JSONField(null=True, blank=True)
    equipos = models.JSONField(default=list, blank=True)
    notas_por_dia = models.JSONField(default=list, blank=True)

    porcentaje_avance = models.PositiveSmallIntegerField(default=0)
    incidencias = models.TextField(blank=True, default="")
    requerimientos_adicionales = models.TextField(blank=True, default="")
    requiere_presupuesto_adicional = models.BooleanField(default=False)

    evidencias_urls = models.JSONField(default=list, blank=True)
    firma_cliente_url = models.TextField(blank=True, default="")
    firma_tecnico_url = models.TextField(blank=True, default="")

    creado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="proyectos_creados",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-idx"]
        verbose_name = "Proyecto"
        verbose_name_plural = "Proyectos"
        indexes = [
            models.Index(fields=["idx"]),
            models.Index(fields=["status"]),
            models.Index(fields=["cliente_nombre"]),
        ]

    def clean(self):
        super().clean()
        result = validate_proyecto_cierre(
            status=self.status,
            requiere_presupuesto_adicional=self.requiere_presupuesto_adicional,
            requerimientos_adicionales=self.requerimientos_adicionales,
            cotizacion_adicional=self.cotizacion_adicional,
        )
        if not result.ok:
            raise ValidationError({"status": result.message})

    def save(self, *args, **kwargs):
        if not self.idx:
            current_max = Proyecto.objects.aggregate(models.Max("idx"))["idx__max"]
            base = current_max if current_max is not None else 999
            if base < 999:
                base = 999
            idx = int(base) + 1
            while Proyecto.objects.filter(idx=idx).exists():
                idx += 1
            self.idx = idx

        if self.idx and not (self.folio or "").strip():
            candidate = format_document_folio(FOLIO_SERIE_PRJ, self.idx, empty="")
            if candidate:
                clash = Proyecto.objects.filter(folio=candidate)
                if self.pk:
                    clash = clash.exclude(pk=self.pk)
                if not clash.exists():
                    self.folio = candidate

        if self.porcentaje_avance is None:
            self.porcentaje_avance = 0
        else:
            self.porcentaje_avance = max(0, min(100, int(self.porcentaje_avance)))

        result = validate_proyecto_cierre(
            status=self.status,
            requiere_presupuesto_adicional=self.requiere_presupuesto_adicional,
            requerimientos_adicionales=self.requerimientos_adicionales,
            cotizacion_adicional=self.cotizacion_adicional,
        )
        if not result.ok:
            raise ValidationError({"status": result.message})

        super().save(*args, **kwargs)

    def __str__(self):
        display = (self.folio or "").strip() or self.idx
        return f"Proyecto #{display} - {self.cliente_nombre or 'Sin cliente'}"


class ProyectoInstalacion(models.Model):
    """Instalación GPS (u otro subtipo) asociada a un proyecto. Varias por proyecto."""

    idx = models.IntegerField(unique=True, db_index=True, null=True, blank=True)
    proyecto = models.ForeignKey(
        Proyecto,
        on_delete=models.CASCADE,
        related_name="instalaciones",
    )
    payload = models.JSONField(default=dict, blank=True)
    dibujo_url = models.TextField(blank=True, default="")
    creado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="proyecto_instalaciones_creadas",
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-idx", "-id"]
        verbose_name = "Instalación de proyecto"
        verbose_name_plural = "Instalaciones de proyecto"
        indexes = [
            models.Index(fields=["idx"]),
            models.Index(fields=["proyecto"]),
        ]

    def save(self, *args, **kwargs):
        if not self.idx:
            current_max = ProyectoInstalacion.objects.aggregate(models.Max("idx"))["idx__max"]
            idx = int(current_max or 0) + 1
            while ProyectoInstalacion.objects.filter(idx=idx).exists():
                idx += 1
            self.idx = idx
        if self.payload is None:
            self.payload = {}
        if self.dibujo_url is None:
            self.dibujo_url = ""
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Instalación INS-{self.idx} · Proyecto #{self.proyecto_id}"


POLIZA_TIPO_CCTV = "cctv"
POLIZA_TIPO_CHOICES = [
    (POLIZA_TIPO_CCTV, "Videovigilancia CCTV"),
]
POLIZA_TIPO_LABELS = {
    POLIZA_TIPO_CCTV: "Videovigilancia CCTV",
}
POLIZA_IDX_START = 10001


class PolizaMantenimiento(models.Model):
    idx = models.IntegerField(unique=True, db_index=True, null=True, blank=True)
    folio = models.CharField(max_length=50, unique=True, db_index=True, null=True, blank=True)

    cliente = models.ForeignKey(
        "clientes.Cliente",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="polizas_mantenimiento",
    )
    cliente_nombre = models.CharField(max_length=255, blank=True, default="")

    tipo = models.CharField(
        max_length=20,
        choices=POLIZA_TIPO_CHOICES,
        default=POLIZA_TIPO_CCTV,
    )
    servicio_tipo = models.CharField(max_length=255, blank=True, default="")
    equipos_atendidos = models.CharField(max_length=255, blank=True, default="")

    cotizacion = models.ForeignKey(
        "cotizaciones.Cotizacion",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="polizas_mantenimiento",
    )
    cotizacion_folio = models.CharField(max_length=50, blank=True, default="")

    intervalo_meses = models.PositiveSmallIntegerField(default=4)
    fecha1 = models.DateField(null=True, blank=True)
    fecha2 = models.DateField(null=True, blank=True)
    fecha3 = models.DateField(null=True, blank=True)

    creado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="polizas_mantenimiento_creadas",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-idx"]
        verbose_name = "Póliza de mantenimiento"
        verbose_name_plural = "Pólizas de mantenimiento"
        indexes = [
            models.Index(fields=["idx"], name="operacion_p_idx_c8f1a1_idx"),
            models.Index(fields=["folio"], name="operacion_p_folio_7c2e11_idx"),
            models.Index(fields=["cliente_nombre"], name="operacion_p_cliente_9b4d22_idx"),
        ]

    def save(self, *args, **kwargs):
        if not self.idx:
            current_max = PolizaMantenimiento.objects.aggregate(models.Max("idx"))["idx__max"]
            base = current_max if current_max is not None else POLIZA_IDX_START - 1
            if base < POLIZA_IDX_START - 1:
                base = POLIZA_IDX_START - 1
            idx = int(base) + 1
            while PolizaMantenimiento.objects.filter(idx=idx).exists():
                idx += 1
            self.idx = idx

        if self.idx and not (self.folio or "").strip():
            candidate = format_document_folio(FOLIO_SERIE_POL, self.idx, empty="")
            if candidate:
                clash = PolizaMantenimiento.objects.filter(folio=candidate)
                if self.pk:
                    clash = clash.exclude(pk=self.pk)
                if not clash.exists():
                    self.folio = candidate

        super().save(*args, **kwargs)

    def __str__(self):
        display = (self.folio or "").strip() or self.idx
        return f"Póliza #{display} - {self.cliente_nombre or 'Sin cliente'}"
