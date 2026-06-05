from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.models import UserPermissions

User = get_user_model()


class OrdenesSmokeTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="tecnico", password="test-pass-123")
        UserPermissions.objects.create(
            user=self.user,
            permissions={
                "ordenes": {"view": True, "create": True, "edit": True, "delete": False},
            },
        )
        self.client.force_authenticate(user=self.user)

    def test_list_ordenes_denied_without_view(self):
        denied = User.objects.create_user(username="bloqueado", password="test-pass-123")
        UserPermissions.objects.create(user=denied, permissions={"ordenes": {}})
        self.client.force_authenticate(user=denied)
        response = self.client.get("/api/ordenes/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_ordenes_ok(self):
        response = self.client.get("/api/ordenes/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_orden_smoke(self):
        payload = {
            "cliente": "Cliente orden",
            "direccion": "Calle 1",
            "telefono_cliente": "5551234567",
            "servicios_realizados": ["Instalación"],
            "status": "pendiente",
            "fecha_inicio": "2026-06-05",
            "tipo_orden": "servicio_tecnico",
        }
        response = self.client.post("/api/ordenes/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("id", response.data)

    def test_tecnico_opciones_denied_without_ordenes_access(self):
        denied = User.objects.create_user(username="sin_ordenes", password="test-pass-123")
        UserPermissions.objects.create(user=denied, permissions={"tareas": {"view": True}})
        self.client.force_authenticate(user=denied)
        response = self.client.get("/api/ordenes/tecnico-opciones/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_tecnico_opciones_hides_sensitive_fields_for_non_staff(self):
        other = User.objects.create_user(
            username="otro_tecnico",
            email="otro@example.com",
            password="test-pass-123",
            is_staff=True,
        )
        UserPermissions.objects.create(
            user=other,
            permissions={"ordenes": {"view": True}},
        )
        response = self.client.get("/api/ordenes/tecnico-opciones/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row = next(item for item in response.data if item["id"] == other.id)
        self.assertNotIn("email", row)
        self.assertNotIn("is_superuser", row)

    def test_tecnico_opciones_includes_sensitive_fields_for_staff(self):
        staff = User.objects.create_user(
            username="admin_tecnico",
            email="admin@example.com",
            password="test-pass-123",
            is_staff=True,
        )
        UserPermissions.objects.create(
            user=staff,
            permissions={"ordenes": {"view": True}},
        )
        self.client.force_authenticate(user=staff)
        response = self.client.get("/api/ordenes/tecnico-opciones/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row = next(item for item in response.data if item["id"] == staff.id)
        self.assertEqual(row["email"], "admin@example.com")
        self.assertTrue(row["is_staff"])
