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
        resp = self._liquidar(self.cerrado.id, True)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.cerrado.refresh_from_db()
        self.assertFalse(self.cerrado.liquidado)

    def test_usuario_con_edit_pero_sin_liquidar_no_puede(self):
        self._auth(self.sin_permiso)
        resp = self._liquidar(self.cerrado.id, True)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_liquidador_marca_y_desmarca(self):
        self._auth(self.liquidador)
        resp = self._liquidar(self.cerrado.id, True)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.cerrado.refresh_from_db()
        self.assertTrue(self.cerrado.liquidado)
        self.assertEqual(self.cerrado.liquidado_por_id, self.liquidador.id)
        self.assertIsNotNone(self.cerrado.liquidado_at)

        resp = self._liquidar(self.cerrado.id, False)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.cerrado.refresh_from_db()
        self.assertFalse(self.cerrado.liquidado)
        self.assertIsNone(self.cerrado.liquidado_por_id)
        self.assertIsNone(self.cerrado.liquidado_at)

    def test_no_se_puede_liquidar_un_proyecto_no_cerrado(self):
        self._auth(self.liquidador)
        resp = self._liquidar(self.en_proceso.id, True)
        self.assertEqual(resp.status_code, status.HTTP_409_CONFLICT)
        self.en_proceso.refresh_from_db()
        self.assertFalse(self.en_proceso.liquidado)

    def test_liquidador_no_puede_editar_otros_campos(self):
        self._auth(self.liquidador)
        resp = self.client.patch(
            f"/api/proyectos/{self.cerrado.id}/", {"incidencias": "hackeo"}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_liquidado_visible_en_el_detalle(self):
        self._auth(self.liquidador)
        self._liquidar(self.cerrado.id, True)
        detail = self.client.get(f"/api/proyectos/{self.cerrado.id}/")
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertTrue(detail.data["liquidado"])
        self.assertEqual(detail.data["liquidado_por_username"], "liq_proy_user")
