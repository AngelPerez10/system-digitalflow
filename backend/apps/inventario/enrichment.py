"""Best-effort SYSCOM/TVC lookup for new inventory items."""
from __future__ import annotations

import html
import logging
import re
import urllib.parse

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# La ficha de inventario muestra las características en un textarea; más allá de
# esto el operador ya no lee y el detalle de SYSCOM llega en HTML muy largo.
MAX_CARACTERISTICAS = 1500

_SALTO_RE = re.compile(r'</(?:li|p|div|tr|h[1-6])\s*>|<br\s*/?>', re.IGNORECASE)
_TAG_RE = re.compile(r'<[^>]+>')
# \xa0 viene de los &nbsp; de SYSCOM y no lo cubre \s en modo ASCII.
_BLANK_RE = re.compile(r'[^\S\n]+')


def _norm(value: str) -> str:
    return (value or '').strip().lower()


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
    return {
        'nombre': nombre,
        'marca': marca,
        'modelo': modelo,
        'fuente': fuente,
        'ref_externa': ref,
        'imagen_url': imagen,
        'caracteristicas': _extract_caracteristicas(raw),
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
