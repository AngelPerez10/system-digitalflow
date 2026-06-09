from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cotizaciones", "0004_cotizacion_contacto_telefono"),
    ]

    operations = [
        migrations.AddField(
            model_name="cotizacion",
            name="pdf_opciones",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="cotizacionitem",
            name="pdf_descripcion_corta",
            field=models.CharField(blank=True, default="", max_length=500),
        ),
    ]
