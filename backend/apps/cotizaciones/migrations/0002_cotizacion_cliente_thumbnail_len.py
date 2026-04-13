# Generated manually: evita 400 por nombre de cliente >100 o URL de miniatura >200 (Syscom/CDN).

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cotizaciones", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="cotizacion",
            name="cliente",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AlterField(
            model_name="cotizacionitem",
            name="thumbnail_url",
            field=models.CharField(blank=True, default="", max_length=512),
        ),
    ]
