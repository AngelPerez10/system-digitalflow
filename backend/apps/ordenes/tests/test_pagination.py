from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.ordenes.models import Orden
from apps.users.models import UserPermissions

User = get_user_model()


class OrdenesPaginationTests(APITestCase):
    """Paginación opt-in de `/api/ordenes/` (ver `OrdenOptInPagination`)."""

    def setUp(self):
        self.user = User.objects.create_user(username="pag_tecnico", password="test-pass-123")
        UserPermissions.objects.create(
            user=self.user,
            permissions={"ordenes": {"view": True, "create": True, "edit": True, "delete": False}},
        )
        self.client.force_authenticate(user=self.user)
        for i in range(7):
            Orden.objects.create(
                cliente=f"Cliente {i}",
                creado_por=self.user,
                fecha_inicio="2026-07-05",
            )

    def test_sin_parametros_devuelve_array_plano(self):
        """Compat: sin `page`/`page_size` la respuesta es la lista de siempre."""
        response = self.client.get("/api/ordenes/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 7)

    def test_limit_sigue_recortando_el_array_plano(self):
        response = self.client.get("/api/ordenes/?limit=3")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 3)

    def test_page_activa_el_sobre_paginado(self):
        response = self.client.get("/api/ordenes/?page=1&page_size=3")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 7)
        self.assertEqual(len(response.data["results"]), 3)
        self.assertIsNotNone(response.data["next"])
        self.assertIsNone(response.data["previous"])

    def test_segunda_y_ultima_pagina(self):
        p2 = self.client.get("/api/ordenes/?page=2&page_size=3")
        self.assertEqual(len(p2.data["results"]), 3)
        self.assertIsNotNone(p2.data["previous"])

        p3 = self.client.get("/api/ordenes/?page=3&page_size=3")
        self.assertEqual(len(p3.data["results"]), 1)
        self.assertIsNone(p3.data["next"])

    def test_page_size_respeta_el_maximo(self):
        response = self.client.get("/api/ordenes/?page=1&page_size=9999")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # max_page_size = 200 -> con 7 órdenes caben todas en una página.
        self.assertEqual(len(response.data["results"]), 7)
        self.assertIsNone(response.data["next"])

    def test_page_fuera_de_rango_da_404(self):
        response = self.client.get("/api/ordenes/?page=99&page_size=3")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_paginado_respeta_filtro_mes(self):
        Orden.objects.create(cliente="Junio", creado_por=self.user, fecha_inicio="2026-06-01")
        response = self.client.get("/api/ordenes/?mes=2026-07&page=1&page_size=50")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 7)

    def test_paginado_respeta_own_only(self):
        UserPermissions.objects.filter(user=self.user).update(
            permissions={"ordenes": {"view": True, "own_only": True}},
        )
        otro = User.objects.create_user(username="pag_otro", password="test-pass-123")
        Orden.objects.create(cliente="Ajena", creado_por=otro, tecnico_asignado=otro)

        response = self.client.get("/api/ordenes/?page=1&page_size=50")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 7)
