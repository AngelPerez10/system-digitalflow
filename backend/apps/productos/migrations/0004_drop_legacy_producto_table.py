from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("productos", "0003_productomanual"),
    ]

    operations = [
        migrations.RunSQL(
            sql="DROP TABLE IF EXISTS productos_producto CASCADE;",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
