from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("productos", "0005_rename_productos_p_producto_1ef977_idx_productos_p_product_51c25a_idx_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="concepto",
            name="descripcion",
            field=models.TextField(blank=True, default=""),
        ),
    ]
