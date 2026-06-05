from django.db import connection, migrations


def drop_legacy_producto_table(apps, schema_editor):
    with connection.cursor() as cursor:
        if connection.vendor == 'postgresql':
            cursor.execute('DROP TABLE IF EXISTS productos_producto CASCADE;')
        else:
            cursor.execute('DROP TABLE IF EXISTS productos_producto;')


class Migration(migrations.Migration):

    dependencies = [
        ("productos", "0003_productomanual"),
    ]

    operations = [
        migrations.RunPython(drop_legacy_producto_table, migrations.RunPython.noop),
    ]
