from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("operacion", "0003_proyecto_tipos_trabajo"),
    ]

    operations = [
        migrations.AddField(
            model_name="proyecto",
            name="quien_autorizo",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
    ]
