from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("operacion", "0007_polizamantenimiento_servicio_campos"),
    ]

    operations = [
        migrations.AddField(
            model_name="polizamantenimiento",
            name="intervalo_meses",
            field=models.PositiveSmallIntegerField(default=4),
        ),
    ]
