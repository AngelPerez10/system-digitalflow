from unittest import mock

from django.contrib.auth import get_user_model
from django.core import signing
from django.http import HttpResponse
from django.test import SimpleTestCase, TestCase
from rest_framework.test import APIClient

from apps.ordenes.models import Orden
from apps.ordenes.views import (
    PDF_ENLACE_SALT,
    crear_token_pdf_orden,
    leer_token_pdf_orden,
)


class TokenPdfOrdenTests(SimpleTestCase):
    def test_roundtrip(self):
        self.assertEqual(leer_token_pdf_orden(crear_token_pdf_orden(42)), 42)

    def test_rechaza_token_alterado(self):
        token = crear_token_pdf_orden(42)
        with self.assertRaises(signing.BadSignature):
            leer_token_pdf_orden(token[:-2] + "xx")

    def test_rechaza_token_de_otro_salt(self):
        token = signing.dumps({"o": 42}, salt="otro")
        with self.assertRaises(signing.BadSignature):
            leer_token_pdf_orden(token)

    def test_rechaza_token_expirado(self):
        token = signing.dumps({"o": 42}, salt=PDF_ENLACE_SALT)
        with mock.patch("apps.ordenes.views.PDF_ENLACE_MAX_AGE", -1):
            with self.assertRaises(signing.SignatureExpired):
                leer_token_pdf_orden(token)


class PdfEnlaceApiTests(TestCase):
    def setUp(self):
        self.admin = get_user_model().objects.create_user(
            username="admin-pdf", password="x", is_staff=True
        )
        self.orden = Orden.objects.create(status="resuelto")
        self.client = APIClient()

    def test_enlace_requiere_sesion(self):
        res = self.client.post(f"/api/ordenes/{self.orden.pk}/pdf-enlace/")
        self.assertIn(res.status_code, (401, 403))

    @mock.patch("apps.ordenes.views._pdf_response_from_html")
    def test_enlace_abre_el_pdf_sin_sesion(self, render):
        render.return_value = HttpResponse(b"%PDF", content_type="application/pdf")
        self.client.force_authenticate(self.admin)
        res = self.client.post(f"/api/ordenes/{self.orden.pk}/pdf-enlace/")
        self.assertEqual(res.status_code, 200, res.data)
        url = res.data["url"]
        self.assertIn("/api/ordenes/pdf-compartido/", url)

        anonimo = APIClient()
        path = url.split("testserver", 1)[1]
        pdf = anonimo.get(path)
        self.assertEqual(pdf.status_code, 200)
        self.assertEqual(pdf["Content-Type"], "application/pdf")

    def test_token_invalido_da_404(self):
        res = APIClient().get("/api/ordenes/pdf-compartido/no-es-un-token/")
        self.assertEqual(res.status_code, 404)
