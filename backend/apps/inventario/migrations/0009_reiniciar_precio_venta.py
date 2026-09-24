"""El precio de venta pasa a ser la lista del proveedor (antes: el tier más bajo).

Los valores guardados se calcularon con el criterio anterior; se vacían para que
la sincronización los vuelva a consultar y no muestre un falso «subió».
"""
from django.db import migrations


def reiniciar(apps, schema_editor):
    InventarioItem = apps.get_model('inventario', 'InventarioItem')
    InventarioItem.objects.exclude(precio_mercado__isnull=True, precio_mercado_actualizado__isnull=True).update(
        precio_mercado=None,
        precio_mercado_anterior=None,
        precio_mercado_actualizado=None,
    )


class Migration(migrations.Migration):
    dependencies = [
        ('inventario', '0008_ubicacion_precio_mercado'),
    ]

    operations = [
        migrations.RunPython(reiniciar, migrations.RunPython.noop),
    ]
