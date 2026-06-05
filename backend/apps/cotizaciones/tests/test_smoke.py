from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.models import UserPermissions

User = get_user_model()


class CotizacionesSmokeTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="cotizador", password="test-pass-123")
        UserPermissions.objects.create(
            user=self.user,
            permissions={
                "cotizaciones": {"view": True, "create": True, "edit": True, "delete": False},
            },
        )
        self.client.force_authenticate(user=self.user)

    def test_list_cotizaciones_requires_view_permission(self):
        denied = User.objects.create_user(username="sin-permiso", password="test-pass-123")
        UserPermissions.objects.create(user=denied, permissions={"cotizaciones": {}})
        self.client.force_authenticate(user=denied)
        response = self.client.get("/api/cotizaciones/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_cotizaciones_ok(self):
        response = self.client.get("/api/cotizaciones/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_cotizacion_smoke(self):
        payload = {
            "cliente": "Cliente prueba",
            "prospecto": True,
            "contacto": "Contacto",
            "medio_contacto": "CLIENTE",
            "status": "PENDIENTE",
            "fecha": "2026-06-05",
            "subtotal": 100,
            "descuento_cliente_pct": 0,
            "iva_pct": 16,
            "iva": 16,
            "total": 116,
            "texto_arriba_precios": "Cotización",
            "terminos": "",
            "items": [],
        }
        response = self.client.post("/api/cotizaciones/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("id", response.data)
