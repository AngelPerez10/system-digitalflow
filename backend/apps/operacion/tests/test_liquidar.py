"""Liquidación de proyectos: exclusiva de quien tenga `liquidar=true` explícito,
sin bypass de staff/superuser, y sin depender del permiso `edit`."""

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.operacion.models import Proyecto
from apps.users.models import UserPermissions

User = get_user_model()


class ProyectosLiquidarTests(APITestCase):
    def setUp(self):
        self.liquidador = User.objects.create_user(username="liq_proy_user", password="test-pass-123")
        UserPermissions.objects.create(
            user=self.liquidador,
            permissions={"proyectos": {"view": True, "create": False, "edit": False, "delete": False, "liquidar": True}},
        )
        self.admin = User.objects.create_user(
            username="liq_proy_admin", password="test-pass-123", is_staff=True, is_superuser=True
        )
        UserPermissions.objects.create(user=self.admin, permissions={"proyectos": {"view": True}})
        self.sin_permiso = User.objects.create_user(username="liq_proy_sin", password="test-pass-123")
        UserPermissions.objects.create(
            user=self.sin_permiso,
            permissions={"proyectos": {"view": True, "create": True, "edit": True, "delete": True}},
        )

        self.saldo = Proyecto.objects.create(cliente_nombre="Cliente con saldo", status="saldo_pendiente")
        self.cerrado = Proyecto.objects.create(cliente_nombre="Cliente cerrado", status="cerrado")
        self.en_proceso = Proyecto.objects.create(cliente_nombre="Cliente en proceso", status="en_proceso")

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def _liquidar(self, proyecto_id, liquidado):
        return self.client.patch(
            f"/api/proyectos/{proyecto_id}/liquidar/", {"liquidado": liquidado}, format="json"
        )

    def test_admin_sin_permiso_explicito_no_puede_liquidar(self):
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
        self.assertEqual(self.saldo.status, "cerrado")
        self.assertEqual(self.saldo.status_changed_by_id, self.liquidador.id)
        self.assertEqual(resp.data.get("status"), "cerrado")

        resp = self._liquidar(self.saldo.id, False)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.saldo.refresh_from_db()
        self.assertFalse(self.saldo.liquidado)
        self.assertIsNone(self.saldo.liquidado_por_id)
        self.assertIsNone(self.saldo.liquidado_at)
        # Desmarcar no revierte el status: sigue Cerrado.
        self.assertEqual(self.saldo.status, "cerrado")

    def test_no_se_puede_liquidar_fuera_de_saldo_pendiente(self):
        self._auth(self.liquidador)
        for proyecto in (self.en_proceso, self.cerrado):
            resp = self._liquidar(proyecto.id, True)
            self.assertEqual(resp.status_code, status.HTTP_409_CONFLICT)
            proyecto.refresh_from_db()
            self.assertFalse(proyecto.liquidado)

    def test_liquidar_pasa_a_cerrado(self):
        self._auth(self.liquidador)
        self._liquidar(self.saldo.id, True)
        self.saldo.refresh_from_db()
        self.assertEqual(self.saldo.status, "cerrado")
        self.assertTrue(self.saldo.liquidado)

    def test_desmarcar_liquidado_historico_en_cerrado(self):
        Proyecto.objects.filter(pk=self.cerrado.pk).update(liquidado=True)
        self._auth(self.liquidador)
        resp = self._liquidar(self.cerrado.id, False)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.cerrado.refresh_from_db()
        self.assertFalse(self.cerrado.liquidado)

    def test_no_admin_no_puede_marcar_saldo_pendiente(self):
        profile = self.liquidador.permissions_profile
        profile.permissions = {
            "proyectos": {
                "view": True, "create": False, "edit": True, "delete": False,
                "cambiar_status": True,
            }
        }
        profile.save(update_fields=["permissions"])
        self.liquidador = User.objects.get(pk=self.liquidador.pk)
        self._auth(self.liquidador)
        for url in (
            f"/api/proyectos/{self.en_proceso.id}/",
            f"/api/proyectos/{self.en_proceso.id}/cambiar-status/",
        ):
            resp = self.client.patch(url, {"status": "saldo_pendiente"}, format="json")
            self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST, url)
        self.en_proceso.refresh_from_db()
        self.assertEqual(self.en_proceso.status, "en_proceso")

    def test_admin_marca_saldo_pendiente(self):
        admin = User.objects.create_user(
            username="saldo_proy_admin", password="test-pass-123", is_staff=True
        )
        UserPermissions.objects.create(
            user=admin,
            permissions={"proyectos": {"view": True, "edit": True, "cambiar_status": True}},
        )
        self._auth(admin)
        resp = self.client.patch(
            f"/api/proyectos/{self.en_proceso.id}/cambiar-status/",
            {"status": "saldo_pendiente"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        self.en_proceso.refresh_from_db()
        self.assertEqual(self.en_proceso.status, "saldo_pendiente")

    def test_liquidador_no_puede_editar_otros_campos(self):
        self._auth(self.liquidador)
        resp = self.client.patch(
            f"/api/proyectos/{self.saldo.id}/", {"incidencias": "hackeo"}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_liquidado_visible_en_el_detalle(self):
        self._auth(self.liquidador)
        self._liquidar(self.saldo.id, True)
        detail = self.client.get(f"/api/proyectos/{self.saldo.id}/")
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertTrue(detail.data["liquidado"])
        self.assertEqual(detail.data["liquidado_por_username"], "liq_proy_user")

    def test_liquidador_con_edit_no_puede_cambiar_status_sin_flag(self):
        profile = self.liquidador.permissions_profile
        profile.permissions = {
            "proyectos": {
                "view": True, "create": False, "edit": True, "delete": False,
                "liquidar": True, "cambiar_status": False,
            }
        }
        profile.save(update_fields=["permissions"])
        self.liquidador = User.objects.get(pk=self.liquidador.pk)
        self._auth(self.liquidador)
        resp = self.client.patch(
            f"/api/proyectos/{self.en_proceso.id}/",
            {"status": "pausado", "motivo_pausa": "Espera de material"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", resp.data)
        self.en_proceso.refresh_from_db()
        self.assertEqual(self.en_proceso.status, "en_proceso")

    def test_cambiar_status_con_flag_funciona_sin_edit(self):
        profile = self.liquidador.permissions_profile
        profile.permissions = {
            "proyectos": {
                "view": True, "create": False, "edit": False, "delete": False,
                "liquidar": True, "cambiar_status": True,
            }
        }
        profile.save(update_fields=["permissions"])
        self.liquidador = User.objects.get(pk=self.liquidador.pk)
        self._auth(self.liquidador)
        resp = self.client.patch(
            f"/api/proyectos/{self.en_proceso.id}/cambiar-status/",
            {"status": "pausado", "motivo_pausa": "Espera de material"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.en_proceso.refresh_from_db()
        self.assertEqual(self.en_proceso.status, "pausado")
