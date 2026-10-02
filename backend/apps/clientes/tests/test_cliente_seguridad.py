"""Endurecimiento de entradas en los endpoints de clientes."""
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient, APITestCase

from apps.clientes.models import Cliente


class ClienteEntradasSeguridadTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.admin = User.objects.create_user(username="adm", password="x", is_staff=True, is_superuser=True)
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        self.cliente = Cliente.objects.create(nombre="ACME", telefono="6441234567")

    def test_filtro_cliente_no_numerico_no_revienta(self):
        for url in ("/api/cliente-contactos/", "/api/cliente-direcciones/"):
            res = self.client.get(url, {"cliente": "abc"})
            self.assertEqual(res.status_code, 200, url)
            self.assertEqual(list(res.json()), [], url)

    def test_documento_rechaza_cliente_manipulado(self):
        pdf = SimpleUploadedFile("a.pdf", b"%PDF-1.4", content_type="application/pdf")
        for bad in ("../../x", "1; DROP", "-5", "999999"):
            pdf.seek(0)
            res = self.client.post("/api/cliente-documentos/", {"cliente": bad, "archivo": pdf}, format="multipart")
            self.assertEqual(res.status_code, 400, bad)
