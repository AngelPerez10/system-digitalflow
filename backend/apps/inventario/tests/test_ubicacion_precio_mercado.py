"""Ubicación (solo al editar la ficha) y precio de mercado de SYSCOM/TVC."""
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.inventario.enrichment import actualizar_precio_mercado, sincronizar_precios_mercado
from apps.inventario.invoice_import import FacturaDetalle, FacturaLinea
from apps.inventario.models import InventarioItem, InventarioPendiente
from apps.users.models import UserPermissions

User = get_user_model()

FETCH = 'apps.inventario.invoice_import.fetch_syscom_factura'
DETALLE = 'apps.inventario.enrichment.fetch_catalog_detail'


def _factura():
    return FacturaDetalle(
        folio='FA26/1',
        lineas=[
            FacturaLinea(
                ref_externa='1', modelo='NUEVO-1', nombre='Cámara', marca='HIK',
                imagen_url='', cantidad=2, precio_unitario=Decimal('100.00'),
            ),
            FacturaLinea(
                ref_externa='2', modelo='EXISTE-1', nombre='Switch', marca='TP',
                imagen_url='', cantidad=1, precio_unitario=Decimal('50.00'),
            ),
        ],
    )


class _Base(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='inv_ubic', password='test-pass-123')
        UserPermissions.objects.create(
            user=self.user,
            permissions={'inventario': {'view': True, 'create': True, 'edit': True}},
        )
        self.client.force_authenticate(user=self.user)


class UbicacionSoloAlEditarTests(_Base):
    """La ubicación no se pide al dar de alta; se asigna al editar la ficha."""

    @patch('apps.inventario.views.enrich_from_catalogs', return_value=None)
    def test_scan_de_codigo_nuevo_se_crea_sin_ubicacion(self, _enrich):
        res = self.client.post(
            '/api/inventario/scan/', {'codigo_barras': 'NUEVO', 'modo': 'entrada'}, format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['creado'])
        self.assertEqual(res.data['item']['ubicacion'], '')

    @patch('apps.inventario.views.enrich_from_catalogs', return_value=None)
    def test_scan_ignora_la_ubicacion_enviada(self, _enrich):
        res = self.client.post(
            '/api/inventario/scan/',
            {'codigo_barras': 'NUEVO', 'modo': 'entrada', 'ubicacion': 'exhibicion'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['item']['ubicacion'], '')

    def test_scan_de_codigo_existente_conserva_su_ubicacion(self):
        InventarioItem.objects.create(codigo_barras='YA', cantidad=1, ubicacion='almacen')
        res = self.client.post(
            '/api/inventario/scan/', {'codigo_barras': 'YA', 'modo': 'entrada'}, format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['item']['cantidad'], 2)
        self.assertEqual(res.data['item']['ubicacion'], 'almacen')

    @patch(FETCH)
    def test_factura_crea_productos_nuevos_sin_ubicacion(self, mock_fetch):
        mock_fetch.return_value = _factura()
        InventarioItem.objects.create(codigo_barras='EXISTE-1', cantidad=3, ubicacion='almacen')
        res = self.client.post(
            '/api/inventario/importar-factura/',
            {
                'proveedor': 'syscom',
                'folio': 'FA26/1',
                'recepcion': [
                    {'indice': 0, 'modelo': 'NUEVO-1', 'recibida': 2},
                    {'indice': 1, 'modelo': 'EXISTE-1', 'recibida': 1},
                ],
            },
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(InventarioItem.objects.get(codigo_barras='NUEVO-1').ubicacion, '')
        existente = InventarioItem.objects.get(codigo_barras='EXISTE-1')
        self.assertEqual(existente.ubicacion, 'almacen')
        self.assertEqual(existente.cantidad, 4)

    @patch(FETCH)
    def test_factura_sin_recepcion_no_asigna_almacen(self, mock_fetch):
        mock_fetch.return_value = _factura()
        res = self.client.post(
            '/api/inventario/importar-factura/',
            {'proveedor': 'syscom', 'folio': 'FA26/1'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(InventarioItem.objects.get(codigo_barras='NUEVO-1').ubicacion, '')

    @patch(FETCH)
    def test_recibir_pendiente_nuevo_no_pide_ubicacion(self, mock_fetch):
        mock_fetch.return_value = _factura()
        self.client.post(
            '/api/inventario/importar-factura/',
            {'proveedor': 'syscom', 'folio': 'FA26/1', 'recepcion': []},
            format='json',
        )
        pendiente = InventarioPendiente.objects.get(modelo='NUEVO-1')
        listado = self.client.get('/api/inventario/pendientes/').data
        self.assertNotIn('requiere_ubicacion', next(p for p in listado if p['id'] == pendiente.id))

        res = self.client.post(f'/api/inventario/pendientes/{pendiente.id}/recibir/', {}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['item']['ubicacion'], '')

    def test_la_ubicacion_se_asigna_al_editar_pero_no_se_vacia(self):
        item = InventarioItem.objects.create(codigo_barras='Z', cantidad=1)
        res = self.client.patch(f'/api/inventario/items/{item.id}/', {'ubicacion': 'exhibicion'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['ubicacion'], 'exhibicion')
        res = self.client.patch(f'/api/inventario/items/{item.id}/', {'ubicacion': 'bodega'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        res = self.client.patch(f'/api/inventario/items/{item.id}/', {'ubicacion': ''}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class UbicacionFiltroTests(_Base):
    def setUp(self):
        super().setUp()
        InventarioItem.objects.create(codigo_barras='EXH', cantidad=1, ubicacion='exhibicion')
        InventarioItem.objects.create(codigo_barras='ALM', cantidad=1, ubicacion='almacen')
        InventarioItem.objects.create(codigo_barras='SIN', cantidad=1)

    def _codigos(self, ubicacion):
        res = self.client.get('/api/inventario/items/', {'ubicacion': ubicacion})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        return {row['codigo_barras'] for row in res.data['results']}

    def test_filtra_por_ubicacion(self):
        self.assertEqual(self._codigos('exhibicion'), {'EXH'})
        self.assertEqual(self._codigos('almacen'), {'ALM'})
        self.assertEqual(self._codigos('sin'), {'SIN'})
        self.assertEqual(self._codigos(''), {'EXH', 'ALM', 'SIN'})

    def test_ubicacion_invalida_es_400(self):
        res = self.client.get('/api/inventario/items/', {'ubicacion': 'bodega'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_stats_cuenta_los_sin_ubicacion(self):
        res = self.client.get('/api/inventario/stats/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['sin_ubicacion'], 1)


class PrecioMercadoTests(_Base):
    def _item(self, **kw):
        datos = {'codigo_barras': 'DS-1', 'fuente': 'syscom', 'ref_externa': '99', 'modelo': 'DS-1'}
        datos.update(kw)
        return InventarioItem.objects.create(**datos)

    @patch(DETALLE, return_value={'precio_lista': '1160.00'})
    def test_sube_el_precio_y_guarda_el_anterior(self, _detalle):
        item = self._item(precio_mercado=Decimal('1000.00'))
        self.assertTrue(actualizar_precio_mercado(item))
        item.refresh_from_db()
        self.assertEqual(item.precio_mercado, Decimal('1160.00'))
        self.assertEqual(item.precio_mercado_anterior, Decimal('1000.00'))
        self.assertIsNotNone(item.precio_mercado_actualizado)

    @patch(DETALLE, return_value={'precio_lista': '1000.00'})
    def test_mismo_precio_no_cambia_el_anterior(self, _detalle):
        item = self._item(precio_mercado=Decimal('1000.00'), precio_mercado_anterior=Decimal('900.00'))
        self.assertFalse(actualizar_precio_mercado(item))
        item.refresh_from_db()
        self.assertEqual(item.precio_mercado_anterior, Decimal('900.00'))

    @patch(DETALLE)
    def test_producto_propio_no_consulta_al_proveedor(self, detalle):
        item = self._item(fuente='desconocido')
        self.assertFalse(actualizar_precio_mercado(item))
        detalle.assert_not_called()

    @patch(DETALLE, return_value={'precio_lista': '500.00'})
    def test_sincroniza_solo_los_vencidos(self, detalle):
        reciente = self._item(codigo_barras='A', precio_mercado_actualizado=timezone.now())
        viejo = self._item(
            codigo_barras='B', precio_mercado_actualizado=timezone.now() - timedelta(days=2)
        )
        nunca = self._item(codigo_barras='C')
        self._item(codigo_barras='D', fuente='desconocido')

        res = self.client.post('/api/inventario/sincronizar-precios/', {}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['revisados'], 2)
        self.assertEqual(detalle.call_count, 2)
        for obj, esperado in ((reciente, None), (viejo, Decimal('500.00')), (nunca, Decimal('500.00'))):
            obj.refresh_from_db()
            self.assertEqual(obj.precio_mercado, esperado)
        # Una segunda pasada ya no consulta a nadie.
        self.assertEqual(sincronizar_precios_mercado()['revisados'], 0)

    @patch(DETALLE, return_value={'precio_lista': '750.50'})
    def test_actualizar_un_item_bajo_demanda(self, _detalle):
        item = self._item()
        res = self.client.post(f'/api/inventario/items/{item.id}/precio-mercado/', {}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['precio_mercado'], '750.50')

    @patch('apps.inventario.views.enrich_from_catalogs')
    def test_alta_por_escaner_toma_el_precio_de_mercado_del_catalogo(self, enrich):
        enrich.return_value = {
            'nombre': 'Cámara', 'fuente': 'syscom', 'ref_externa': '5',
            'precio_unitario': '900.00', 'precio_lista': '1234.00',
        }
        res = self.client.post(
            '/api/inventario/scan/',
            {'codigo_barras': 'CAM', 'modo': 'entrada', 'ubicacion': 'almacen'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['item']['precio_mercado'], '1234.00')
        # El costo sigue siendo el del catálogo; el precio de venta es la lista.
        self.assertEqual(res.data['item']['precio_unitario'], '900.00')


class SincronizacionPreciosTests(_Base):
    def _item(self, codigo, **kw):
        datos = {'codigo_barras': codigo, 'fuente': 'syscom', 'ref_externa': codigo, 'modelo': codigo}
        datos.update(kw)
        return InventarioItem.objects.create(**datos)

    @patch(DETALLE, return_value={'precio_lista': '100.00'})
    def test_los_visibles_van_primero_y_regresan_sus_valores(self, _detalle):
        otros = [self._item(f'O{i}') for i in range(3)]
        visible = self._item('VISIBLE', precio_mercado_actualizado=timezone.now() - timedelta(days=9))
        res = self.client.post(
            '/api/inventario/sincronizar-precios/', {'limit': 1, 'ids': [visible.id]}, format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual([i['id'] for i in res.data['items']], [visible.id])
        self.assertEqual(res.data['items'][0]['precio_mercado'], '100.00')
        self.assertEqual(res.data['pendientes_restantes'], len(otros))

    @patch(DETALLE, return_value=None)
    def test_sin_respuesta_se_reintenta_pronto(self, _detalle):
        item = self._item('NET')
        sincronizar_precios_mercado()
        item.refresh_from_db()
        self.assertIsNone(item.precio_mercado)
        # Queda vencido de nuevo en ~30 min, no en 3 h.
        edad = timezone.now() - item.precio_mercado_actualizado
        self.assertGreater(edad, timedelta(hours=2))
        self.assertEqual(sincronizar_precios_mercado()['revisados'], 0)

    @patch(DETALLE, return_value={'precio_lista': None, 'nombre': 'X'})
    def test_sin_precio_de_lista_queda_revisado(self, _detalle):
        item = self._item('SINPRECIO')
        res = sincronizar_precios_mercado()
        self.assertEqual(res['revisados'], 1)
        item.refresh_from_db()
        self.assertIsNone(item.precio_mercado)
        self.assertIsNotNone(item.precio_mercado_actualizado)
        self.assertEqual(sincronizar_precios_mercado()['revisados'], 0)


class PrecioListaTests(APITestCase):
    """El precio de venta sale de la lista del proveedor, no del tier más bajo."""

    @patch('apps.inventario.enrichment._get_syscom_tipo_cambio', return_value=Decimal('20'))
    def test_syscom_usa_precio_de_lista(self, _tc):
        from apps.inventario.enrichment import _map_product

        raw = {
            'producto_id': '1',
            'modelo': 'X',
            'precios': {'precio_lista': '100', 'precio_especial': '80', 'precio_descuento': '70'},
        }
        mapped = _map_product(raw, 'syscom')
        self.assertEqual(mapped['precio_lista'], '2320.00')  # 100 × 20 × 1.16
        self.assertEqual(mapped['precio_unitario'], '1624.00')  # costo: tier más bajo (70)

    def test_tvc_usa_precio_mxn(self):
        from apps.inventario.enrichment import _map_product

        mapped = _map_product({'tvc_id': '9', 'sku': 'Y', 'precio_mxn': '1500.5'}, 'tvc')
        self.assertEqual(mapped['precio_lista'], '1500.50')
