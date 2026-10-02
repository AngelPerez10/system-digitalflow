from unittest import mock

from django.contrib.auth import get_user_model
from django.http import HttpResponse
from django.test import TestCase
from rest_framework.test import APIClient

from apps.common.pdf_enlace import crear_token_pdf
from apps.operacion.models import Proyecto

LIST_URL = "/api/reportes-mantenimiento/"


class ReportePdfEnlaceApiTests(TestCase):
    """Enlace firmado al PDF del reporte (lo usa la app móvil para descargar / WhatsApp)."""

    def setUp(self):
        self.admin = get_user_model().objects.create_user(username="rm-pdf-admin", password="x", is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        proyecto = Proyecto.objects.create(cliente_nombre="Cliente PDF")
        res = self.client.post(
            LIST_URL,
            {"proyecto_id": proyecto.id, "fecha_servicio": "2026-09-20", "tecnico_nombre": "Ana Pérez", "secciones": []},
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        self.reporte_id = res.data["id"]

    def test_enlace_requiere_sesion(self):
        res = APIClient().post(f"{LIST_URL}{self.reporte_id}/pdf-enlace/")
        self.assertIn(res.status_code, (401, 403))

    @mock.patch("apps.operacion.reporte_mantenimiento_views._pdf_response_from_html")
    def test_enlace_abre_el_pdf_sin_sesion(self, render):
        render.return_value = HttpResponse(b"%PDF", content_type="application/pdf")
        res = self.client.post(f"{LIST_URL}{self.reporte_id}/pdf-enlace/")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertTrue(res.data["filename"].startswith("Reporte_"))
        path = res.data["url"].split("testserver", 1)[1]

        pdf = APIClient().get(f"{path}?descargar=1")
        self.assertEqual(pdf.status_code, 200)
        self.assertEqual(pdf["Content-Type"], "application/pdf")
        self.assertIn("attachment", pdf["Content-Disposition"])

    def test_token_de_proyecto_no_abre_un_reporte(self):
        token = crear_token_pdf("proyectos.pdf-compartido", self.reporte_id)
        res = APIClient().get(f"{LIST_URL}pdf-compartido/{token}/")
        self.assertEqual(res.status_code, 404)
