"""Historial de reasignaciones del tablero Equipo (/api/equipo-historial/)."""

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.operacion.models import EquipoReasignacion

User = get_user_model()

URL = "/api/equipo-historial/"


class EquipoHistorialTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="eq_admin", password="test-pass-123", is_staff=True, first_name="Ana", last_name="Admin"
        )
        self.tecnico = User.objects.create_user(username="eq_tec", password="test-pass-123")

    def _payload(self, **extra):
        data = {
            "tipo": "orden",
            "objeto_id": 12,
            "folio": "ODT-12",
            "cliente": "Cliente X",
            "accion": "reasignar",
            "desde_id": None,
            "desde_nombre": "Sin asignar",
            "hacia_id": self.tecnico.id,
            "hacia_nombre": "Beto Técnico",
        }
        data.update(extra)
        return data

    def test_admin_registra_y_lista(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post(URL, self._payload(), format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["usuario"], self.admin.id)
        self.assertEqual(resp.data["usuario_nombre"], "Ana Admin")

        listado = self.client.get(URL)
        self.assertEqual(listado.status_code, status.HTTP_200_OK)
        self.assertEqual(len(listado.data), 1)
        self.assertEqual(listado.data[0]["folio"], "ODT-12")

    def test_usuario_lo_pone_el_servidor(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post(URL, self._payload(usuario=self.tecnico.id), format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(EquipoReasignacion.objects.get().usuario_id, self.admin.id)

    def test_mas_recientes_primero_y_limite(self):
        self.client.force_authenticate(self.admin)
        for i in range(3):
            self.client.post(URL, self._payload(objeto_id=i + 1, folio=f"ODT-{i + 1}"), format="json")
        resp = self.client.get(URL, {"limit": 2})
        self.assertEqual([r["folio"] for r in resp.data], ["ODT-3", "ODT-2"])

    def test_filtra_por_objeto(self):
        self.client.force_authenticate(self.admin)
        self.client.post(URL, self._payload(objeto_id=1), format="json")
        self.client.post(URL, self._payload(tipo="proyecto", objeto_id=1, folio="PRJ-1"), format="json")
        resp = self.client.get(URL, {"tipo": "proyecto", "objeto_id": 1})
        self.assertEqual([r["folio"] for r in resp.data], ["PRJ-1"])

    def test_mismo_origen_y_destino_rechazado(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post(URL, self._payload(desde_id=5, hacia_id=5), format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_no_admin_prohibido(self):
        self.client.force_authenticate(self.tecnico)
        self.assertEqual(self.client.get(URL).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.post(URL, self._payload(), format="json").status_code, status.HTTP_403_FORBIDDEN)

    def test_cambio_de_dia_con_el_mismo_tecnico(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post(
            URL,
            self._payload(
                desde_id=self.tecnico.id,
                desde_nombre="Beto Técnico",
                desde_fecha="2026-09-28",
                hacia_fecha="2026-09-30",
            ),
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["desde_fecha"], "2026-09-28")
        self.assertEqual(resp.data["hacia_fecha"], "2026-09-30")

    def test_rechaza_mismo_tecnico_y_mismo_dia(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post(
            URL,
            self._payload(desde_id=self.tecnico.id, desde_fecha="2026-09-28", hacia_fecha="2026-09-28"),
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_filtra_por_mes_y_permite_mas_de_200(self):
        from datetime import datetime
        from datetime import timezone as dt_tz

        self.client.force_authenticate(self.admin)
        viejo = self.client.post(URL, self._payload(objeto_id=1, folio="ODT-VIEJO"), format="json")
        self.client.post(URL, self._payload(objeto_id=2, folio="ODT-NUEVO"), format="json")
        EquipoReasignacion.objects.filter(pk=viejo.data["id"]).update(
            creado_at=datetime(2026, 8, 15, 12, 0, tzinfo=dt_tz.utc)
        )
        hoy = EquipoReasignacion.objects.get(folio="ODT-NUEVO").creado_at
        mes = f"{hoy.year}-{hoy.month:02d}"
        resp = self.client.get(URL, {"mes": mes, "limit": 1000})
        self.assertEqual([r["folio"] for r in resp.data], ["ODT-NUEVO"])
        resp = self.client.get(URL, {"mes": "2026-08"})
        self.assertEqual([r["folio"] for r in resp.data], ["ODT-VIEJO"])
        # Mes inválido: se ignora el filtro.
        self.assertEqual(len(self.client.get(URL, {"mes": "2026-13"}).data), 2)
