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

        self.saldo = Orden.objects.create(cliente="Cliente con saldo", status="saldo_pendiente")
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
        resp = self._liquidar(self.saldo.id, True)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.saldo.refresh_from_db()
        self.assertFalse(self.saldo.liquidado)

    def test_usuario_con_edit_pero_sin_liquidar_no_puede(self):
        self._auth(self.sin_permiso)
        resp = self._liquidar(self.saldo.id, True)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_liquidador_marca_y_desmarca(self):
        self._auth(self.liquidador)
        resp = self._liquidar(self.saldo.id, True)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.saldo.refresh_from_db()
        self.assertTrue(self.saldo.liquidado)
        self.assertEqual(self.saldo.liquidado_por_id, self.liquidador.id)
        self.assertIsNotNone(self.saldo.liquidado_at)
        self.assertEqual(self.saldo.status, "resuelto")
        self.assertEqual(self.saldo.status_changed_by_id, self.liquidador.id)
        self.assertEqual(resp.data.get("status"), "resuelto")

        resp = self._liquidar(self.saldo.id, False)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.saldo.refresh_from_db()
        self.assertFalse(self.saldo.liquidado)
        self.assertIsNone(self.saldo.liquidado_por_id)
        self.assertIsNone(self.saldo.liquidado_at)
        # Desmarcar no revierte el status: sigue Resuelta.
        self.assertEqual(self.saldo.status, "resuelto")

    def test_no_se_puede_liquidar_fuera_de_saldo_pendiente(self):
        self._auth(self.liquidador)
        for orden in (self.pendiente, self.resuelta):
            resp = self._liquidar(orden.id, True)
            self.assertEqual(resp.status_code, status.HTTP_409_CONFLICT)
            orden.refresh_from_db()
            self.assertFalse(orden.liquidado)

    def test_desmarcar_liquidado_historico_en_resuelta(self):
        """Registros liquidados antes de Saldo pendiente se pueden corregir."""
        Orden.objects.filter(pk=self.resuelta.pk).update(liquidado=True)
        self._auth(self.liquidador)
        resp = self._liquidar(self.resuelta.id, False)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.resuelta.refresh_from_db()
        self.assertFalse(self.resuelta.liquidado)

    def test_liquidado_requiere_booleano(self):
        self._auth(self.liquidador)
        resp = self._liquidar(self.saldo.id, "si")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_liquidador_no_puede_editar_otros_campos(self):
        """El aislamiento es por ruta: sin `edit`, el PATCH normal se rechaza."""
        self._auth(self.liquidador)
        resp = self.client.patch(
            f"/api/ordenes/{self.saldo.id}/", {"comentario_tecnico": "hackeo"}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_liquidado_visible_en_el_detalle(self):
        self._auth(self.liquidador)
        self._liquidar(self.saldo.id, True)
        detail = self.client.get(f"/api/ordenes/{self.saldo.id}/")
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertTrue(detail.data["liquidado"])
        self.assertEqual(detail.data["liquidado_por_username"], "liq_user")

    def test_liquidador_con_edit_no_puede_cambiar_status_sin_flag(self):
        """liquidar + edit sin cambiar_status → PATCH status rechazado."""
        profile = self.liquidador.permissions_profile
        profile.permissions = {
            "ordenes": {
                "view": True, "create": False, "edit": True, "delete": False,
                "own_only": False, "liquidar": True, "cambiar_status": False,
            }
        }
        profile.save(update_fields=["permissions"])
        self.liquidador = User.objects.get(pk=self.liquidador.pk)
        self._auth(self.liquidador)
        resp = self.client.patch(
            f"/api/ordenes/{self.pendiente.id}/",
            {"status": "pausado", "motivo_pausa": "Espera de pieza"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", resp.data)
        self.pendiente.refresh_from_db()
        self.assertEqual(self.pendiente.status, "pendiente")

    def test_cambiar_status_ruta_dedicada_exige_flag(self):
        self._auth(self.liquidador)
        resp = self.client.patch(
            f"/api/ordenes/{self.pendiente.id}/cambiar-status/",
            {"status": "pausado", "motivo_pausa": "Espera"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_cambiar_status_con_flag_funciona_sin_edit(self):
        profile = self.liquidador.permissions_profile
        profile.permissions = {
            "ordenes": {
                "view": True, "create": False, "edit": False, "delete": False,
                "own_only": False, "liquidar": True, "cambiar_status": True,
            }
        }
        profile.save(update_fields=["permissions"])
        self.liquidador = User.objects.get(pk=self.liquidador.pk)
        self._auth(self.liquidador)
        resp = self.client.patch(
            f"/api/ordenes/{self.pendiente.id}/cambiar-status/",
            {"status": "pausado", "motivo_pausa": "Espera de pieza"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.pendiente.refresh_from_db()
        self.assertEqual(self.pendiente.status, "pausado")


class OrdenesSaldoPendienteTests(APITestCase):
    """Entrar a `saldo_pendiente` es exclusivo de staff/superuser."""

    def setUp(self):
        perms = {
            "ordenes": {
                "view": True, "create": True, "edit": True, "delete": False,
                "own_only": False, "cambiar_status": True,
            }
        }
        self.tecnico = User.objects.create_user(username="saldo_tec", password="test-pass-123")
        UserPermissions.objects.create(user=self.tecnico, permissions=perms)
        self.admin = User.objects.create_user(
            username="saldo_admin", password="test-pass-123", is_staff=True
        )
        UserPermissions.objects.create(user=self.admin, permissions=perms)
        self.orden = Orden.objects.create(cliente="Cliente", status="pendiente")

    def test_no_admin_no_puede_marcar_saldo_pendiente_por_patch(self):
        self.client.force_authenticate(user=self.tecnico)
        resp = self.client.patch(
            f"/api/ordenes/{self.orden.id}/", {"status": "saldo_pendiente"}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.orden.refresh_from_db()
        self.assertEqual(self.orden.status, "pendiente")

    def test_no_admin_no_puede_marcar_saldo_pendiente_por_cambiar_status(self):
        self.client.force_authenticate(user=self.tecnico)
        resp = self.client.patch(
            f"/api/ordenes/{self.orden.id}/cambiar-status/",
            {"status": "saldo_pendiente"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.orden.refresh_from_db()
        self.assertEqual(self.orden.status, "pendiente")

    def test_admin_marca_saldo_pendiente(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.patch(
            f"/api/ordenes/{self.orden.id}/cambiar-status/",
            {"status": "saldo_pendiente"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.orden.refresh_from_db()
        self.assertEqual(self.orden.status, "saldo_pendiente")
