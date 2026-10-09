"""Proveedor del producto manual: solo contactos dados de alta como proveedor."""
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.clientes.models import Cliente
from apps.productos.models import ProductoManual
from apps.users.models import UserPermissions

User = get_user_model()

URL = '/api/productos-manuales/'


class ProductoProveedorTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='prod_prov', password='test-pass-123')
        UserPermissions.objects.create(
            user=self.user,
            permissions={'productos': {'view': True, 'create': True, 'edit': True}},
        )
        self.client.force_authenticate(user=self.user)
        self.proveedor = Cliente.objects.create(nombre='Distribuidora Norte', tipo='PROVEEDOR')
        self.empresa = Cliente.objects.create(nombre='Cliente Final', tipo='EMPRESA')

    def _payload(self, **extra):
        return {'producto': 'Cámara bala', 'marca': 'Hikvision', 'modelo': 'DS-2CD', 'precio': '100.00', 'stock': 1, **extra}

    def test_crea_con_proveedor_registrado(self):
        res = self.client.post(URL, self._payload(proveedor=self.proveedor.pk), format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data['proveedor'], self.proveedor.pk)
        self.assertEqual(res.data['proveedor_nombre'], 'Distribuidora Norte')

    def test_rechaza_contacto_que_no_es_proveedor(self):
        res = self.client.post(URL, self._payload(proveedor=self.empresa.pk), format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('proveedor', res.data)
        self.assertFalse(ProductoManual.objects.exists())

    def test_rechaza_proveedor_inexistente(self):
        res = self.client.post(URL, self._payload(proveedor=999999), format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('proveedor', res.data)

    def test_proveedor_es_opcional_y_se_puede_quitar(self):
        res = self.client.post(URL, self._payload(), format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertIsNone(res.data['proveedor'])
        self.assertEqual(res.data['proveedor_nombre'], '')

        pk = res.data['id']
        res = self.client.patch(f'{URL}{pk}/', {'proveedor': self.proveedor.pk}, format='json')
        self.assertEqual(res.data['proveedor'], self.proveedor.pk)
        res = self.client.patch(f'{URL}{pk}/', {'proveedor': None}, format='json')
        self.assertIsNone(res.data['proveedor'])

    def test_lista_de_proveedores_solo_trae_nombre(self):
        res = self.client.get(f'{URL}proveedores/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(all(set(r) == {'id', 'nombre'} for r in res.data))
        nombres = [r['nombre'] for r in res.data]
        # Distribuidores base primero (en mayúsculas) y luego el resto; nunca clientes.
        self.assertEqual(nombres, ['INTRAX', 'SYSCOM', 'TVC', 'Distribuidora Norte'])

    def test_distribuidores_base_no_se_duplican_y_van_en_mayusculas(self):
        intrax = Cliente.objects.create(nombre='Intrax', tipo='PROVEEDOR')
        self.client.get(f'{URL}proveedores/')
        res = self.client.get(f'{URL}proveedores/')
        self.assertEqual(Cliente.objects.filter(tipo='PROVEEDOR', nombre__iexact='intrax').count(), 1)
        self.assertIn({'id': intrax.pk, 'nombre': 'INTRAX'}, res.data)
        self.assertEqual(Cliente.objects.filter(tipo='PROVEEDOR', nombre='TVC').count(), 1)

        creado = self.client.post(URL, self._payload(proveedor=intrax.pk), format='json')
        self.assertEqual(creado.data['proveedor_nombre'], 'INTRAX')

    def test_guarda_costo_precios_utilidad_e_iva(self):
        res = self.client.post(
            URL,
            self._payload(
                costo='100.00',
                precio='130.00',
                utilidad_1='30.00',
                precio_2='125.00',
                utilidad_2='25.00',
                precio_3=None,
                utilidad_3=None,
                aplica_iva=True,
            ),
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data['costo'], '100.00')
        self.assertEqual(res.data['precio'], '130.00')
        self.assertEqual(res.data['utilidad_2'], '25.00')
        self.assertIsNone(res.data['precio_3'])
        self.assertTrue(res.data['aplica_iva'])

    def test_rechaza_costo_negativo(self):
        res = self.client.post(URL, self._payload(costo='-1'), format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('costo', res.data)
