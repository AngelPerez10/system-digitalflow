"""Tests del portal cliente: registro, dedup, serie numérica y cambio de contraseña."""

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.clientes.models import Cliente, ClienteContacto
from apps.clientes.portal_models import ClientePortalAccount, ClienteRegistroSolicitud

User = get_user_model()

REGISTRO_URL = '/api/v1/portal-cliente/registro/'
CAMBIAR_URL = '/api/v1/portal-cliente/cambiar-contrasena/'
SOLICITUDES_URL = '/api/v1/portal-cliente/solicitudes/'


def _payload(**overrides):
    base = {
        'first_name': 'Ana',
        'last_name': 'López',
        'email': 'ana.portal@test.com',
        'telefono': '5512345678',
        'acepto_privacidad': True,
    }
    base.update(overrides)
    return base


@override_settings(PORTAL_CLIENT_USERNAME_START=105040)
class PortalClienteRegistroTests(APITestCase):
    def setUp(self):
        self.client = APIClient()

    @patch('apps.clientes.portal_services.send_portal_credentials_email')
    def test_registro_crea_cuenta_y_serie(self, mock_mail):
        resp = self.client.post(REGISTRO_URL, _payload(), format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        mock_mail.assert_called_once()
        account = ClientePortalAccount.objects.get(portal_username='105040')
        self.assertTrue(account.must_change_password)
        self.assertEqual(account.user.email, 'ana.portal@test.com')
        self.assertEqual(
            ClienteRegistroSolicitud.objects.filter(email='ana.portal@test.com').count(),
            1,
        )

    @patch('apps.clientes.portal_services.send_portal_credentials_email')
    def test_registro_incrementa_serie(self, mock_mail):
        self.client.post(REGISTRO_URL, _payload(email='uno@test.com'), format='json')
        self.client.post(REGISTRO_URL, _payload(email='dos@test.com'), format='json')
        usernames = set(ClientePortalAccount.objects.values_list('portal_username', flat=True))
        self.assertEqual(usernames, {'105040', '105041'})
        self.assertEqual(mock_mail.call_count, 2)

    def test_rechaza_email_duplicado_user(self):
        User.objects.create_user(username='staff1', email='dup@test.com', password='x')
        resp = self.client.post(REGISTRO_URL, _payload(email='dup@test.com'), format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Ya tienes cuenta', resp.data['detail'])

    def test_rechaza_email_staff(self):
        User.objects.create_user(
            username='admin1',
            email='interno@test.com',
            password='x',
            is_staff=True,
        )
        resp = self.client.post(REGISTRO_URL, _payload(email='interno@test.com'), format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('personal interno', resp.data['detail'])

    @patch('apps.clientes.portal_services.send_portal_credentials_email')
    def test_vincula_cliente_existente_por_correo(self, mock_mail):
        cliente = Cliente.objects.create(nombre='Empresa Demo', correo='cliente@test.com')
        resp = self.client.post(
            REGISTRO_URL,
            _payload(email='cliente@test.com', razon_social='Empresa Demo'),
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        account = ClientePortalAccount.objects.get(user__email='cliente@test.com')
        self.assertEqual(account.cliente_id, cliente.id)
        self.assertFalse(Cliente.objects.filter(correo='cliente@test.com').exclude(pk=cliente.pk).exists())

    @patch('apps.clientes.portal_services.send_portal_credentials_email')
    def test_vincula_por_contacto_correo(self, mock_mail):
        cliente = Cliente.objects.create(nombre='Con Contacto', correo='')
        ClienteContacto.objects.create(
            cliente=cliente,
            nombre_apellido='Contacto',
            correo='contacto@test.com',
        )
        resp = self.client.post(REGISTRO_URL, _payload(email='contacto@test.com'), format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        account = ClientePortalAccount.objects.get(user__email='contacto@test.com')
        self.assertEqual(account.cliente_id, cliente.id)

    def test_correo_en_varios_clientes_va_a_cola(self):
        Cliente.objects.create(nombre='A', correo='ambiguo@test.com')
        Cliente.objects.create(nombre='B', correo='ambiguo@test.com')
        resp = self.client.post(REGISTRO_URL, _payload(email='ambiguo@test.com'), format='json')
        self.assertEqual(resp.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(resp.data['status'], 'pending_review')
        self.assertFalse(User.objects.filter(email='ambiguo@test.com').exists())
        solicitud = ClienteRegistroSolicitud.objects.get(email='ambiguo@test.com')
        self.assertEqual(solicitud.status, ClienteRegistroSolicitud.STATUS_PENDING)


@override_settings(PORTAL_CLIENT_USERNAME_START=105040)
class PortalClienteCambioContrasenaTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.temp = 'TempPass123'
        self.user = User.objects.create_user(
            username='105050',
            email='cambio@test.com',
            password=self.temp,
        )
        self.cliente = Cliente.objects.create(nombre='Cliente Cambio', correo='cambio@test.com')
        self.account = ClientePortalAccount.objects.create(
            user=self.user,
            cliente=self.cliente,
            portal_username='105050',
            must_change_password=True,
        )

    def test_cambiar_contrasena_ok(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.post(
            CAMBIAR_URL,
            {
                'current_password': self.temp,
                'new_password': 'NuevaClave9',
                'confirm_password': 'NuevaClave9',
            },
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.account.refresh_from_db()
        self.assertFalse(self.account.must_change_password)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NuevaClave9'))

    def test_me_incluye_flags_cliente(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.get('/api/me/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['account_type'], 'cliente')
        self.assertTrue(resp.data['must_change_password'])
        self.assertEqual(resp.data['portal_username'], '105050')


@override_settings(
    PORTAL_CLIENT_USERNAME_START=105040,
    REST_FRAMEWORK={
        'DEFAULT_AUTHENTICATION_CLASSES': [
            'rest_framework_simplejwt.authentication.JWTAuthentication',
        ],
        'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticated'],
        'DEFAULT_THROTTLE_RATES': {
            'portal_registro': '2/minute',
            'portal_registro_email': '2/hour',
        },
    },
)
class PortalClienteThrottleTests(APITestCase):
    def test_throttle_registro_por_ip(self):
        client = APIClient()
        for i in range(2):
            resp = client.post(REGISTRO_URL, _payload(email=f't{i}@test.com'), format='json')
            self.assertIn(resp.status_code, (status.HTTP_201_CREATED, status.HTTP_202_ACCEPTED))
        resp = client.post(REGISTRO_URL, _payload(email='t3@test.com'), format='json')
        self.assertEqual(resp.status_code, status.HTTP_429_TOO_MANY_REQUESTS)


@override_settings(PORTAL_CLIENT_USERNAME_START=105040)
class PortalClienteAdminSolicitudesTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='adminpass',
            is_staff=True,
            is_superuser=True,
        )
        self.solicitud = ClienteRegistroSolicitud.objects.create(
            first_name='Pend',
            last_name='iente',
            email='pend@test.com',
            telefono='5511111111',
            acepto_privacidad=True,
            dedup_result={'ambiguous': True},
            status=ClienteRegistroSolicitud.STATUS_PENDING,
        )
        self.cliente = Cliente.objects.create(nombre='Elegido', correo='otro@test.com')

    @patch('apps.clientes.portal_services.send_portal_credentials_email')
    def test_admin_aprueba_solicitud(self, mock_mail):
        self.client.force_authenticate(user=self.admin)
        list_resp = self.client.get(SOLICITUDES_URL)
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_resp.data), 1)

        url = f'/api/v1/portal-cliente/solicitudes/{self.solicitud.id}/aprobar/'
        resp = self.client.post(url, {'cliente_id': self.cliente.id}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.solicitud.refresh_from_db()
        self.assertEqual(self.solicitud.status, ClienteRegistroSolicitud.STATUS_APPROVED)
        mock_mail.assert_called_once()

    def test_admin_rechaza_solicitud(self):
        self.client.force_authenticate(user=self.admin)
        url = f'/api/v1/portal-cliente/solicitudes/{self.solicitud.id}/rechazar/'
        resp = self.client.post(url, {'reason': 'No coincide'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.solicitud.refresh_from_db()
        self.assertEqual(self.solicitud.status, ClienteRegistroSolicitud.STATUS_REJECTED)
