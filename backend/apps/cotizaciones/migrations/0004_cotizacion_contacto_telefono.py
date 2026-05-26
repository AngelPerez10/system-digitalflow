from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cotizaciones", "0003_cotizacion_tipo_trabajo_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="cotizacion",
            name="contacto_telefono",
            field=models.CharField(blank=True, default="", max_length=30),
        ),
    ]

