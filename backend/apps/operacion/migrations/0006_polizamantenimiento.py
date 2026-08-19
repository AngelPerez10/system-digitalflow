from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("clientes", "0004_cliente_formulario_simplificado"),
        ("cotizaciones", "0007_cotizacionitem_sin_iva"),
        ("operacion", "0005_proyecto_tecnicos_auxiliares"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="PolizaMantenimiento",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("idx", models.IntegerField(blank=True, db_index=True, null=True, unique=True)),
                ("folio", models.CharField(blank=True, db_index=True, max_length=50, null=True, unique=True)),
                ("cliente_nombre", models.CharField(blank=True, default="", max_length=255)),
                (
                    "tipo",
                    models.CharField(
                        choices=[("cctv", "Videovigilancia CCTV")],
                        default="cctv",
                        max_length=20,
                    ),
                ),
                ("cotizacion_folio", models.CharField(blank=True, default="", max_length=50)),
                ("fecha1", models.DateField(blank=True, null=True)),
                ("fecha2", models.DateField(blank=True, null=True)),
                ("fecha3", models.DateField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "cliente",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="polizas_mantenimiento",
                        to="clientes.cliente",
                    ),
                ),
                (
                    "cotizacion",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="polizas_mantenimiento",
                        to="cotizaciones.cotizacion",
                    ),
                ),
                (
                    "creado_por",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="polizas_mantenimiento_creadas",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Póliza de mantenimiento",
                "verbose_name_plural": "Pólizas de mantenimiento",
                "ordering": ["-idx"],
                "indexes": [
                    models.Index(fields=["idx"], name="operacion_p_idx_c8f1a1_idx"),
                    models.Index(fields=["folio"], name="operacion_p_folio_7c2e11_idx"),
                    models.Index(fields=["cliente_nombre"], name="operacion_p_cliente_9b4d22_idx"),
                ],
            },
        ),
    ]
