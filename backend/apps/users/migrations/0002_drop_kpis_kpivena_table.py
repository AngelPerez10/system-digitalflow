# Remove legacy kpis.KpiVenta table after apps.kpis was deleted.

from django.db import connection, migrations


def drop_kpis_table(apps, schema_editor):
    with connection.cursor() as cursor:
        if connection.vendor == 'postgresql':
            cursor.execute('DROP TABLE IF EXISTS kpis_kpivena CASCADE;')
        else:
            cursor.execute('DROP TABLE IF EXISTS kpis_kpivena;')
        cursor.execute("DELETE FROM django_migrations WHERE app = 'kpis';")


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(drop_kpis_table, noop_reverse),
    ]
