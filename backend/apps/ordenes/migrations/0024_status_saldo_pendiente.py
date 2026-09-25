from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ordenes', '0023_liquidado'),
    ]

    operations = [
        migrations.AlterField(
            model_name='orden',
            name='status',
            field=models.CharField(
                choices=[
                    ('pendiente', 'Pendiente'),
                    ('pausado', 'Pausado'),
                    ('saldo_pendiente', 'Saldo pendiente'),
                    ('resuelto', 'Resuelto'),
                    ('cancelada', 'Cancelada'),
                ],
                default='pendiente',
                max_length=20,
            ),
        ),
    ]
