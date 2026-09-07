# Generated manually for Orden.actualizado_por

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('ordenes', '0015_ordencalificacion'),
    ]

    operations = [
        migrations.AddField(
            model_name='orden',
            name='actualizado_por',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='ordenes_actualizadas',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
