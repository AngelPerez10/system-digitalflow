"""Proveedor elegido a mano en la ficha y productos que llegaron sin pedido."""
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.clientes.models import Cliente
from apps.inventario.models import InventarioItem
from apps.users.models import UserPermissions

User = get_user_model()


class ProveedorManualTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='inv_prov', password='test-pass-123')
        UserPermissions.objects.create(
            user=self.user,
            permissions={'inventario': {'view': True, 'create': True, 'edit': True}},
        )
        self.client.force_authenticate(user=self.user)
        self.proveedor = Cliente.objects.create(nombre='Distribuidora Norte', tipo='PROVEEDOR')
        self.empresa = Cliente.objects.create(nombre='Cliente Final', tipo='EMPRESA')
        # Datos tomados del catálogo de SYSCOM, pero no se compró ahí.
        self.item = InventarioItem.objects.create(
            codigo_barras='CAM-123', modelo='CAM-123', fuente='syscom', ref_externa='999', cantidad=10
        )

    def _patch(self, data):
        return self.client.patch(f'/api/inventario/items/{self.item.pk}/', data, format='json')

    def test_marcar_sin_proveedor_conserva_el_catalogo(self):
        res = self._patch({'sin_proveedor': True})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['sin_proveedor'])
        self.assertIsNone(res.data['proveedor'])
        # El vínculo con SYSCOM sigue para datos y precio de lista.
        self.assertEqual(res.data['fuente'], 'syscom')

    def test_elegir_proveedor_quita_sin_proveedor(self):
        self.item.sin_proveedor = True
        self.item.save()
        res = self._patch({'proveedor': self.proveedor.pk})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['proveedor'], self.proveedor.pk)
        self.assertEqual(res.data['proveedor_nombre'], 'Distribuidora Norte')
        self.assertFalse(res.data['sin_proveedor'])

    def test_sin_proveedor_limpia_el_proveedor_elegido(self):
        self.item.proveedor = self.proveedor
        self.item.save()
        res = self._patch({'sin_proveedor': True})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsNone(res.data['proveedor'])

    def test_rechaza_contacto_que_no_es_proveedor(self):
        res = self._patch({'proveedor': self.empresa.pk})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_lista_solo_proveedores(self):
        res = self.client.get('/api/inventario/proveedores/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual([r['nombre'] for r in res.data], ['Distribuidora Norte'])

    def test_proveedor_intrax_crea_el_contacto_una_sola_vez(self):
        res = self._patch({'proveedor_intrax': True})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['proveedor_nombre'], 'Intrax')
        self.assertFalse(res.data['sin_proveedor'])
        # Reutiliza el mismo contacto en la siguiente ficha.
        otro = InventarioItem.objects.create(codigo_barras='OTRO-1', cantidad=1)
        res2 = self.client.patch(f'/api/inventario/items/{otro.pk}/', {'proveedor_intrax': True}, format='json')
        self.assertEqual(res2.data['proveedor'], res.data['proveedor'])
        self.assertEqual(Cliente.objects.filter(tipo='PROVEEDOR', nombre__iexact='Intrax').count(), 1)
