from datetime import date

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.clientes.models import Cliente
from apps.cotizaciones.models import Cotizacion
from apps.ordenes.models import Orden
from apps.escritorio.dashboard_stats import build_dashboard_stats

User = get_user_model()


class DashboardStatsTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="dash_admin",
            password="test-pass-123",
            is_staff=True,
        )
        self.user = User.objects.create_user(username="dash_user", password="test-pass-123")
        self.cliente = Cliente.objects.create(nombre="Cliente Dash", tipo="CLIENTE")

    def test_requires_admin(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/dashboard/stats/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_stats_ok_for_staff(self):
        Cotizacion.objects.create(
            cliente="Cliente Dash",
            cliente_id=self.cliente,
            fecha=date(2026, 8, 1),
            status="PENDIENTE",
            creado_por=self.admin,
        )
        Orden.objects.create(
            cliente="Cliente Dash",
            cliente_id=self.cliente,
            status="resuelto",
            fecha_inicio=date(2026, 8, 2),
            fecha_finalizacion=date(2026, 8, 3),
            creado_por=self.admin,
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/dashboard/stats/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertIn("mes_actual", body)
        self.assertIn("cotizaciones_years", body)
        self.assertIn("ordenes_completadas_meses", body)
        self.assertEqual(len(body["cotizaciones_years"]["current"]), 12)
        self.assertEqual(len(body["ordenes_completadas_meses"]), 12)
        self.assertGreaterEqual(body["mes_actual"]["cotizaciones_mes"], 1)
        self.assertGreaterEqual(body["mes_actual"]["ordenes_mes"], 1)
        self.assertGreaterEqual(body["ordenes_completadas_meses"][7], 1)  # agosto = idx 7

    def test_build_dashboard_stats_unit(self):
        data = build_dashboard_stats(today=date(2026, 8, 12))
        self.assertEqual(data["cotizaciones_years"]["year"], 2026)
        self.assertEqual(data["cotizaciones_years"]["previous_year"], 2025)
