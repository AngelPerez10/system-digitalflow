from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("ordenes", "0004_orden_quien_instalo_quien_entrego"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ReporteSemanal",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("semana_inicio", models.DateField()),
                ("semana_fin", models.DateField()),
                ("ordenes", models.JSONField(blank=True, default=list)),
                ("total_ordenes", models.PositiveIntegerField(default=0)),
                ("fecha_creacion", models.DateTimeField(auto_now_add=True)),
                ("fecha_actualizacion", models.DateTimeField(auto_now=True)),
                (
                    "tecnico",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="reportes_semanales", to=settings.AUTH_USER_MODEL),
                ),
            ],
            options={
                "verbose_name": "Reporte semanal",
                "verbose_name_plural": "Reportes semanales",
                "ordering": ["-fecha_creacion"],
            },
        ),
        migrations.AddIndex(
            model_name="reportesemanal",
            index=models.Index(fields=["tecnico", "semana_inicio", "semana_fin"], name="ordenes_rep_tecnic_2e75ce_idx"),
        ),
        migrations.AddIndex(
            model_name="reportesemanal",
            index=models.Index(fields=["fecha_creacion"], name="ordenes_rep_fecha_c09f45_idx"),
        ),
    ]
