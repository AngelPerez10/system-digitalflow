from django.db import migrations, models


def forwards_copy_bool_to_int(apps, schema_editor):
    Orden = apps.get_model("ordenes", "Orden")
    Orden.objects.filter(permitir_fotos_extra=True).update(fotos_extra_max=2)


class Migration(migrations.Migration):

    dependencies = [
        ("ordenes", "0007_orden_permitir_fotos_extra"),
    ]

    operations = [
        migrations.AddField(
            model_name="orden",
            name="fotos_extra_max",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.RunPython(forwards_copy_bool_to_int, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="orden",
            name="permitir_fotos_extra",
        ),
    ]
