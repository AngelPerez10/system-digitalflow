"""Rellena `nombre_cliente` / `telefono_cliente` vacíos de órdenes cuyo cliente
tiene cuenta de portal, con los datos que el cliente dio al registrarse.
"""

from django.db import migrations, models


def backfill(apps, schema_editor):
    Orden = apps.get_model('ordenes', 'Orden')
    ClientePortalAccount = apps.get_model('clientes', 'ClientePortalAccount')

    # cliente_id -> (nombre, telefono) para clientes con cuenta de portal.
    contacto_por_cliente = {}
    accounts = (
        ClientePortalAccount.objects
        .select_related('user', 'cliente')
        .order_by('id')
    )
    for acc in accounts:
        if acc.cliente_id in contacto_por_cliente:
            continue  # la primera cuenta gana
        user = acc.user
        nombre = f"{(user.first_name or '').strip()} {(user.last_name or '').strip()}".strip()
        cliente = acc.cliente
        telefono = ((cliente.celular or '').strip() or (cliente.telefono or '').strip())[:15]
        contacto_por_cliente[acc.cliente_id] = (nombre, telefono)

    if not contacto_por_cliente:
        return

    vacias = (
        Orden.objects
        .filter(cliente_id__in=contacto_por_cliente.keys())
        .filter(
            models.Q(nombre_cliente__isnull=True) | models.Q(nombre_cliente='')
            | models.Q(telefono_cliente__isnull=True) | models.Q(telefono_cliente='')
        )
        .only('id', 'cliente_id', 'nombre_cliente', 'telefono_cliente')
    )
    por_actualizar = []
    for orden in vacias.iterator():
        # El FK del modelo se llama `cliente_id`; el pk real es `cliente_id_id`.
        nombre, telefono = contacto_por_cliente.get(orden.cliente_id_id, (None, None))
        cambio = False
        if not (orden.nombre_cliente or '').strip() and nombre:
            orden.nombre_cliente = nombre
            cambio = True
        if not (orden.telefono_cliente or '').strip() and telefono:
            orden.telefono_cliente = telefono
            cambio = True
        if cambio:
            por_actualizar.append(orden)

    if por_actualizar:
        Orden.objects.bulk_update(por_actualizar, ['nombre_cliente', 'telefono_cliente'], batch_size=500)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('ordenes', '0017_orden_pool_fields'),
        ('clientes', '0005_portal_cliente'),
    ]

    operations = [
        migrations.RunPython(backfill, noop),
    ]
