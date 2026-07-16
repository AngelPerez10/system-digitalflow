from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIRequestFactory

from apps.productos.tvc_views import TvcProductosPermission
from apps.users.models import UserPermissions

User = get_user_model()


class TvcProductosPermissionTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def test_get_allowed_with_cotizaciones_only(self):
        user = User.objects.create_user(username="vendedor-tvc", password="test-pass-123")
        UserPermissions.objects.create(
            user=user,
            permissions={
                "cotizaciones": {"view": True, "create": True, "edit": False, "delete": False},
                "productos": {"view": False, "create": False, "edit": False, "delete": False},
            },
        )
        request = self.factory.get("/api/productos/tvc/productos/")
        request.user = user
        self.assertTrue(TvcProductosPermission().has_permission(request, None))

    def test_post_denied_with_cotizaciones_only(self):
        user = User.objects.create_user(username="vendedor-tvc2", password="test-pass-123")
        UserPermissions.objects.create(
            user=user,
            permissions={
                "cotizaciones": {"view": True, "create": True, "edit": False, "delete": False},
                "productos": {"view": False, "create": False, "edit": False, "delete": False},
            },
        )
        request = self.factory.post("/api/productos/tvc/productos/")
        request.user = user
        self.assertFalse(TvcProductosPermission().has_permission(request, None))
