from decimal import Decimal
from unittest.mock import MagicMock, patch

import requests
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from rest_framework import status
from rest_framework.test import APITestCase

from apps.inventario.enrichment import MAX_CARACTERISTICAS, _map_product
from apps.inventario.models import InventarioItem, InventarioMovimiento
from apps.users.models import UserPermissions

User = get_user_model()


class InventarioScanTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='inv_user', password='test-pass-123')
        UserPermissions.objects.create(
            user=self.user,
            permissions={'inventario': {'view': True, 'create': True, 'edit': False, 'delete': False}},
        )
        self.client.force_authenticate(user=self.user)

    def test_scan_denied_without_create(self):
        denied = User.objects.create_user(username='sin_inv', password='test-pass-123')
        UserPermissions.objects.create(
            user=denied, permissions={'inventario': {'view': True, 'create': False}}
        )
        self.client.force_authenticate(user=denied)
        res = self.client.post(
            '/api/inventario/scan/',
            {'codigo_barras': '7501234567890', 'modo': 'entrada'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    @patch('apps.inventario.views.enrich_from_catalogs', return_value=None)
    def test_primera_entrada_crea_item(self, _enrich):
        res = self.client.post(
            '/api/inventario/scan/',
            {'codigo_barras': '7501234567890', 'modo': 'entrada'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['creado'])
        self.assertEqual(res.data['item']['cantidad'], 1)
        self.assertEqual(InventarioItem.objects.get(codigo_barras='7501234567890').cantidad, 1)

    @patch('apps.inventario.views.enrich_from_catalogs', return_value=None)
    def test_segunda_entrada_suma(self, _enrich):
        InventarioItem.objects.create(codigo_barras='ABC', cantidad=1)
        res = self.client.post(
            '/api/inventario/scan/',
            {'codigo_barras': 'ABC', 'modo': 'entrada'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.data['creado'])
        self.assertEqual(res.data['item']['cantidad'], 2)

    @patch('apps.inventario.views.enrich_from_catalogs', return_value=None)
    def test_salida_resta(self, _enrich):
        InventarioItem.objects.create(codigo_barras='ABC', cantidad=2)
        res = self.client.post(
            '/api/inventario/scan/',
            {'codigo_barras': 'ABC', 'modo': 'salida'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['item']['cantidad'], 1)

    def test_salida_sin_existencia(self):
        InventarioItem.objects.create(codigo_barras='ABC', cantidad=0)
        res = self.client.post(
            '/api/inventario/scan/',
            {'codigo_barras': 'ABC', 'modo': 'salida'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('existencia', str(res.data.get('detail', '')).lower())

    def test_salida_codigo_inexistente(self):
        res = self.client.post(
            '/api/inventario/scan/',
            {'codigo_barras': 'NOEXISTE', 'modo': 'salida'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    @patch(
        'apps.inventario.views.enrich_from_catalogs',
        return_value={
            'nombre': 'Cámara X',
            'marca': 'Hikvision',
            'modelo': 'DS-2',
            'fuente': 'syscom',
            'ref_externa': '123',
        },
    )
    def test_enriquecimiento_en_alta(self, _enrich):
        res = self.client.post(
            '/api/inventario/scan/',
            {'codigo_barras': 'SKU-1', 'modo': 'entrada'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['enriquecido'])
        self.assertEqual(res.data['item']['nombre'], 'Cámara X')
        self.assertEqual(res.data['item']['fuente'], 'syscom')

    @patch('apps.inventario.views.enrich_from_catalogs', return_value=None)
    def test_entrada_integrity_error_recovery(self, _enrich):
        peer_item = InventarioItem.objects.create(codigo_barras='RACE', cantidad=1)

        original_save = InventarioItem.save

        def save_raises_on_insert(self, *args, **kwargs):
            if self.pk is None:
                raise IntegrityError('duplicate key')
            return original_save(self, *args, **kwargs)

        queryset_mock = MagicMock()
        queryset_mock.first.return_value = None
        queryset_mock.get.return_value = peer_item
        queryset_mock.filter.return_value = queryset_mock

        with patch.object(InventarioItem, 'save', save_raises_on_insert):
            with patch.object(
                InventarioItem.objects, 'select_for_update', return_value=queryset_mock
            ):
                res = self.client.post(
                    '/api/inventario/scan/',
                    {'codigo_barras': 'RACE', 'modo': 'entrada'},
                    format='json',
                )

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.data['creado'])
        self.assertFalse(res.data['enriquecido'])
        self.assertEqual(res.data['item']['cantidad'], 2)
        peer_item.refresh_from_db()
        self.assertEqual(peer_item.cantidad, 2)


class InventarioItemsTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='inv2', password='test-pass-123')
        UserPermissions.objects.create(
            user=self.user,
            permissions={'inventario': {'view': True, 'create': True}},
        )
        self.client.force_authenticate(user=self.user)
        self.item = InventarioItem.objects.create(
            codigo_barras='X1', nombre='', cantidad=3
        )

    def test_list_items(self):
        res = self.client.get('/api/inventario/items/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('results', res.data)
        self.assertIn('count', res.data)
        self.assertTrue(any(i['codigo_barras'] == 'X1' for i in res.data['results']))

    def test_list_items_busca_por_codigo_y_modelo(self):
        InventarioItem.objects.create(
            codigo_barras='6942160404431',
            nombre='Sensor puerta',
            modelo='XBSSW01',
            marca='Ajax',
            cantidad=2,
        )
        InventarioItem.objects.create(
            codigo_barras='OTRO-1',
            nombre='Cable UTP',
            modelo='ZZZ',
            cantidad=1,
        )
        # Prefijo compartido: la coincidencia exacta de código debe ir primero.
        InventarioItem.objects.create(
            codigo_barras='694216040443199',
            nombre='Variante larga',
            modelo='XBSSW01-LONG',
            cantidad=1,
        )

        por_codigo = self.client.get('/api/inventario/items/?search=6942160404431')
        self.assertEqual(por_codigo.status_code, status.HTTP_200_OK)
        self.assertEqual(por_codigo.data['count'], 2)
        self.assertEqual(por_codigo.data['results'][0]['codigo_barras'], '6942160404431')

        por_modelo = self.client.get('/api/inventario/items/?search=XBSSW01')
        self.assertEqual(por_modelo.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(por_modelo.data['count'], 1)
        self.assertEqual(por_modelo.data['results'][0]['modelo'], 'XBSSW01')

        parcial = self.client.get('/api/inventario/items/?search=XBSS')
        self.assertEqual(parcial.status_code, status.HTTP_200_OK)
        self.assertTrue(
            any(i['codigo_barras'] == '6942160404431' for i in parcial.data['results'])
        )

    def test_list_items_paginado(self):
        for i in range(25):
            InventarioItem.objects.create(codigo_barras=f'PAG-{i}', cantidad=1)
        res = self.client.get('/api/inventario/items/?page=1&page_size=20')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data['results']), 20)
        self.assertGreaterEqual(res.data['count'], 26)
        res2 = self.client.get('/api/inventario/items/?page=2&page_size=20')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res2.data['results']), 1)

    def test_stats(self):
        InventarioItem.objects.create(codigo_barras='S2', nombre='Con nombre', cantidad=5)
        InventarioMovimiento.objects.create(
            item=self.item,
            tipo='entrada',
            cantidad=1,
            usuario=self.user,
        )
        res = self.client.get('/api/inventario/stats/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['total_items'], 2)
        self.assertEqual(res.data['total_unidades'], 8)  # 3 + 5
        self.assertEqual(res.data['sin_identificar'], 1)
        self.assertGreaterEqual(res.data['movimientos_hoy'], 1)

    def test_patch_ficha(self):
        res = self.client.patch(
            f'/api/inventario/items/{self.item.id}/',
            {'nombre': 'Sensor', 'marca': 'Ajax'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.item.refresh_from_db()
        self.assertEqual(self.item.nombre, 'Sensor')

    def test_patch_rejects_cantidad(self):
        res = self.client.patch(
            f'/api/inventario/items/{self.item.id}/',
            {'cantidad': 99, 'nombre': 'Sensor'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.item.refresh_from_db()
        self.assertEqual(self.item.cantidad, 3)
        self.assertEqual(self.item.nombre, 'Sensor')

    def test_filtro_seccion(self):
        InventarioItem.objects.create(
            codigo_barras='CAM-1',
            nombre='Cámara',
            cantidad=1,
            seccion='videovigilancia',
        )
        InventarioItem.objects.create(
            codigo_barras='NET-1',
            nombre='Switch',
            cantidad=1,
            seccion='redes_it',
        )
        res = self.client.get('/api/inventario/items/?seccion=videovigilancia')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        codigos = {i['codigo_barras'] for i in res.data['results']}
        self.assertIn('CAM-1', codigos)
        self.assertNotIn('NET-1', codigos)
        self.assertNotIn('X1', codigos)

        res_sin = self.client.get('/api/inventario/items/?seccion=sin')
        self.assertEqual(res_sin.status_code, status.HTTP_200_OK)
        codigos_sin = {i['codigo_barras'] for i in res_sin.data['results']}
        self.assertIn('X1', codigos_sin)
        self.assertNotIn('CAM-1', codigos_sin)

    def test_patch_seccion(self):
        res = self.client.patch(
            f'/api/inventario/items/{self.item.id}/',
            {'seccion': 'control_acceso'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.item.refresh_from_db()
        self.assertEqual(self.item.seccion, 'control_acceso')

    @patch(
        'apps.inventario.enrichment.fetch_catalog_detail',
        return_value={
            'nombre': 'Cámara',
            'marca': 'HIK',
            'modelo': 'X',
            'fuente': 'syscom',
            'ref_externa': '1',
            'imagen_url': '',
            'caracteristicas': '',
            'precio_unitario': None,
            'seccion': 'videovigilancia',
        },
    )
    def test_sincronizar_secciones(self, _detalle):
        self.item.fuente = 'syscom'
        self.item.ref_externa = '199807'
        self.item.seccion = ''
        self.item.save(update_fields=['fuente', 'ref_externa', 'seccion'])
        res = self.client.post(
            '/api/inventario/sincronizar-secciones/',
            {'limit': 10},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(res.data['actualizados'], 1)
        self.item.refresh_from_db()
        self.assertEqual(self.item.seccion, 'videovigilancia')

    @patch('apps.inventario.views.enrich_from_catalogs', return_value=None)
    def test_list_movimientos(self, _enrich):
        self.client.post(
            '/api/inventario/scan/',
            {'codigo_barras': 'X1', 'modo': 'entrada'},
            format='json',
        )
        res = self.client.get(f'/api/inventario/movimientos/?item={self.item.id}')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('results', res.data)
        self.assertTrue(len(res.data['results']) >= 1)
        mov = res.data['results'][0]
        self.assertEqual(mov['usuario'], self.user.id)
        self.assertEqual(mov['usuario_nombre'], self.user.username)
        self.assertEqual(mov['item_codigo_barras'], 'X1')

    @patch('apps.inventario.views.enrich_from_catalogs', return_value=None)
    def test_list_movimientos_desde_hoy_sin_warning_naive(self, _enrich):
        import warnings

        from django.utils import timezone

        self.client.post(
            '/api/inventario/scan/',
            {'codigo_barras': 'X1', 'modo': 'entrada'},
            format='json',
        )
        hoy = timezone.localdate().isoformat()
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter('always')
            res = self.client.get(f'/api/inventario/movimientos/?desde={hoy}')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('results', res.data)
        self.assertGreaterEqual(len(res.data['results']), 1)
        self.assertGreaterEqual(res.data['count'], 1)
        naive_warns = [
            w
            for w in caught
            if issubclass(w.category, RuntimeWarning)
            and 'naive datetime' in str(w.message)
        ]
        self.assertEqual(naive_warns, [])


class InventarioEnrichmentTests(APITestCase):
    @patch('apps.inventario.enrichment._search_tvc', return_value=None)
    @patch(
        'apps.inventario.enrichment._search_syscom',
        return_value={
            'nombre': 'Cámara SYSCOM',
            'marca': 'Hikvision',
            'modelo': 'DS-2',
            'fuente': 'syscom',
            'ref_externa': '999',
        },
    )
    def test_enrich_syscom_first(self, _syscom, _tvc):
        from apps.inventario.enrichment import enrich_from_catalogs

        result = enrich_from_catalogs('DS-2')
        self.assertEqual(result['fuente'], 'syscom')
        _syscom.assert_called_once_with('DS-2')
        _tvc.assert_not_called()

    @patch(
        'apps.inventario.enrichment._search_tvc',
        return_value={
            'nombre': 'Sensor TVC',
            'marca': 'Ajax',
            'modelo': 'AJAX-1',
            'fuente': 'tvc',
            'ref_externa': 'tvc:42',
        },
    )
    @patch('apps.inventario.enrichment._search_syscom', return_value=None)
    def test_enrich_falls_back_to_tvc(self, _syscom, _tvc):
        from apps.inventario.enrichment import enrich_from_catalogs

        result = enrich_from_catalogs('AJAX-1')
        self.assertEqual(result['fuente'], 'tvc')
        _syscom.assert_called_once_with('AJAX-1')
        _tvc.assert_called_once_with('AJAX-1')

    @patch('apps.inventario.enrichment._search_tvc', side_effect=requests.RequestException('timeout'))
    @patch('apps.inventario.enrichment._search_syscom', side_effect=requests.RequestException('timeout'))
    def test_enrich_never_raises(self, _syscom, _tvc):
        from apps.inventario.enrichment import enrich_from_catalogs

        self.assertIsNone(enrich_from_catalogs('FAIL'))


class InventarioCatalogoSearchTests(APITestCase):
    """Los catálogos no indexan EAN, así que el operador busca y vincula a mano."""

    def setUp(self):
        self.user = User.objects.create_user(username='inv_cat', password='test-pass-123')
        UserPermissions.objects.create(
            user=self.user,
            permissions={'inventario': {'view': True, 'create': True}},
        )
        self.client.force_authenticate(user=self.user)

    @patch('apps.inventario.enrichment._fetch_tvc', return_value=[])
    @patch(
        'apps.inventario.enrichment._fetch_syscom',
        return_value=[
            {
                'producto_id': 210627,
                'titulo': 'Kit de Videoportero IP PoE',
                'marca': 'HIKVISION',
                'modelo': 'DS-KIS604-P(C)',
                'img_portada': 'https://cdn.syscom.mx/kit.jpg',
            }
        ],
    )
    def test_busca_candidatos(self, _syscom, _tvc):
        res = self.client.get('/api/inventario/catalogo/?search=videoportero')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['fuente'], 'syscom')
        self.assertEqual(res.data[0]['modelo'], 'DS-KIS604-P(C)')
        self.assertEqual(res.data[0]['ref_externa'], '210627')
        self.assertEqual(res.data[0]['imagen_url'], 'https://cdn.syscom.mx/kit.jpg')

    @patch('apps.inventario.enrichment._fetch_tvc', return_value=[])
    @patch(
        'apps.inventario.enrichment._fetch_syscom',
        return_value=[
            {'producto_id': 1, 'titulo': 'Sensor', 'modelo': 'AJ-1', 'img_portada': 'javascript:alert(1)'}
        ],
    )
    def test_descarta_imagen_no_http(self, _syscom, _tvc):
        res = self.client.get('/api/inventario/catalogo/?search=sensor')
        self.assertEqual(res.data[0]['imagen_url'], '')

    def test_termino_corto_no_llama_catalogos(self):
        with patch('apps.inventario.views.search_catalogs') as mock_search:
            res = self.client.get('/api/inventario/catalogo/?search=ds')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data, [])
        mock_search.assert_not_called()

    @patch('apps.inventario.enrichment._fetch_tvc', side_effect=requests.RequestException('down'))
    @patch(
        'apps.inventario.enrichment._fetch_syscom',
        return_value=[{'producto_id': 1, 'titulo': 'Sensor', 'marca': 'Ajax', 'modelo': 'AJ-1'}],
    )
    def test_un_catalogo_caido_no_rompe_la_busqueda(self, _syscom, _tvc):
        res = self.client.get('/api/inventario/catalogo/?search=sensor')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

    @patch('apps.inventario.enrichment._fetch_tvc', return_value=[])
    @patch('apps.inventario.enrichment._fetch_syscom', return_value=[])
    def test_incluye_productos_manuales(self, _syscom, _tvc):
        from apps.productos.models import ProductoManual

        ProductoManual.objects.create(
            producto='GPS Tracker Pro',
            marca='DigitalFlow',
            modelo='DF-GPS-1',
            precio=1500,
        )
        res = self.client.get('/api/inventario/catalogo/?search=gps')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        manuals = [row for row in res.data if row.get('fuente') == 'manual']
        self.assertEqual(len(manuals), 1)
        self.assertEqual(manuals[0]['modelo'], 'DF-GPS-1')

    def test_denegado_sin_permiso(self):
        sin_permiso = User.objects.create_user(username='inv_nope', password='test-pass-123')
        UserPermissions.objects.create(user=sin_permiso, permissions={'inventario': {}})
        self.client.force_authenticate(user=sin_permiso)
        res = self.client.get('/api/inventario/catalogo/?search=sensor')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class InventarioRegistrarCatalogoTests(APITestCase):
    URL = '/api/inventario/registrar-catalogo/'

    def setUp(self):
        self.user = User.objects.create_user(username='inv_reg', password='test-pass-123')
        UserPermissions.objects.create(
            user=self.user,
            permissions={'inventario': {'view': True, 'create': True}},
        )
        self.client.force_authenticate(user=self.user)

    def test_crea_item_con_stock_inicial_uno(self):
        res = self.client.post(
            self.URL,
            {
                'fuente': 'syscom',
                'ref': '210627',
                'modelo': 'DS-KIS604-P(C)',
                'nombre': 'Kit videoportero',
                'marca': 'HIKVISION',
                'imagen_url': 'https://cdn.syscom.mx/kit.jpg',
            },
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['creado'])
        item = InventarioItem.objects.get(pk=res.data['item']['id'])
        self.assertEqual(item.cantidad, 1)
        self.assertEqual(item.fuente, InventarioItem.Fuente.SYSCOM)
        self.assertEqual(item.ref_externa, '210627')
        self.assertEqual(InventarioMovimiento.objects.count(), 0)

    def test_reutiliza_item_existente_por_modelo(self):
        existing = InventarioItem.objects.create(
            codigo_barras='DS-KIS604-P(C)',
            cantidad=4,
            modelo='DS-KIS604-P(C)',
            nombre='Ya en almacén',
        )
        res = self.client.post(
            self.URL,
            {
                'fuente': 'syscom',
                'ref': '210627',
                'modelo': 'DS-KIS604-P(C)',
                'nombre': 'Kit videoportero',
            },
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.data['creado'])
        self.assertEqual(res.data['item']['id'], existing.id)
        existing.refresh_from_db()
        self.assertEqual(existing.cantidad, 4)

    def test_manual_guarda_ref_con_stock_inicial_uno(self):
        res = self.client.post(
            self.URL,
            {
                'fuente': 'manual',
                'ref': '12',
                'modelo': 'DF-GPS-1',
                'nombre': 'GPS Tracker Pro',
                'marca': 'DigitalFlow',
            },
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        item = InventarioItem.objects.get(pk=res.data['item']['id'])
        self.assertEqual(item.cantidad, 1)
        self.assertEqual(item.ref_externa, 'manual:12')
        self.assertEqual(item.fuente, InventarioItem.Fuente.DESCONOCIDO)

    def test_denegado_sin_create(self):
        denied = User.objects.create_user(username='inv_view', password='test-pass-123')
        UserPermissions.objects.create(
            user=denied, permissions={'inventario': {'view': True, 'create': False}}
        )
        self.client.force_authenticate(user=denied)
        res = self.client.post(
            self.URL,
            {'fuente': 'tvc', 'ref': '1', 'modelo': 'X'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class InventarioCatalogoDetalleTests(APITestCase):
    """El detalle por fuente + ref recupera lo que la búsqueda no trae (foto, ficha)."""

    DETALLE_URL = '/api/inventario/catalogo/detalle/'

    def setUp(self):
        self.user = User.objects.create_user(username='inv_det', password='test-pass-123')
        UserPermissions.objects.create(
            user=self.user,
            permissions={'inventario': {'view': True, 'create': True}},
        )
        self.client.force_authenticate(user=self.user)

    @patch(
        'apps.inventario.enrichment._fetch_syscom_detalle',
        return_value={
            'producto_id': '234940',
            'titulo': 'Videoportero IP 2 Megapixel',
            'marca': 'HIKVISION',
            'modelo': 'DS-KV6113-PE1(C)',
            'img_portada': 'https://ftp3.syscom.mx/portada.png',
        },
    )
    def test_devuelve_imagen_por_ref_externa(self, mock_detalle):
        res = self.client.get(f'{self.DETALLE_URL}?fuente=syscom&ref=234940')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['imagen_url'], 'https://ftp3.syscom.mx/portada.png')
        self.assertEqual(res.data['fuente'], 'syscom')
        mock_detalle.assert_called_once_with('234940')

    def test_fuente_sin_catalogo_responde_400(self):
        res = self.client.get(f'{self.DETALLE_URL}?fuente=desconocido&ref=1')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('apps.inventario.enrichment._fetch_syscom', return_value=[])
    @patch('apps.inventario.enrichment._fetch_syscom_detalle', return_value=None)
    def test_producto_ausente_responde_404(self, _detalle, _busqueda):
        res = self.client.get(f'{self.DETALLE_URL}?fuente=syscom&ref=234940')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    @patch(
        'apps.inventario.enrichment._fetch_syscom_detalle',
        side_effect=requests.RequestException('down'),
    )
    @patch('apps.inventario.enrichment._fetch_syscom', return_value=[])
    def test_catalogo_caido_no_revienta(self, _busqueda, _detalle):
        res = self.client.get(f'{self.DETALLE_URL}?fuente=syscom&ref=234940')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    @patch(
        'apps.inventario.enrichment._fetch_tvc',
        return_value=[{'tvc_id': 55, 'name': 'NVR 8 canales', 'tvc_model': 'TVC-NVR8'}],
    )
    def test_tvc_resuelve_por_modelo(self, _tvc):
        res = self.client.get(f'{self.DETALLE_URL}?fuente=tvc&ref=55&modelo=TVC-NVR8')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['ref_externa'], '55')

    def test_denegado_sin_permiso(self):
        sin_permiso = User.objects.create_user(username='inv_det_nope', password='test-pass-123')
        UserPermissions.objects.create(user=sin_permiso, permissions={'inventario': {}})
        self.client.force_authenticate(user=sin_permiso)
        res = self.client.get(f'{self.DETALLE_URL}?fuente=syscom&ref=1')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class InventarioCaracteristicasTests(APITestCase):
    """Las notas del ítem se alimentan de las características del catálogo."""

    def setUp(self):
        self.user = User.objects.create_user(username='inv_carac', password='test-pass-123')
        UserPermissions.objects.create(
            user=self.user,
            permissions={'inventario': {'view': True, 'create': True}},
        )
        self.client.force_authenticate(user=self.user)

    def test_lista_de_caracteristicas_se_vuelve_texto(self):
        mapped = _map_product(
            {
                'producto_id': 1,
                'titulo': 'Cámara',
                'caracteristicas': ['Lente 2.8 mm', 'IP67', ''],
            },
            'syscom',
        )
        self.assertEqual(mapped['caracteristicas'], 'Lente 2.8 mm\nIP67')

    def test_descripcion_html_se_limpia(self):
        mapped = _map_product(
            {
                'producto_id': 1,
                'titulo': 'Cámara',
                'descripcion': '<ul><li>Resoluci&oacute;n 4&nbsp;MP</li><li>PoE</li></ul>',
            },
            'syscom',
        )
        self.assertNotIn('<', mapped['caracteristicas'])
        self.assertEqual(mapped['caracteristicas'], 'Resolución 4 MP\nPoE')

    def test_tvc_usa_sus_etiquetas_como_respaldo(self):
        mapped = _map_product(
            {'tvc_id': 55, 'name': 'NVR', 'hash_tags': ['nvr', '8 canales']},
            'tvc',
        )
        self.assertEqual(mapped['caracteristicas'], 'nvr · 8 canales')

    @patch('apps.inventario.enrichment._get_syscom_tipo_cambio', return_value=Decimal('17.27'))
    def test_map_product_precio_lista_a_mxn(self, _tc):
        mapped = _map_product(
            {
                'producto_id': 1,
                'titulo': 'Botonera',
                'precios': {
                    'precio_lista': '14.66',
                    'precio_especial': '14.52',
                    'precio_descuento': '9.10',
                },
            },
            'syscom',
        )
        # El más bajo (descuento 9.10) × 17.27 × 1.16
        esperado = (Decimal('9.10') * Decimal('17.27') * Decimal('1.16')).quantize(Decimal('0.01'))
        self.assertEqual(mapped['precio_unitario'], format(esperado, 'f'))

    def test_map_product_tvc_usa_precio_mxn(self):
        mapped = _map_product(
            {'tvc_id': 9, 'name': 'Cable', 'precio_mxn': 1234.5},
            'tvc',
        )
        self.assertEqual(mapped['precio_unitario'], '1234.50')

    def test_map_product_tvc_escala_al_descuento(self):
        mapped = _map_product(
            {
                'tvc_id': 9,
                'name': 'Cable',
                'precio_mxn': 1160.0,
                'precios': {'precio_lista': '100', 'precio_descuento': '80'},
            },
            'tvc',
        )
        # 1160 × 80/100
        self.assertEqual(mapped['precio_unitario'], '928.00')

    def test_map_product_asigna_seccion_desde_categoria(self):
        mapped = _map_product(
            {
                'producto_id': 1,
                'titulo': 'Cámara',
                'categorias': [{'id': '22', 'nombre': 'Videovigilancia', 'nivel': 1}],
            },
            'syscom',
        )
        self.assertEqual(mapped['seccion'], 'videovigilancia')

    def test_map_product_seccion_por_id_syscom_control_acceso(self):
        mapped = _map_product(
            {
                'producto_id': 2,
                'titulo': 'Lector',
                'categorias': [{'id': '37', 'nombre': 'Control  de Acceso', 'nivel': 1}],
            },
            'syscom',
        )
        self.assertEqual(mapped['seccion'], 'control_acceso')

    def test_map_product_marketing_sin_seccion(self):
        mapped = _map_product(
            {
                'producto_id': 3,
                'titulo': 'Flyer',
                'categorias': [{'id': '65747', 'nombre': 'Marketing', 'nivel': 1}],
            },
            'syscom',
        )
        self.assertEqual(mapped['seccion'], '')

    def test_map_product_sin_categoria_deja_seccion_vacia(self):
        mapped = _map_product({'producto_id': 1, 'titulo': 'X'}, 'syscom')
        self.assertEqual(mapped['seccion'], '')

    @patch(
        'apps.inventario.views.enrich_from_catalogs',
        return_value={
            'nombre': 'Botonera',
            'marca': 'ACCESSPRO',
            'modelo': 'XBSSW01',
            'fuente': 'syscom',
            'ref_externa': '78542',
            'imagen_url': '',
            'caracteristicas': '',
            'precio_unitario': '291.12',
        },
    )
    def test_scan_guarda_precio_unitario(self, _enrich):
        res = self.client.post(
            '/api/inventario/scan/',
            {'codigo_barras': 'XBSSW01', 'modo': 'entrada'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        item = InventarioItem.objects.get(codigo_barras='XBSSW01')
        self.assertEqual(item.precio_unitario, Decimal('291.12'))

    def test_patch_precio_unitario(self):
        item = InventarioItem.objects.create(codigo_barras='P-1', cantidad=1)
        res = self.client.patch(
            f'/api/inventario/items/{item.id}/',
            {'precio_unitario': '99.50'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        item.refresh_from_db()
        self.assertEqual(item.precio_unitario, Decimal('99.50'))

    def test_texto_largo_se_recorta(self):
        mapped = _map_product(
            {'producto_id': 1, 'titulo': 'X', 'descripcion': 'a' * (MAX_CARACTERISTICAS + 500)},
            'syscom',
        )
        self.assertEqual(len(mapped['caracteristicas']), MAX_CARACTERISTICAS)

    def test_sin_datos_queda_vacio(self):
        mapped = _map_product({'producto_id': 1, 'titulo': 'X'}, 'syscom')
        self.assertEqual(mapped['caracteristicas'], '')

    @patch(
        'apps.inventario.views.enrich_from_catalogs',
        return_value={
            'nombre': 'Cámara IP',
            'marca': 'HIKVISION',
            'modelo': 'DS-2CD1023',
            'fuente': 'syscom',
            'ref_externa': '111',
            'imagen_url': '',
            'caracteristicas': 'Lente 2.8 mm\nIP67',
        },
    )
    def test_alta_automatica_guarda_caracteristicas_en_notas(self, _enrich):
        res = self.client.post(
            '/api/inventario/scan/',
            {'codigo_barras': 'DS-2CD1023', 'modo': 'entrada'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['item']['notas'], 'Lente 2.8 mm\nIP67')

    @patch(
        'apps.inventario.enrichment._fetch_syscom_detalle',
        return_value={
            'producto_id': '234940',
            'titulo': 'Videoportero IP',
            'marca': 'HIKVISION',
            'modelo': 'DS-KV6113-PE1(C)',
            'caracteristicas': ['Pantalla 2"', 'PoE 802.3af'],
        },
    )
    def test_detalle_por_ref_devuelve_caracteristicas(self, mock_detalle):
        res = self.client.get('/api/inventario/catalogo/detalle/?fuente=syscom&ref=234940')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['caracteristicas'], 'Pantalla 2"\nPoE 802.3af')
        mock_detalle.assert_called_once_with('234940')

    def test_detalle_sin_referencia_responde_400(self):
        res = self.client.get('/api/inventario/catalogo/detalle/?fuente=syscom')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class InventarioVinculacionTests(APITestCase):
    """Vincular una vez deja el mapeo guardado: el siguiente escaneo ya trae datos."""

    def setUp(self):
        self.user = User.objects.create_user(username='inv_link', password='test-pass-123')
        UserPermissions.objects.create(
            user=self.user,
            permissions={'inventario': {'view': True, 'create': True}},
        )
        self.client.force_authenticate(user=self.user)
        self.item = InventarioItem.objects.create(codigo_barras='305303442', cantidad=3)

    def test_patch_vincula_producto_de_catalogo(self):
        res = self.client.patch(
            f'/api/inventario/items/{self.item.id}/',
            {
                'nombre': 'Kit de Videoportero IP PoE',
                'marca': 'HIKVISION',
                'modelo': 'DS-KIS604-P(C)',
                'fuente': 'syscom',
                'ref_externa': '210627',
            },
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.item.refresh_from_db()
        self.assertEqual(self.item.fuente, 'syscom')
        self.assertEqual(self.item.ref_externa, '210627')

    def test_patch_rechaza_fuente_invalida(self):
        res = self.client.patch(
            f'/api/inventario/items/{self.item.id}/',
            {'fuente': 'mercadolibre'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('apps.inventario.views.enrich_from_catalogs', return_value=None)
    def test_escaneo_posterior_conserva_la_vinculacion(self, _enrich):
        self.client.patch(
            f'/api/inventario/items/{self.item.id}/',
            {'nombre': 'Kit de Videoportero IP PoE', 'fuente': 'syscom', 'ref_externa': '210627'},
            format='json',
        )
        res = self.client.post(
            '/api/inventario/scan/',
            {'codigo_barras': '305303442', 'modo': 'entrada'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['item']['nombre'], 'Kit de Videoportero IP PoE')
        self.assertEqual(res.data['item']['fuente'], 'syscom')
        self.assertEqual(res.data['item']['cantidad'], 4)

    def test_patch_guarda_imagen(self):
        res = self.client.patch(
            f'/api/inventario/items/{self.item.id}/',
            {'imagen_url': 'https://res.cloudinary.com/demo/inventario/productos/x.jpg'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.item.refresh_from_db()
        self.assertTrue(self.item.imagen_url.endswith('x.jpg'))

    def test_patch_permite_quitar_imagen(self):
        self.item.imagen_url = 'https://res.cloudinary.com/demo/inventario/productos/x.jpg'
        self.item.save()
        res = self.client.patch(
            f'/api/inventario/items/{self.item.id}/',
            {'imagen_url': ''},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.item.refresh_from_db()
        self.assertEqual(self.item.imagen_url, '')


class InventarioUploadImageTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='inv_img', password='test-pass-123')
        UserPermissions.objects.create(
            user=self.user,
            permissions={'inventario': {'view': True, 'create': True}},
        )
        self.client.force_authenticate(user=self.user)

    def test_rechaza_data_url_invalido(self):
        res = self.client.post(
            '/api/inventario/upload-image/', {'data_url': 'no-es-imagen'}, format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('apps.inventario.views.upload_data_url', return_value='https://cdn/x.jpg')
    @patch('apps.inventario.views.cloudinary', new=object())
    def test_sube_imagen(self, mock_upload):
        res = self.client.post(
            '/api/inventario/upload-image/',
            {'data_url': 'data:image/png;base64,AAAA'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['url'], 'https://cdn/x.jpg')
        self.assertEqual(mock_upload.call_args.kwargs['folder'], 'inventario/productos')

    def test_denegado_sin_create(self):
        sin_create = User.objects.create_user(username='inv_img_no', password='test-pass-123')
        UserPermissions.objects.create(
            user=sin_create, permissions={'inventario': {'view': True, 'create': False}}
        )
        self.client.force_authenticate(user=sin_create)
        res = self.client.post(
            '/api/inventario/upload-image/',
            {'data_url': 'data:image/png;base64,AAAA'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class InventarioBorradoTests(APITestCase):
    """Un producto puede traer varios códigos de barras: hay que poder limpiar errores."""

    def setUp(self):
        self.item = InventarioItem.objects.create(codigo_barras='DUP-1', cantidad=2)
        InventarioMovimiento.objects.create(item=self.item, tipo='entrada', cantidad=1)

    def _auth(self, **perms):
        user = User.objects.create_user(
            username=f'inv_del_{len(perms)}_{perms.get("delete")}', password='test-pass-123'
        )
        UserPermissions.objects.create(user=user, permissions={'inventario': perms})
        self.client.force_authenticate(user=user)
        return user

    def test_borrado_denegado_sin_permiso_delete(self):
        self._auth(view=True, create=True, edit=True, delete=False)
        res = self.client.delete(f'/api/inventario/items/{self.item.id}/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(InventarioItem.objects.filter(pk=self.item.pk).exists())

    def test_borra_item_y_sus_movimientos(self):
        self._auth(view=True, delete=True)
        res = self.client.delete(f'/api/inventario/items/{self.item.id}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(InventarioItem.objects.filter(pk=self.item.pk).exists())
        self.assertEqual(InventarioMovimiento.objects.filter(item_id=self.item.pk).count(), 0)

    @patch('apps.inventario.views.delete_cloudinary_resource')
    def test_borrado_limpia_imagen(self, mock_delete):
        self.item.imagen_url = 'https://res.cloudinary.com/demo/inventario/productos/x.jpg'
        self.item.save()
        self._auth(view=True, delete=True)
        res = self.client.delete(f'/api/inventario/items/{self.item.id}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        mock_delete.assert_called_once_with(self.item.imagen_url)


class InventarioImportarFacturaTests(APITestCase):
    """Importar factura SYSCOM (contrato listo para TVC)."""

    FACTURA = {
        'folio_factura': 'FA26/1405777',
        'productos': [
            {
                'producto_id': '230540',
                'cod_art': 'DS1LN5ESB',
                'titulo': 'Bobina de Cable UTP / Cat5E / Color Azul',
                'marca': 'HIKVISION',
                'imagen': 'https://ftp3.syscom.mx/bobina.png',
                'cantidad': '2',
                'precio_unitario': '1755.69',
            },
            {
                'producto_id': '234940',
                'cod_art': 'DS-KV6113',
                'titulo': 'Videoportero IP',
                'marca': 'HIKVISION',
                'imagen': 'https://ftp3.syscom.mx/portero.png',
                'cantidad': '1',
                'precio_unitario': '2500.00',
            },
            {
                'producto_id': '136321',
                'cod_art': 'ENVIO',
                'titulo': 'Env&iacute;o Terrestre 24-48 Horas / A&eacute;reo Menores a 35KG',
                'marca': 'SYSCOM',
                'imagen': '',
                'cantidad': '1',
                'precio_unitario': '1.68',
            },
        ],
    }

    def setUp(self):
        self.user = User.objects.create_user(username='inv_imp', password='test-pass-123')
        UserPermissions.objects.create(
            user=self.user,
            permissions={'inventario': {'view': True, 'create': True}},
        )
        self.client.force_authenticate(user=self.user)

    def _post(self, proveedor='syscom', folio='FA26/1405777'):
        return self.client.post(
            '/api/inventario/importar-factura/',
            {'proveedor': proveedor, 'folio': folio},
            format='json',
        )

    @patch('apps.inventario.invoice_import.fetch_syscom_factura')
    def test_importa_crea_items_y_movimientos(self, mock_fetch):
        from decimal import Decimal

        from apps.inventario.invoice_import import FacturaDetalle, FacturaLinea

        mock_fetch.return_value = FacturaDetalle(
            folio='FA26/1405777',
            lineas=[
                FacturaLinea(
                    ref_externa='230540',
                    modelo='DS1LN5ESB',
                    nombre='Bobina de Cable UTP',
                    marca='HIKVISION',
                    imagen_url='https://ftp3.syscom.mx/bobina.png',
                    cantidad=2,
                    caracteristicas='Cat5E\nColor Azul',
                    precio_unitario=Decimal('1755.69'),
                ),
                FacturaLinea(
                    ref_externa='234940',
                    modelo='DS-KV6113',
                    nombre='Videoportero IP',
                    marca='HIKVISION',
                    imagen_url='https://ftp3.syscom.mx/portero.png',
                    cantidad=1,
                    precio_unitario=Decimal('2500.00'),
                ),
            ],
        )
        res = self._post()
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['creados'], 2)
        self.assertEqual(res.data['movimientos'], 2)
        bobina = InventarioItem.objects.get(codigo_barras='DS1LN5ESB')
        self.assertEqual(bobina.cantidad, 2)
        self.assertEqual(bobina.fuente, 'syscom')
        self.assertEqual(bobina.ref_externa, '230540')
        self.assertEqual(bobina.notas, 'Cat5E\nColor Azul')
        self.assertEqual(bobina.folio_factura, 'FA26/1405777')
        self.assertEqual(bobina.precio_unitario, Decimal('1755.69'))
        self.assertIsNotNone(bobina.proveedor_id)
        self.assertEqual(bobina.proveedor.nombre, 'SYSCOM')
        self.assertEqual(bobina.proveedor.tipo, 'PROVEEDOR')
        mov = InventarioMovimiento.objects.get(item=bobina)
        self.assertEqual(mov.cantidad, 2)
        self.assertEqual(mov.tipo, 'entrada')
        self.assertIn('FA26/1405777', mov.nota)

    @patch('apps.inventario.invoice_import.fetch_syscom_factura')
    def test_sobrescribe_ultima_compra(self, mock_fetch):
        from decimal import Decimal

        from apps.clientes.models import Cliente
        from apps.inventario.invoice_import import FacturaDetalle, FacturaLinea

        viejo = Cliente.objects.create(nombre='Otro', tipo='PROVEEDOR', clave='OTRO')
        item = InventarioItem.objects.create(
            codigo_barras='DS1LN5ESB',
            nombre='Bobina',
            fuente='syscom',
            ref_externa='230540',
            cantidad=1,
            folio_factura='FA26/1111111',
            proveedor=viejo,
            precio_unitario=Decimal('100.00'),
        )
        mock_fetch.return_value = FacturaDetalle(
            folio='FA26/1405777',
            lineas=[
                FacturaLinea(
                    ref_externa='230540',
                    modelo='DS1LN5ESB',
                    nombre='Bobina de Cable UTP',
                    marca='HIKVISION',
                    imagen_url='',
                    cantidad=1,
                    precio_unitario=Decimal('1755.69'),
                ),
            ],
        )
        res = self._post()
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        item.refresh_from_db()
        self.assertEqual(item.folio_factura, 'FA26/1405777')
        self.assertEqual(item.precio_unitario, Decimal('1755.69'))
        self.assertEqual(item.proveedor.nombre, 'SYSCOM')
        self.assertEqual(item.cantidad, 2)

    @patch('apps.inventario.invoice_import.fetch_syscom_factura')
    def test_suma_en_item_ya_vinculado(self, mock_fetch):
        from apps.inventario.invoice_import import FacturaDetalle, FacturaLinea

        existente = InventarioItem.objects.create(
            codigo_barras='6931847170448',
            nombre='Videoportero',
            modelo='DS-KV6113',
            fuente='syscom',
            ref_externa='234940',
            cantidad=1,
        )
        mock_fetch.return_value = FacturaDetalle(
            folio='FA26/1405777',
            lineas=[
                FacturaLinea(
                    ref_externa='234940',
                    modelo='DS-KV6113',
                    nombre='Videoportero IP',
                    marca='HIKVISION',
                    imagen_url='',
                    cantidad=3,
                ),
            ],
        )
        res = self._post()
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['creados'], 0)
        self.assertEqual(res.data['actualizados'], 1)
        existente.refresh_from_db()
        self.assertEqual(existente.cantidad, 4)
        self.assertEqual(existente.codigo_barras, '6931847170448')

    @patch('apps.inventario.invoice_import.fetch_syscom_factura')
    def test_reimport_bloqueado(self, mock_fetch):
        from apps.inventario.invoice_import import FacturaDetalle, FacturaLinea

        mock_fetch.return_value = FacturaDetalle(
            folio='FA26/1405777',
            lineas=[
                FacturaLinea(
                    ref_externa='1',
                    modelo='X1',
                    nombre='X',
                    marca='',
                    imagen_url='',
                    cantidad=1,
                ),
            ],
        )
        self.assertEqual(self._post().status_code, status.HTTP_200_OK)
        res = self._post()
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(InventarioItem.objects.get(codigo_barras='X1').cantidad, 1)

    def test_tvc_responde_501(self):
        res = self._post(proveedor='tvc', folio='TVC-1')
        self.assertEqual(res.status_code, status.HTTP_501_NOT_IMPLEMENTED)

    def test_folio_vacio_400(self):
        res = self._post(folio='   ')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_denegado_sin_create(self):
        sin = User.objects.create_user(username='inv_imp_nope', password='test-pass-123')
        UserPermissions.objects.create(user=sin, permissions={'inventario': {'view': True}})
        self.client.force_authenticate(user=sin)
        res = self._post()
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_map_syscom_linea_nombre_corto(self):
        from apps.inventario.invoice_import import _map_syscom_linea

        linea = _map_syscom_linea(self.FACTURA['productos'][0])
        self.assertIsNotNone(linea)
        assert linea is not None
        self.assertEqual(linea.nombre, 'Bobina de Cable UTP')
        self.assertEqual(linea.caracteristicas, 'Cat5E\nColor Azul')
        self.assertEqual(linea.cantidad, 2)
        self.assertEqual(linea.modelo, 'DS1LN5ESB')
        from decimal import Decimal

        self.assertEqual(linea.precio_unitario, Decimal('1755.69'))

    def test_obtener_o_crear_proveedor_reusa_existente(self):
        from apps.clientes.models import Cliente
        from apps.inventario.invoice_import import obtener_o_crear_proveedor

        creado = Cliente.objects.create(nombre='Syscom', tipo='PROVEEDOR', clave='SYSCOM')
        hallado = obtener_o_crear_proveedor('syscom')
        self.assertEqual(hallado.id, creado.id)
        self.assertEqual(Cliente.objects.filter(tipo='PROVEEDOR', nombre__iexact='SYSCOM').count(), 1)

    @patch('apps.productos.syscom_views._syscom_get')
    @patch('apps.productos.syscom_views._get_syscom_token', return_value=('tok', None))
    def test_fetch_syscom_factura_real_shape(self, _token, mock_get):
        from apps.inventario.invoice_import import fetch_syscom_factura

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = self.FACTURA
        mock_get.return_value = mock_resp
        detalle = fetch_syscom_factura('fa26/1405777')
        self.assertEqual(detalle.folio, 'FA26/1405777')
        # La tercera línea es el envío: se descarta, no es mercancía.
        self.assertEqual(len(detalle.lineas), 2)
        self.assertEqual(detalle.lineas[0].modelo, 'DS1LN5ESB')
        self.assertNotIn('ENVIO', [linea.modelo for linea in detalle.lineas])

    def test_envio_no_entra_al_inventario(self):
        from apps.inventario.invoice_import import _map_syscom_linea, es_linea_de_servicio

        self.assertIsNone(_map_syscom_linea(self.FACTURA['productos'][2]))
        self.assertTrue(es_linea_de_servicio('ENVIO'))
        self.assertTrue(es_linea_de_servicio('flete-local'))
        self.assertTrue(es_linea_de_servicio('SEGURO'))
        self.assertFalse(es_linea_de_servicio('DS1LN5ESB'))
        self.assertFalse(es_linea_de_servicio(''))

    def test_titulo_con_entidades_html_se_limpia(self):
        from apps.inventario.invoice_import import _map_syscom_linea

        linea = _map_syscom_linea(
            {
                'producto_id': '203940',
                'cod_art': 'DS1280ZJXS(BLACK)',
                'titulo': 'Caja de Conexi&oacute;n de Metal / Exterior IP66',
                'marca': 'HIKVISION',
                'cantidad': '3',
            }
        )
        assert linea is not None
        self.assertEqual(linea.nombre, 'Caja de Conexión de Metal')
        self.assertEqual(linea.caracteristicas, 'Exterior IP66')

