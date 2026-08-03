from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.cotizaciones.models import Cotizacion
from apps.users.models import UserPermissions

User = get_user_model()


class CotizacionesSmokeTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="cotizador", password="test-pass-123")
        UserPermissions.objects.create(
            user=self.user,
            permissions={
                "cotizaciones": {"view": True, "create": True, "edit": True, "delete": False},
            },
        )
        self.client.force_authenticate(user=self.user)

    def _create_cotizacion(self, **kwargs):
        defaults = {
            "cliente": "Cliente prueba",
            "prospecto": True,
            "contacto": "Contacto",
            "medio_contacto": "CLIENTE",
            "status": "PENDIENTE",
            "fecha": "2026-06-05",
            "subtotal": 100,
            "descuento_cliente_pct": 0,
            "iva_pct": 16,
            "iva": 16,
            "total": 116,
            "texto_arriba_precios": "Cotización",
            "terminos": "",
        }
        defaults.update(kwargs)
        return Cotizacion.objects.create(**defaults)

    def test_list_cotizaciones_requires_view_permission(self):
        denied = User.objects.create_user(username="sin-permiso", password="test-pass-123")
        UserPermissions.objects.create(user=denied, permissions={"cotizaciones": {}})
        self.client.force_authenticate(user=denied)
        response = self.client.get("/api/cotizaciones/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_cotizaciones_ok(self):
        response = self.client.get("/api/cotizaciones/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_cotizaciones_month_filter_paginated(self):
        self._create_cotizacion(cliente="Junio reciente", fecha="2026-06-10", total=200)
        self._create_cotizacion(cliente="Mayo antiguo", fecha="2026-05-15", total=300)

        response = self.client.get("/api/cotizaciones/?month=2026-06&page=1&page_size=25")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["cliente"], "Junio reciente")
        self.assertIn("month_stats", response.data)
        self.assertEqual(float(response.data["month_stats"]["total"]), 200.0)

    def test_list_cotizaciones_search_ignores_month(self):
        self._create_cotizacion(cliente="Cliente único XYZ", fecha="2026-05-15", total=150)
        self._create_cotizacion(cliente="Otro cliente", fecha="2026-06-10", total=250)

        response = self.client.get(
            "/api/cotizaciones/?search=XYZ&month=2026-06&page=1&page_size=25"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["cliente"], "Cliente único XYZ")
        self.assertNotIn("month_stats", response.data)

    def test_create_cotizacion_smoke(self):
        payload = {
            "cliente": "Cliente prueba",
            "prospecto": True,
            "contacto": "Contacto",
            "medio_contacto": "CLIENTE",
            "status": "PENDIENTE",
            "fecha": "2026-06-05",
            "subtotal": 100,
            "descuento_cliente_pct": 0,
            "iva_pct": 16,
            "iva": 16,
            "total": 116,
            "texto_arriba_precios": "Cotización",
            "terminos": "",
            "items": [],
        }
        response = self.client.post("/api/cotizaciones/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("id", response.data)


class CotizacionesEnviarPdfTests(APITestCase):
    def setUp(self):
        from apps.clientes.models import Cliente, ClienteContacto
        from apps.cotizaciones.models import Cotizacion

        self.user = User.objects.create_user(username="cot_mail", password="test-pass-123")
        UserPermissions.objects.create(
            user=self.user,
            permissions={
                "cotizaciones": {"view": True, "create": True, "edit": True, "delete": False},
            },
        )
        self.client.force_authenticate(user=self.user)
        self.cliente = Cliente.objects.create(nombre="Cliente cot", correo="")
        ClienteContacto.objects.create(
            cliente=self.cliente,
            nombre_apellido="Contacto",
            correo="contacto.cot@example.com",
            is_principal=True,
        )
        self.cot_pendiente = Cotizacion.objects.create(
            cliente="Cliente cot",
            cliente_id=self.cliente,
            status="PENDIENTE",
            fecha="2026-07-01",
            creado_por=self.user,
        )
        self.cot_autorizada = Cotizacion.objects.create(
            cliente="Cliente cot",
            cliente_id=self.cliente,
            status="AUTORIZADA",
            fecha="2026-07-02",
            creado_por=self.user,
        )
        self.cot_cancelada = Cotizacion.objects.create(
            cliente="Cancelada",
            status="CANCELADA",
            fecha="2026-07-03",
            creado_por=self.user,
        )
        from apps.users.models import UserSmtpCredentials
        from apps.users.smtp_crypto import encrypt_smtp_password

        UserSmtpCredentials.objects.create(
            user=self.user,
            smtp_email="vendedor@example.com",
            smtp_password_encrypted=encrypt_smtp_password("webmail-secret"),
        )

    def test_correo_sugerido(self):
        response = self.client.get(f"/api/cotizaciones/{self.cot_pendiente.id}/correo-sugerido/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("correo"), "contacto.cot@example.com")

    def test_enviar_pdf_rechaza_cancelada(self):
        response = self.client.post(
            f"/api/cotizaciones/{self.cot_cancelada.id}/enviar-pdf/",
            {"correo": "alguien@example.com"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_enviar_pdf_pendiente_ok(self):
        from unittest.mock import patch

        from django.core import mail
        from django.test import override_settings

        with override_settings(
            EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
            EMAIL_HOST="mail.example.com",
            EMAIL_HOST_USER="",
            EMAIL_HOST_PASSWORD="",
            DEFAULT_FROM_EMAIL="",
        ):
            with patch(
                "apps.cotizaciones.views.render_html_to_pdf",
                return_value=b"%PDF-1.4 test",
            ), patch(
                "apps.cotizaciones.views.any_provider_configured",
                return_value=True,
            ):
                response = self.client.post(
                    f"/api/cotizaciones/{self.cot_pendiente.id}/enviar-pdf/",
                    {"correo": "nuevo.cot@example.com"},
                    format="json",
                )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("ok"))
        self.cliente.refresh_from_db()
        self.assertEqual(self.cliente.correo, "nuevo.cot@example.com")
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].from_email, "vendedor@example.com")

    def test_enviar_pdf_autorizada_ok(self):
        from unittest.mock import patch

        from django.test import override_settings

        with override_settings(
            EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
            EMAIL_HOST="mail.example.com",
            EMAIL_HOST_USER="",
            EMAIL_HOST_PASSWORD="",
            DEFAULT_FROM_EMAIL="",
        ):
            with patch(
                "apps.cotizaciones.views.render_html_to_pdf",
                return_value=b"%PDF-1.4 test",
            ), patch(
                "apps.cotizaciones.views.any_provider_configured",
                return_value=True,
            ):
                response = self.client.post(
                    f"/api/cotizaciones/{self.cot_autorizada.id}/enviar-pdf/",
                    {"correo": "auth@example.com"},
                    format="json",
                )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
