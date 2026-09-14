from django.db import migrations


def backfill_direcciones(apps, schema_editor):
    """Copia la dirección plana de cada Cliente existente a una ClienteDireccion principal."""
    Cliente = apps.get_model('clientes', 'Cliente')
    ClienteDireccion = apps.get_model('clientes', 'ClienteDireccion')

    direccion_fields = [
        'direccion', 'calle', 'numero_exterior', 'interior', 'colonia',
        'localidad', 'municipio', 'codigo_postal', 'ciudad', 'estado',
    ]

    nuevas = []
    for cliente in Cliente.objects.all().iterator():
        if not any(getattr(cliente, f, '') for f in direccion_fields):
            continue
        nuevas.append(ClienteDireccion(
            cliente=cliente,
            etiqueta='Principal',
            direccion=cliente.direccion,
            calle=cliente.calle,
            numero_exterior=cliente.numero_exterior,
            interior=cliente.interior,
            colonia=cliente.colonia,
            localidad=cliente.localidad,
            municipio=cliente.municipio,
            codigo_postal=cliente.codigo_postal,
            ciudad=cliente.ciudad,
            pais=cliente.pais or 'México',
            estado=cliente.estado,
            is_principal=True,
        ))

    if nuevas:
        ClienteDireccion.objects.bulk_create(nuevas)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('clientes', '0006_clientedireccion'),
    ]

    operations = [
        migrations.RunPython(backfill_direcciones, noop_reverse),
    ]
