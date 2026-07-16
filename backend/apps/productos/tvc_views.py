"""
Proxy para API TVC (proveedor mayorista tvc.mx).
Autenticación: Bearer JWT estático (TVC_API_TOKEN) con vigencia ~1 año.

Documentación: https://api.tvc.mx/doc-site/index.html
"""
from __future__ import annotations

import logging
import re
import urllib.parse

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


def _abs_media_url(path: str) -> str:
    s = (path or '').strip()
    if not s:
        return ''
    if s.startswith('http://') or s.startswith('https://'):
        return s
    base = _tvc_media_base()
    return f'{base}/{s.lstrip("/")}'


def _map_tvc_product(raw: dict) -> dict:
    """Normaliza un producto TVC al shape SyscomProducto usado en el frontend."""
    tvc_id = raw.get('tvc_id')
    tvc_model = str(raw.get('tvc_model') or '').strip()
    provider_model = str(raw.get('provider_model') or '').strip()
    brand = str(raw.get('brand') or '').strip()
    name = str(raw.get('name') or '').strip()
    media = raw.get('media') if isinstance(raw.get('media'), dict) else {}
    main_image = _abs_media_url(str(media.get('main_image') or ''))

    distributor = _as_number(raw.get('distributor_price'))
    list_price = _as_number(raw.get('list_price'))

    stock_raw = raw.get('total_inventories')
    try:
        stock = int(float(stock_raw)) if stock_raw is not None and str(stock_raw).strip() != '' else 0
    except (TypeError, ValueError):
        stock = 0

    producto_id = f'{_TVC_ID_PREFIX}{tvc_id}' if tvc_id is not None else ''
    estado_inv = 'con_existencia' if stock > 0 else 'sin_existencia'

    precio_mxn = None
    precio_lista_usd = distributor
    if distributor is None and list_price is not None and list_price > 100:
        precio_mxn = list_price
        precio_lista_usd = None

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
            'precio_lista': precio_lista_usd,
            'precio_especial': None,
            'precio_descuento': None,
        },
        'tvc_id': tvc_id,
        'tvc_model': tvc_model,
        'provider_model': provider_model,
        'category_id': raw.get('category_id'),
        'brand_id': raw.get('brand_id'),
        'hash_tags': raw.get('hash_tags') if isinstance(raw.get('hash_tags'), list) else [],
    }


def _parse_tvc_list_payload(body) -> tuple[list[dict], dict]:
    if isinstance(body, list):
        return [_map_tvc_product(x) for x in body if isinstance(x, dict)], {}
    if not isinstance(body, dict):
        return [], {}
    data = body.get('data')
    rows = [_map_tvc_product(x) for x in data] if isinstance(data, list) else []
    meta = body.get('meta') if isinstance(body.get('meta'), dict) else {}
    return rows, meta


def _parse_tvc_detail_payload(body) -> dict | None:
    if isinstance(body, dict) and body.get('data') and isinstance(body['data'], dict):
        return _map_tvc_product(body['data'])
    if isinstance(body, dict) and body.get('tvc_id') is not None:
        return _map_tvc_product(body)
    return None


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
    return _parse_tvc_list_payload(r.json())


def _search_tvc_catalog(
    token: str,
    busqueda: str,
    page: int,
    per_page: int,
    categoria_id: str,
    marca_id: str,
) -> tuple[list[dict], int, int, int]:
    """Busca por modelo exacto y, si hace falta, filtra por texto en páginas recientes."""
    variants = _busqueda_variants(busqueda)
    merged: list[dict] = []
    seen_ids: set[str] = set()

    def ingest(rows: list[dict]) -> None:
        for row in rows:
            pid = str(row.get('producto_id') or '')
            if not pid or pid in seen_ids:
                continue
            if not _product_matches_filter(row, busqueda, categoria_id, marca_id):
                continue
            seen_ids.add(pid)
            merged.append(row)

    if variants:
        try:
            by_model, _meta = _fetch_tvc_products(token, page=1, per_page=100, tvc_models=variants)
            ingest(by_model)
        except requests.RequestException:
            logger.exception('TVC products by model request error')

        if busqueda.strip().isdigit():
            try:
                by_id, _meta = _fetch_tvc_products(
                    token, page=1, per_page=100, tvc_ids=[int(busqueda.strip())]
                )
                ingest(by_id)
            except (requests.RequestException, ValueError):
                logger.exception('TVC products by id request error')

    if not merged:
        try:
            rows, meta = _fetch_tvc_products(token, page=page, per_page=per_page)
            needle = busqueda.strip().lower()
            filtered = [r for r in rows if _product_matches_filter(r, needle, categoria_id, marca_id)]
            if needle and not filtered and rows:
                max_scan = min(5, int(meta.get('last_page') or 1))
                for p in range(2, max_scan + 1):
                    extra, _ = _fetch_tvc_products(token, page=p, per_page=per_page)
                    rows.extend(extra)
                filtered = [r for r in rows if _product_matches_filter(r, needle, categoria_id, marca_id)]
            ingest(filtered if needle else rows)
            total = len(merged) if needle else int(meta.get('total') or len(merged))
            last_page = max(1, -(-total // per_page)) if needle else int(meta.get('last_page') or 1)
            current = page if not needle else 1
            return merged, total, current, last_page
        except requests.RequestException as e:
            logger.exception('TVC products list request error')
            raise e

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
            mapped = _parse_tvc_detail_payload(r.json())
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
        try:
            r = _tvc_get('exchange-rates', token)
            body = r.json()
            rate = None
            if isinstance(body, (int, float)):
                rate = float(body)
            elif isinstance(body, dict):
                for key in ('tipo_cambio', 'exchange_rate', 'rate', 'valor', 'data', 'value'):
                    n = _as_number(body.get(key))
                    if n:
                        rate = n
                        break
                if rate is None:
                    for v in body.values():
                        n = _as_number(v)
                        if n:
                            rate = n
                            break
            if rate is None:
                return Response({'detail': 'Tipo de cambio TVC no disponible.'}, status=status.HTTP_502_BAD_GATEWAY)
            return Response({'tipo_cambio': rate})
        except requests.RequestException as e:
            logger.exception('TVC tipocambio request error')
            return Response(
                {'detail': _safe_error_text(e, 'No se pudo consultar tipo de cambio en TVC')},
                status=status.HTTP_502_BAD_GATEWAY,
            )


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
