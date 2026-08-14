from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APITestCase

from apps.ordenes.edit_scope import user_has_full_orden_edit
from apps.ordenes.models import Orden
from apps.users.models import UserPermissions

User = get_user_model()


class UserHasFullOrdenEditTests(TestCase):
    def setUp(self):
        self.tecnico = User.objects.create_user(username="tec_full", password="test-pass-123")
        self.otro = User.objects.create_user(username="otro_full", password="test-pass-123")
        self.orden_ajena = Orden.objects.create(
            cliente="Cliente ajeno",
            tecnico_asignado=self.otro,
            creado_por=self.otro,
        )

    def _set_ordenes_perms(self, own_only: bool):
        UserPermissions.objects.filter(user=self.tecnico).delete()
        UserPermissions.objects.create(
            user=self.tecnico,
            permissions={
                "ordenes": {
                    "view": True,
                    "create": True,
                    "edit": True,
                    "delete": False,
                    "own_only": own_only,
                },
            },
        )
        self.tecnico.refresh_from_db()

    def test_own_only_true_foreign_order_is_limited(self):
        self._set_ordenes_perms(own_only=True)
        self.assertFalse(user_has_full_orden_edit(self.tecnico, self.orden_ajena))

    def test_own_only_false_foreign_order_is_full_edit(self):
        self._set_ordenes_perms(own_only=False)
        self.assertTrue(user_has_full_orden_edit(self.tecnico, self.orden_ajena))


class OrdenesOwnOnlyFullEditApiTests(APITestCase):
    def setUp(self):
        self.tecnico = User.objects.create_user(username="tec_api", password="test-pass-123")
        self.otro = User.objects.create_user(username="otro_api", password="test-pass-123")
        self.orden_ajena = Orden.objects.create(
            cliente="Cliente ajeno",
            tecnico_asignado=self.otro,
            creado_por=self.otro,
            problematica="Antes",
            nombre_encargado="Encargado original",
        )

    def _auth(self, own_only: bool):
        UserPermissions.objects.filter(user=self.tecnico).delete()
        UserPermissions.objects.create(
            user=self.tecnico,
            permissions={
                "ordenes": {
                    "view": True,
                    "create": True,
                    "edit": True,
                    "delete": False,
                    "own_only": own_only,
                },
            },
        )
        self.client.force_authenticate(user=self.tecnico)

    def test_own_only_false_can_patch_non_limited_fields(self):
        self._auth(own_only=False)
        response = self.client.patch(
            f"/api/ordenes/{self.orden_ajena.id}/",
            {"nombre_encargado": "Nuevo encargado", "problematica": "Después"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.orden_ajena.refresh_from_db()
        self.assertEqual(self.orden_ajena.nombre_encargado, "Nuevo encargado")
        self.assertEqual(self.orden_ajena.problematica, "Después")

    def test_own_only_true_cannot_patch_foreign_order(self):
        self._auth(own_only=True)
        response = self.client.patch(
            f"/api/ordenes/{self.orden_ajena.id}/",
            {"nombre_encargado": "Hack"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)
