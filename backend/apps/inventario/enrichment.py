"""Best-effort SYSCOM/TVC lookup for new inventory items."""
from __future__ import annotations

import logging
import urllib.parse

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def _norm(value: str) -> str:
    return (value or '').strip().lower()


def _map_product(raw: dict, fuente: str) -> dict:
    ref = str(raw.get('producto_id') or raw.get('tvc_id') or '').strip()
    modelo = str(
        raw.get('modelo') or raw.get('sku') or raw.get('tvc_model') or raw.get('provider_model') or ''
    ).strip()
    nombre = str(raw.get('titulo') or raw.get('name') or modelo).strip()
    marca = str(raw.get('marca') or raw.get('brand') or '').strip()
    return {
        'nombre': nombre,
        'marca': marca,
        'modelo': modelo,
        'fuente': fuente,
        'ref_externa': ref,
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


def _search_syscom(codigo: str) -> dict | None:
    from apps.productos.syscom_views import (
        _clip_syscom_busqueda,
        _get_syscom_token,
        _syscom_get,
    )

    token, err = _get_syscom_token()
    if err or not token:
        return None

    base = (
        getattr(settings, 'SYSCOM_API_BASE', '') or 'https://developers.syscom.mx/api/v1'
    ).rstrip('/')
    busqueda = _clip_syscom_busqueda(codigo)
    if not busqueda:
        return None

    params = urllib.parse.urlencode({'busqueda': busqueda.replace(' ', '+')})
    url = f'{base}/productos?{params}'
    response = _syscom_get(url, token, timeout_seconds=15, retries=0)
    body = response.json()
    productos = body.get('productos') if isinstance(body, dict) else None
    if not isinstance(productos, list):
        return None
    return _pick_match(productos, codigo, 'syscom')


def _search_tvc(codigo: str) -> dict | None:
    from apps.productos.tvc_views import _get_tvc_token, _search_tvc_catalog

    token, err = _get_tvc_token()
    if err or not token:
        return None

    rows, _total, _page, _last = _search_tvc_catalog(
        token,
        codigo,
        page=1,
        per_page=10,
        categoria_id='',
        marca_id='',
    )
    return _pick_match(rows, codigo, 'tvc')


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
