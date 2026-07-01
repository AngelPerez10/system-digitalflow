from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("productos", "0006_concepto_descripcion"),
    ]

    operations = [
        migrations.AddField(
            model_name="productomanual",
            name="caracteristicas",
            field=models.TextField(blank=True, default=""),
        ),
    ]
