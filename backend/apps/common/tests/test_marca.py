from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db.utils import ProgrammingError
from rest_framework import status
from rest_framework.test import APITestCase

from apps.common.models import MarcaSistema
from apps.cotizaciones.email_pdf import build_cotizacion_email_body

User = get_user_model()

MARCA_URL = "/api/v1/marca/"
MARCA_LOGO_URL = "/api/v1/marca/logo/"


class MarcaSistemaApiTests(APITestCase):
    def test_get_publico_devuelve_grupo_intrax_por_defecto(self):
        res = self.client.get(MARCA_URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["nombre"], "Grupo Intrax")
        self.assertEqual(res.data.get("logo_url") or "", "")

    def test_legacy_prefix_tambien_resuelve(self):
        res = self.client.get("/api/marca/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["nombre"], "Grupo Intrax")

    def test_patch_requiere_admin(self):
        user = User.objects.create_user(username="operador", password="test-pass-123")
        self.client.force_authenticate(user=user)
        res = self.client.patch(MARCA_URL, {"nombre": "Otra SA"}, format="json")
        self.assertIn(res.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_admin_puede_cambiar_nombre(self):
        admin = User.objects.create_user(
            username="admin", password="test-pass-123", is_staff=True
        )
        self.client.force_authenticate(user=admin)
        res = self.client.patch(MARCA_URL, {"nombre": "  Acme GPS  "}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["nombre"], "Acme GPS")
        self.assertEqual(MarcaSistema.get_solo().nombre, "Acme GPS")

    def test_patch_nombre_vacio_es_400(self):
        admin = User.objects.create_user(
            username="admin", password="test-pass-123", is_staff=True
        )
        self.client.force_authenticate(user=admin)
        res = self.client.patch(MARCA_URL, {"nombre": "   "}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_correo_usa_nombre_de_marca(self):
        MarcaSistema.objects.create(pk=1, nombre="Acme GPS")

        class _C:
            idx = 12
            cliente = "Cliente Demo"

        body = build_cotizacion_email_body(_C())
        self.assertIn("Acme GPS", body)
        self.assertNotIn("Grupo Intrax", body)

    def test_upload_logo_requiere_admin(self):
        res = self.client.post(MARCA_LOGO_URL, {"data_url": "data:image/png;base64,xx"}, format="json")
        self.assertIn(res.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_get_si_tabla_falta_devuelve_default(self):
        with patch.object(
            MarcaSistema, "get_solo", side_effect=ProgrammingError("relation missing")
        ):
            res = self.client.get(MARCA_URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["nombre"], "Grupo Intrax")
        self.assertEqual(res.data.get("logo_url") or "", "")

    def test_get_oculta_logo_data_url(self):
        MarcaSistema.objects.update_or_create(
            pk=1,
            defaults={
                "nombre": "Grupo Intrax",
                "logo_url": "data:image/png;base64,AAAA",
            },
        )
        res = self.client.get(MARCA_URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data.get("logo_url") or "", "")

    def test_patch_nombre_invalido_no_borra_logo(self):
        admin = User.objects.create_user(
            username="admin", password="test-pass-123", is_staff=True
        )
        logo = "https://res.cloudinary.com/demo/image/upload/v1/marca/logo/x.png"
        marca = MarcaSistema.get_solo()
        marca.logo_url = logo
        marca.save(update_fields=["logo_url", "updated_at"])
        self.client.force_authenticate(user=admin)
        res = self.client.patch(
            MARCA_URL, {"nombre": "   ", "clear_logo": True}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        marca.refresh_from_db()
        self.assertEqual(marca.logo_url, logo)

    def test_clear_logo_conserva_nombre(self):
        admin = User.objects.create_user(
            username="admin", password="test-pass-123", is_staff=True
        )
        MarcaSistema.objects.update_or_create(
            pk=1,
            defaults={
                "nombre": "Acme GPS",
                "logo_url": "https://res.cloudinary.com/demo/image/upload/v1/marca/logo/x.png",
            },
        )
        self.client.force_authenticate(user=admin)
        res = self.client.patch(MARCA_URL, {"clear_logo": True}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["nombre"], "Acme GPS")
        self.assertEqual(res.data.get("logo_url") or "", "")
        self.assertEqual(MarcaSistema.get_solo().logo_url, "")

    @patch(
        "apps.common.views.upload_data_url",
        return_value="data:image/png;base64,abc",
    )
    def test_upload_rechaza_data_url_sin_cloudinary(self, _mock_upload):
        admin = User.objects.create_user(
            username="admin", password="test-pass-123", is_staff=True
        )
        self.client.force_authenticate(user=admin)
        res = self.client.post(
            MARCA_LOGO_URL,
            {"data_url": "data:image/png;base64,xx"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(MarcaSistema.get_solo().logo_url, "")

    @patch(
        "apps.common.views.upload_data_url",
        return_value="https://res.cloudinary.com/demo/image/upload/v1/marca/logo/x.png",
    )
    def test_upload_guarda_https_y_public_id(self, _mock_upload):
        admin = User.objects.create_user(
            username="admin", password="test-pass-123", is_staff=True
        )
        self.client.force_authenticate(user=admin)
        res = self.client.post(
            MARCA_LOGO_URL,
            {"data_url": "data:image/png;base64,xx"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(
            res.data["logo_url"],
            "https://res.cloudinary.com/demo/image/upload/v1/marca/logo/x.png",
        )
        marca = MarcaSistema.get_solo()
        self.assertEqual(marca.logo_public_id, "marca/logo/x")
