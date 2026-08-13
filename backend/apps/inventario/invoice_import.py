"""Importación de facturas de proveedores a inventario (SYSCOM hoy, TVC después)."""
from __future__ import annotations

import logging
import re
import urllib.parse
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation

import requests
from django.conf import settings
from django.db import IntegrityError, transaction

from .enrichment import _plain_text
from .models import InventarioImportacion, InventarioItem, InventarioMovimiento

logger = logging.getLogger(__name__)

PROVEEDORES = frozenset({'syscom', 'tvc'})

# Nombre visible del Cliente PROVEEDOR que se crea/busca al importar.
_NOMBRE_PROVEEDOR = {
    'syscom': 'SYSCOM',
    'tvc': 'TVC',
}

# La factura incluye servicios como si fueran productos (el envío es el artículo
# de catálogo SYSCOM-ENVIO-136321). No son existencias: no entran al inventario.
_PREFIJOS_SERVICIO = ('ENVIO', 'FLETE', 'PAQUETERIA')
_CODIGOS_SERVICIO = frozenset({'SEGURO', 'MANIOBRA', 'MANIOBRAS'})


def es_linea_de_servicio(modelo: str) -> bool:
    """True para envíos, fletes y demás cargos que no son mercancía."""
    codigo = re.sub(r'[^A-Z0-9]', '', (modelo or '').upper())
    if not codigo:
        return False
    if codigo in _CODIGOS_SERVICIO:
        return True
    return codigo.startswith(_PREFIJOS_SERVICIO)


class FacturaNoEncontrada(Exception):
    """La factura no existe o no pertenece a esta cuenta de distribuidor."""


class FacturaYaImportada(Exception):
    """El folio ya se importó antes."""


class ProveedorNoSoportado(Exception):
    """El proveedor aún no tiene importación de facturas."""


class FacturaInvalida(Exception):
    """Folio vacío o factura sin líneas útiles."""


@dataclass(frozen=True)
class FacturaLinea:
    ref_externa: str
    modelo: str
    nombre: str
    marca: str
    imagen_url: str
    cantidad: int
    caracteristicas: str = ''
    precio_unitario: Decimal | None = None


@dataclass(frozen=True)
class FacturaDetalle:
    folio: str
    lineas: list[FacturaLinea]


def normalize_folio(folio: str) -> str:
    return re.sub(r'\s+', '', (folio or '').strip().upper())


def _parse_precio_unitario(raw: object) -> Decimal | None:
    """Convierte el precio_unitario de la factura; inválido → None."""
    if raw is None or raw == '':
        return None
    try:
        valor = Decimal(str(raw).strip())
    except (InvalidOperation, TypeError, ValueError):
        return None
    if valor < 0:
        return None
    return valor.quantize(Decimal('0.01'))


def obtener_o_crear_proveedor(origen: str):
    """Busca o crea el Cliente tipo PROVEEDOR (SYSCOM / TVC) para la FK del ítem."""
    from apps.clientes.models import Cliente

    nombre = _NOMBRE_PROVEEDOR.get((origen or '').strip().lower())
    if not nombre:
        return None
    existente = (
        Cliente.objects.filter(tipo='PROVEEDOR', nombre__iexact=nombre)
        .order_by('id')
        .first()
    )
    if existente:
        return existente
    return Cliente.objects.create(
        nombre=nombre,
        tipo='PROVEEDOR',
        clave=nombre,
    )


def _nombre_corto(titulo: str) -> tuple[str, str]:
    """Separa el título largo de SYSCOM (tramos con ' / ') en nombre + notas.

    El título de la factura viene con entidades HTML (`Conexi&oacute;n`), así que
    se limpia con el mismo helper que usa el enriquecimiento del catálogo.
    """
    texto = _plain_text(titulo).replace('\n', ' ').strip()
    if not texto:
        return '', ''
    if ' / ' not in texto:
        return texto[:255], ''
    partes = [p.strip() for p in texto.split(' / ') if p.strip()]
    if not partes:
        return '', ''
    nombre = partes[0][:255]
    resto = '\n'.join(partes[1:])
    return nombre, resto


def _parse_cantidad(raw: object) -> int:
    try:
        valor = int(float(str(raw).strip()))
    except (TypeError, ValueError):
        return 0
    return valor if valor > 0 else 0


def _map_syscom_linea(raw: dict) -> FacturaLinea | None:
    if not isinstance(raw, dict):
        return None
    ref = str(raw.get('producto_id') or '').strip()
    modelo = str(raw.get('cod_art') or raw.get('modelo') or '').strip()
    cantidad = _parse_cantidad(raw.get('cantidad'))
    if cantidad <= 0 or (not ref and not modelo):
        return None
    if es_linea_de_servicio(modelo):
        return None
    titulo = str(raw.get('titulo') or '').strip()
    nombre, extras = _nombre_corto(titulo)
    if not nombre:
        nombre = modelo or f'SYSCOM:{ref}'
    imagen = str(raw.get('imagen') or raw.get('img_portada') or '').strip()
    if not imagen.startswith(('http://', 'https://')):
        imagen = ''
    return FacturaLinea(
        ref_externa=ref,
        modelo=modelo or (f'SYSCOM:{ref}' if ref else ''),
        nombre=nombre,
        marca=str(raw.get('marca') or '').strip(),
        imagen_url=imagen,
        cantidad=cantidad,
        caracteristicas=extras,
        precio_unitario=_parse_precio_unitario(raw.get('precio_unitario')),
    )


def fetch_syscom_factura(folio: str) -> FacturaDetalle:
    """GET /facturas/{FA26}/{id} — detalle con productos."""
    from apps.productos.syscom_views import _get_syscom_token, _syscom_get

    folio_norm = normalize_folio(folio)
    if not folio_norm:
        raise FacturaInvalida('Indica el folio de la factura.')

    token, err = _get_syscom_token()
    if err or not token:
        raise FacturaNoEncontrada('No se pudo autenticar con SYSCOM.')

    base = (
        getattr(settings, 'SYSCOM_API_BASE', '') or 'https://developers.syscom.mx/api/v1'
    ).rstrip('/')
    # Folios FA26/1405777 → path /facturas/FA26/1405777
    path = urllib.parse.quote(folio_norm, safe='/')
    url = f'{base}/facturas/{path}'

    try:
        response = _syscom_get(url, token, timeout_seconds=25, retries=0)
    except requests.RequestException:
        logger.exception('SYSCOM factura error folio=%s', folio_norm)
        raise FacturaNoEncontrada('No se pudo consultar la factura en SYSCOM.') from None

    if response.status_code == 404:
        raise FacturaNoEncontrada(f'No se encontró la factura {folio_norm} en SYSCOM.')
    if response.status_code >= 400:
        logger.warning('SYSCOM factura HTTP %s folio=%s', response.status_code, folio_norm)
        raise FacturaNoEncontrada(f'No se encontró la factura {folio_norm} en SYSCOM.')

    body = response.json()
    if not isinstance(body, dict):
        raise FacturaNoEncontrada(f'No se encontró la factura {folio_norm} en SYSCOM.')

    folio_oficial = normalize_folio(
        str(body.get('folio_factura') or body.get('folio') or folio_norm)
    )
    productos = body.get('productos')
    if not isinstance(productos, list):
        productos = []

    lineas: list[FacturaLinea] = []
    for raw in productos:
        mapped = _map_syscom_linea(raw)
        if mapped:
            lineas.append(mapped)

    if not lineas:
        raise FacturaInvalida(f'La factura {folio_oficial} no trae productos importables.')

    return FacturaDetalle(folio=folio_oficial or folio_norm, lineas=lineas)


def fetch_tvc_factura(folio: str) -> FacturaDetalle:
    """Reservado: la API pública de TVC no documenta facturas aún."""
    raise ProveedorNoSoportado(
        'La importación de facturas TVC aún no está disponible.'
    )


def fetch_factura(proveedor: str, folio: str) -> FacturaDetalle:
    origen = (proveedor or '').strip().lower()
    if origen == 'syscom':
        return fetch_syscom_factura(folio)
    if origen == 'tvc':
        return fetch_tvc_factura(folio)
    raise FacturaInvalida('Proveedor inválido. Usa syscom o tvc.')


def _buscar_item(proveedor: str, linea: FacturaLinea) -> InventarioItem | None:
    if linea.ref_externa:
        hallado = (
            InventarioItem.objects.select_for_update()
            .filter(fuente=proveedor, ref_externa=linea.ref_externa)
            .first()
        )
        if hallado:
            return hallado
    if linea.modelo:
        return (
            InventarioItem.objects.select_for_update()
            .filter(codigo_barras=linea.modelo)
            .first()
        )
    return None


def _aplicar_ficha(
    item: InventarioItem,
    linea: FacturaLinea,
    proveedor: str,
    *,
    creado: bool,
    folio: str,
    proveedor_cliente,
) -> None:
    """Rellena ficha (vacíos) y siempre sobrescribe última compra (folio/proveedor/precio)."""
    if creado or not item.nombre.strip():
        item.nombre = linea.nombre
    if creado or not item.marca.strip():
        item.marca = linea.marca
    if creado or not item.modelo.strip():
        item.modelo = linea.modelo
    if creado or not item.fuente or item.fuente == InventarioItem.Fuente.DESCONOCIDO:
        item.fuente = proveedor
    if creado or not item.ref_externa.strip():
        item.ref_externa = linea.ref_externa
    if creado or not item.imagen_url.strip():
        item.imagen_url = linea.imagen_url
    if (creado or not item.notas.strip()) and linea.caracteristicas:
        item.notas = linea.caracteristicas
    # Última compra: siempre la más reciente.
    item.folio_factura = folio
    item.proveedor = proveedor_cliente
    item.precio_unitario = linea.precio_unitario


def importar_factura(*, proveedor: str, folio: str, usuario) -> dict:
    """Importa la factura: crea/actualiza ítems, movimientos +N y registra la importación."""
    origen = (proveedor or '').strip().lower()
    folio_norm = normalize_folio(folio)
    if origen not in PROVEEDORES:
        raise FacturaInvalida('Proveedor inválido. Usa syscom o tvc.')
    if not folio_norm:
        raise FacturaInvalida('Indica el folio de la factura.')

    if InventarioImportacion.objects.filter(proveedor=origen, folio=folio_norm).exists():
        raise FacturaYaImportada(f'La factura {folio_norm} ya se importó.')

    detalle = fetch_factura(origen, folio_norm)
    folio_oficial = normalize_folio(detalle.folio) or folio_norm

    if InventarioImportacion.objects.filter(proveedor=origen, folio=folio_oficial).exists():
        raise FacturaYaImportada(f'La factura {folio_oficial} ya se importó.')

    creados = 0
    actualizados = 0
    items_afectados: list[InventarioItem] = []

    with transaction.atomic():
        # Doble check bajo lock de fila de importación (unique + IntegrityError).
        if InventarioImportacion.objects.filter(proveedor=origen, folio=folio_oficial).exists():
            raise FacturaYaImportada(f'La factura {folio_oficial} ya se importó.')

        proveedor_cliente = obtener_o_crear_proveedor(origen)

        for linea in detalle.lineas:
            item = _buscar_item(origen, linea)
            creado = item is None
            if creado:
                codigo = linea.modelo or f'{origen.upper()}:{linea.ref_externa}'
                item = InventarioItem(codigo_barras=codigo, cantidad=0)
                creados += 1
            else:
                actualizados += 1

            _aplicar_ficha(
                item,
                linea,
                origen,
                creado=creado,
                folio=folio_oficial,
                proveedor_cliente=proveedor_cliente,
            )
            item.cantidad += linea.cantidad
            try:
                item.save()
            except IntegrityError:
                # Carrera al crear el mismo modelo: reusa el existente.
                item = (
                    InventarioItem.objects.select_for_update()
                    .get(codigo_barras=linea.modelo or item.codigo_barras)
                )
                creado = False
                actualizados += 1
                if creados:
                    creados -= 1
                _aplicar_ficha(
                    item,
                    linea,
                    origen,
                    creado=False,
                    folio=folio_oficial,
                    proveedor_cliente=proveedor_cliente,
                )
                item.cantidad += linea.cantidad
                item.save()

            InventarioMovimiento.objects.create(
                item=item,
                tipo=InventarioMovimiento.Tipo.ENTRADA,
                cantidad=linea.cantidad,
                usuario=usuario,
                nota=f'Importación {origen.upper()} {folio_oficial}'[:255],
            )
            items_afectados.append(item)

        try:
            importacion = InventarioImportacion.objects.create(
                proveedor=origen,
                folio=folio_oficial,
                usuario=usuario,
            )
        except IntegrityError as exc:
            raise FacturaYaImportada(f'La factura {folio_oficial} ya se importó.') from exc

    return {
        'importacion_id': importacion.id,
        'proveedor': origen,
        'folio': folio_oficial,
        'creados': creados,
        'actualizados': actualizados,
        'movimientos': len(detalle.lineas),
        'items': items_afectados,
    }
