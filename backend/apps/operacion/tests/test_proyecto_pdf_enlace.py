from unittest import mock

from django.contrib.auth import get_user_model
from django.http import HttpResponse
from django.test import TestCase
from rest_framework.test import APIClient

from apps.common.pdf_enlace import crear_token_pdf


class ProyectoPdfEnlaceApiTests(TestCase):
    def setUp(self):
        self.admin = get_user_model().objects.create_user(
            username="admin-proyecto-pdf", password="x", is_staff=True, is_superuser=True
        )
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            "/api/proyectos/",
            {"cliente_nombre": "Cliente PDF", "status": "en_proceso"},
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        self.proyecto_id = res.data["id"]

    def test_enlace_requiere_sesion(self):
        res = APIClient().post(f"/api/proyectos/{self.proyecto_id}/pdf-enlace/")
        self.assertIn(res.status_code, (401, 403))

    @mock.patch("apps.operacion.views._pdf_response_from_html")
    def test_enlace_abre_el_pdf_sin_sesion(self, render):
        render.return_value = HttpResponse(b"%PDF", content_type="application/pdf")
        res = self.client.post(f"/api/proyectos/{self.proyecto_id}/pdf-enlace/")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertTrue(res.data["filename"].startswith("Proyecto_"))
        path = res.data["url"].split("testserver", 1)[1]

        pdf = APIClient().get(path)
        self.assertEqual(pdf.status_code, 200)
        self.assertEqual(pdf["Content-Type"], "application/pdf")

    def test_token_de_orden_no_abre_un_proyecto(self):
        token = crear_token_pdf("ordenes.pdf-compartido", self.proyecto_id)
        res = APIClient().get(f"/api/proyectos/pdf-compartido/{token}/")
        self.assertEqual(res.status_code, 404)
