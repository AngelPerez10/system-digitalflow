from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.productos.models import Concepto, ProductoManual
from apps.users.models import UserPermissions

User = get_user_model()


class DuplicateValidationApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="ops", password="test-pass-123")
        UserPermissions.objects.create(
            user=self.user,
            permissions={
                "productos": {"view": True, "create": True, "edit": True, "delete": True},
                "servicios": {"view": True, "create": True, "edit": True, "delete": True},
            },
        )
        self.client.force_authenticate(user=self.user)

    def test_producto_manual_modelo_duplicado(self):
        ProductoManual.objects.create(
            producto="Camara A",
            marca="DAHUA",
            modelo="DH-IPC-B1E40",
            precio=100,
            stock=1,
        )
        res = self.client.post(
            "/api/productos-manuales/",
            {
                "producto": "Camara B",
                "marca": "DAHUA",
                "modelo": "dh-ipc-b1e40",
                "precio": 200,
                "stock": 2,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("modelo", res.data)
        self.assertTrue(any("Ya existe" in str(m) for m in res.data["modelo"]))

    def test_concepto_folio_duplicado(self):
        Concepto.objects.create(folio="STL4001", concepto="Instalacion", precio1=500)
        res = self.client.post(
            "/api/conceptos/",
            {
                "folio": "stl4001",
                "concepto": "Otro",
                "precio1": 100,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("folio", res.data)
        self.assertTrue(any("Ya existe" in str(m) for m in res.data["folio"]))
