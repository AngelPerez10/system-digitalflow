from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('ordenes', '0002_add_folio_to_orden'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='OrdenLevantamiento',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('payload', models.JSONField(blank=True, default=dict)),
                ('dibujo_url', models.TextField(blank=True, default='')),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
                ('fecha_actualizacion', models.DateTimeField(auto_now=True)),
                ('creado_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='levantamientos_creados', to=settings.AUTH_USER_MODEL)),
                ('orden', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='levantamiento', to='ordenes.orden')),
            ],
            options={
                'verbose_name': 'Levantamiento',
                'verbose_name_plural': 'Levantamientos',
            },
        ),
    ]
