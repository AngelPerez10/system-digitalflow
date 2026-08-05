from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch

from apps.inventario.models import InventarioItem
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
