from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_drop_kpis_kpivena_table'),
    ]

    operations = [
        migrations.AddField(
            model_name='userpermissions',
            name='avatar_public_id',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='userpermissions',
            name='avatar_url',
            field=models.URLField(blank=True, default=''),
        ),
    ]
