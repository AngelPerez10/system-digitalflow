from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("escritorio", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="tarea",
            name="estado",
            field=models.CharField(
                choices=[
                    ("BACKLOG", "Backlog"),
                    ("TODO", "Por hacer"),
                    ("EN_PROGRESO", "En progreso"),
                    ("HECHO", "Hecho"),
                ],
                default="BACKLOG",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="tarea",
            name="orden",
            field=models.PositiveIntegerField(default=0),
        ),
    ]
