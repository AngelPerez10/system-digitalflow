from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ordenes", "0010_orden_seguimiento_administrativo"),
    ]

    operations = [
        migrations.AddField(
            model_name="orden",
            name="status_changed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
