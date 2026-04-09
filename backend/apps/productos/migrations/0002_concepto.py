from django.db import migrations, models


def _create_concepto_table_if_missing(apps, schema_editor):
    """
    Crea la tabla solo si no existe.
    Tras SeparateDatabaseAndState (solo estado), `apps` ya incluye Concepto.
    """
    Concepto = apps.get_model("productos", "Concepto")
    table = Concepto._meta.db_table
    if table in schema_editor.connection.introspection.table_names():
        return
    schema_editor.create_model(Concepto)


def _drop_concepto_table_if_present(apps, schema_editor):
    Concepto = apps.get_model("productos", "Concepto")
    table = Concepto._meta.db_table
    if table not in schema_editor.connection.introspection.table_names():
        return
    schema_editor.delete_model(Concepto)


class Migration(migrations.Migration):

    dependencies = [
        ("productos", "0001_initial"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.CreateModel(
                    name="Concepto",
                    fields=[
                        (
                            "id",
                            models.BigAutoField(
                                auto_created=True,
                                primary_key=True,
                                serialize=False,
                                verbose_name="ID",
                            ),
                        ),
                        ("folio", models.CharField(db_index=True, max_length=50, unique=True)),
                        ("concepto", models.CharField(blank=False, default="", max_length=255)),
                        (
                            "precio1",
                            models.DecimalField(decimal_places=2, default=0, max_digits=12),
                        ),
                        ("imagen_url", models.CharField(blank=True, default="", max_length=500)),
                        ("fecha_creacion", models.DateTimeField(auto_now_add=True)),
                        (
                            "fecha_actualizacion",
                            models.DateTimeField(auto_now=True, blank=True, null=True),
                        ),
                    ],
                    options={
                        "ordering": ["folio"],
                        "verbose_name": "Concepto",
                        "verbose_name_plural": "Conceptos",
                    },
                ),
                migrations.AddIndex(
                    model_name="concepto",
                    index=models.Index(fields=["folio"], name="productos_c_folio_87bf69_idx"),
                ),
                migrations.AddIndex(
                    model_name="concepto",
                    index=models.Index(fields=["concepto"], name="productos_c_concept_b17196_idx"),
                ),
                migrations.AddIndex(
                    model_name="concepto",
                    index=models.Index(fields=["precio1"], name="productos_c_precio1_892b8e_idx"),
                ),
            ],
            database_operations=[],
        ),
        migrations.RunPython(_create_concepto_table_if_missing, _drop_concepto_table_if_present),
    ]
