"""
Proxy para API TVC (proveedor mayorista tvc.mx).
Autenticación: Bearer JWT estático (TVC_API_TOKEN) con vigencia ~1 año.

Documentación: https://api.tvc.mx/doc-site/index.html
"""
from __future__ import annotations

import logging
import re
import threading
import time
import urllib.parse
from concurrent.futures import ThreadPoolExecutor

import requests
from django.conf import settings
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.permissions import ModulePermission, user_has_any_cotizaciones_access

logger = logging.getLogger(__name__)

TVC_BUSQUEDA_MAX_CHARS = 120
_TVC_ID_PREFIX = 'tvc:'


def _clip_busqueda(s: str) -> str:
    t = ' '.join((s or '').strip().split())
    if len(t) <= TVC_BUSQUEDA_MAX_CHARS:
        return t
    cut = t[:TVC_BUSQUEDA_MAX_CHARS]
    sp = cut.rfind(' ')
    if sp > TVC_BUSQUEDA_MAX_CHARS // 2:
        return cut[:sp].strip()
    return cut.strip()


def _safe_error_text(exc: requests.RequestException, default_msg: str) -> str:
    if isinstance(exc, requests.Timeout):
        return f'{default_msg} (timeout con TVC).'
    if isinstance(exc, requests.ConnectionError):
        return f'{default_msg} (error de conexión con TVC).'
    return default_msg


def _get_tvc_token() -> tuple[str | None, str | None]:
    token = (getattr(settings, 'TVC_API_TOKEN', '') or '').strip()
    if not token or getattr(settings, 'DEBUG', False):
        from config.settings import get_env_from_dotenv

        file_token = get_env_from_dotenv('TVC_API_TOKEN').strip()
        if file_token:
            token = file_token
    if not token:
        return None, 'TVC_API_TOKEN debe estar configurado en el entorno.'
    return token, None


def _tvc_base_url() -> str:
    return (getattr(settings, 'TVC_API_BASE', '') or 'https://api.tvc.mx').rstrip('/')


def _tvc_media_base() -> str:
    return (getattr(settings, 'TVC_MEDIA_BASE', '') or 'https://cdn.tvc.mx').rstrip('/')


def _tvc_get(path: str, token: str, params: dict | list | None = None, timeout_seconds: int = 25):
    base = _tvc_base_url()
    clean = path.lstrip('/')
    url = f'{base}/{clean}'
    if params:
        url += '?' + urllib.parse.urlencode(params, doseq=True)
    r = requests.get(
        url,
        headers={
            'Authorization': f'Bearer {token}',
            'Accept': 'application/json',
        },
        timeout=timeout_seconds,
    )
    r.raise_for_status()
    return r


def _as_number(value) -> float | None:
    if value is None:
        return None
    try:
        n = float(value)
    except (TypeError, ValueError):
        return None
    return n if n == n else None  # NaN guard


IVA_MX = 1.16

# Cache en memoria del tipo de cambio TVC (para calcular precio_mxn).
_TVC_RATE_TTL_SECONDS = 15 * 60
_tvc_rate_lock = threading.Lock()
_tvc_rate_cache: dict = {'rate': None, 'ts': 0.0}


def _extract_rate(body) -> float | None:
    if isinstance(body, (int, float)):
        return float(body)
    if isinstance(body, dict):
        for key in ('tipo_cambio', 'exchange_rate', 'rate', 'valor', 'data', 'value'):
            n = _as_number(body.get(key))
            if n:
                return n
        for v in body.values():
            n = _as_number(v)
            if n:
                return n
    return None


def _get_tvc_exchange_rate(token: str) -> float | None:
    now = time.monotonic()
    with _tvc_rate_lock:
        cached = _tvc_rate_cache['rate']
        if cached and now - _tvc_rate_cache['ts'] < _TVC_RATE_TTL_SECONDS:
            return cached
        try:
            r = _tvc_get('exchange-rates', token, timeout_seconds=10)
            rate = _extract_rate(r.json())
        except requests.RequestException:
            logger.warning('TVC exchange rate request failed; usando cache previo')
            return cached
        if rate:
            _tvc_rate_cache['rate'] = rate
            _tvc_rate_cache['ts'] = now
        return rate or cached


def _abs_media_url(path: str) -> str:
    s = (path or '').strip()
    if not s:
        return ''
    if s.startswith('http://') or s.startswith('https://'):
        return s
    base = _tvc_media_base()
    return f'{base}/{s.lstrip("/")}'


def _map_tvc_product(raw: dict, exchange_rate: float | None = None) -> dict:
    """Normaliza un producto TVC al shape SyscomProducto usado en el frontend."""
    tvc_id = raw.get('tvc_id')
    tvc_model = str(raw.get('tvc_model') or '').strip()
    provider_model = str(raw.get('provider_model') or '').strip()
    brand = str(raw.get('brand') or '').strip()
    name = str(raw.get('name') or '').strip()
    media = raw.get('media') if isinstance(raw.get('media'), dict) else {}
    main_image = _abs_media_url(str(media.get('main_image') or ''))

    # TVC entrega precios en USD: list_price (precio de lista) y
    # distributor_price (precio de distribuidor). El frontend convierte
    # precio_lista USD -> MXN con tipo de cambio TVC + IVA.
    distributor = _as_number(raw.get('distributor_price'))
    list_price = _as_number(raw.get('list_price'))

    stock_raw = raw.get('total_inventories')
    try:
        stock = int(float(stock_raw)) if stock_raw is not None and str(stock_raw).strip() != '' else 0
    except (TypeError, ValueError):
        stock = 0

    producto_id = f'{_TVC_ID_PREFIX}{tvc_id}' if tvc_id is not None else ''
    estado_inv = 'con_existencia' if stock > 0 else 'sin_existencia'

    # Precio de lista en MXN con IVA (list_price USD × TC TVC × 1.16).
    # Si no hay precio de lista, usar el de distribuidor como respaldo.
    precio_mxn = None
    usd_base = list_price if list_price is not None else distributor
    if usd_base is not None and exchange_rate:
        precio_mxn = round(usd_base * exchange_rate * IVA_MX, 2)

    link_model = tvc_model or provider_model
    link = f'https://www.tvcenlinea.com/buscar?q={urllib.parse.quote(link_model)}' if link_model else 'https://www.tvcenlinea.com/'

    return {
        'producto_id': producto_id,
        'modelo': tvc_model or provider_model,
        'sku': tvc_model or provider_model,
        'total_existencia': stock,
        'titulo': name or tvc_model or provider_model,
        'marca': brand,
        'fuente': 'tvc',
        'estado': str(raw.get('stage_name') or 'activo'),
        'estado_inventario': estado_inv,
        'precio_mxn': precio_mxn,
        'sat_key': str(raw.get('sat_key') or ''),
        'img_portada': main_image,
        'link': link,
        'precios': {
            'precio_lista': list_price,
            'precio_especial': None,
            'precio_descuento': distributor,
        },
        'tvc_id': tvc_id,
        'tvc_model': tvc_model,
        'provider_model': provider_model,
        'category_id': raw.get('category_id'),
        'brand_id': raw.get('brand_id'),
        'hash_tags': raw.get('hash_tags') if isinstance(raw.get('hash_tags'), list) else [],
    }


def _parse_tvc_list_payload(body, exchange_rate: float | None = None) -> tuple[list[dict], dict]:
    if isinstance(body, list):
        return [_map_tvc_product(x, exchange_rate) for x in body if isinstance(x, dict)], {}
    if not isinstance(body, dict):
        return [], {}
    data = body.get('data')
    rows = [_map_tvc_product(x, exchange_rate) for x in data] if isinstance(data, list) else []
    meta = body.get('meta') if isinstance(body.get('meta'), dict) else {}
    return rows, meta


def _parse_tvc_detail_payload(body, exchange_rate: float | None = None) -> dict | None:
    if isinstance(body, dict) and body.get('data') and isinstance(body['data'], dict):
        return _map_tvc_product(body['data'], exchange_rate)
    if isinstance(body, dict) and body.get('tvc_id') is not None:
        return _map_tvc_product(body, exchange_rate)
    return None


# ---------------------------------------------------------------------------
# Índice en memoria del catálogo TVC.
# La API de TVC solo permite buscar por clave TVC exacta (tvcModels[]) o id
# (tvcIds[]); no hay búsqueda por texto ni por modelo del fabricante
# (provider_model, p. ej. "DH-IPC-B1E40"). Para soportar esas búsquedas se
# descarga el catálogo completo (~5k productos, ligero: sin precios/medios)
# y se cachea en memoria con TTL.
# ---------------------------------------------------------------------------
_TVC_INDEX_TTL_SECONDS = 15 * 60
_tvc_index_lock = threading.Lock()
_tvc_index: dict = {'rows': [], 'ts': 0.0}

_INDEX_FIELDS = (
    'tvc_id',
    'tvc_model',
    'provider_model',
    'name',
    'brand',
    'brand_id',
    'category_id',
    'hash_tags',
)


def _fetch_index_page(token: str, page: int) -> tuple[list[dict], dict]:
    r = _tvc_get('products', token, [('perPage', '100'), ('page', str(page))])
    body = r.json()
    data = body.get('data') if isinstance(body, dict) else body
    meta = body.get('meta') if isinstance(body, dict) and isinstance(body.get('meta'), dict) else {}
    rows = []
    for item in data or []:
        if isinstance(item, dict) and item.get('tvc_id') is not None:
            rows.append({k: item.get(k) for k in _INDEX_FIELDS})
    return rows, meta


def _get_tvc_index(token: str) -> list[dict]:
    """Regresa el índice cacheado; lo (re)construye si expiró."""
    now = time.monotonic()
    with _tvc_index_lock:
        if _tvc_index['rows'] and now - _tvc_index['ts'] < _TVC_INDEX_TTL_SECONDS:
            return _tvc_index['rows']

        first_rows, meta = _fetch_index_page(token, 1)
        last_page = int(meta.get('last_page') or 1)
        all_rows = list(first_rows)
        if last_page > 1:
            with ThreadPoolExecutor(max_workers=8) as ex:
                for rows, _m in ex.map(
                    lambda p: _fetch_index_page(token, p), range(2, last_page + 1)
                ):
                    all_rows.extend(rows)
        _tvc_index['rows'] = all_rows
        _tvc_index['ts'] = time.monotonic()
        return all_rows


_NORM_RE = re.compile(r'[^a-z0-9]+')


def _norm_key(s: str) -> str:
    return _NORM_RE.sub('', str(s or '').lower())


def _index_row_score(row: dict, needle: str, needle_key: str) -> int:
    """Puntaje de relevancia: 0 = sin match; mayor = mejor."""
    provider = _norm_key(row.get('provider_model'))
    tvc_model = _norm_key(row.get('tvc_model'))
    name = str(row.get('name') or '').lower()
    brand = str(row.get('brand') or '').lower()
    tags = ' '.join(str(t) for t in (row.get('hash_tags') or [])).lower()

    if needle_key and (provider == needle_key or tvc_model == needle_key):
        return 100
    if needle_key and (provider.startswith(needle_key) or tvc_model.startswith(needle_key)):
        return 80
    if needle_key and (needle_key in provider or needle_key in tvc_model):
        return 60
    if needle and needle in name:
        return 40
    if needle_key and needle_key in _norm_key(name):
        return 30
    if needle and (needle in brand or needle in tags):
        return 20
    return 0


def _search_tvc_index(
    token: str, busqueda: str, categoria_id: str, marca_id: str, limit: int = 100
) -> list[int]:
    """Busca en el índice y regresa tvc_ids ordenados por relevancia."""
    needle = ' '.join(busqueda.strip().lower().split())
    needle_key = _norm_key(busqueda)
    if not needle and not categoria_id and not marca_id:
        return []
    scored: list[tuple[int, int]] = []
    for row in _get_tvc_index(token):
        if categoria_id and str(row.get('category_id') or '') != str(categoria_id):
            continue
        if marca_id and str(row.get('brand_id') or '') != str(marca_id):
            continue
        if needle:
            score = _index_row_score(row, needle, needle_key)
            if score <= 0:
                continue
        else:
            score = 1
        scored.append((score, int(row['tvc_id'])))
    scored.sort(key=lambda t: -t[0])
    return [tid for _s, tid in scored[:limit]]


def _busqueda_variants(busqueda: str) -> list[str]:
    raw = _clip_busqueda(busqueda)
    if len(raw) < 2:
        return []
    out: list[str] = []
    seen: set[str] = set()

    def add(v: str) -> None:
        t = v.strip()
        if len(t) < 2 or t in seen:
            return
        seen.add(t)
        out.append(t)

    add(raw)
    if '/' in raw:
        add(raw.replace('/', ' ').strip())
        add(raw.replace('/', '-').strip())
        pre = raw.split('/')[0].strip()
        if len(pre) >= 4:
            add(pre)
    if ' ' in raw:
        add(raw.split()[0])
    return out[:8]


def _product_matches_filter(row: dict, needle: str, categoria_id: str, marca_id: str) -> bool:
    if categoria_id and str(row.get('category_id') or '') != str(categoria_id):
        return False
    if marca_id and str(row.get('brand_id') or '') != str(marca_id):
        return False
    if not needle:
        return True
    q = needle.lower()
    haystack = ' '.join(
        [
            str(row.get('titulo') or ''),
            str(row.get('modelo') or ''),
            str(row.get('sku') or ''),
            str(row.get('marca') or ''),
            ' '.join(str(t) for t in (row.get('hash_tags') or [])),
        ]
    ).lower()
    return q in haystack


def _fetch_tvc_products(
    token: str,
    *,
    page: int = 1,
    per_page: int = 50,
    tvc_models: list[str] | None = None,
    tvc_ids: list[int] | None = None,
) -> tuple[list[dict], dict]:
    params: list[tuple[str, str]] = [
        ('page', str(max(1, page))),
        ('perPage', str(min(100, max(1, per_page)))),
        ('withPrice', 'true'),
        ('withInventory', 'simple'),
        ('withMedia', 'true'),
    ]
    for mid in tvc_ids or []:
        params.append(('tvcIds[]', str(mid)))
    for model in tvc_models or []:
        m = str(model or '').strip()
        if m:
            params.append(('tvcModels[]', m))

    r = _tvc_get('products', token, params)
    return _parse_tvc_list_payload(r.json(), _get_tvc_exchange_rate(token))


def _search_tvc_catalog(
    token: str,
    busqueda: str,
    page: int,
    per_page: int,
    categoria_id: str,
    marca_id: str,
) -> tuple[list[dict], int, int, int]:
    """Busca en el índice local (modelo TVC, modelo fabricante, texto) y trae precios por tvcIds."""
    merged: list[dict] = []
    seen_ids: set[str] = set()

    def ingest(rows: list[dict]) -> None:
        for row in rows:
            pid = str(row.get('producto_id') or '')
            if not pid or pid in seen_ids:
                continue
            seen_ids.add(pid)
            merged.append(row)

    matched_ids: list[int] = []
    try:
        matched_ids = _search_tvc_index(token, busqueda, categoria_id, marca_id)
    except requests.RequestException:
        logger.exception('TVC index build error')

    if matched_ids:
        # Traer detalle (precio/inventario/medios) solo de los que se van a mostrar.
        total = len(matched_ids)
        start = (max(1, page) - 1) * per_page
        page_ids = matched_ids[start : start + per_page]
        if page_ids:
            try:
                rows, _meta = _fetch_tvc_products(
                    token, page=1, per_page=100, tvc_ids=page_ids
                )
                by_id = {str(r.get('tvc_id')): r for r in rows}
                ordered = [by_id[str(tid)] for tid in page_ids if str(tid) in by_id]
                ingest(ordered)
            except requests.RequestException:
                logger.exception('TVC products by ids request error')
        last_page = max(1, -(-total // per_page))
        return merged, total, page, last_page

    # Fallback sin índice: intento directo por clave TVC exacta.
    variants = _busqueda_variants(busqueda)
    if variants:
        try:
            by_model, _meta = _fetch_tvc_products(token, page=1, per_page=100, tvc_models=variants)
            ingest([r for r in by_model if _product_matches_filter(r, '', categoria_id, marca_id)])
        except requests.RequestException:
            logger.exception('TVC products by model request error')

    total = len(merged)
    start = (max(1, page) - 1) * per_page
    page_rows = merged[start : start + per_page]
    last_page = max(1, -(-total // per_page))
    return page_rows, total, page, last_page


class TvcProductosPermission(ModulePermission):
    """Misma política que SYSCOM: GET con productos o cualquier permiso en cotizaciones."""

    module_key = 'productos'

    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        if not user or not getattr(user, 'is_authenticated', False):
            return False
        if getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False):
            return True
        method = (request.method or '').upper()
        if method in ('GET', 'HEAD', 'OPTIONS'):
            perms_obj = getattr(user, 'permissions_profile', None)
            permissions = getattr(perms_obj, 'permissions', None) or {}
            if user_has_any_cotizaciones_access(permissions):
                return True
        return super().has_permission(request, view)


class TvcProductosSearchView(APIView):
    """GET ?busqueda=...&pagina=...&por_pagina=...&categoria=...&marca=..."""

    permission_classes = [IsAuthenticated, TvcProductosPermission]

    def get(self, request):
        token, err = _get_tvc_token()
        if err:
            return Response({'detail': f'Error TVC: {err}'}, status=status.HTTP_502_BAD_GATEWAY)

        try:
            page = max(1, int(request.GET.get('pagina') or request.GET.get('page') or 1))
        except (TypeError, ValueError):
            page = 1
        try:
            per_page = min(100, max(1, int(request.GET.get('por_pagina') or request.GET.get('perPage') or 50)))
        except (TypeError, ValueError):
            per_page = 50

        busqueda = _clip_busqueda(str(request.GET.get('busqueda') or ''))
        categoria_id = str(request.GET.get('categoria') or '').strip()
        marca_id = str(request.GET.get('marca') or '').strip()

        try:
            if busqueda:
                rows, total, current, last_page = _search_tvc_catalog(
                    token, busqueda, page, per_page, categoria_id, marca_id
                )
            else:
                rows, meta = _fetch_tvc_products(token, page=page, per_page=per_page)
                if categoria_id or marca_id:
                    rows = [
                        r
                        for r in rows
                        if _product_matches_filter(r, '', categoria_id, marca_id)
                    ]
                total = int(meta.get('total') or len(rows))
                current = int(meta.get('current_page') or page)
                last_page = int(meta.get('last_page') or 1)
        except requests.RequestException as e:
            logger.exception('TVC productos request error')
            try:
                body = e.response.json() if e.response else {}
            except Exception:
                body = {}
            upstream = getattr(e.response, 'status_code', None) if e.response else None
            return Response(
                body if body else {'detail': _safe_error_text(e, 'No se pudo consultar productos en TVC')},
                status=status.HTTP_502_BAD_GATEWAY if upstream is None or upstream >= 500 else upstream,
            )

        return Response(
            {
                'cantidad': total,
                'pagina': current,
                'paginas': last_page,
                'productos': rows,
            }
        )


class TvcProductoDetalleView(APIView):
    """GET .../productos/<id>/ — id = tvc_id numérico o tvc:123; ?byModel=clave"""

    permission_classes = [IsAuthenticated, TvcProductosPermission]

    def get(self, request, product_id):
        token, err = _get_tvc_token()
        if err:
            return Response({'detail': f'Error TVC: {err}'}, status=status.HTTP_502_BAD_GATEWAY)

        raw_id = str(product_id or '').strip()
        if raw_id.lower().startswith(_TVC_ID_PREFIX):
            raw_id = raw_id[len(_TVC_ID_PREFIX) :]

        by_model = str(request.GET.get('byModel') or request.GET.get('modelo') or '').strip()
        params: dict[str, str] = {
            'withPrice': 'true',
            'withInventory': 'simple',
            'withMedia': 'true',
            'withOverviews': 'true',
        }
        if by_model:
            params['byModel'] = by_model

        path = f'products/{urllib.parse.quote(raw_id, safe="")}'
        try:
            r = _tvc_get(path, token, params)
            mapped = _parse_tvc_detail_payload(r.json(), _get_tvc_exchange_rate(token))
            if not mapped:
                return Response({'detail': 'Producto TVC no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
            return Response(mapped)
        except requests.RequestException as e:
            logger.exception('TVC producto detalle request error')
            return Response(
                {'detail': _safe_error_text(e, 'No se pudo consultar detalle de producto en TVC')},
                status=getattr(getattr(e, 'response', None), 'status_code', status.HTTP_502_BAD_GATEWAY),
            )


class TvcCategoriasView(APIView):
    permission_classes = [IsAuthenticated, TvcProductosPermission]

    def get(self, request):
        token, err = _get_tvc_token()
        if err:
            return Response({'detail': f'Error TVC: {err}'}, status=status.HTTP_502_BAD_GATEWAY)
        params = {'per_page': request.GET.get('per_page') or '1000', 'page': request.GET.get('page') or '1'}
        try:
            r = _tvc_get('categories', token, params)
            body = r.json()
            data = body.get('data') if isinstance(body, dict) else body
            rows = data if isinstance(data, list) else []
            mapped = [
                {
                    'id': str(item.get('id') or ''),
                    'nombre': str(item.get('name') or item.get('nombre') or '').strip(),
                    'nivel': item.get('level') or 0,
                }
                for item in rows
                if isinstance(item, dict) and item.get('id') is not None
            ]
            return Response(mapped)
        except requests.RequestException as e:
            logger.exception('TVC categorias request error')
            return Response(
                {'detail': _safe_error_text(e, 'No se pudo consultar categorías en TVC')},
                status=status.HTTP_502_BAD_GATEWAY,
            )


class TvcMarcasView(APIView):
    permission_classes = [IsAuthenticated, TvcProductosPermission]

    def get(self, request):
        token, err = _get_tvc_token()
        if err:
            return Response({'detail': f'Error TVC: {err}'}, status=status.HTTP_502_BAD_GATEWAY)
        params = {'per_page': request.GET.get('per_page') or '1000', 'page': request.GET.get('page') or '1'}
        try:
            r = _tvc_get('brands', token, params)
            body = r.json()
            data = body.get('data') if isinstance(body, dict) else body
            rows = data if isinstance(data, list) else []
            mapped = [
                {
                    'id': str(item.get('id') or ''),
                    'nombre': str(item.get('name') or item.get('nombre') or '').strip(),
                }
                for item in rows
                if isinstance(item, dict) and item.get('id') is not None
            ]
            return Response(mapped)
        except requests.RequestException as e:
            logger.exception('TVC marcas request error')
            return Response(
                {'detail': _safe_error_text(e, 'No se pudo consultar marcas en TVC')},
                status=status.HTTP_502_BAD_GATEWAY,
            )


class TvcTipoCambioView(APIView):
    permission_classes = [IsAuthenticated, TvcProductosPermission]

    def get(self, request):
        token, err = _get_tvc_token()
        if err:
            return Response({'detail': f'Error TVC: {err}'}, status=status.HTTP_502_BAD_GATEWAY)
        rate = _get_tvc_exchange_rate(token)
        if rate is None:
            return Response({'detail': 'Tipo de cambio TVC no disponible.'}, status=status.HTTP_502_BAD_GATEWAY)
        return Response({'tipo_cambio': rate})


def tvc_producto_externo_id(tvc_id: int | str) -> str:
    return f'{_TVC_ID_PREFIX}{tvc_id}'


_TVC_EXT_RE = re.compile(r'^tvc:(\d+)$', re.IGNORECASE)


def tvc_id_from_externo(producto_externo_id: str) -> int | None:
    match = _TVC_EXT_RE.match(str(producto_externo_id or '').strip())
    if not match:
        return None
    try:
        return int(match.group(1))
    except (TypeError, ValueError):
        return None
