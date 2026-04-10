"""
Proxy para API SYSCOM (proveedor mayorista).
OAuth 2.0 client_credentials + búsqueda de productos.
Las credenciales se leen de settings (SYSCOM_CLIENT_ID, SYSCOM_CLIENT_SECRET).

Nota sobre precios: los montos en USD (precios.precio_lista, etc.) se convierten a MXN en cliente
con tipo de cambio e IVA 16 %. Si el producto trae `precio_mxn`, suele usarse tal cual en UI.
"""
import logging
import time
import urllib.parse

import requests
from django.conf import settings
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.permissions import ModulePermission, user_has_any_cotizaciones_access

logger = logging.getLogger(__name__)

# Búsquedas muy largas (p. ej. pegar un párrafo) rompen la API de Syscom (500) y la URL.
SYSCOM_BUSQUEDA_MAX_CHARS = 120

_SYSCOM_TOKEN_CACHE = {
    'access_token': None,
    'expires_at': 0.0,
}


def _safe_error_text(exc: requests.RequestException, default_msg: str) -> str:
    if isinstance(exc, requests.Timeout):
        return f'{default_msg} (timeout con SYSCOM).'
    if isinstance(exc, requests.ConnectionError):
        return f'{default_msg} (error de conexión con SYSCOM).'
    return default_msg


def _syscom_get(url: str, token: str, timeout_seconds: int = 20, retries: int = 1):
    last_exc = None
    for _ in range(max(1, retries) + 1):
        try:
            r = requests.get(url, headers={'Authorization': f'Bearer {token}'}, timeout=timeout_seconds)
            r.raise_for_status()
            return r
        except requests.Timeout as e:
            last_exc = e
            continue
        except requests.RequestException:
            raise
    if last_exc:
        raise last_exc


def _get_syscom_token():
    """Obtiene access_token de SYSCOM OAuth (client_credentials)."""
    client_id = getattr(settings, 'SYSCOM_CLIENT_ID', '') or ''
    client_secret = getattr(settings, 'SYSCOM_CLIENT_SECRET', '') or ''
    oauth_url = getattr(settings, 'SYSCOM_OAUTH_URL', 'https://developers.syscom.mx/oauth/token') or 'https://developers.syscom.mx/oauth/token'

    if not client_id or not client_secret:
        return None, 'SYSCOM_CLIENT_ID y SYSCOM_CLIENT_SECRET deben estar configurados en el entorno.'

    now = time.time()
    cached_token = _SYSCOM_TOKEN_CACHE.get('access_token')
    cached_expires_at = float(_SYSCOM_TOKEN_CACHE.get('expires_at') or 0)
    if cached_token and cached_expires_at > now + 30:
        return cached_token, None

    data = {
        'client_id': client_id,
        'client_secret': client_secret,
        'grant_type': 'client_credentials',
    }
    try:
        r = requests.post(oauth_url, data=data, timeout=15)
        r.raise_for_status()
        body = r.json()
        token = body.get('access_token')
        if not token:
            return None, body.get('error_description', 'No se recibió access_token')
        expires_in = int(body.get('expires_in') or 3600)
        _SYSCOM_TOKEN_CACHE['access_token'] = token
        _SYSCOM_TOKEN_CACHE['expires_at'] = time.time() + max(60, expires_in - 30)
        return token, None
    except requests.RequestException as e:
        logger.exception('SYSCOM OAuth error')
        return None, _safe_error_text(e, 'No se pudo autenticar con SYSCOM')
    except Exception as e:
        logger.exception('SYSCOM OAuth parse error')
        return None, f'No se pudo procesar autenticación SYSCOM: {e}'


class SyscomProductosPermission(ModulePermission):
    """
    Proxy SYSCOM: lectura mayorista usada desde Productos y desde Cotizaciones.

    Por defecto exige permiso de módulo `productos` (view en GET).
    Si el usuario no tiene productos pero sí cotizaciones (view/create/edit/delete),
    se permite GET para que técnicos con solo cotizaciones puedan armar líneas con Syscom.
    """

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


class SyscomProductosSearchView(APIView):
    """GET ?busqueda=...&categoria=...&marca=...&pagina=...&orden=..."""
    permission_classes = [IsAuthenticated, SyscomProductosPermission]

    def get(self, request):
        base = (getattr(settings, 'SYSCOM_API_BASE', '') or 'https://developers.syscom.mx/api/v1').rstrip('/')
        token, err = _get_syscom_token()
        if err:
            return Response({'detail': f'Error SYSCOM: {err}'}, status=status.HTTP_502_BAD_GATEWAY)

        params = {}
        raw_busqueda = request.GET.get('busqueda')
        if raw_busqueda:
            b = str(raw_busqueda).strip()[:SYSCOM_BUSQUEDA_MAX_CHARS]
            if b:
                params['busqueda'] = b.replace(' ', '+')
        if request.GET.get('categoria'):
            params['categoria'] = request.GET.get('categoria')
        if request.GET.get('marca'):
            params['marca'] = request.GET.get('marca')
        if request.GET.get('pagina'):
            params['pagina'] = request.GET.get('pagina')
        if request.GET.get('orden'):
            params['orden'] = request.GET.get('orden')
        if request.GET.get('stock') is not None:
            params['stock'] = request.GET.get('stock')
        if request.GET.get('agrupar') is not None:
            params['agrupar'] = request.GET.get('agrupar')
        if request.GET.get('sucursal'):
            params['sucursal'] = request.GET.get('sucursal')

        url = f'{base}/productos'
        if params:
            url += '?' + urllib.parse.urlencode(params)

        try:
            r = _syscom_get(url, token, timeout_seconds=20, retries=1)
            return Response(r.json())
        except requests.RequestException as e:
            logger.exception('SYSCOM productos request error')
            try:
                body = e.response.json() if e.response else {}
            except Exception:
                body = {}
            # No propagar 500 de Syscom como 500 de nuestra API (confunde con error de Django).
            upstream = getattr(e.response, 'status_code', None) if e.response else None
            return Response(
                body if body else {'detail': _safe_error_text(e, 'No se pudo consultar productos en SYSCOM')},
                status=status.HTTP_502_BAD_GATEWAY if upstream is None or upstream >= 500 else upstream,
            )


class SyscomCategoriasView(APIView):
    """GET /api/productos/syscom/categorias/ -> categorías base SYSCOM."""
    permission_classes = [IsAuthenticated, SyscomProductosPermission]

    def get(self, request):
        base = (getattr(settings, 'SYSCOM_API_BASE', '') or 'https://developers.syscom.mx/api/v1').rstrip('/')
        token, err = _get_syscom_token()
        if err:
            return Response({'detail': f'Error SYSCOM: {err}'}, status=status.HTTP_502_BAD_GATEWAY)
        url = f'{base}/categorias'
        try:
            r = _syscom_get(url, token, timeout_seconds=15, retries=1)
            return Response(r.json())
        except requests.RequestException as e:
            logger.exception('SYSCOM categorias request error')
            return Response(
                {'detail': _safe_error_text(e, 'No se pudo consultar categorías en SYSCOM')},
                status=getattr(getattr(e, 'response', None), 'status_code', status.HTTP_502_BAD_GATEWAY)
            )


class SyscomMarcasView(APIView):
    """GET /api/productos/syscom/marcas/ -> marcas SYSCOM."""
    permission_classes = [IsAuthenticated, SyscomProductosPermission]

    def get(self, request):
        base = (getattr(settings, 'SYSCOM_API_BASE', '') or 'https://developers.syscom.mx/api/v1').rstrip('/')
        token, err = _get_syscom_token()
        if err:
            return Response({'detail': f'Error SYSCOM: {err}'}, status=status.HTTP_502_BAD_GATEWAY)
        url = f'{base}/marcas'
        try:
            r = _syscom_get(url, token, timeout_seconds=15, retries=1)
            return Response(r.json())
        except requests.RequestException as e:
            logger.exception('SYSCOM marcas request error')
            return Response(
                {'detail': _safe_error_text(e, 'No se pudo consultar marcas en SYSCOM')},
                status=getattr(getattr(e, 'response', None), 'status_code', status.HTTP_502_BAD_GATEWAY)
            )


class SyscomProductoDetalleView(APIView):
    """GET /api/productos/syscom/productos/<id>/ -> detalle de un producto SYSCOM."""
    permission_classes = [IsAuthenticated, SyscomProductosPermission]

    def get(self, request, product_id):
        base = (getattr(settings, 'SYSCOM_API_BASE', '') or 'https://developers.syscom.mx/api/v1').rstrip('/')
        token, err = _get_syscom_token()
        if err:
            return Response({'detail': f'Error SYSCOM: {err}'}, status=status.HTTP_502_BAD_GATEWAY)
        url = f'{base}/productos/{product_id}'
        try:
            r = _syscom_get(url, token, timeout_seconds=15, retries=1)
            return Response(r.json())
        except requests.RequestException as e:
            logger.exception('SYSCOM producto detalle request error')
            return Response(
                {'detail': _safe_error_text(e, 'No se pudo consultar detalle de producto en SYSCOM')},
                status=getattr(getattr(e, 'response', None), 'status_code', status.HTTP_502_BAD_GATEWAY)
            )


class SyscomTipoCambioView(APIView):
    """GET /api/productos/syscom/tipocambio/ -> tipo de cambio vigente (SYSCOM)."""
    permission_classes = [IsAuthenticated, SyscomProductosPermission]

    def get(self, request):
        base = (getattr(settings, 'SYSCOM_API_BASE', '') or 'https://developers.syscom.mx/api/v1').rstrip('/')
        token, err = _get_syscom_token()
        if err:
            return Response({'detail': f'Error SYSCOM: {err}'}, status=status.HTTP_502_BAD_GATEWAY)
        url = f'{base}/tipocambio'
        try:
            r = _syscom_get(url, token, timeout_seconds=15, retries=1)
            return Response(r.json())
        except requests.RequestException as e:
            logger.exception('SYSCOM tipocambio request error')
            return Response(
                {'detail': _safe_error_text(e, 'No se pudo consultar tipo de cambio en SYSCOM')},
                status=getattr(getattr(e, 'response', None), 'status_code', status.HTTP_502_BAD_GATEWAY)
            )
