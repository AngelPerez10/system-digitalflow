from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.ordenes.models import Orden
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


class OrdenesOwnOnlyScopeTests(APITestCase):
    """Non-staff técnico: own_only controls list/detail scope (not is_staff)."""

    def setUp(self):
        self.tecnico = User.objects.create_user(username="tecnico_scope", password="test-pass-123")
        self.otro = User.objects.create_user(username="otro_scope", password="test-pass-123")
        self.orden_propia = Orden.objects.create(
            cliente="Cliente propio",
            tecnico_asignado=self.tecnico,
            creado_por=self.tecnico,
        )
        self.orden_ajena = Orden.objects.create(
            cliente="Cliente ajeno",
            tecnico_asignado=self.otro,
            creado_por=self.otro,
        )

    def _auth_as_tecnico(self, own_only: bool):
        UserPermissions.objects.filter(user=self.tecnico).delete()
        UserPermissions.objects.create(
            user=self.tecnico,
            permissions={
                "ordenes": {"view": True, "create": True, "edit": True, "delete": False, "own_only": own_only},
            },
        )
        self.client.force_authenticate(user=self.tecnico)

    def test_own_only_true_lists_only_own_orders(self):
        self._auth_as_tecnico(own_only=True)
        response = self.client.get("/api/ordenes/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = {row["id"] for row in response.data}
        self.assertEqual(ids, {self.orden_propia.id})

    def test_own_only_true_denies_foreign_order_detail(self):
        self._auth_as_tecnico(own_only=True)
        response = self.client.get(f"/api/ordenes/{self.orden_ajena.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_own_only_false_lists_all_orders(self):
        self._auth_as_tecnico(own_only=False)
        response = self.client.get("/api/ordenes/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = {row["id"] for row in response.data}
        self.assertEqual(ids, {self.orden_propia.id, self.orden_ajena.id})

    def test_own_only_false_allows_foreign_order_detail(self):
        self._auth_as_tecnico(own_only=False)
        response = self.client.get(f"/api/ordenes/{self.orden_ajena.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.orden_ajena.id)

    def test_missing_own_only_defaults_to_restricted_for_tecnico(self):
        UserPermissions.objects.filter(user=self.tecnico).delete()
        UserPermissions.objects.create(
            user=self.tecnico,
            permissions={"ordenes": {"view": True, "create": True, "edit": True, "delete": False}},
        )
        self.client.force_authenticate(user=self.tecnico)

        list_response = self.client.get("/api/ordenes/")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual({row["id"] for row in list_response.data}, {self.orden_propia.id})

        detail_response = self.client.get(f"/api/ordenes/{self.orden_ajena.id}/")
        self.assertEqual(detail_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_missing_own_only_defaults_to_all_for_staff(self):
        staff = User.objects.create_user(
            username="staff_scope",
            password="test-pass-123",
            is_staff=True,
        )
        UserPermissions.objects.create(
            user=staff,
            permissions={"ordenes": {"view": True}},
        )
        self.client.force_authenticate(user=staff)

        response = self.client.get("/api/ordenes/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            {row["id"] for row in response.data},
            {self.orden_propia.id, self.orden_ajena.id},
        )


class OrdenesLimitedEditTests(APITestCase):
    def setUp(self):
        self.jefe = User.objects.create_user(username="jefe_tecnico", password="test-pass-123")
        self.otro = User.objects.create_user(username="otro_tecnico_le", password="test-pass-123")
        UserPermissions.objects.create(
            user=self.jefe,
            permissions={
                "ordenes": {
                    "view": True,
                    "create": True,
                    "edit": True,
                    "delete": False,
                    "own_only": False,
                },
            },
        )
        self.orden_ajena = Orden.objects.create(
            cliente="Cliente ajeno",
            direccion="Calle remota",
            telefono_cliente="5551112233",
            servicios_realizados=["Instalación"],
            tecnico_asignado=self.otro,
            creado_por=self.otro,
        )
        self.client.force_authenticate(user=self.jefe)

    def test_limited_patch_problematica_and_status(self):
        response = self.client.patch(
            f"/api/ordenes/{self.orden_ajena.id}/",
            {"problematica": "Falla remota", "status": "resuelto"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.orden_ajena.refresh_from_db()
        self.assertEqual(self.orden_ajena.problematica, "Falla remota")
        self.assertEqual(self.orden_ajena.status, "resuelto")

    def test_limited_patch_time_fields(self):
        response = self.client.patch(
            f"/api/ordenes/{self.orden_ajena.id}/",
            {
                "fecha_inicio": "2026-06-01",
                "hora_inicio": "09:30:00",
                "fecha_finalizacion": "2026-06-02",
                "hora_termino": "11:00:00",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_limited_patch_disallowed_cliente_returns_403(self):
        response = self.client.patch(
            f"/api/ordenes/{self.orden_ajena.id}/",
            {"cliente": "Cliente modificado"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_limited_update_photos_allowed(self):
        response = self.client.patch(
            f"/api/ordenes/{self.orden_ajena.id}/update-photos/",
            {"fotos_urls": []},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_limited_levantamiento_returns_403(self):
        response = self.client.put(
            f"/api/ordenes/{self.orden_ajena.id}/levantamiento/",
            {"payload": {"tipo": "cerco"}, "dibujo_url": ""},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
