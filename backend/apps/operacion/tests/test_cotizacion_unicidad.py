"""Cotización única por proyecto — tests de API (requieren DB)."""

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.operacion.models import Proyecto
from apps.users.models import UserPermissions

User = get_user_model()


def _bloque_df(cot_id: str = "df-42", folio: str = "1042") -> dict:
    return {
        "vinculoId": f"vin-{cot_id}",
        "orden": 1,
        "cotizacion": {
            "id": cot_id,
            "origen": "digitalflow",
            "folio": folio,
            "cliente": "Cliente unicidad",
            "fecha": "2026-09-01",
        },
        "lineas": [],
    }


class CotizacionUnicidadApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="unicidad_admin",
            password="test-pass-123",
            is_staff=True,
            is_superuser=True,
        )
        UserPermissions.objects.create(
            user=self.admin,
            permissions={
                "proyectos": {"view": True, "create": True, "edit": True, "delete": True},
            },
        )
        self.client.force_authenticate(user=self.admin)

    def _create(self, **overrides):
        payload = {
            "cliente_nombre": "Cliente unicidad",
            "status": "en_proceso",
            "tipo_trabajo_nombre": "Instalación",
            "equipos": [],
            "cotizaciones": [],
            "porcentaje_avance": 0,
        }
        payload.update(overrides)
        return self.client.post("/api/proyectos/", payload, format="json")

    def test_second_proyecto_cannot_reuse_principal_cotizacion(self):
        a = self._create(cotizaciones=[_bloque_df("df-42")])
        self.assertEqual(a.status_code, status.HTTP_201_CREATED, a.data)

        b = self._create(cotizaciones=[_bloque_df("df-42")])
        self.assertEqual(b.status_code, status.HTTP_400_BAD_REQUEST, b.data)
        self.assertIn("cotizaciones", b.data)

    def test_cotizacion_adicional_blocks_other_proyecto(self):
        a = self._create(
            cotizaciones=[],
            cotizacion_adicional={
                "id": "df-99",
                "origen": "digitalflow",
                "folio": "1099",
                "cliente": "Cliente unicidad",
                "fecha": "2026-09-01",
            },
        )
        self.assertEqual(a.status_code, status.HTTP_201_CREATED, a.data)

        b_as_principal = self._create(cotizaciones=[_bloque_df("df-99")])
        self.assertEqual(b_as_principal.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cotizaciones", b_as_principal.data)

        b_as_adicional = self._create(
            cotizacion_adicional={
                "id": "df-99",
                "origen": "digitalflow",
                "folio": "1099",
                "cliente": "Cliente unicidad",
                "fecha": "2026-09-01",
            },
        )
        self.assertEqual(b_as_adicional.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cotizacion_adicional", b_as_adicional.data)

    def test_self_edit_keeps_own_cotizacion(self):
        a = self._create(cotizaciones=[_bloque_df("df-55")])
        self.assertEqual(a.status_code, status.HTTP_201_CREATED, a.data)
        proyecto_id = a.data["id"]

        patch = self.client.patch(
            f"/api/proyectos/{proyecto_id}/",
            {
                "cotizaciones": [_bloque_df("df-55")],
                "cliente_nombre": "Cliente unicidad editado",
            },
            format="json",
        )
        self.assertEqual(patch.status_code, status.HTTP_200_OK, patch.data)

    def test_cancelado_releases_cotizacion(self):
        a = self._create(cotizaciones=[_bloque_df("df-77")])
        self.assertEqual(a.status_code, status.HTTP_201_CREATED, a.data)
        proyecto_id = a.data["id"]

        cancel = self.client.patch(
            f"/api/proyectos/{proyecto_id}/",
            {"status": "cancelado", "motivo_cancelacion": "Cliente desistió"},
            format="json",
        )
        self.assertEqual(cancel.status_code, status.HTTP_200_OK, cancel.data)
        self.assertEqual(Proyecto.objects.get(pk=proyecto_id).status, "cancelado")

        b = self._create(cotizaciones=[_bloque_df("df-77")])
        self.assertEqual(b.status_code, status.HTTP_201_CREATED, b.data)

    def test_duplicate_principal_and_adicional_in_same_payload(self):
        res = self._create(
            cotizaciones=[_bloque_df("df-33")],
            cotizacion_adicional={
                "id": "df-33",
                "origen": "digitalflow",
                "folio": "1033",
                "cliente": "Cliente unicidad",
                "fecha": "2026-09-01",
            },
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST, res.data)
        self.assertIn("cotizaciones", res.data)

    def test_cotizaciones_ocupadas_endpoint(self):
        a = self._create(cotizaciones=[_bloque_df("df-88")])
        self.assertEqual(a.status_code, status.HTTP_201_CREATED, a.data)
        folio_a = a.data["folio"]
        id_a = a.data["id"]

        all_ocupadas = self.client.get("/api/proyectos/cotizaciones-ocupadas/")
        self.assertEqual(all_ocupadas.status_code, status.HTTP_200_OK)
        self.assertIn("df-88", all_ocupadas.data["ids"])
        self.assertEqual(all_ocupadas.data["by_id"]["df-88"]["folio"], folio_a)

        excluded = self.client.get(
            f"/api/proyectos/cotizaciones-ocupadas/?exclude_proyecto_id={id_a}"
        )
        self.assertEqual(excluded.status_code, status.HTTP_200_OK)
        self.assertNotIn("df-88", excluded.data["ids"])
