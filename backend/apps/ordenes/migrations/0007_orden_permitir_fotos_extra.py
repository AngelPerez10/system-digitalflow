from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ordenes", "0006_rename_ordenes_rep_tecnic_2e75ce_idx_ordenes_rep_tecnico_d600b3_idx_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="orden",
            name="permitir_fotos_extra",
            field=models.BooleanField(default=False),
        ),
    ]
