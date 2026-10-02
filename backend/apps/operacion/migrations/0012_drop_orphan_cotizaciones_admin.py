from django.db import migrations


def drop_cotizaciones_admin_column(apps, schema_editor):
    # `DROP COLUMN IF EXISTS` es sintaxis de PostgreSQL; SQLite (tests) no la
    # soporta y en una base nueva la columna nunca existió.
    if schema_editor.connection.vendor != "postgresql":
        return
    schema_editor.execute(
        "ALTER TABLE operacion_proyecto DROP COLUMN IF EXISTS cotizaciones_admin;"
    )


class Migration(migrations.Migration):
    """
    Limpia la columna `cotizaciones_admin` que quedó huérfana en bases de datos
    donde ya se había aplicado una versión anterior de la migración
    0011_proyecto_seguimiento_administrativo (esta se editó antes de commitear
    para quitar ese campo). `IF EXISTS` la hace segura en instalaciones nuevas
    que nunca tuvieron la columna.
    """

    dependencies = [
        ("operacion", "0011_proyecto_seguimiento_administrativo"),
    ]

    operations = [
        migrations.RunPython(
            drop_cotizaciones_admin_column,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
