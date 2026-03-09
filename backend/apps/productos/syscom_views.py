"""
Proxy para API SYSCOM (proveedor mayorista).
OAuth 2.0 client_credentials + búsqueda de productos.
Las credenciales se leen de settings (SYSCOM_CLIENT_ID, SYSCOM_CLIENT_SECRET).
"""
import logging
import urllib.parse

import requests
from django.conf import settings
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.permissions import ModulePermission

logger = logging.getLogger(__name__)


def _get_syscom_token():
    """Obtiene access_token de SYSCOM OAuth (client_credentials)."""
    client_id = getattr(settings, 'SYSCOM_CLIENT_ID', '') or ''
    client_secret = getattr(settings, 'SYSCOM_CLIENT_SECRET', '') or ''
    oauth_url = getattr(settings, 'SYSCOM_OAUTH_URL', 'https://developers.syscom.mx/oauth/token') or 'https://developers.syscom.mx/oauth/token'

    if not client_id or not client_secret:
        return None, 'SYSCOM_CLIENT_ID y SYSCOM_CLIENT_SECRET deben estar configurados en el entorno.'

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
        return token, None
    except requests.RequestException as e:
        logger.exception('SYSCOM OAuth error')
        return None, str(e)
    except Exception as e:
        logger.exception('SYSCOM OAuth parse error')
        return None, str(e)


class SyscomProductosPermission(ModulePermission):
    module_key = 'productos'


class SyscomProductosSearchView(APIView):
    """GET ?busqueda=...&categoria=...&marca=...&pagina=...&orden=..."""
    permission_classes = [IsAuthenticated, SyscomProductosPermission]

    def get(self, request):
        base = (getattr(settings, 'SYSCOM_API_BASE', '') or 'https://developers.syscom.mx/api/v1').rstrip('/')
        token, err = _get_syscom_token()
        if err:
            return Response({'detail': f'Error SYSCOM: {err}'}, status=status.HTTP_502_BAD_GATEWAY)

        params = {}
        if request.GET.get('busqueda'):
            params['busqueda'] = request.GET.get('busqueda').replace(' ', '+')
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
            r = requests.get(url, headers={'Authorization': f'Bearer {token}'}, timeout=30)
            r.raise_for_status()
            return Response(r.json())
        except requests.RequestException as e:
            logger.exception('SYSCOM productos request error')
            try:
                body = e.response.json() if e.response else {}
            except Exception:
                body = {}
            return Response(
                body if body else {'detail': str(e)},
                status=getattr(e.response, 'status_code', status.HTTP_502_BAD_GATEWAY)
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
            r = requests.get(url, headers={'Authorization': f'Bearer {token}'}, timeout=15)
            r.raise_for_status()
            return Response(r.json())
        except requests.RequestException as e:
            logger.exception('SYSCOM categorias request error')
            return Response(
                {'detail': getattr(e, 'response', None) and e.response.text or str(e)},
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
            r = requests.get(url, headers={'Authorization': f'Bearer {token}'}, timeout=15)
            r.raise_for_status()
            return Response(r.json())
        except requests.RequestException as e:
            logger.exception('SYSCOM marcas request error')
            return Response(
                {'detail': getattr(e, 'response', None) and e.response.text or str(e)},
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
            r = requests.get(url, headers={'Authorization': f'Bearer {token}'}, timeout=15)
            r.raise_for_status()
            return Response(r.json())
        except requests.RequestException as e:
            logger.exception('SYSCOM producto detalle request error')
            return Response(
                {'detail': getattr(e, 'response', None) and e.response.text or str(e)},
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
            r = requests.get(url, headers={'Authorization': f'Bearer {token}'}, timeout=15)
            r.raise_for_status()
            return Response(r.json())
        except requests.RequestException as e:
            logger.exception('SYSCOM tipocambio request error')
            return Response(
                {'detail': getattr(e, 'response', None) and e.response.text or str(e)},
                status=getattr(getattr(e, 'response', None), 'status_code', status.HTTP_502_BAD_GATEWAY)
            )
