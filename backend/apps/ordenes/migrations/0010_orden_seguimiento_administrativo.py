from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ordenes", "0009_ordeninstalacion"),
    ]

    operations = [
        migrations.AddField(
            model_name="orden",
            name="status_administrativo",
            field=models.CharField(
                choices=[
                    ("pendiente", "Pendiente"),
                    ("en_revision", "En revisión"),
                    ("enviado", "Enviado"),
                    ("cerrado", "Cerrado"),
                ],
                default="pendiente",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="orden",
            name="fecha_envio",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="orden",
            name="cotizaciones_adjuntas",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
