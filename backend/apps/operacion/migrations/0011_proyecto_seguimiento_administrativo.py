from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("operacion", "0010_reportemantenimiento_orden"),
    ]

    operations = [
        migrations.AddField(
            model_name="proyecto",
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
            model_name="proyecto",
            name="fecha_envio_admin",
            field=models.DateField(blank=True, null=True),
        ),
    ]
