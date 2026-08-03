from django.db import migrations, models


def forwards_copy_legacy_tipos(apps, schema_editor):
    Proyecto = apps.get_model("operacion", "Proyecto")
    for proy in Proyecto.objects.all().iterator():
        existing = proy.tipos_trabajo if isinstance(proy.tipos_trabajo, list) else []
        if existing:
            continue
        if proy.tipo_trabajo_id:
            proy.tipos_trabajo = [
                {
                    "id": int(proy.tipo_trabajo_id),
                    "nombre": str(proy.tipo_trabajo_nombre or "").strip(),
                }
            ]
            proy.save(update_fields=["tipos_trabajo"])


def backwards_noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("operacion", "0002_proyectoinstalacion"),
    ]

    operations = [
        migrations.AddField(
            model_name="proyecto",
            name="tipos_trabajo",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.RunPython(forwards_copy_legacy_tipos, backwards_noop),
    ]
