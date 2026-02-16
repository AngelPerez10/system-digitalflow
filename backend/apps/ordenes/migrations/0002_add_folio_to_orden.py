from django.db import migrations, models


def _prefill_folio_from_idx(apps, schema_editor):
    Orden = apps.get_model('ordenes', 'Orden')
    # Fill folio with current idx as string when folio is empty
    for o in Orden.objects.filter(folio__isnull=True).exclude(idx__isnull=True):
        Orden.objects.filter(id=o.id).update(folio=str(o.idx))


class Migration(migrations.Migration):

    dependencies = [
        ('ordenes', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='orden',
            name='folio',
            field=models.CharField(blank=True, db_index=True, max_length=50, null=True, unique=True),
        ),
        migrations.RunPython(_prefill_folio_from_idx, migrations.RunPython.noop),
    ]
