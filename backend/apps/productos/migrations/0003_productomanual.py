from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('productos', '0002_concepto'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProductoManual',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('producto', models.CharField(default='', max_length=255)),
                ('marca', models.CharField(default='', max_length=120)),
                ('modelo', models.CharField(default='', max_length=120)),
                ('imagen_url', models.CharField(blank=True, default='', max_length=500)),
                ('fuente', models.CharField(default='manual', max_length=20)),
                ('precio', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('stock', models.IntegerField(default=0)),
                ('activo', models.BooleanField(default=True)),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
                ('fecha_actualizacion', models.DateTimeField(auto_now=True, blank=True, null=True)),
            ],
            options={
                'verbose_name': 'Producto manual',
                'verbose_name_plural': 'Productos manuales',
                'ordering': ['-fecha_creacion'],
            },
        ),
        migrations.AddIndex(
            model_name='productomanual',
            index=models.Index(fields=['producto'], name='productos_p_producto_1ef977_idx'),
        ),
        migrations.AddIndex(
            model_name='productomanual',
            index=models.Index(fields=['marca'], name='productos_p_marca_68e0b2_idx'),
        ),
        migrations.AddIndex(
            model_name='productomanual',
            index=models.Index(fields=['modelo'], name='productos_p_modelo_2bbdbc_idx'),
        ),
        migrations.AddIndex(
            model_name='productomanual',
            index=models.Index(fields=['fuente'], name='productos_p_fuente_44a2fa_idx'),
        ),
        migrations.AddIndex(
            model_name='productomanual',
            index=models.Index(fields=['activo'], name='productos_p_activo_5e7354_idx'),
        ),
    ]
