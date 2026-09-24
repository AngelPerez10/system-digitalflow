"""Importar factura marcando lo recibido; lo que no llega queda en espera."""
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.inventario.invoice_import import FacturaDetalle, FacturaLinea
from apps.inventario.models import (
    InventarioImportacion,
    InventarioItem,
    InventarioMovimiento,
    InventarioPendiente,
)
from apps.users.models import UserPermissions

User = get_user_model()

FETCH = 'apps.inventario.invoice_import.fetch_syscom_factura'


def _factura():
    return FacturaDetalle(
        folio='FA26/1405777',
        lineas=[
            FacturaLinea(
                ref_externa='230540',
                modelo='DS1LN5ESB',
                nombre='Bobina de Cable UTP',
                marca='HIKVISION',
                imagen_url='https://ftp3.syscom.mx/bobina.png',
                cantidad=4,
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


class FacturaRecepcionTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='inv_rec', password='test-pass-123')
        self.perms = UserPermissions.objects.create(
            user=self.user,
            permissions={'inventario': {'view': True, 'create': True, 'delete': True}},
        )
        self.client.force_authenticate(user=self.user)

    def _importar(self, recepcion=None):
        body = {'proveedor': 'syscom', 'folio': 'FA26/1405777'}
        if recepcion is not None:
            body['recepcion'] = recepcion
        return self.client.post('/api/inventario/importar-factura/', body, format='json')

    @patch(FETCH)
    def test_vista_previa_no_toca_inventario(self, mock_fetch):
        mock_fetch.return_value = _factura()
        InventarioItem.objects.create(codigo_barras='DS-KV6113', cantidad=3)

        res = self.client.post(
            '/api/inventario/importar-factura/previsualizar/',
            {'proveedor': 'syscom', 'folio': 'fa26/1405777'},
            format='json',
        )

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['folio'], 'FA26/1405777')
        self.assertEqual([l['indice'] for l in res.data['lineas']], [0, 1])
        self.assertEqual(res.data['lineas'][0]['precio_unitario'], '1755.69')
        self.assertIsNone(res.data['lineas'][0]['en_inventario'])
        self.assertEqual(res.data['lineas'][1]['en_inventario']['cantidad'], 3)
        self.assertEqual(InventarioItem.objects.count(), 1)
        self.assertFalse(InventarioImportacion.objects.exists())
        self.assertFalse(InventarioMovimiento.objects.exists())

    @patch(FETCH)
    def test_vista_previa_de_folio_ya_importado_es_409(self, mock_fetch):
        mock_fetch.return_value = _factura()
        InventarioImportacion.objects.create(proveedor='syscom', folio='FA26/1405777')
        res = self.client.post(
            '/api/inventario/importar-factura/previsualizar/',
            {'proveedor': 'syscom', 'folio': 'FA26/1405777'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)

    @patch(FETCH)
    def test_recepcion_parcial_deja_el_resto_en_espera(self, mock_fetch):
        mock_fetch.return_value = _factura()

        res = self._importar(
            [
                {'indice': 0, 'modelo': 'DS1LN5ESB', 'recibida': 3, 'ubicacion': 'almacen'},
                {'indice': 1, 'modelo': 'DS-KV6113', 'recibida': 0, 'ubicacion': 'almacen'},
            ]
        )

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['creados'], 1)
        self.assertEqual(res.data['movimientos'], 1)
        bobina = InventarioItem.objects.get(codigo_barras='DS1LN5ESB')
        self.assertEqual(bobina.cantidad, 3)
        self.assertFalse(InventarioItem.objects.filter(codigo_barras='DS-KV6113').exists())

        pendientes = {p.modelo: p for p in InventarioPendiente.objects.all()}
        self.assertEqual(pendientes['DS1LN5ESB'].cantidad, 1)
        self.assertEqual(pendientes['DS1LN5ESB'].cantidad_facturada, 4)
        self.assertEqual(pendientes['DS-KV6113'].cantidad, 1)
        self.assertEqual(len(res.data['pendientes']), 2)
        # El folio queda registrado aunque haya pendientes.
        self.assertTrue(InventarioImportacion.objects.filter(folio='FA26/1405777').exists())

    @patch(FETCH)
    def test_linea_omitida_se_considera_no_recibida(self, mock_fetch):
        mock_fetch.return_value = _factura()
        res = self._importar([{'indice': 1, 'modelo': 'DS-KV6113', 'recibida': 1, 'ubicacion': 'almacen'}])
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(InventarioPendiente.objects.get().modelo, 'DS1LN5ESB')

    @patch(FETCH)
    def test_recibida_mayor_a_facturada_se_limita(self, mock_fetch):
        mock_fetch.return_value = _factura()
        self._importar(
            [
                {'indice': 0, 'modelo': 'DS1LN5ESB', 'recibida': 99, 'ubicacion': 'almacen'},
                {'indice': 1, 'modelo': 'DS-KV6113', 'recibida': 1, 'ubicacion': 'almacen'},
            ]
        )
        self.assertEqual(InventarioItem.objects.get(codigo_barras='DS1LN5ESB').cantidad, 4)
        self.assertFalse(InventarioPendiente.objects.exists())

    @patch(FETCH)
    def test_factura_cambiada_no_aplica_la_seleccion(self, mock_fetch):
        mock_fetch.return_value = _factura()
        res = self._importar([{'indice': 0, 'modelo': 'OTRO-MODELO', 'recibida': 1, 'ubicacion': 'almacen'}])
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(InventarioImportacion.objects.exists())
        self.assertFalse(InventarioItem.objects.exists())

    @patch(FETCH)
    def test_sin_recepcion_importa_todo_como_antes(self, mock_fetch):
        mock_fetch.return_value = _factura()
        res = self._importar()
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['movimientos'], 2)
        self.assertEqual(res.data['pendientes'], [])
        self.assertFalse(InventarioPendiente.objects.exists())

    @patch(FETCH)
    def test_recibir_pendiente_parcial_y_total(self, mock_fetch):
        mock_fetch.return_value = _factura()
        self._importar([{'indice': 0, 'modelo': 'DS1LN5ESB', 'recibida': 0, 'ubicacion': 'almacen'}, {'indice': 1, 'modelo': 'DS-KV6113', 'recibida': 1, 'ubicacion': 'almacen'}])
        pendiente = InventarioPendiente.objects.get(modelo='DS1LN5ESB')
        self.assertEqual(pendiente.cantidad, 4)

        res = self.client.post(f'/api/inventario/pendientes/{pendiente.id}/recibir/', {'cantidad': 1, 'ubicacion': 'exhibicion'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['recibidas'], 1)
        self.assertEqual(res.data['pendiente']['cantidad'], 3)
        item = InventarioItem.objects.get(codigo_barras='DS1LN5ESB')
        self.assertEqual(item.cantidad, 1)
        self.assertEqual(item.folio_factura, 'FA26/1405777')
        self.assertEqual(item.precio_unitario, Decimal('1755.69'))

        res = self.client.post(f'/api/inventario/pendientes/{pendiente.id}/recibir/', {}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsNone(res.data['pendiente'])
        item.refresh_from_db()
        self.assertEqual(item.cantidad, 4)
        self.assertFalse(InventarioPendiente.objects.filter(id=pendiente.id).exists())
        self.assertEqual(
            InventarioMovimiento.objects.filter(item=item, nota__startswith='Recepción pendiente').count(), 2
        )

    @patch(FETCH)
    def test_recibir_mas_de_lo_pendiente_es_400(self, mock_fetch):
        mock_fetch.return_value = _factura()
        self._importar([{'indice': 1, 'modelo': 'DS-KV6113', 'recibida': 1, 'ubicacion': 'almacen'}])
        pendiente = InventarioPendiente.objects.get()
        res = self.client.post(f'/api/inventario/pendientes/{pendiente.id}/recibir/', {'cantidad': 9}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(InventarioPendiente.objects.get().cantidad, 4)

    @patch(FETCH)
    def test_listar_y_descartar_pendiente(self, mock_fetch):
        mock_fetch.return_value = _factura()
        self._importar([])
        res = self.client.get('/api/inventario/pendientes/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 2)

        pid = res.data[0]['id']
        res = self.client.delete(f'/api/inventario/pendientes/{pid}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(InventarioPendiente.objects.count(), 1)
        self.assertFalse(InventarioItem.objects.exists())

    @patch(FETCH)
    def test_descartar_sin_permiso_de_eliminar_es_403(self, mock_fetch):
        mock_fetch.return_value = _factura()
        self._importar([])
        self.perms.permissions = {'inventario': {'view': True, 'create': True}}
        self.perms.save()
        pid = InventarioPendiente.objects.first().id
        res = self.client.delete(f'/api/inventario/pendientes/{pid}/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(InventarioPendiente.objects.filter(id=pid).exists())
