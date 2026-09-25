"""Liquidación de órdenes: exclusiva de quien tenga `liquidar=true` explícito,
sin bypass de staff/superuser, y sin depender del permiso `edit`."""

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.ordenes.models import Orden
from apps.users.models import UserPermissions

User = get_user_model()


class OrdenesLiquidarTests(APITestCase):
    def setUp(self):
        self.liquidador = User.objects.create_user(username="liq_user", password="test-pass-123")
        UserPermissions.objects.create(
            user=self.liquidador,
            permissions={
                "ordenes": {
                    "view": True, "create": False, "edit": False, "delete": False,
                    "own_only": False, "liquidar": True,
                }
            },
        )
        self.admin = User.objects.create_user(
            username="liq_admin", password="test-pass-123", is_staff=True, is_superuser=True
        )
        UserPermissions.objects.create(user=self.admin, permissions={"ordenes": {"view": True}})
        self.sin_permiso = User.objects.create_user(username="liq_sin", password="test-pass-123")
        UserPermissions.objects.create(
            user=self.sin_permiso,
            permissions={"ordenes": {"view": True, "create": True, "edit": True, "delete": True}},
        )

        self.resuelta = Orden.objects.create(cliente="Cliente resuelto", status="resuelto")
        self.pendiente = Orden.objects.create(cliente="Cliente pendiente", status="pendiente")

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def _liquidar(self, orden_id, liquidado):
        return self.client.patch(
            f"/api/ordenes/{orden_id}/liquidar/", {"liquidado": liquidado}, format="json"
        )

    def test_admin_sin_permiso_explicito_no_puede_liquidar(self):
        """Ser staff/superuser NO basta: liquidar es exclusivo de `liquidar=true`."""
        self._auth(self.admin)
        resp = self._liquidar(self.resuelta.id, True)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.resuelta.refresh_from_db()
        self.assertFalse(self.resuelta.liquidado)

    def test_usuario_con_edit_pero_sin_liquidar_no_puede(self):
        self._auth(self.sin_permiso)
        resp = self._liquidar(self.resuelta.id, True)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_liquidador_marca_y_desmarca(self):
        self._auth(self.liquidador)
        resp = self._liquidar(self.resuelta.id, True)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.resuelta.refresh_from_db()
        self.assertTrue(self.resuelta.liquidado)
        self.assertEqual(self.resuelta.liquidado_por_id, self.liquidador.id)
        self.assertIsNotNone(self.resuelta.liquidado_at)

        resp = self._liquidar(self.resuelta.id, False)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.resuelta.refresh_from_db()
        self.assertFalse(self.resuelta.liquidado)
        self.assertIsNone(self.resuelta.liquidado_por_id)
        self.assertIsNone(self.resuelta.liquidado_at)

    def test_no_se_puede_liquidar_una_orden_no_resuelta(self):
        self._auth(self.liquidador)
        resp = self._liquidar(self.pendiente.id, True)
        self.assertEqual(resp.status_code, status.HTTP_409_CONFLICT)
        self.pendiente.refresh_from_db()
        self.assertFalse(self.pendiente.liquidado)

    def test_liquidado_requiere_booleano(self):
        self._auth(self.liquidador)
        resp = self._liquidar(self.resuelta.id, "si")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_liquidador_no_puede_editar_otros_campos(self):
        """El aislamiento es por ruta: sin `edit`, el PATCH normal se rechaza."""
        self._auth(self.liquidador)
        resp = self.client.patch(
            f"/api/ordenes/{self.resuelta.id}/", {"comentario_tecnico": "hackeo"}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_liquidado_visible_en_el_detalle(self):
        self._auth(self.liquidador)
        self._liquidar(self.resuelta.id, True)
        detail = self.client.get(f"/api/ordenes/{self.resuelta.id}/")
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertTrue(detail.data["liquidado"])
        self.assertEqual(detail.data["liquidado_por_username"], "liq_user")
