from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.ordenes.models import Orden
from apps.users.models import UserPermissions

User = get_user_model()


def _list_ids(response):
    data = response.data
    if isinstance(data, dict) and "results" in data:
        rows = data["results"]
    else:
        rows = data
    return {row["id"] for row in rows}


class ArrastreAbiertasListTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="arrastre", password="pass")
        UserPermissions.objects.create(
            user=self.user,
            permissions={"ordenes": {"view": True, "create": True, "edit": True, "delete": False}},
        )
        self.client.force_authenticate(user=self.user)

        self.junio_pendiente = Orden.objects.create(
            cliente="Junio pendiente",
            fecha_inicio="2026-06-15",
            status="pendiente",
            creado_por=self.user,
        )
        self.julio_pendiente = Orden.objects.create(
            cliente="Julio pendiente",
            fecha_inicio="2026-07-10",
            status="pendiente",
            creado_por=self.user,
        )
        self.julio_pausado = Orden.objects.create(
            cliente="Julio pausado",
            fecha_inicio="2026-07-12",
            status="pausado",
            motivo_pausa="Espera de refacción",
            creado_por=self.user,
        )
        self.julio_resuelto = Orden.objects.create(
            cliente="Julio resuelto",
            fecha_inicio="2026-07-20",
            status="resuelto",
            creado_por=self.user,
        )
        self.agosto_pendiente = Orden.objects.create(
            cliente="Agosto pendiente",
            fecha_inicio="2026-08-05",
            status="pendiente",
            creado_por=self.user,
        )
        self.septiembre = Orden.objects.create(
            cliente="Septiembre",
            fecha_inicio="2026-09-02",
            status="pendiente",
            creado_por=self.user,
        )

    def test_sin_param_solo_mes_estricto(self):
        response = self.client.get("/api/ordenes/?mes=2026-09")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = _list_ids(response)
        self.assertEqual(ids, {self.septiembre.id})

    def test_arrastre_incluye_pendiente_y_pausado_desde_julio(self):
        response = self.client.get("/api/ordenes/?mes=2026-09&arrastre_abiertas=1")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = _list_ids(response)
        self.assertIn(self.septiembre.id, ids)
        self.assertIn(self.julio_pendiente.id, ids)
        self.assertIn(self.julio_pausado.id, ids)
        self.assertIn(self.agosto_pendiente.id, ids)
        self.assertNotIn(self.junio_pendiente.id, ids)
        self.assertNotIn(self.julio_resuelto.id, ids)

    def test_arrastre_valor_invalido_ignora(self):
        response = self.client.get("/api/ordenes/?mes=2026-09&arrastre_abiertas=2")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(_list_ids(response), {self.septiembre.id})

    def test_arrastre_en_julio_no_trae_junio(self):
        response = self.client.get("/api/ordenes/?mes=2026-07&arrastre_abiertas=1")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = _list_ids(response)
        self.assertIn(self.julio_pendiente.id, ids)
        self.assertIn(self.julio_pausado.id, ids)
        self.assertIn(self.julio_resuelto.id, ids)
        self.assertNotIn(self.junio_pendiente.id, ids)
        self.assertNotIn(self.agosto_pendiente.id, ids)

    def test_al_resolver_sale_del_arrastre_y_queda_en_su_mes(self):
        """Resuelta deja de verse en el mes actual; sigue en el mes de su fecha."""
        self.julio_pendiente.status = "resuelto"
        self.julio_pendiente.save(update_fields=["status"])

        sept = self.client.get("/api/ordenes/?mes=2026-09&arrastre_abiertas=1")
        self.assertEqual(sept.status_code, status.HTTP_200_OK)
        sept_ids = _list_ids(sept)
        self.assertNotIn(self.julio_pendiente.id, sept_ids)
        self.assertIn(self.agosto_pendiente.id, sept_ids)

        jul = self.client.get("/api/ordenes/?mes=2026-07")
        self.assertEqual(jul.status_code, status.HTTP_200_OK)
        self.assertIn(self.julio_pendiente.id, _list_ids(jul))
