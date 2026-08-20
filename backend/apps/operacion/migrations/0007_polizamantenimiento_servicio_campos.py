from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("operacion", "0006_polizamantenimiento"),
    ]

    operations = [
        migrations.AddField(
            model_name="polizamantenimiento",
            name="equipos_atendidos",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="polizamantenimiento",
            name="servicio_tipo",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
    ]
