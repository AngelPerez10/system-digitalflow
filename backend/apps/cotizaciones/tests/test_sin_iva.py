from decimal import Decimal

from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.models import UserPermissions


class CotizacionSinIvaTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="cot_sin_iva", password="test-pass-123")
        UserPermissions.objects.create(
            user=self.user,
            permissions={
                "cotizaciones": {"view": True, "create": True, "edit": True, "delete": False},
            },
        )
        self.client.force_authenticate(user=self.user)
        self.admin = User.objects.create_user(
            username="admin_sin_iva",
            password="test-pass-123",
            is_staff=True,
        )
        UserPermissions.objects.create(
            user=self.admin,
            permissions={
                "cotizaciones": {"view": True, "create": True, "edit": True, "delete": False},
            },
        )

    def _base_payload(self, items):
        return {
            "cliente": "Cliente sin IVA",
            "prospecto": True,
            "contacto": "Contacto",
            "medio_contacto": "CLIENTE",
            "status": "PENDIENTE",
            "fecha": "2026-08-03",
            "subtotal": 0,
            "descuento_cliente_pct": 0,
            "iva_pct": 0,
            "iva": 0,
            "total": 0,
            "texto_arriba_precios": "Cotización",
            "terminos": "",
            "items": items,
        }

    def test_concepto_sin_iva_no_multiplica(self):
        payload = self._base_payload(
            [
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
            ]
        )
        response = self.client.post("/api/cotizaciones/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(str(response.data["total"])), Decimal("100.00"))
        self.assertTrue(response.data["items"][0]["sin_iva"])

    def test_concepto_con_iva_multiplica(self):
        payload = self._base_payload(
            [
                {
                    "producto_externo_id": "",
                    "producto_nombre": "Servicio",
                    "producto_descripcion": "",
                    "unidad": "SERV",
                    "cantidad": 1,
                    "precio_lista": 100,
                    "descuento_pct": 0,
                    "sin_iva": False,
                    "orden": 0,
                }
            ]
        )
        response = self.client.post("/api/cotizaciones/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(str(response.data["total"])), Decimal("116.00"))

    def test_producto_sin_iva_rechazado_si_no_admin(self):
        payload = self._base_payload(
            [
                {
                    "producto_externo_id": "syscom:123",
                    "producto_nombre": "Cámara",
                    "producto_descripcion": "",
                    "unidad": "PZA",
                    "cantidad": 1,
                    "precio_lista": 116,
                    "descuento_pct": 0,
                    "sin_iva": True,
                    "orden": 0,
                }
            ]
        )
        response = self.client.post("/api/cotizaciones/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("items", response.data)

    def test_producto_sin_iva_admin_divide(self):
        self.client.force_authenticate(user=self.admin)
        payload = self._base_payload(
            [
                {
                    "producto_externo_id": "syscom:123",
                    "producto_nombre": "Cámara",
                    "producto_descripcion": "",
                    "unidad": "PZA",
                    "cantidad": 1,
                    "precio_lista": 116,
                    "descuento_pct": 0,
                    "sin_iva": True,
                    "orden": 0,
                }
            ]
        )
        response = self.client.post("/api/cotizaciones/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(str(response.data["total"])), Decimal("100.00"))
        self.assertTrue(response.data["items"][0]["sin_iva"])
