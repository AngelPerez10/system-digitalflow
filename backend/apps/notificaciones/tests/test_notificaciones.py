from unittest.mock import patch

import requests
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.notificaciones.expo_push import enviar_push
from apps.notificaciones.models import PushDevice
from apps.notificaciones.services import (
    dispositivos_para_orden_liberada,
    mensajes_orden_liberada,
)
from apps.ordenes.models import Orden
from apps.users.models import UserPermissions

User = get_user_model()

TOKEN_A = 'ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]'
TOKEN_B = 'ExponentPushToken[bbbbbbbbbbbbbbbbbbbbbb]'
TOKEN_C = 'ExponentPushToken[cccccccccccccccccccccc]'


def _respuesta(payload, status_code=200):
    """Doble mínimo de `requests.Response` para los tests de `enviar_push`."""
    class _Fake:
        def __init__(self):
            self.status_code = status_code
            self.text = str(payload)

        def json(self):
            return payload

    return _Fake()


class PushDeviceEndpointTests(APITestCase):
    def setUp(self):
        cache.clear()  # el throttle `push_devices` se apoya en la caché
        self.user = User.objects.create_user(username='tecnico_push', password='test-pass-123')
        UserPermissions.objects.create(
            user=self.user, permissions={'ordenes': {'view': True}}
        )
        self.client.force_authenticate(user=self.user)

    def test_registro_crea_dispositivo(self):
        r = self.client.post(
            '/api/push-devices/', {'expo_token': TOKEN_A, 'platform': 'android'}, format='json'
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        d = PushDevice.objects.get(expo_token=TOKEN_A)
        self.assertEqual(d.user, self.user)
        self.assertEqual(d.platform, 'android')
        self.assertIsNone(d.disabled_at)

    def test_reregistro_no_duplica_y_reactiva(self):
        PushDevice.objects.create(
            user=self.user, expo_token=TOKEN_A, platform='android',
            disabled_at=timezone.now(),
        )
        r = self.client.post(
            '/api/push-devices/', {'expo_token': TOKEN_A, 'platform': 'android'}, format='json'
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(PushDevice.objects.filter(expo_token=TOKEN_A).count(), 1)
        self.assertIsNone(PushDevice.objects.get(expo_token=TOKEN_A).disabled_at)

    def test_registro_reasigna_token_a_otro_usuario(self):
        """Equipo compartido: el token cambia de dueño, no se duplica."""
        otro = User.objects.create_user(username='otro_push', password='test-pass-123')
        PushDevice.objects.create(user=otro, expo_token=TOKEN_A, platform='android')

        r = self.client.post('/api/push-devices/', {'expo_token': TOKEN_A}, format='json')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(PushDevice.objects.get(expo_token=TOKEN_A).user, self.user)

    def test_token_invalido_da_400(self):
        r = self.client.post('/api/push-devices/', {'expo_token': 'no-es-un-token'}, format='json')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(PushDevice.objects.exists())

    def test_registro_exige_autenticacion(self):
        self.client.force_authenticate(user=None)
        r = self.client.post('/api/push-devices/', {'expo_token': TOKEN_A}, format='json')
        self.assertIn(r.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_baja_borra_solo_el_token_propio(self):
        otro = User.objects.create_user(username='ajeno_push', password='test-pass-123')
        PushDevice.objects.create(user=self.user, expo_token=TOKEN_A)
        PushDevice.objects.create(user=otro, expo_token=TOKEN_B)

        r = self.client.post('/api/push-devices/baja/', {'expo_token': TOKEN_B}, format='json')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['borrados'], 0)
        self.assertTrue(PushDevice.objects.filter(expo_token=TOKEN_B).exists())

        r = self.client.post('/api/push-devices/baja/', {'expo_token': TOKEN_A}, format='json')
        self.assertEqual(r.data['borrados'], 1)
        self.assertFalse(PushDevice.objects.filter(expo_token=TOKEN_A).exists())


class DestinatariosTests(APITestCase):
    """A quién le llega el aviso de «orden disponible»."""

    def setUp(self):
        cache.clear()
        self.liberador = User.objects.create_user(username='liberador', password='test-pass-123')
        UserPermissions.objects.create(
            user=self.liberador, permissions={'ordenes': {'view': True, 'edit': True}}
        )
        self.orden = Orden.objects.create(
            cliente='Ferretería López',
            folio='ODT-1042',
            en_pool=True,
            liberada_por=self.liberador,
            liberada_at=timezone.now(),
        )

    def _tecnico(self, username, permisos, token, **kwargs):
        u = User.objects.create_user(username=username, password='test-pass-123', **kwargs)
        if permisos is not None:
            UserPermissions.objects.create(user=u, permissions=permisos)
        PushDevice.objects.create(user=u, expo_token=token, platform='android')
        return u

    def test_incluye_tecnico_con_acceso(self):
        self._tecnico('con_acceso', {'ordenes': {'view': True}}, TOKEN_A)
        dispositivos = dispositivos_para_orden_liberada(self.orden)
        self.assertEqual([d.expo_token for d in dispositivos], [TOKEN_A])

    def test_excluye_al_liberador(self):
        PushDevice.objects.create(user=self.liberador, expo_token=TOKEN_C)
        self._tecnico('otro_tecnico', {'ordenes': {'view': True}}, TOKEN_A)
        tokens = [d.expo_token for d in dispositivos_para_orden_liberada(self.orden)]
        self.assertIn(TOKEN_A, tokens)
        self.assertNotIn(TOKEN_C, tokens)

    def test_excluye_sin_acceso_a_ordenes(self):
        self._tecnico('sin_acceso', {'cotizaciones': {'view': True}}, TOKEN_A)
        self.assertEqual(dispositivos_para_orden_liberada(self.orden), [])

    def test_excluye_dispositivos_dados_de_baja(self):
        u = self._tecnico('de_baja', {'ordenes': {'view': True}}, TOKEN_A)
        PushDevice.objects.filter(user=u).update(disabled_at=timezone.now())
        self.assertEqual(dispositivos_para_orden_liberada(self.orden), [])

    def test_excluye_usuarios_inactivos(self):
        self._tecnico('inactivo', {'ordenes': {'view': True}}, TOKEN_A, is_active=False)
        self.assertEqual(dispositivos_para_orden_liberada(self.orden), [])

    def test_incluye_staff_sin_perfil_de_permisos(self):
        self._tecnico('admin_push', None, TOKEN_A, is_staff=True)
        tokens = [d.expo_token for d in dispositivos_para_orden_liberada(self.orden)]
        self.assertEqual(tokens, [TOKEN_A])

    def test_mensaje_lleva_folio_cliente_y_deep_link(self):
        u = self._tecnico('mensajero', {'ordenes': {'view': True}}, TOKEN_A)
        dispositivos = list(PushDevice.objects.filter(user=u))
        mensaje = mensajes_orden_liberada(self.orden, dispositivos)[0]

        self.assertEqual(mensaje['to'], TOKEN_A)
        self.assertEqual(mensaje['title'], 'Nueva orden disponible')
        self.assertIn('ODT-1042', mensaje['body'])
        self.assertIn('Ferretería López', mensaje['body'])
        self.assertEqual(
            mensaje['data'], {'tipo': 'orden_liberada', 'ordenId': self.orden.pk}
        )
        self.assertEqual(mensaje['channelId'], 'ordenes')

    def test_mensaje_marca_prioridad_alta(self):
        self.orden.prioridad_pool = 'alta'
        self.orden.save(update_fields=['prioridad_pool'])
        u = self._tecnico('prioritario', {'ordenes': {'view': True}}, TOKEN_A)
        mensaje = mensajes_orden_liberada(self.orden, list(PushDevice.objects.filter(user=u)))[0]
        self.assertIn('Prioridad alta', mensaje['body'])


class EnviarPushTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='dueño_token', password='test-pass-123')
        PushDevice.objects.create(user=self.user, expo_token=TOKEN_A)

    def test_cuenta_los_aceptados(self):
        payload = {'data': [{'status': 'ok', 'id': 'x'}]}
        with patch('apps.notificaciones.expo_push.requests.post', return_value=_respuesta(payload)):
            enviados = enviar_push([{'to': TOKEN_A, 'title': 't', 'body': 'b'}])
        self.assertEqual(enviados, 1)

    def test_device_not_registered_da_de_baja_el_token(self):
        payload = {
            'data': [{
                'status': 'error',
                'message': 'not registered',
                'details': {'error': 'DeviceNotRegistered'},
            }]
        }
        with patch('apps.notificaciones.expo_push.requests.post', return_value=_respuesta(payload)):
            enviados = enviar_push([{'to': TOKEN_A, 'title': 't', 'body': 'b'}])

        self.assertEqual(enviados, 0)
        self.assertIsNotNone(PushDevice.objects.get(expo_token=TOKEN_A).disabled_at)

    def test_fallo_de_red_no_lanza(self):
        with patch(
            'apps.notificaciones.expo_push.requests.post',
            side_effect=requests.ConnectionError('sin red'),
        ):
            self.assertEqual(enviar_push([{'to': TOKEN_A, 'title': 't', 'body': 'b'}]), 0)
        # El token no se da de baja por un fallo de red: no es culpa del device.
        self.assertIsNone(PushDevice.objects.get(expo_token=TOKEN_A).disabled_at)

    def test_sin_mensajes_no_llama_a_expo(self):
        with patch('apps.notificaciones.expo_push.requests.post') as post:
            self.assertEqual(enviar_push([]), 0)
        post.assert_not_called()


@override_settings(PUSH_EN_SEGUNDO_PLANO=False)
class LiberarDisparaNotificacionTests(APITestCase):
    """Integración: `POST /ordenes/{id}/liberar/` avisa a los demás técnicos."""

    def setUp(self):
        cache.clear()
        self.tecnico = User.objects.create_user(username='asignado', password='test-pass-123')
        UserPermissions.objects.create(
            user=self.tecnico,
            permissions={'ordenes': {'view': True, 'edit': True}},
        )
        self.companero = User.objects.create_user(username='companero', password='test-pass-123')
        UserPermissions.objects.create(
            user=self.companero, permissions={'ordenes': {'view': True}}
        )
        PushDevice.objects.create(user=self.companero, expo_token=TOKEN_B, platform='ios')
        PushDevice.objects.create(user=self.tecnico, expo_token=TOKEN_A, platform='android')

        self.orden = Orden.objects.create(
            cliente='Cliente liberado',
            folio='ODT-2001',
            tecnico_asignado=self.tecnico,
            creado_por=self.tecnico,
        )
        self.client.force_authenticate(user=self.tecnico)

    def test_liberar_envia_push_solo_a_los_demas(self):
        with patch('apps.notificaciones.services.enviar_push', return_value=1) as enviar:
            r = self.client.post(f'/api/ordenes/{self.orden.id}/liberar/')

        self.assertEqual(r.status_code, status.HTTP_200_OK)
        enviar.assert_called_once()
        mensajes = enviar.call_args[0][0]
        self.assertEqual([m['to'] for m in mensajes], [TOKEN_B])
        self.assertEqual(mensajes[0]['data']['ordenId'], self.orden.id)

    def test_fallo_del_push_no_rompe_la_liberacion(self):
        with patch(
            'apps.notificaciones.services.enviar_push', side_effect=RuntimeError('boom')
        ):
            r = self.client.post(f'/api/ordenes/{self.orden.id}/liberar/')

        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.orden.refresh_from_db()
        self.assertTrue(self.orden.en_pool)
        self.assertIsNone(self.orden.tecnico_asignado_id)
