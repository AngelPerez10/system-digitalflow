from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('productos', '0007_productomanual_caracteristicas'),
    ]

    operations = [
        migrations.AddField(
            model_name='productomanual',
            name='sat_key',
            field=models.CharField(blank=True, default='', max_length=32),
        ),
    ]
