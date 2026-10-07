"""Teléfono de contacto de la orden: 10 dígitos (MX, EE. UU. o Canadá)."""

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase
from rest_framework import status
from rest_framework.test import APITestCase

from apps.ordenes.models import Orden
from apps.ordenes.telefono import normalizar_telefono
from apps.users.models import UserPermissions

User = get_user_model()


class NormalizarTelefonoTests(SimpleTestCase):
    def test_quita_separadores(self):
        self.assertEqual(normalizar_telefono('314 123-4567'), '3141234567')

    def test_quita_lada_mexico(self):
        self.assertEqual(normalizar_telefono('+52 314 123 4567'), '3141234567')
        self.assertEqual(normalizar_telefono('+52 1 314 123 4567'), '3141234567')

    def test_quita_lada_estados_unidos_canada(self):
        self.assertEqual(normalizar_telefono('+1 (415) 555-0132'), '4155550132')
        self.assertEqual(normalizar_telefono('1-604-555-0199'), '6045550199')

    def test_vacio(self):
        self.assertEqual(normalizar_telefono(None), '')
        self.assertEqual(normalizar_telefono(''), '')


class TelefonoOrdenApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='tel_tecnico', password='test-pass-123')
        UserPermissions.objects.create(
            user=self.user,
            permissions={'ordenes': {'view': True, 'create': True, 'edit': True}},
        )
        self.client.force_authenticate(user=self.user)

    def _crear(self, telefono):
        return self.client.post(
            '/api/ordenes/',
            {
                'cliente': 'Cliente tel',
                'direccion': 'Calle 1',
                'telefono_cliente': telefono,
                'servicios_realizados': ['Instalación'],
                'status': 'pendiente',
                'fecha_inicio': '2026-06-05',
                'tipo_orden': 'servicio_tecnico',
            },
            format='json',
        )

    def test_guarda_normalizado(self):
        r = self._crear('+1 (415) 555-0132')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        self.assertEqual(Orden.objects.get(pk=r.data['id']).telefono_cliente, '4155550132')

    def test_rechaza_mas_de_10_digitos(self):
        r = self._crear('314123456789')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('telefono_cliente', r.data)
