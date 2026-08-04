# Generated manually for sin_iva on CotizacionItem

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cotizaciones', '0006_cotizacion_categorias_productos'),
    ]

    operations = [
        migrations.AddField(
            model_name='cotizacionitem',
            name='sin_iva',
            field=models.BooleanField(default=False),
        ),
    ]
