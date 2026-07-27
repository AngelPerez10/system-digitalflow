from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import models

from apps.common.document_folio import FOLIO_SERIE_PRJ, format_document_folio

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

    fecha_autorizacion = models.DateField(null=True, blank=True)
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
