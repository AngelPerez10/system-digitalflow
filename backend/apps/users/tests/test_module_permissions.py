from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIRequestFactory
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import UserPermissions
from apps.users.views import login_view, token_refresh_view
from apps.users.permissions import OrdenesPermission, TareasPermission

User = get_user_model()


class ModulePermissionTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = User.objects.create_user(username="operador", password="test-pass-123")
        UserPermissions.objects.create(
            user=self.user,
            permissions={
                "ordenes": {"view": True, "create": False, "edit": False, "delete": False},
                "tareas": {"view": False, "create": False, "edit": False, "delete": False},
            },
        )

    def test_ordenes_view_allowed_with_explicit_permission(self):
        request = self.factory.get("/api/ordenes/")
        request.user = self.user
        self.assertTrue(OrdenesPermission().has_permission(request, None))

    def test_ordenes_create_denied_without_permission(self):
        request = self.factory.post("/api/ordenes/")
        request.user = self.user
        self.assertFalse(OrdenesPermission().has_permission(request, None))

    def test_tareas_view_denied_by_default(self):
        request = self.factory.get("/api/tareas/")
        request.user = self.user
        self.assertFalse(TareasPermission().has_permission(request, None))

    def test_staff_bypasses_module_permission(self):
        staff = User.objects.create_user(username="staff", password="test-pass-123", is_staff=True)
        request = self.factory.get("/api/tareas/")
        request.user = staff
        self.assertTrue(TareasPermission().has_permission(request, None))


class AuthViewTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.active_user = User.objects.create_user(
            username="activo",
            email="activo@example.com",
            password="test-pass-123",
        )
        self.inactive_user = User.objects.create_user(
            username="inactivo",
            email="inactivo@example.com",
            password="test-pass-123",
            is_active=False,
        )

    def test_login_does_not_disclose_inactive_account_without_valid_password(self):
        request = self.factory.post(
            "/api/login/",
            {"email": self.inactive_user.email, "password": "wrong-pass"},
            format="json",
        )

        response = login_view(request)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["detail"], "Credenciales inválidas")

    def test_login_reports_inactive_account_with_valid_password(self):
        request = self.factory.post(
            "/api/login/",
            {"email": self.inactive_user.email, "password": "test-pass-123"},
            format="json",
        )

        response = login_view(request)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("desactivada", response.data["detail"])

    def test_refresh_rotates_refresh_cookie(self):
        original_refresh = str(RefreshToken.for_user(self.active_user))
        request = self.factory.post("/api/token/refresh/", {}, format="json")
        request.COOKIES["refresh_token"] = original_refresh

        response = token_refresh_view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        cookies = response.cookies
        self.assertIn("refresh_token", cookies)
        self.assertNotEqual(cookies["refresh_token"].value, original_refresh)
