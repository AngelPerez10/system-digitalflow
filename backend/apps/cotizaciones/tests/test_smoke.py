from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.cotizaciones.models import Cotizacion
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

    def _create_cotizacion(self, **kwargs):
        defaults = {
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
        }
        defaults.update(kwargs)
        return Cotizacion.objects.create(**defaults)

    def test_list_cotizaciones_requires_view_permission(self):
        denied = User.objects.create_user(username="sin-permiso", password="test-pass-123")
        UserPermissions.objects.create(user=denied, permissions={"cotizaciones": {}})
        self.client.force_authenticate(user=denied)
        response = self.client.get("/api/cotizaciones/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_cotizaciones_ok(self):
        response = self.client.get("/api/cotizaciones/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_cotizaciones_month_filter_paginated(self):
        self._create_cotizacion(cliente="Junio reciente", fecha="2026-06-10", total=200)
        self._create_cotizacion(cliente="Mayo antiguo", fecha="2026-05-15", total=300)

        response = self.client.get("/api/cotizaciones/?month=2026-06&page=1&page_size=25")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["cliente"], "Junio reciente")
        self.assertIn("month_stats", response.data)
        self.assertEqual(float(response.data["month_stats"]["total"]), 200.0)

    def test_list_cotizaciones_search_ignores_month(self):
        self._create_cotizacion(cliente="Cliente único XYZ", fecha="2026-05-15", total=150)
        self._create_cotizacion(cliente="Otro cliente", fecha="2026-06-10", total=250)

        response = self.client.get(
            "/api/cotizaciones/?search=XYZ&month=2026-06&page=1&page_size=25"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["cliente"], "Cliente único XYZ")
        self.assertNotIn("month_stats", response.data)

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
