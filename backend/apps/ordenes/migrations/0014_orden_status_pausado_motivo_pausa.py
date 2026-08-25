from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ordenes", "0013_orden_list_fecha_indexes"),
    ]

    operations = [
        migrations.AddField(
            model_name="orden",
            name="motivo_pausa",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="orden",
            name="status",
            field=models.CharField(
                choices=[
                    ("pendiente", "Pendiente"),
                    ("pausado", "Pausado"),
                    ("resuelto", "Resuelto"),
                ],
                default="pendiente",
                max_length=20,
            ),
        ),
    ]
