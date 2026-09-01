from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.models import UserPermissions


class CotizacionItemRangoTests(APITestCase):
    """Los rangos de cantidad/precio/descuento se validan en el API.

    Sin esto, un payload malformado (bug de frontend o cliente externo)
    producía subtotales negativos que acababan impresos en el PDF oficial.
    """

    def setUp(self):
        self.user = User.objects.create_user(username="cot_rangos", password="test-pass-123")
        UserPermissions.objects.create(
            user=self.user,
            permissions={
                "cotizaciones": {"view": True, "create": True, "edit": True, "delete": False},
            },
        )
        self.client.force_authenticate(user=self.user)

    def _payload(self, **item_overrides):
        item = {
            "producto_externo_id": "",
            "producto_nombre": "Producto",
            "producto_descripcion": "",
            "unidad": "PZA",
            "cantidad": 1,
            "precio_lista": 100,
            "descuento_pct": 0,
            "sin_iva": False,
        }
        item.update(item_overrides)
        return {
            "cliente": "Cliente rangos",
            "prospecto": True,
            "contacto": "Contacto",
            "medio_contacto": "CLIENTE",
            "status": "PENDIENTE",
            "fecha": "2026-08-25",
            "subtotal": 0,
            "descuento_cliente_pct": 0,
            "iva_pct": 16,
            "iva": 0,
            "total": 0,
            "texto_arriba_precios": "Cotización",
            "terminos": "",
            "items": [item],
        }

    def test_rechaza_cantidad_negativa(self):
        response = self.client.post("/api/cotizaciones/", self._payload(cantidad=-5), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rechaza_precio_negativo(self):
        response = self.client.post("/api/cotizaciones/", self._payload(precio_lista=-1), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rechaza_descuento_mayor_a_100(self):
        response = self.client.post("/api/cotizaciones/", self._payload(descuento_pct=150), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rechaza_descuento_negativo(self):
        response = self.client.post("/api/cotizaciones/", self._payload(descuento_pct=-10), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_acepta_valores_en_rango(self):
        response = self.client.post(
            "/api/cotizaciones/",
            self._payload(cantidad=3, precio_lista=250, descuento_pct=100),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
