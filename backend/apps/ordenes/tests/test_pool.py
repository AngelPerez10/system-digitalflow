"""Bolsa de órdenes: liberar / tomar (primero gana) / listar pool."""

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.ordenes.models import Orden
from apps.users.models import UserPermissions

User = get_user_model()


class OrdenesPoolTests(APITestCase):
    def setUp(self):
        self.tecnico_a = User.objects.create_user(username="pool_a", password="test-pass-123")
        self.tecnico_b = User.objects.create_user(username="pool_b", password="test-pass-123")
        self.tecnico_c = User.objects.create_user(username="pool_c", password="test-pass-123")
        self.admin = User.objects.create_user(
            username="pool_admin", password="test-pass-123", is_staff=True
        )
        for u in (self.tecnico_a, self.tecnico_b, self.tecnico_c):
            UserPermissions.objects.create(
                user=u,
                permissions={
                    "ordenes": {
                        "view": True, "create": True, "edit": True,
                        "delete": False, "own_only": True,
                    }
                },
            )
        UserPermissions.objects.create(user=self.admin, permissions={"ordenes": {"view": True}})

        self.orden = Orden.objects.create(
            cliente="Cliente pool",
            status="pendiente",
            prioridad_pool="media",
            tecnico_asignado=self.tecnico_a,
            creado_por=self.tecnico_a,
        )

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def _liberar(self, orden_id):
        return self.client.post(f"/api/ordenes/{orden_id}/liberar/", {}, format="json")

    def _tomar(self, orden_id):
        return self.client.post(f"/api/ordenes/{orden_id}/tomar/", {}, format="json")

    def _poner_en_pool(self):
        self.orden.en_pool = True
        self.orden.tecnico_asignado = None
        self.orden.liberada_por = self.tecnico_a
        self.orden.save(update_fields=["en_pool", "tecnico_asignado", "liberada_por"])

    # --- liberar ---------------------------------------------------------
    def test_liberar_por_tecnico_asignado_ok(self):
        self._auth(self.tecnico_a)
        resp = self._liberar(self.orden.id)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.orden.refresh_from_db()
        self.assertTrue(self.orden.en_pool)
        self.assertIsNone(self.orden.tecnico_asignado_id)
        self.assertEqual(self.orden.liberada_por_id, self.tecnico_a.id)
        self.assertIsNotNone(self.orden.liberada_at)
        self.assertEqual(self.orden.status, "pendiente")

    def test_liberar_por_admin_no_asignado_ok(self):
        self._auth(self.admin)
        resp = self._liberar(self.orden.id)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.orden.refresh_from_db()
        self.assertTrue(self.orden.en_pool)

    def test_liberar_por_tecnico_ajeno_forbidden(self):
        self._auth(self.tecnico_b)
        resp = self._liberar(self.orden.id)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.orden.refresh_from_db()
        self.assertFalse(self.orden.en_pool)

    def test_liberar_orden_resuelta_rechazada(self):
        self.orden.status = "resuelto"
        self.orden.save(update_fields=["status"])
        self._auth(self.tecnico_a)
        resp = self._liberar(self.orden.id)
        self.assertEqual(resp.status_code, status.HTTP_409_CONFLICT)
        self.orden.refresh_from_db()
        self.assertFalse(self.orden.en_pool)

    def test_liberar_pausada_conserva_status(self):
        self.orden.status = "pausado"
        self.orden.motivo_pausa = "Falta material"
        self.orden.save(update_fields=["status", "motivo_pausa"])
        self._auth(self.tecnico_a)
        resp = self._liberar(self.orden.id)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.orden.refresh_from_db()
        self.assertTrue(self.orden.en_pool)
        self.assertEqual(self.orden.status, "pausado")

    def test_liberar_idempotente(self):
        self._auth(self.tecnico_a)
        self._liberar(self.orden.id)
        resp = self._liberar(self.orden.id)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_liberar_sin_permiso_ordenes(self):
        sin = User.objects.create_user(username="pool_sin", password="test-pass-123")
        UserPermissions.objects.create(user=sin, permissions={"ordenes": {}})
        self._auth(sin)
        resp = self._liberar(self.orden.id)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    # --- tomar ---------------------------------------------------------
    def test_tomar_happy_path(self):
        self._poner_en_pool()
        self._auth(self.tecnico_b)
        resp = self._tomar(self.orden.id)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.orden.refresh_from_db()
        self.assertFalse(self.orden.en_pool)
        self.assertEqual(self.orden.tecnico_asignado_id, self.tecnico_b.id)
        self.assertEqual(self.orden.tomada_por_id, self.tecnico_b.id)
        self.assertIsNotNone(self.orden.tomada_at)
        detail = self.client.get(f"/api/ordenes/{self.orden.id}/")
        self.assertEqual(detail.status_code, status.HTTP_200_OK)

    def test_tomar_ya_tomada_409(self):
        self._auth(self.tecnico_b)
        resp = self._tomar(self.orden.id)  # nunca se liberó
        self.assertEqual(resp.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("detail", resp.data)

    def test_tomar_doble_secuencial_una_gana(self):
        self._poner_en_pool()
        self._auth(self.tecnico_b)
        r1 = self._tomar(self.orden.id)
        self._auth(self.tecnico_c)
        r2 = self._tomar(self.orden.id)
        self.assertEqual(r1.status_code, status.HTTP_200_OK)
        self.assertEqual(r2.status_code, status.HTTP_409_CONFLICT)
        self.orden.refresh_from_db()
        self.assertEqual(self.orden.tecnico_asignado_id, self.tecnico_b.id)

    # --- pool listing ------------------------------------------------
    def test_pool_visible_para_tecnico_own_only(self):
        self._poner_en_pool()
        self._auth(self.tecnico_b)  # own_only, no asignado, no creador
        resp = self.client.get("/api/ordenes/pool/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn(self.orden.id, {row["id"] for row in resp.data})
        normal = self.client.get("/api/ordenes/")
        self.assertNotIn(self.orden.id, {row["id"] for row in normal.data})

    def test_pool_excluye_no_liberadas(self):
        otra = Orden.objects.create(cliente="No liberada", tecnico_asignado=self.tecnico_b)
        self._poner_en_pool()
        self._auth(self.tecnico_c)
        resp = self.client.get("/api/ordenes/pool/")
        ids = {row["id"] for row in resp.data}
        self.assertIn(self.orden.id, ids)
        self.assertNotIn(otra.id, ids)

    def test_pool_ordena_por_prioridad(self):
        alta = Orden.objects.create(
            cliente="Alta", en_pool=True, prioridad_pool="alta", liberada_por=self.tecnico_a
        )
        baja = Orden.objects.create(
            cliente="Baja", en_pool=True, prioridad_pool="baja", liberada_por=self.tecnico_a
        )
        self._poner_en_pool()  # media
        self._auth(self.tecnico_c)
        resp = self.client.get("/api/ordenes/pool/")
        orden_ids = [row["id"] for row in resp.data]
        self.assertLess(orden_ids.index(alta.id), orden_ids.index(baja.id))
        self.assertLess(orden_ids.index(alta.id), orden_ids.index(self.orden.id))

    def test_prioridad_pool_editable_por_patch(self):
        self._auth(self.admin)
        resp = self.client.patch(
            f"/api/ordenes/{self.orden.id}/", {"prioridad_pool": "alta"}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.orden.refresh_from_db()
        self.assertEqual(self.orden.prioridad_pool, "alta")
