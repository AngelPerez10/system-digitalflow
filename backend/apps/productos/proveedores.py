"""Proveedores que se pueden asignar a un producto manual.

Solo contactos tipo PROVEEDOR. Los distribuidores base (INTRAX, SYSCOM, TVC)
siempre están disponibles: si aún no existen como contacto se dan de alta, igual
que al importar una factura en Inventario.
"""
from apps.clientes.models import Cliente

# Orden fijo al inicio de la lista; el resto va alfabético.
PROVEEDORES_BASE = ('INTRAX', 'SYSCOM', 'TVC')
_BASE = {n.lower(): n for n in PROVEEDORES_BASE}


def nombre_proveedor_visible(nombre: str | None) -> str:
    """Los distribuidores base siempre en mayúsculas (p. ej. «Intrax» → «INTRAX»)."""
    limpio = (nombre or '').strip()
    return _BASE.get(limpio.lower(), limpio)


def asegurar_proveedores_base() -> None:
    for nombre in PROVEEDORES_BASE:
        if not Cliente.objects.filter(tipo='PROVEEDOR', nombre__iexact=nombre).exists():
            Cliente.objects.create(nombre=nombre, tipo='PROVEEDOR', clave=nombre)


def listar_proveedores() -> list[dict]:
    asegurar_proveedores_base()
    rows = Cliente.objects.filter(tipo='PROVEEDOR').values('id', 'nombre')[:500]
    items = [{'id': r['id'], 'nombre': nombre_proveedor_visible(r['nombre'])} for r in rows]
    orden_base = {n: i for i, n in enumerate(PROVEEDORES_BASE)}
    # Si hay contactos duplicados de un distribuidor base, se muestra solo el más antiguo.
    vistos: set[str] = set()
    unicos = []
    for it in sorted(items, key=lambda x: x['id']):
        if it['nombre'] in orden_base:
            if it['nombre'] in vistos:
                continue
            vistos.add(it['nombre'])
        unicos.append(it)
    return sorted(unicos, key=lambda x: (orden_base.get(x['nombre'], len(orden_base)), x['nombre'].lower()))
