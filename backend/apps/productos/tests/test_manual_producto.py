from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase
from rest_framework.test import APIRequestFactory

from apps.productos.manual_producto import (
    build_manual_producto_descripcion,
    manual_producto_id_from_externo,
    resolve_item_descripcion,
)
from apps.productos.views import ProductoManualPermission
from apps.users.models import UserPermissions

User = get_user_model()


class ManualProductoHelperTests(SimpleTestCase):
    def test_build_descripcion_includes_caracteristicas(self):
        text = build_manual_producto_descripcion(
            marca="Marca X",
            modelo="Modelo Y",
            caracteristicas="Línea 1\nLínea 2",
        )
        self.assertIn("Marca X · Modelo Y", text)
        self.assertIn("Línea 1", text)
        self.assertIn("Línea 2", text)

    def test_manual_id_parser(self):
        self.assertEqual(manual_producto_id_from_externo("manual:42"), 42)
        self.assertIsNone(manual_producto_id_from_externo("syscom:1"))

    def test_resolve_prefers_catalog_map(self):
        resolved = resolve_item_descripcion(
            "manual:5",
            "solo marca",
            {5: "Marca · Modelo\n\nCaracterística A"},
        )
        self.assertEqual(resolved, "Marca · Modelo\n\nCaracterística A")


class ProductoManualPermissionTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def test_get_allowed_with_cotizaciones_only(self):
        user = User.objects.create_user(username="vendedor", password="test-pass-123")
        UserPermissions.objects.create(
            user=user,
            permissions={
                "cotizaciones": {"view": True, "create": True, "edit": False, "delete": False},
                "productos": {"view": False, "create": False, "edit": False, "delete": False},
            },
        )
        request = self.factory.get("/api/productos-manuales/")
        request.user = user
        self.assertTrue(ProductoManualPermission().has_permission(request, None))

    def test_post_denied_with_cotizaciones_only(self):
        user = User.objects.create_user(username="vendedor2", password="test-pass-123")
        UserPermissions.objects.create(
            user=user,
            permissions={
                "cotizaciones": {"view": True, "create": True, "edit": False, "delete": False},
                "productos": {"view": False, "create": False, "edit": False, "delete": False},
            },
        )
        request = self.factory.post("/api/productos-manuales/")
        request.user = user
        self.assertFalse(ProductoManualPermission().has_permission(request, None))
