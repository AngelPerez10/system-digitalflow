from django.db import migrations


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
        migrations.RunSQL(
            sql="ALTER TABLE operacion_proyecto DROP COLUMN IF EXISTS cotizaciones_admin;",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
