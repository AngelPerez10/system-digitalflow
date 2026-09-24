"""Best-effort SYSCOM/TVC lookup for new inventory items."""
from __future__ import annotations

import html
import logging
import re
import threading
import urllib.parse
from datetime import timedelta
from decimal import Decimal, InvalidOperation
from time import monotonic

import requests
from django.conf import settings

from .secciones import map_producto_to_seccion

logger = logging.getLogger(__name__)

# La ficha de inventario muestra las características en un textarea; más allá de
# esto el operador ya no lee y el detalle de SYSCOM llega en HTML muy largo.
MAX_CARACTERISTICAS = 1500
IVA_MX = Decimal('1.16')

_SALTO_RE = re.compile(r'</(?:li|p|div|tr|h[1-6])\s*>|<br\s*/?>', re.IGNORECASE)
_TAG_RE = re.compile(r'<[^>]+>')
# \xa0 viene de los &nbsp; de SYSCOM y no lo cubre \s en modo ASCII.
_BLANK_RE = re.compile(r'[^\S\n]+')

# Tipo de cambio SYSCOM en caché por proceso, con caducidad: el precio de
# mercado debe reflejar los cambios del dólar sin pedirlo en cada producto.
_SYSCOM_TC_TTL_SECONDS = 60 * 60
_syscom_tc_cache: Decimal | None = None
_syscom_tc_cache_at: float = 0.0


def _norm(value: str) -> str:
    return (value or '').strip().lower()


def _as_decimal(value: object) -> Decimal | None:
    if value is None or value == '':
        return None
    try:
        numero = Decimal(str(value).strip())
    except (InvalidOperation, TypeError, ValueError):
        return None
    if numero < 0:
        return None
    return numero


def _get_syscom_tipo_cambio() -> Decimal | None:
    """Tipo de cambio 'normal' de SYSCOM (cache en proceso)."""
    global _syscom_tc_cache, _syscom_tc_cache_at
    if _syscom_tc_cache is not None and monotonic() - _syscom_tc_cache_at < _SYSCOM_TC_TTL_SECONDS:
        return _syscom_tc_cache
    from apps.productos.syscom_views import _get_syscom_token, _syscom_get

    token, err = _get_syscom_token()
    if err or not token:
        return None
    base = (
        getattr(settings, 'SYSCOM_API_BASE', '') or 'https://developers.syscom.mx/api/v1'
    ).rstrip('/')
    try:
        response = _syscom_get(f'{base}/tipocambio', token, timeout_seconds=10, retries=0)
        body = response.json()
    except Exception:
        logger.exception('Inventario: no se pudo leer tipocambio SYSCOM')
        return None
    if not isinstance(body, dict):
        return None
    tc = _as_decimal(body.get('normal') or body.get('preferencial'))
    if tc is None or tc <= 0:
        return None
    _syscom_tc_cache = tc
    _syscom_tc_cache_at = monotonic()
    return tc


def _usd_precios_candidatos(raw: dict) -> list[Decimal]:
    """Montos USD positivos de lista / especial / descuento (y aliases TVC)."""
    precios = raw.get('precios') if isinstance(raw.get('precios'), dict) else {}
    candidatos: list[Decimal] = []
    for clave in (
        'precio_lista',
        'precio_especial',
        'precio_descuento',
        'precio_1',
    ):
        valor = _as_decimal(precios.get(clave))
        if valor is not None and valor > 0:
            candidatos.append(valor)
    for clave in ('list_price', 'distributor_price'):
        valor = _as_decimal(raw.get(clave))
        if valor is not None and valor > 0:
            candidatos.append(valor)
    return candidatos


def _extract_precio_unitario(raw: dict, fuente: str) -> Decimal | None:
    """Precio de costo sugerido en MXN: el más bajo entre los tiers del proveedor."""
    origen = (fuente or '').strip().lower()
    precios = raw.get('precios') if isinstance(raw.get('precios'), dict) else {}
    usd_vals = _usd_precios_candidatos(raw)
    usd_min = min(usd_vals) if usd_vals else None

    if origen == 'syscom':
        if usd_min is None:
            directo = _as_decimal(raw.get('precio_mxn') or raw.get('precio_unitario'))
            if directo is not None and directo > 0:
                return directo.quantize(Decimal('0.01'))
            return None
        tc = _get_syscom_tipo_cambio()
        if tc is None:
            return None
        return (usd_min * tc * IVA_MX).quantize(Decimal('0.01'))

    if origen == 'tvc':
        # El mapeo TVC suele poner precio_mxn desde list_price; escalamos al USD mínimo.
        directo = _as_decimal(raw.get('precio_mxn') or raw.get('precio_unitario'))
        lista = _as_decimal(precios.get('precio_lista') or raw.get('list_price'))
        if (
            directo is not None
            and directo > 0
            and usd_min is not None
            and lista is not None
            and lista > 0
            and usd_min < lista
        ):
            return (directo * usd_min / lista).quantize(Decimal('0.01'))
        if directo is not None and directo > 0:
            return directo.quantize(Decimal('0.01'))
        return None

    directo = _as_decimal(raw.get('precio_mxn') or raw.get('precio_unitario'))
    if directo is not None and directo > 0:
        return directo.quantize(Decimal('0.01'))
    return None


def _extract_precio_lista(raw: dict, fuente: str) -> Decimal | None:
    """Precio de venta (lista del proveedor) en MXN con IVA.

    SYSCOM publica en USD: `precio_lista` (si falta, especial y luego
    descuento) × tipo de cambio × IVA. TVC ya trae `precio_mxn` desde su
    `list_price`.
    """
    origen = (fuente or '').strip().lower()
    precios = raw.get('precios') if isinstance(raw.get('precios'), dict) else {}

    if origen == 'syscom':
        usd = None
        for clave in ('precio_lista', 'precio_especial', 'precio_descuento'):
            valor = _as_decimal(precios.get(clave))
            if valor is not None and valor > 0:
                usd = valor
                break
        if usd is None:
            directo = _as_decimal(raw.get('precio_mxn'))
            return directo.quantize(Decimal('0.01')) if directo and directo > 0 else None
        tc = _get_syscom_tipo_cambio()
        if tc is None:
            return None
        return (usd * tc * IVA_MX).quantize(Decimal('0.01'))

    directo = _as_decimal(raw.get('precio_mxn'))
    if directo is not None and directo > 0:
        return directo.quantize(Decimal('0.01'))
    lista = _as_decimal(precios.get('precio_lista') or raw.get('list_price'))
    return lista.quantize(Decimal('0.01')) if lista and lista > 0 else None


def _plain_text(value: object) -> str:
    """Convierte a texto plano: SYSCOM devuelve la descripción en HTML."""
    texto = _SALTO_RE.sub('\n', str(value or ''))
    texto = _TAG_RE.sub(' ', texto)
    texto = html.unescape(texto).replace('\xa0', ' ')
    lineas = [_BLANK_RE.sub(' ', linea).strip() for linea in texto.splitlines()]
    return '\n'.join(linea for linea in lineas if linea).strip()


def _extract_caracteristicas(raw: dict) -> str:
    """Texto de características para volcarlo en las notas del ítem.

    SYSCOM manda `caracteristicas` (lista) en el detalle y `descripcion` en HTML;
    TVC no expone descripción, así que solo quedan sus etiquetas.
    """
    crudas = raw.get('caracteristicas')
    if isinstance(crudas, list):
        lineas = [_plain_text(c) for c in crudas]
        texto = '\n'.join(linea for linea in lineas if linea)
        if texto:
            return texto[:MAX_CARACTERISTICAS].strip()

    for clave in ('descripcion', 'description'):
        texto = _plain_text(raw.get(clave))
        if texto:
            return texto[:MAX_CARACTERISTICAS].strip()

    etiquetas = raw.get('hash_tags')
    if isinstance(etiquetas, list):
        texto = ' · '.join(t for t in (_plain_text(e) for e in etiquetas) if t)
        if texto:
            return texto[:MAX_CARACTERISTICAS].strip()

    return ''


def _map_product(raw: dict, fuente: str) -> dict:
    ref = str(raw.get('producto_id') or raw.get('tvc_id') or '').strip()
    modelo = str(
        raw.get('modelo') or raw.get('sku') or raw.get('tvc_model') or raw.get('provider_model') or ''
    ).strip()
    nombre = str(raw.get('titulo') or raw.get('name') or modelo).strip()
    marca = str(raw.get('marca') or raw.get('brand') or '').strip()
    imagen = str(raw.get('img_portada') or raw.get('imagen') or '').strip()
    if not imagen.startswith(('http://', 'https://')):
        imagen = ''
    precio = _extract_precio_unitario(raw, fuente)
    lista = _extract_precio_lista(raw, fuente)
    seccion = map_producto_to_seccion(raw)
    return {
        'nombre': nombre,
        'marca': marca,
        'modelo': modelo,
        'fuente': fuente,
        'ref_externa': ref,
        'imagen_url': imagen,
        'caracteristicas': _extract_caracteristicas(raw),
        # String para JSON estable en /catalogo/; el scan lo convierte a Decimal.
        'precio_unitario': format(precio, 'f') if precio is not None else None,
        # Precio de venta (lista del proveedor): alimenta `precio_mercado` del ítem.
        'precio_lista': format(lista, 'f') if lista is not None else None,
        'seccion': seccion,
    }


def _pick_match(productos: list[dict], codigo: str, fuente: str) -> dict | None:
    if not productos:
        return None

    codigo_norm = _norm(codigo)
    exact: list[dict] = []
    for producto in productos:
        if not isinstance(producto, dict):
            continue
        modelo = _norm(str(producto.get('modelo') or ''))
        sku = _norm(str(producto.get('sku') or producto.get('tvc_model') or ''))
        provider = _norm(str(producto.get('provider_model') or ''))
        if codigo_norm and codigo_norm in {modelo, sku, provider}:
            exact.append(producto)

    if len(exact) == 1:
        return _map_product(exact[0], fuente)
    if len(exact) > 1:
        return None
    if len(productos) == 1 and isinstance(productos[0], dict):
        return _map_product(productos[0], fuente)
    return None


def _fetch_syscom(termino: str, per_page: int = 10) -> list[dict]:
    from apps.productos.syscom_views import (
        _clip_syscom_busqueda,
        _get_syscom_token,
        _syscom_get,
    )

    token, err = _get_syscom_token()
    if err or not token:
        return []

    base = (
        getattr(settings, 'SYSCOM_API_BASE', '') or 'https://developers.syscom.mx/api/v1'
    ).rstrip('/')
    busqueda = _clip_syscom_busqueda(termino)
    if not busqueda:
        return []

    params = urllib.parse.urlencode({'busqueda': busqueda.replace(' ', '+')})
    url = f'{base}/productos?{params}'
    response = _syscom_get(url, token, timeout_seconds=15, retries=0)
    body = response.json()
    productos = body.get('productos') if isinstance(body, dict) else None
    if not isinstance(productos, list):
        return []
    return [p for p in productos[:per_page] if isinstance(p, dict)]


def _fetch_tvc(termino: str, per_page: int = 10) -> list[dict]:
    from apps.productos.tvc_views import _get_tvc_token, _search_tvc_catalog

    token, err = _get_tvc_token()
    if err or not token:
        return []

    rows, _total, _page, _last = _search_tvc_catalog(
        token,
        termino,
        page=1,
        per_page=per_page,
        categoria_id='',
        marca_id='',
    )
    return [r for r in rows if isinstance(r, dict)]


def _fetch_syscom_detalle(producto_id: str) -> dict | None:
    """Detalle por `producto_id`; SYSCOM devuelve 422 si se le pasa un modelo."""
    from apps.productos.syscom_views import _get_syscom_token, _syscom_get

    ref = (producto_id or '').strip()
    if not ref:
        return None

    token, err = _get_syscom_token()
    if err or not token:
        return None

    base = (
        getattr(settings, 'SYSCOM_API_BASE', '') or 'https://developers.syscom.mx/api/v1'
    ).rstrip('/')
    pid = urllib.parse.quote(ref, safe='')
    response = _syscom_get(f'{base}/productos/{pid}', token, timeout_seconds=15, retries=0)
    body = response.json()
    return body if isinstance(body, dict) else None


def fetch_catalog_detail(fuente: str, ref_externa: str, modelo: str = '') -> dict | None:
    """Relee el catálogo de un ítem ya vinculado (p. ej. para recuperar su foto).

    Los ítems vinculados antes de que existiera `imagen_url` quedaron sin foto, y
    volver a buscarlos a mano es tedioso; con `fuente` + `ref_externa` guardados
    se puede resolver el producto exacto sin intervención del operador.
    """
    origen = (fuente or '').strip().lower()
    ref = (ref_externa or '').strip()
    termino = (modelo or '').strip()

    try:
        if origen == 'syscom':
            raw = _fetch_syscom_detalle(ref)
            if raw:
                return _map_product(raw, 'syscom')
            if termino:
                return _pick_match(_fetch_syscom(termino), termino, 'syscom')
            return None

        if origen == 'tvc':
            if not termino:
                return None
            filas = _fetch_tvc(termino)
            if ref:
                for fila in filas:
                    if str(fila.get('tvc_id') or '').strip() == ref:
                        return _map_product(fila, 'tvc')
            return _pick_match(filas, termino, 'tvc')
    except requests.RequestException:
        logger.exception('Inventario detalle %s error para ref=%s', origen, ref)
    except Exception:
        logger.exception('Inventario detalle %s error inesperado para ref=%s', origen, ref)

    return None


def _search_syscom(codigo: str) -> dict | None:
    return _pick_match(_fetch_syscom(codigo), codigo, 'syscom')


def _search_tvc(codigo: str) -> dict | None:
    return _pick_match(_fetch_tvc(codigo), codigo, 'tvc')


def enrich_from_catalogs(codigo: str) -> dict | None:
    """Intenta SYSCOM luego TVC; nunca lanza hacia el caller."""
    code = (codigo or '').strip()
    if not code:
        return None

    try:
        match = _search_syscom(code)
        if match:
            return match
    except requests.RequestException:
        logger.exception('Inventario enrichment SYSCOM error for codigo=%s', code)
    except Exception:
        logger.exception('Inventario enrichment SYSCOM unexpected error for codigo=%s', code)

    try:
        return _search_tvc(code)
    except requests.RequestException:
        logger.exception('Inventario enrichment TVC error for codigo=%s', code)
    except Exception:
        logger.exception('Inventario enrichment TVC unexpected error for codigo=%s', code)

    return None


def search_catalogs(termino: str, limit: int = 10) -> list[dict]:
    """Candidatos de SYSCOM y TVC para vincular a mano un código de barras.

    SYSCOM y TVC solo indexan su propio modelo/SKU, nunca el EAN impreso en la
    caja, así que el operador busca por nombre o modelo y elige el producto.
    """
    term = (termino or '').strip()
    if not term:
        return []

    candidatos: list[dict] = []
    for fuente, fetch in (('syscom', _fetch_syscom), ('tvc', _fetch_tvc)):
        try:
            for raw in fetch(term, per_page=limit):
                mapped = _map_product(raw, fuente)
                if mapped['nombre'] or mapped['modelo']:
                    candidatos.append(mapped)
        except requests.RequestException:
            logger.exception('Inventario búsqueda %s error para termino=%s', fuente, term)
        except Exception:
            logger.exception(
                'Inventario búsqueda %s error inesperado para termino=%s', fuente, term
            )

    return candidatos[: limit * 2]


def aplicar_seccion_desde_catalogo(item) -> str:
    """Rellena `item.seccion` desde SYSCOM/TVC si está vacía. Devuelve el slug aplicado.

    Prioridad: detalle por vínculo (fuente+ref) → búsqueda por modelo/código.
    Persiste solo si obtiene una sección válida.
    """
    if getattr(item, 'seccion', None):
        return ''

    detalle = None
    fuente = (getattr(item, 'fuente', '') or '').strip().lower()
    ref = (getattr(item, 'ref_externa', '') or '').strip()
    modelo = (getattr(item, 'modelo', '') or '').strip()
    codigo = (getattr(item, 'codigo_barras', '') or '').strip()

    if fuente in {'syscom', 'tvc'} and (ref or modelo):
        detalle = fetch_catalog_detail(fuente, ref, modelo)

    # Si el detalle existe pero no trae sección (p. ej. búsqueda sin categorías),
    # intentar match por modelo/código.
    if not (detalle and detalle.get('seccion')):
        for termino in (modelo, codigo):
            if not termino:
                continue
            candidato = enrich_from_catalogs(termino)
            if candidato and candidato.get('seccion'):
                detalle = candidato
                break

    seccion = (detalle or {}).get('seccion') or ''
    if not seccion:
        return ''

    item.seccion = seccion
    # Si aún no había vínculo y el match lo trajo, conviene guardarlo para la próxima.
    if fuente in {'', 'desconocido'} and detalle:
        nueva_fuente = (detalle.get('fuente') or '').strip().lower()
        nueva_ref = (detalle.get('ref_externa') or '').strip()
        if nueva_fuente in {'syscom', 'tvc'} and nueva_ref:
            item.fuente = nueva_fuente
            item.ref_externa = nueva_ref
            if not modelo and detalle.get('modelo'):
                item.modelo = str(detalle['modelo'])[:120]
    update_fields = ['seccion', 'fecha_actualizacion']
    if item.fuente != fuente:
        update_fields.append('fuente')
    if item.ref_externa != ref:
        update_fields.append('ref_externa')
    if modelo != (getattr(item, 'modelo', '') or '').strip():
        update_fields.append('modelo')
    item.save(update_fields=update_fields)
    return seccion


def sincronizar_secciones_pendientes(limit: int = 40) -> dict:
    """Backfill de secciones vacías consultando el catálogo."""
    from .models import InventarioItem

    limite = max(1, min(int(limit or 40), 100))
    pendientes = list(
        InventarioItem.objects.filter(seccion='')
        .order_by('-fecha_actualizacion')[:limite]
    )
    actualizados = 0
    revisados = 0
    for item in pendientes:
        revisados += 1
        if aplicar_seccion_desde_catalogo(item):
            actualizados += 1
    return {
        'revisados': revisados,
        'actualizados': actualizados,
        'pendientes_restantes': InventarioItem.objects.filter(seccion='').count(),
    }


# ---------------------------------------------------------------------------
# Precio de mercado (SYSCOM / TVC)
# ---------------------------------------------------------------------------

PRECIO_MERCADO_MAX_EDAD = timedelta(hours=3)
# Si el proveedor no respondió, se reintenta pronto en vez de esperar la edad completa.
PRECIO_MERCADO_REINTENTO = timedelta(minutes=30)
# Consultas simultáneas al proveedor por lote (red, no base de datos).
_PRECIO_WORKERS = 6

_SIN_RESPUESTA = object()


def _consultar_precio_lista(fuente: str, ref: str, modelo: str):
    """Precio de lista del proveedor, None si no publica, `_SIN_RESPUESTA` si no respondió.

    Solo red: se puede llamar desde hilos (no toca la base de datos).
    """
    from django.db import connections

    try:
        detalle = fetch_catalog_detail(fuente, ref, modelo)
    except Exception:  # fetch_catalog_detail ya registra; defensa extra en hilos
        logger.exception('Precio de lista %s ref=%s', fuente, ref)
        return _SIN_RESPUESTA
    finally:
        # En hilos del lote: no dejar conexiones abiertas si algo tocó la BD.
        if threading.current_thread() is not threading.main_thread():
            connections.close_all()
    if detalle is None:
        return _SIN_RESPUESTA
    precio = _as_decimal(detalle.get('precio_lista'))
    if precio is None or precio <= 0:
        return None
    return precio.quantize(Decimal('0.01'))


def _datos_consulta(item) -> tuple[str, str, str] | None:
    fuente = (getattr(item, 'fuente', '') or '').strip().lower()
    ref = (getattr(item, 'ref_externa', '') or '').strip()
    modelo = (getattr(item, 'modelo', '') or '').strip() or (getattr(item, 'codigo_barras', '') or '').strip()
    if fuente not in {'syscom', 'tvc'} or not (ref or modelo):
        return None
    return fuente, ref, modelo


def _guardar_precio(item, resultado) -> bool:
    """Persiste el resultado de la consulta. Devuelve True si el precio cambió."""
    from django.utils import timezone

    ahora = timezone.now()
    if resultado is _SIN_RESPUESTA:
        # Reintento en ~30 min: se registra como si se hubiera revisado hace
        # (edad máxima − reintento).
        item.precio_mercado_actualizado = ahora - (PRECIO_MERCADO_MAX_EDAD - PRECIO_MERCADO_REINTENTO)
        item.save(update_fields=['precio_mercado_actualizado'])
        return False
    if resultado is None:
        # El proveedor no publica precio de lista: revisado, sin precio.
        item.precio_mercado_actualizado = ahora
        item.save(update_fields=['precio_mercado_actualizado'])
        return False

    cambio = item.precio_mercado != resultado
    campos = ['precio_mercado_actualizado']
    if cambio:
        if item.precio_mercado is not None:
            item.precio_mercado_anterior = item.precio_mercado
            campos.append('precio_mercado_anterior')
        item.precio_mercado = resultado
        campos.append('precio_mercado')
    item.precio_mercado_actualizado = ahora
    item.save(update_fields=campos)
    return cambio


def actualizar_precio_mercado(item) -> bool:
    """Consulta el precio de venta actual (lista del proveedor) y lo guarda en el ítem.

    `precio_mercado` guarda el precio de lista en MXN con IVA. Si cambia,
    el valor previo queda en `precio_mercado_anterior` para mostrar si subió o
    bajó. Devuelve True si el precio cambió. Nunca lanza hacia el caller.
    """
    datos = _datos_consulta(item)
    if datos is None:
        return False
    return _guardar_precio(item, _consultar_precio_lista(*datos))


def sincronizar_precios_mercado(limit: int = 6, ids: list[int] | None = None) -> dict:
    """Refresca el precio de venta de los ítems de proveedor más desactualizados.

    - Solo toca los no revisados en `PRECIO_MERCADO_MAX_EDAD`.
    - `ids` (p. ej. los visibles en pantalla) van primero.
    - Las consultas al proveedor corren en paralelo; las escrituras, en este hilo.

    Devuelve también los valores nuevos de cada ítem revisado para que la
    pantalla los pinte sin recargar la lista.
    """
    from concurrent.futures import ThreadPoolExecutor

    from django.db.models import F, Q
    from django.utils import timezone

    from .models import InventarioItem

    limite = max(1, min(int(limit or 6), 30))
    corte = timezone.now() - PRECIO_MERCADO_MAX_EDAD
    vencidos = InventarioItem.objects.filter(fuente__in=['syscom', 'tvc']).filter(
        Q(precio_mercado_actualizado__isnull=True) | Q(precio_mercado_actualizado__lt=corte)
    )
    orden = F('precio_mercado_actualizado').asc(nulls_first=True)

    lote: list = []
    if ids:
        lote = list(vencidos.filter(id__in=ids).order_by(orden)[:limite])
    if len(lote) < limite:
        ya = [i.id for i in lote]
        lote += list(vencidos.exclude(id__in=ya).order_by(orden)[: limite - len(lote)])

    consultas = [(item, _datos_consulta(item)) for item in lote]
    con_datos = [(item, datos) for item, datos in consultas if datos is not None]
    resultados: dict[int, object] = {}
    if con_datos:
        with ThreadPoolExecutor(max_workers=min(_PRECIO_WORKERS, len(con_datos))) as pool:
            futuros = {item.id: pool.submit(_consultar_precio_lista, *datos) for item, datos in con_datos}
        resultados = {item_id: futuro.result() for item_id, futuro in futuros.items()}

    actualizados = 0
    items = []
    for item, datos in consultas:
        # Sin datos para consultar: se marca revisado para no volver a pedirlo.
        resultado = resultados.get(item.id) if datos is not None else None
        if _guardar_precio(item, resultado):
            actualizados += 1
        items.append(
            {
                'id': item.id,
                'precio_mercado': None if item.precio_mercado is None else format(item.precio_mercado, 'f'),
                'precio_mercado_anterior': (
                    None if item.precio_mercado_anterior is None else format(item.precio_mercado_anterior, 'f')
                ),
                'precio_mercado_actualizado': item.precio_mercado_actualizado.isoformat()
                if item.precio_mercado_actualizado
                else None,
            }
        )
    return {
        'revisados': len(lote),
        'actualizados': actualizados,
        'pendientes_restantes': vencidos.count(),
        'items': items,
    }
