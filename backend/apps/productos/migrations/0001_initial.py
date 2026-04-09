from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Servicio",
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
                ("idx", models.IntegerField(unique=True, db_index=True)),
                ("nombre", models.CharField(max_length=200, blank=False, default="")),
                ("descripcion", models.TextField(blank=True, default="")),
                ("activo", models.BooleanField(default=True)),
                ("categoria", models.CharField(max_length=200, blank=True, default="")),
                ("fecha_creacion", models.DateTimeField(auto_now_add=True)),
                (
                    "fecha_actualizacion",
                    models.DateTimeField(auto_now=True, null=True, blank=True),
                ),
            ],
            options={
                "ordering": ["idx"],
                "verbose_name": "Servicio",
                "verbose_name_plural": "Servicios",
            },
        ),
        migrations.AddIndex(
            model_name="servicio",
            index=models.Index(fields=["idx"], name="productos_s_idx_c28d22_idx"),
        ),
        migrations.AddIndex(
            model_name="servicio",
            index=models.Index(fields=["nombre"], name="productos_s_nombre_6cb91a_idx"),
        ),
        migrations.AddIndex(
            model_name="servicio",
            index=models.Index(fields=["activo"], name="productos_s_activo_f1b54a_idx"),
        ),
        migrations.AddIndex(
            model_name="servicio",
            index=models.Index(fields=["categoria"], name="productos_s_categor_41a800_idx"),
        ),
    ]
