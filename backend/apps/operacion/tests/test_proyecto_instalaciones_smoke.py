from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.operacion.models import Proyecto, ProyectoInstalacion
from apps.users.models import UserPermissions

User = get_user_model()


class ProyectoInstalacionesSmokeTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="ins_user", password="test-pass-123")
        UserPermissions.objects.create(
            user=self.user,
            permissions={
                "proyectos": {"view": True, "create": True, "edit": True, "delete": True},
            },
        )
        self.client.force_authenticate(user=self.user)
        self.proyecto = Proyecto.objects.create(
            cliente_nombre="Cliente instalación",
            status="en_proceso",
            creado_por=self.user,
        )

    def test_crud_and_filter(self):
        create_res = self.client.post(
            "/api/proyecto-instalaciones/",
            {
                "proyecto": self.proyecto.id,
                "payload": {
                    "tipo_instalacion": "gps",
                    "placas": "ABC-123",
                    "imei": "860000000000001",
                    "tipo_gps": "teltonika-kitgpsfmc920",
                },
                "dibujo_url": "",
            },
            format="json",
        )
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED, create_res.data)
        self.assertIn("id", create_res.data)
        self.assertIsNotNone(create_res.data.get("idx"))
        self.assertEqual(create_res.data["proyecto"], self.proyecto.id)
        self.assertEqual(create_res.data["cliente_nombre"], "Cliente instalación")
        self.assertEqual(create_res.data["payload"]["placas"], "ABC-123")
        instalacion_id = create_res.data["id"]

        # Segunda instalación en el mismo proyecto
        create2 = self.client.post(
            "/api/proyecto-instalaciones/",
            {
                "proyecto": self.proyecto.id,
                "payload": {"tipo_instalacion": "gps", "placas": "XYZ-999"},
            },
            format="json",
        )
        self.assertEqual(create2.status_code, status.HTTP_201_CREATED, create2.data)
        self.assertNotEqual(create2.data["id"], instalacion_id)

        list_res = self.client.get("/api/proyecto-instalaciones/")
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_res.data), 2)

        filtered = self.client.get(f"/api/proyecto-instalaciones/?proyecto={self.proyecto.id}")
        self.assertEqual(filtered.status_code, status.HTTP_200_OK)
        self.assertEqual(len(filtered.data), 2)

        other = Proyecto.objects.create(cliente_nombre="Otro", status="en_proceso", creado_por=self.user)
        filtered_other = self.client.get(f"/api/proyecto-instalaciones/?proyecto={other.id}")
        self.assertEqual(filtered_other.status_code, status.HTTP_200_OK)
        self.assertEqual(len(filtered_other.data), 0)

        patch_res = self.client.patch(
            f"/api/proyecto-instalaciones/{instalacion_id}/",
            {"payload": {"tipo_instalacion": "gps", "placas": "ABC-456"}},
            format="json",
        )
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK, patch_res.data)
        self.assertEqual(patch_res.data["payload"]["placas"], "ABC-456")

        detail = self.client.get(f"/api/proyecto-instalaciones/{instalacion_id}/")
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertEqual(detail.data["payload"]["placas"], "ABC-456")

        delete_res = self.client.delete(f"/api/proyecto-instalaciones/{instalacion_id}/")
        self.assertEqual(delete_res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(ProyectoInstalacion.objects.filter(pk=instalacion_id).exists())

    def test_denied_without_proyectos_permission(self):
        denied = User.objects.create_user(username="ins_denied", password="test-pass-123")
        UserPermissions.objects.create(
            user=denied,
            permissions={"ordenes": {"view": True, "create": True, "edit": True, "delete": True}},
        )
        self.client.force_authenticate(user=denied)
        response = self.client.get("/api/proyecto-instalaciones/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_requires_proyecto(self):
        response = self.client.post(
            "/api/proyecto-instalaciones/",
            {"payload": {"placas": "NO-PRJ"}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_own_only_cannot_attach_to_foreign_proyecto(self):
        owner = User.objects.create_user(username="ins_owner", password="test-pass-123")
        UserPermissions.objects.create(
            user=owner,
            permissions={"proyectos": {"view": True, "create": True, "edit": True, "delete": True}},
        )
        foreign = Proyecto.objects.create(
            cliente_nombre="Ajeno",
            status="en_proceso",
            creado_por=owner,
        )

        limited = User.objects.create_user(username="ins_own_only", password="test-pass-123")
        UserPermissions.objects.create(
            user=limited,
            permissions={
                "proyectos": {
                    "view": True,
                    "create": True,
                    "edit": True,
                    "delete": True,
                    "own_only": True,
                },
            },
        )
        mine = Proyecto.objects.create(
            cliente_nombre="Mío",
            status="en_proceso",
            creado_por=limited,
        )
        self.client.force_authenticate(user=limited)

        denied = self.client.post(
            "/api/proyecto-instalaciones/",
            {"proyecto": foreign.id, "payload": {"placas": "X"}},
            format="json",
        )
        self.assertEqual(denied.status_code, status.HTTP_400_BAD_REQUEST)

        ok = self.client.post(
            "/api/proyecto-instalaciones/",
            {"proyecto": mine.id, "payload": {"placas": "MIO-1"}},
            format="json",
        )
        self.assertEqual(ok.status_code, status.HTTP_201_CREATED, ok.data)
