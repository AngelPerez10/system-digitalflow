from django.db import migrations


def drop_giro_column(apps, schema_editor):
    vendor = schema_editor.connection.vendor
    if vendor == 'postgresql':
        schema_editor.execute("ALTER TABLE clientes_cliente DROP COLUMN IF EXISTS giro;")
    else:
        return


class Migration(migrations.Migration):

    dependencies = [
        ('clientes', '0002_rename_clientes_cli_idx_5b2d08_idx_clientes_cl_idx_04b478_idx_and_more'),
    ]

    operations = [
        migrations.RunPython(drop_giro_column, reverse_code=migrations.RunPython.noop),
    ]
