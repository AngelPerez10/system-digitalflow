from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cotizaciones", "0005_cotizacion_pdf_opciones_item_descripcion_corta"),
    ]

    operations = [
        migrations.AddField(
            model_name="cotizacion",
            name="categorias_productos",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="cotizacionitem",
            name="categoria_id",
            field=models.CharField(blank=True, default="", max_length=64),
        ),
    ]
