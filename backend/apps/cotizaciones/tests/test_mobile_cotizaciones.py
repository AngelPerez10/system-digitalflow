from unittest import mock

from django.contrib.auth import get_user_model
from django.http import HttpResponse
from django.test import TestCase
from rest_framework.test import APIClient

from apps.common.pdf_enlace import crear_token_pdf
from apps.cotizaciones.models import Cotizacion
from apps.users.models import UserPermissions


def _usuario_con_permisos(username: str, permisos: dict):
    user = get_user_model().objects.create_user(username=username, password="x")
    UserPermissions.objects.update_or_create(user=user, defaults={"permissions": permisos})
    return user


class CotizacionPdfEnlaceTests(TestCase):
    def setUp(self):
        self.admin = get_user_model().objects.create_user(
            username="admin-cot-pdf", password="x", is_staff=True, is_superuser=True
        )
        self.cotizacion = Cotizacion.objects.create(cliente="Cliente PDF", status="PENDIENTE")

    def test_enlace_requiere_sesion(self):
        res = APIClient().post(f"/api/cotizaciones/{self.cotizacion.pk}/pdf-enlace/")
        self.assertIn(res.status_code, (401, 403))

    @mock.patch("apps.cotizaciones.views.any_provider_configured", return_value=True)
    @mock.patch("apps.cotizaciones.views.render_html_to_pdf", return_value=b"%PDF-1.4")
    @mock.patch("apps.cotizaciones.views.CotizacionViewSet._generate_pdf_html", return_value="<html></html>")
    def test_enlace_abre_y_descarga_sin_sesion(self, *_mocks):
        client = APIClient()
        client.force_authenticate(self.admin)
        res = client.post(f"/api/cotizaciones/{self.cotizacion.pk}/pdf-enlace/")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertTrue(res.data["filename"].startswith("Cotizacion_"))
        path = res.data["url"].split("testserver", 1)[1]

        anonimo = APIClient()
        pdf = anonimo.get(path)
        self.assertEqual(pdf.status_code, 200)
        self.assertEqual(pdf["Content-Type"], "application/pdf")
        self.assertTrue(pdf["Content-Disposition"].startswith("inline;"))

        descarga = anonimo.get(path + "?descargar=1")
        self.assertTrue(descarga["Content-Disposition"].startswith("attachment;"))

    def test_token_de_orden_no_abre_una_cotizacion(self):
        token = crear_token_pdf("ordenes.pdf-compartido", self.cotizacion.pk)
        res = APIClient().get(f"/api/cotizaciones/pdf-compartido/{token}/")
        self.assertEqual(res.status_code, 404)


class CotizacionTerminosDefaultTests(TestCase):
    def setUp(self):
        self.admin = get_user_model().objects.create_user(
            username="admin-cot-terminos", password="x", is_staff=True, is_superuser=True
        )
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def test_sin_terminos_usa_los_de_la_marca(self):
        res = self.client.post("/api/cotizaciones/", {"cliente": "Móvil", "items": []}, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertTrue(res.data["terminos"].startswith("TÉRMINOS Y CONDICIONES"))

    def test_terminos_explicitos_se_respetan(self):
        res = self.client.post(
            "/api/cotizaciones/", {"cliente": "Web", "terminos": "", "items": []}, format="json"
        )
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["terminos"], "")


class CotizacionAvatarTests(TestCase):
    def test_incluye_la_foto_de_quien_la_creo(self):
        admin = get_user_model().objects.create_user(
            username="admin-cot-avatar", password="x", is_staff=True, is_superuser=True
        )
        UserPermissions.objects.update_or_create(
            user=admin, defaults={"avatar_url": "https://res.cloudinary.com/demo/a.jpg"}
        )
        client = APIClient()
        client.force_authenticate(admin)
        creada = client.post("/api/cotizaciones/", {"cliente": "Foto", "items": []}, format="json")
        self.assertEqual(creada.status_code, 201, creada.data)
        self.assertEqual(creada.data["creado_por_avatar_url"], "https://res.cloudinary.com/demo/a.jpg")
        lista = client.get("/api/cotizaciones/?page_size=5")
        self.assertEqual(lista.data["results"][0]["creado_por_avatar_url"], "https://res.cloudinary.com/demo/a.jpg")


class CatalogosParaCotizarTests(TestCase):
    def test_quien_solo_cotiza_puede_leer_clientes_y_servicios(self):
        user = _usuario_con_permisos("vendedor", {"cotizaciones": {"view": True, "create": True}})
        client = APIClient()
        client.force_authenticate(user)
        self.assertEqual(client.get("/api/clientes/?page_size=5").status_code, 200)
        self.assertEqual(client.get("/api/servicios/?page_size=5").status_code, 200)
        self.assertEqual(client.get("/api/conceptos/").status_code, 200)

    def test_sin_modulos_no_lee_clientes(self):
        user = _usuario_con_permisos("sin-modulos", {})
        client = APIClient()
        client.force_authenticate(user)
        self.assertEqual(client.get("/api/clientes/?page_size=5").status_code, 403)
