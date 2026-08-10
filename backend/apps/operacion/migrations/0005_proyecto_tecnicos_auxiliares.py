# Generated manually for multi técnicos/auxiliares

from django.db import migrations, models


def hydrate_from_fk(apps, schema_editor):
    Proyecto = apps.get_model("operacion", "Proyecto")
    for p in Proyecto.objects.all().iterator(chunk_size=200):
        changed = False
        tecnicos = p.tecnicos if isinstance(p.tecnicos, list) else []
        if not tecnicos and p.tecnico_id:
            p.tecnicos = [
                {
                    "id": p.tecnico_id,
                    "nombre": p.tecnico_nombre or "",
                    "responsable": True,
                }
            ]
            changed = True
        auxiliares = p.auxiliares if isinstance(p.auxiliares, list) else []
        if not auxiliares and p.auxiliar_id:
            p.auxiliares = [{"id": p.auxiliar_id, "nombre": p.auxiliar_nombre or ""}]
            changed = True
        if changed:
            p.save(update_fields=["tecnicos", "auxiliares"])


class Migration(migrations.Migration):
    dependencies = [
        ("operacion", "0004_proyecto_quien_autorizo"),
    ]

    operations = [
        migrations.AddField(
            model_name="proyecto",
            name="tecnicos",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="proyecto",
            name="auxiliares",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.RunPython(hydrate_from_fk, migrations.RunPython.noop),
    ]
