"""Las cuentas de portal cliente NO son personal del ERP.

`GestionUsuario` (frontend) las listaba como «Técnico» porque `UserAccountViewSet`
devolvía todos los `User`. Eso además dejaba editarlas/borrarlas y —peor— darles
permisos de módulo desde una pantalla pensada para el equipo interno. Aquí se fija
la frontera: el portal cliente vive aparte.
"""

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.clientes.models import Cliente
from apps.clientes.portal_models import ClientePortalAccount

User = get_user_model()

ACCOUNTS_URL = '/api/v1/users/accounts/'


class PortalNoEsPersonalTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin1', password='x', is_staff=True, is_superuser=True
        )
        self.tecnico = User.objects.create_user(username='tecnico1', password='x')

        cliente = Cliente.objects.create(nombre='ACME')
        self.portal_user = User.objects.create_user(username='105040', password='x')
        ClientePortalAccount.objects.create(
            user=self.portal_user,
            cliente=cliente,
            portal_username='105040',
            must_change_password=False,
        )

        self.client.force_authenticate(user=self.admin)

    def test_el_listado_no_incluye_cuentas_de_portal(self):
        resp = self.client.get(ACCOUNTS_URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = {row['id'] for row in resp.data}
        self.assertIn(self.tecnico.id, ids)
        self.assertIn(self.admin.id, ids)
        self.assertNotIn(self.portal_user.id, ids)

    def test_no_se_puede_ver_ni_editar_una_cuenta_de_portal_por_id(self):
        detalle = f'{ACCOUNTS_URL}{self.portal_user.id}/'
        self.assertEqual(self.client.get(detalle).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            self.client.patch(detalle, {'first_name': 'X'}, format='json').status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertEqual(self.client.delete(detalle).status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(User.objects.filter(pk=self.portal_user.id).exists())

    def test_no_se_pueden_asignar_permisos_de_modulo_a_una_cuenta_de_portal(self):
        """Escalada de privilegios: un cliente con `{ordenes:{view:true}}`
        entraría al ERP. El endpoint debe negarlo con 404."""
        url = f'{ACCOUNTS_URL}{self.portal_user.id}/permissions/'
        self.assertEqual(self.client.get(url).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            self.client.put(url, {'permissions': {'ordenes': {'view': True}}}, format='json').status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_no_se_gestiona_la_firma_de_una_cuenta_de_portal(self):
        url = f'{ACCOUNTS_URL}{self.portal_user.id}/signature/'
        self.assertEqual(self.client.get(url).status_code, status.HTTP_404_NOT_FOUND)

    def test_el_equipo_interno_sigue_siendo_gestionable(self):
        detalle = f'{ACCOUNTS_URL}{self.tecnico.id}/'
        self.assertEqual(self.client.get(detalle).status_code, status.HTTP_200_OK)
        self.assertEqual(
            self.client.get(f'{ACCOUNTS_URL}{self.tecnico.id}/permissions/').status_code,
            status.HTTP_200_OK,
        )
