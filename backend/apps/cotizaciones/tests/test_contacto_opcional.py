from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from apps.clientes.models import Cliente, ClienteContacto
from apps.users.models import UserPermissions


class CotizacionContactoOpcionalTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="cot_contacto", password="test-pass-123")
        UserPermissions.objects.create(
            user=self.user,
            permissions={
                "cotizaciones": {"view": True, "create": True, "edit": True, "delete": False},
            },
        )
        self.client.force_authenticate(user=self.user)
        self.cliente = Cliente.objects.create(nombre="Cliente sin contactos")

    def _payload(self, **overrides):
        data = {
            "cliente_id": self.cliente.id,
            "cliente": self.cliente.nombre,
            "prospecto": False,
            "contacto": "",
            "contacto_telefono": "",
            "medio_contacto": "",
            "status": "PENDIENTE",
            "fecha": "2026-08-04",
            "subtotal": 0,
            "descuento_cliente_pct": 0,
            "iva_pct": 0,
            "iva": 0,
            "total": 0,
            "texto_arriba_precios": "Cotización",
            "terminos": "",
            "items": [
                {
                    "producto_externo_id": "",
                    "producto_nombre": "Servicio",
                    "producto_descripcion": "",
                    "unidad": "SERV",
                    "cantidad": 1,
                    "precio_lista": 100,
                    "descuento_pct": 0,
                    "sin_iva": True,
                    "orden": 0,
                }
            ],
        }
        data.update(overrides)
        return data

    def test_crear_sin_contacto_ok(self):
        response = self.client.post("/api/cotizaciones/", self._payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data.get("contacto"), "")
        self.assertEqual(ClienteContacto.objects.filter(cliente=self.cliente).count(), 0)

    def test_contacto_sin_medio_rechazado(self):
        response = self.client.post(
            "/api/cotizaciones/",
            self._payload(contacto="Ana Pérez", medio_contacto=""),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("medio_contacto", response.data)

    def test_contacto_nuevo_se_guarda_en_cliente(self):
        response = self.client.post(
            "/api/cotizaciones/",
            self._payload(
                contacto="Ana Pérez",
                contacto_telefono="3141234567",
                medio_contacto="CLIENTE",
            ),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        contactos = list(ClienteContacto.objects.filter(cliente=self.cliente))
        self.assertEqual(len(contactos), 1)
        self.assertEqual(contactos[0].nombre_apellido, "Ana Pérez")
        self.assertEqual(contactos[0].celular, "3141234567")
        # Primer contacto del cliente → principal automático
        self.assertTrue(contactos[0].is_principal)

    def test_contacto_existente_no_duplica(self):
        ClienteContacto.objects.create(
            cliente=self.cliente,
            nombre_apellido="Ana Pérez",
            celular="",
            is_principal=True,
        )
        response = self.client.post(
            "/api/cotizaciones/",
            self._payload(
                contacto="ana pérez",
                contacto_telefono="3149998877",
                medio_contacto="WEB",
            ),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        contactos = list(ClienteContacto.objects.filter(cliente=self.cliente))
        self.assertEqual(len(contactos), 1)
        self.assertEqual(contactos[0].celular, "3149998877")
