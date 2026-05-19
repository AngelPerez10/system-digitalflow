from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clientes', '0003_add_giro_field'),
    ]

    operations = [
        migrations.AddField(
            model_name='cliente',
            name='clave',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AddField(
            model_name='cliente',
            name='representante',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='cliente',
            name='celular',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AddField(
            model_name='cliente',
            name='idcif',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AddField(
            model_name='cliente',
            name='curp_fiscal',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AddField(
            model_name='cliente',
            name='regimen_fiscal',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='cliente',
            name='uso_cfdi',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
    ]
