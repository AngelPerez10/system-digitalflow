from django.contrib.auth import get_user_model
from unittest.mock import patch
from rest_framework import status
from rest_framework.test import APITestCase

from apps.ordenes.models import Orden
from apps.users.models import UserPermissions, UserSignature

User = get_user_model()


class OrdenesSmokeTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="tecnico", password="test-pass-123")
        UserPermissions.objects.create(
            user=self.user,
            permissions={
                "ordenes": {"view": True, "create": True, "edit": True, "delete": False},
            },
        )
        self.client.force_authenticate(user=self.user)

    def test_list_ordenes_denied_without_view(self):
        denied = User.objects.create_user(username="bloqueado", password="test-pass-123")
        UserPermissions.objects.create(user=denied, permissions={"ordenes": {}})
        self.client.force_authenticate(user=denied)
        response = self.client.get("/api/ordenes/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_ordenes_ok(self):
        response = self.client.get("/api/ordenes/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_orden_smoke(self):
        payload = {
            "cliente": "Cliente orden",
            "direccion": "Calle 1",
            "telefono_cliente": "5551234567",
            "servicios_realizados": ["Instalación"],
            "status": "pendiente",
            "fecha_inicio": "2026-06-05",
            "tipo_orden": "servicio_tecnico",
        }
        response = self.client.post("/api/ordenes/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("id", response.data)

    def test_tecnico_opciones_denied_without_ordenes_access(self):
        denied = User.objects.create_user(username="sin_ordenes", password="test-pass-123")
        UserPermissions.objects.create(user=denied, permissions={"tareas": {"view": True}})
        self.client.force_authenticate(user=denied)
        response = self.client.get("/api/ordenes/tecnico-opciones/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_tecnico_opciones_hides_sensitive_fields_for_non_staff(self):
        other = User.objects.create_user(
            username="otro_tecnico",
            email="otro@example.com",
            password="test-pass-123",
            is_staff=True,
        )
        UserPermissions.objects.create(
            user=other,
            permissions={"ordenes": {"view": True}},
        )
        response = self.client.get("/api/ordenes/tecnico-opciones/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row = next(item for item in response.data if item["id"] == other.id)
        self.assertNotIn("email", row)
        self.assertNotIn("is_superuser", row)

    def test_tecnico_opciones_includes_sensitive_fields_for_staff(self):
        staff = User.objects.create_user(
            username="admin_tecnico",
            email="admin@example.com",
            password="test-pass-123",
            is_staff=True,
        )
        UserPermissions.objects.create(
            user=staff,
            permissions={"ordenes": {"view": True}},
        )
        self.client.force_authenticate(user=staff)
        response = self.client.get("/api/ordenes/tecnico-opciones/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row = next(item for item in response.data if item["id"] == staff.id)
        self.assertEqual(row["email"], "admin@example.com")
        self.assertTrue(row["is_staff"])


class OrdenesListFilterTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="list_filter",
            password="test-pass-123",
            is_staff=True,
        )
        UserPermissions.objects.create(
            user=self.user,
            permissions={"ordenes": {"view": True, "create": True, "edit": True, "delete": False}},
        )
        self.client.force_authenticate(user=self.user)
        self.junio = Orden.objects.create(
            cliente="Junio",
            direccion="Calle J",
            telefono_cliente="5550001",
            servicios_realizados=["GPS"],
            fecha_inicio="2026-06-10",
            creado_por=self.user,
        )
        self.julio = Orden.objects.create(
            cliente="Julio",
            direccion="Calle L",
            telefono_cliente="5550002",
            servicios_realizados=["GPS"],
            fecha_inicio="2026-07-15",
            creado_por=self.user,
        )
        self.lev = Orden.objects.create(
            cliente="Lev",
            direccion="Calle V",
            telefono_cliente="5550003",
            servicios_realizados=["Cámara"],
            fecha_inicio="2026-07-20",
            creado_por=self.user,
        )
        from apps.ordenes.models import OrdenLevantamiento

        OrdenLevantamiento.objects.create(
            orden=self.lev,
            payload={"tipo": "camara"},
        )

    def test_list_mes_filters_by_fecha_inicio(self):
        response = self.client.get("/api/ordenes/?mes=2026-07")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = {row["id"] for row in response.data}
        self.assertIn(self.julio.id, ids)
        self.assertIn(self.lev.id, ids)
        self.assertNotIn(self.junio.id, ids)

    def test_list_tipo_orden_levantamiento(self):
        response = self.client.get("/api/ordenes/?mes=2026-07&tipo_orden=levantamiento")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = {row["id"] for row in response.data}
        self.assertEqual(ids, {self.lev.id})
        self.assertEqual(response.data[0].get("levantamiento_tipo"), "camara")

    def test_list_omits_heavy_fields(self):
        response = self.client.get("/api/ordenes/?mes=2026-07")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data)
        row = response.data[0]
        self.assertNotIn("fotos_urls", row)
        self.assertNotIn("firma_encargado_url", row)
        self.assertNotIn("firma_cliente_url", row)
        self.assertNotIn("cotizaciones_adjuntas", row)
        self.assertIn("cliente", row)
        self.assertIn("status", row)

    def test_retrieve_keeps_heavy_fields(self):
        response = self.client.get(f"/api/ordenes/{self.julio.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("fotos_urls", response.data)
        self.assertIn("firma_encargado_url", response.data)


class OrdenesOwnOnlyScopeTests(APITestCase):
    """Non-staff técnico: own_only controls list/detail scope (not is_staff)."""

    def setUp(self):
        self.tecnico = User.objects.create_user(username="tecnico_scope", password="test-pass-123")
        self.otro = User.objects.create_user(username="otro_scope", password="test-pass-123")
        self.orden_propia = Orden.objects.create(
            cliente="Cliente propio",
            tecnico_asignado=self.tecnico,
            creado_por=self.tecnico,
        )
        self.orden_ajena = Orden.objects.create(
            cliente="Cliente ajeno",
            tecnico_asignado=self.otro,
            creado_por=self.otro,
        )

    def _auth_as_tecnico(self, own_only: bool):
        UserPermissions.objects.filter(user=self.tecnico).delete()
        UserPermissions.objects.create(
            user=self.tecnico,
            permissions={
                "ordenes": {"view": True, "create": True, "edit": True, "delete": False, "own_only": own_only},
            },
        )
        self.client.force_authenticate(user=self.tecnico)

    def test_own_only_true_lists_only_own_orders(self):
        self._auth_as_tecnico(own_only=True)
        response = self.client.get("/api/ordenes/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = {row["id"] for row in response.data}
        self.assertEqual(ids, {self.orden_propia.id})

    def test_own_only_true_denies_foreign_order_detail(self):
        self._auth_as_tecnico(own_only=True)
        response = self.client.get(f"/api/ordenes/{self.orden_ajena.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_own_only_false_lists_all_orders(self):
        self._auth_as_tecnico(own_only=False)
        response = self.client.get("/api/ordenes/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = {row["id"] for row in response.data}
        self.assertEqual(ids, {self.orden_propia.id, self.orden_ajena.id})

    def test_own_only_false_allows_foreign_order_detail(self):
        self._auth_as_tecnico(own_only=False)
        response = self.client.get(f"/api/ordenes/{self.orden_ajena.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.orden_ajena.id)

    def test_missing_own_only_defaults_to_restricted_for_tecnico(self):
        UserPermissions.objects.filter(user=self.tecnico).delete()
        UserPermissions.objects.create(
            user=self.tecnico,
            permissions={"ordenes": {"view": True, "create": True, "edit": True, "delete": False}},
        )
        self.client.force_authenticate(user=self.tecnico)

        list_response = self.client.get("/api/ordenes/")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual({row["id"] for row in list_response.data}, {self.orden_propia.id})

        detail_response = self.client.get(f"/api/ordenes/{self.orden_ajena.id}/")
        self.assertEqual(detail_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_missing_own_only_defaults_to_all_for_staff(self):
        staff = User.objects.create_user(
            username="staff_scope",
            password="test-pass-123",
            is_staff=True,
        )
        UserPermissions.objects.create(
            user=staff,
            permissions={"ordenes": {"view": True}},
        )
        self.client.force_authenticate(user=staff)

        response = self.client.get("/api/ordenes/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            {row["id"] for row in response.data},
            {self.orden_propia.id, self.orden_ajena.id},
        )


class OrdenesLimitedEditTests(APITestCase):
    def setUp(self):
        self.jefe = User.objects.create_user(username="jefe_tecnico", password="test-pass-123")
        self.otro = User.objects.create_user(username="otro_tecnico_le", password="test-pass-123")
        UserPermissions.objects.create(
            user=self.jefe,
            permissions={
                "ordenes": {
                    "view": True,
                    "create": True,
                    "edit": True,
                    "delete": False,
                    "own_only": False,
                },
            },
        )
        self.orden_ajena = Orden.objects.create(
            cliente="Cliente ajeno",
            direccion="Calle remota",
            telefono_cliente="5551112233",
            servicios_realizados=["Instalación"],
            tecnico_asignado=self.otro,
            creado_por=self.otro,
        )
        self.client.force_authenticate(user=self.jefe)

    def test_limited_patch_problematica_and_status(self):
        response = self.client.patch(
            f"/api/ordenes/{self.orden_ajena.id}/",
            {"problematica": "Falla remota", "status": "resuelto"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.orden_ajena.refresh_from_db()
        self.assertEqual(self.orden_ajena.problematica, "Falla remota")
        self.assertEqual(self.orden_ajena.status, "resuelto")
        self.assertIsNotNone(self.orden_ajena.fecha_finalizacion)
        self.assertIsNotNone(self.orden_ajena.hora_termino)

    def test_patch_resuelto_fills_fecha_finalizacion_when_empty(self):
        self.assertIsNone(self.orden_ajena.fecha_finalizacion)
        response = self.client.patch(
            f"/api/ordenes/{self.orden_ajena.id}/",
            {"status": "resuelto"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.orden_ajena.refresh_from_db()
        self.assertEqual(self.orden_ajena.status, "resuelto")
        self.assertIsNotNone(self.orden_ajena.fecha_finalizacion)
        self.assertIsNotNone(self.orden_ajena.hora_termino)

    def test_patch_resuelto_does_not_overwrite_existing_fecha_finalizacion(self):
        self.orden_ajena.fecha_finalizacion = "2026-01-15"
        self.orden_ajena.hora_termino = "10:30:00"
        self.orden_ajena.save(update_fields=["fecha_finalizacion", "hora_termino"])
        response = self.client.patch(
            f"/api/ordenes/{self.orden_ajena.id}/",
            {"status": "resuelto"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.orden_ajena.refresh_from_db()
        self.assertEqual(str(self.orden_ajena.fecha_finalizacion), "2026-01-15")
        self.assertEqual(self.orden_ajena.hora_termino.strftime("%H:%M:%S"), "10:30:00")

    def test_limited_patch_time_fields(self):
        response = self.client.patch(
            f"/api/ordenes/{self.orden_ajena.id}/",
            {
                "fecha_inicio": "2026-06-01",
                "hora_inicio": "09:30:00",
                "fecha_finalizacion": "2026-06-02",
                "hora_termino": "11:00:00",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_limited_patch_disallowed_cliente_returns_403(self):
        response = self.client.patch(
            f"/api/ordenes/{self.orden_ajena.id}/",
            {"cliente": "Cliente modificado"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_limited_update_photos_allowed(self):
        response = self.client.patch(
            f"/api/ordenes/{self.orden_ajena.id}/update-photos/",
            {"fotos_urls": []},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_limited_levantamiento_returns_403(self):
        response = self.client.put(
            f"/api/ordenes/{self.orden_ajena.id}/levantamiento/",
            {"payload": {"tipo": "cerco"}, "dibujo_url": ""},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_patch_status_sets_status_changed_at(self):
        self.assertIsNone(self.orden_ajena.status_changed_at)
        response = self.client.patch(
            f"/api/ordenes/{self.orden_ajena.id}/",
            {"status": "resuelto"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.orden_ajena.refresh_from_db()
        self.assertIsNotNone(self.orden_ajena.status_changed_at)
        self.assertIsNotNone(response.data.get("status_changed_at"))

    def test_patch_without_status_change_keeps_status_changed_at(self):
        first = self.client.patch(
            f"/api/ordenes/{self.orden_ajena.id}/",
            {"status": "resuelto"},
            format="json",
        )
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.orden_ajena.refresh_from_db()
        stamped = self.orden_ajena.status_changed_at
        self.assertIsNotNone(stamped)

        second = self.client.patch(
            f"/api/ordenes/{self.orden_ajena.id}/",
            {"problematica": "Sin cambio de status"},
            format="json",
        )
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.orden_ajena.refresh_from_db()
        self.assertEqual(self.orden_ajena.status_changed_at, stamped)

    def test_patch_same_status_keeps_status_changed_at(self):
        first = self.client.patch(
            f"/api/ordenes/{self.orden_ajena.id}/",
            {"status": "resuelto"},
            format="json",
        )
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.orden_ajena.refresh_from_db()
        stamped = self.orden_ajena.status_changed_at
        self.assertIsNotNone(stamped)

        second = self.client.patch(
            f"/api/ordenes/{self.orden_ajena.id}/",
            {"status": "resuelto", "problematica": "Sigue resuelto"},
            format="json",
        )
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.orden_ajena.refresh_from_db()
        self.assertEqual(self.orden_ajena.status_changed_at, stamped)


class OrdenesFirmaEncargadoTests(APITestCase):
    ADMIN_SIG = "https://cdn.example.com/firmas/admin.png"
    TEC_SIG = "https://cdn.example.com/firmas/tecnico.png"

    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin_firma",
            password="test-pass-123",
            is_staff=True,
        )
        self.tecnico = User.objects.create_user(username="tec_firma", password="test-pass-123")
        UserPermissions.objects.create(
            user=self.admin,
            permissions={"ordenes": {"view": True, "create": True, "edit": True, "delete": False}},
        )
        UserPermissions.objects.create(
            user=self.tecnico,
            permissions={"ordenes": {"view": True, "create": True, "edit": True, "delete": False}},
        )
        UserSignature.objects.create(user=self.admin, url=self.ADMIN_SIG)
        UserSignature.objects.create(user=self.tecnico, url=self.TEC_SIG)
        self.orden = Orden.objects.create(
            cliente="Cliente firma",
            direccion="Calle 1",
            telefono_cliente="5550001111",
            servicios_realizados=["Instalación"],
            tecnico_asignado=self.tecnico,
            creado_por=self.tecnico,
            firma_encargado_url=self.ADMIN_SIG,
        )
        self.client.force_authenticate(user=self.admin)

    def test_admin_patch_stamps_tecnico_signature_not_own(self):
        response = self.client.patch(
            f"/api/ordenes/{self.orden.id}/",
            {"problematica": "Cambio de admin"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.orden.refresh_from_db()
        self.assertEqual(self.orden.firma_encargado_url, self.TEC_SIG)

    def test_create_with_tecnico_stamps_tecnico_signature(self):
        response = self.client.post(
            "/api/ordenes/",
            {
                "cliente": "Cliente nuevo",
                "direccion": "Calle 2",
                "telefono_cliente": "5550002222",
                "servicios_realizados": ["Revisión"],
                "status": "pendiente",
                "fecha_inicio": "2026-08-11",
                "tipo_orden": "servicio_tecnico",
                "tecnico_asignado": self.tecnico.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = Orden.objects.get(id=response.data["id"])
        self.assertEqual(created.firma_encargado_url, self.TEC_SIG)

    def test_pdf_prefers_tecnico_signature_over_stored_url(self):
        from apps.ordenes.views import _apply_firma_encargado_for_pdf

        self.assertEqual(self.orden.firma_encargado_url, self.ADMIN_SIG)
        _apply_firma_encargado_for_pdf(self.orden)
        self.assertEqual(self.orden.firma_encargado_url, self.TEC_SIG)

    def test_update_null_firma_cliente_does_not_clear(self):
        firma = "https://res.cloudinary.com/demo/image/upload/v1/ordenes/firmas/cliente-test.png"
        self.orden.firma_cliente_url = firma
        self.orden.save(update_fields=["firma_cliente_url"])
        response = self.client.patch(
            f"/api/ordenes/{self.orden.id}/",
            {"problematica": "Sin tocar firma", "firma_cliente_url": None},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.orden.refresh_from_db()
        self.assertEqual(self.orden.firma_cliente_url, firma)

    def test_update_empty_firma_cliente_clears(self):
        firma = "https://res.cloudinary.com/demo/image/upload/v1/ordenes/firmas/cliente-clear.png"
        self.orden.firma_cliente_url = firma
        self.orden.save(update_fields=["firma_cliente_url"])
        response = self.client.patch(
            f"/api/ordenes/{self.orden.id}/",
            {"firma_cliente_url": ""},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.orden.refresh_from_db()
        self.assertEqual(self.orden.firma_cliente_url, "")

    def test_update_fotos_same_public_id_different_scheme_does_not_delete_asset(self):
        old_url = "http://res.cloudinary.com/demo/image/upload/v1/ordenes/fotos/foto-protocolo.jpg"
        self.orden.fotos_urls = [old_url]
        self.orden.save(update_fields=["fotos_urls"])
        new_url = "https://res.cloudinary.com/demo/image/upload/v1/ordenes/fotos/foto-protocolo.jpg"
        with patch("apps.ordenes.views._delete_cloudinary_resource") as delete_mock:
            response = self.client.patch(
                f"/api/ordenes/{self.orden.id}/",
                {"fotos_urls": [new_url]},
                format="json",
            )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        delete_mock.assert_not_called()
        self.orden.refresh_from_db()
        self.assertEqual(self.orden.fotos_urls, [new_url])


class OrdenesEnviarPdfTests(APITestCase):
    def setUp(self):
        from apps.clientes.models import Cliente, ClienteContacto

        self.user = User.objects.create_user(username="envio_pdf", password="test-pass-123")
        UserPermissions.objects.create(
            user=self.user,
            permissions={
                "ordenes": {"view": True, "create": True, "edit": True, "delete": False},
            },
        )
        self.client.force_authenticate(user=self.user)
        self.cliente = Cliente.objects.create(nombre="Cliente correo", correo="")
        ClienteContacto.objects.create(
            cliente=self.cliente,
            nombre_apellido="Contacto Principal",
            correo="contacto@example.com",
            is_principal=True,
        )
        self.orden = Orden.objects.create(
            cliente="Cliente correo",
            cliente_id=self.cliente,
            status="resuelto",
            servicios_realizados=["Servicio"],
            fecha_inicio="2026-07-01",
            creado_por=self.user,
            tecnico_asignado=self.user,
        )
        self.orden_pendiente = Orden.objects.create(
            cliente="Pendiente",
            status="pendiente",
            servicios_realizados=["Servicio"],
            fecha_inicio="2026-07-02",
            creado_por=self.user,
            tecnico_asignado=self.user,
        )
        from apps.users.models import UserSmtpCredentials
        from apps.users.smtp_crypto import encrypt_smtp_password

        UserSmtpCredentials.objects.create(
            user=self.user,
            smtp_email="tecnico@example.com",
            smtp_password_encrypted=encrypt_smtp_password("webmail-secret"),
        )

    def test_correo_sugerido_usa_contacto_si_cliente_vacio(self):
        response = self.client.get(f"/api/ordenes/{self.orden.id}/correo-sugerido/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("correo"), "contacto@example.com")
        self.assertFalse(response.data.get("cliente_tiene_correo"))

    def test_enviar_pdf_rechaza_pendiente(self):
        response = self.client.post(
            f"/api/ordenes/{self.orden_pendiente.id}/enviar-pdf/",
            {"correo": "alguien@example.com"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_enviar_pdf_requiere_correo_valido(self):
        response = self.client.post(
            f"/api/ordenes/{self.orden.id}/enviar-pdf/",
            {"correo": "no-es-correo"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_enviar_pdf_sin_smtp_usuario_bloquea(self):
        from django.test import override_settings

        from apps.users.models import UserSmtpCredentials

        UserSmtpCredentials.objects.filter(user=self.user).delete()
        with override_settings(EMAIL_HOST="mail.example.com"):
            response = self.client.post(
                f"/api/ordenes/{self.orden.id}/enviar-pdf/",
                {"correo": "alguien@example.com"},
                format="json",
            )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("SMTP", response.data.get("detail", ""))
        self.assertIn("envio_pdf", response.data.get("detail", ""))

    def test_enviar_pdf_ok_guarda_correo_y_envia(self):
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
                "apps.ordenes.views.render_html_to_pdf",
                return_value=b"%PDF-1.4 test",
            ), patch(
                "apps.ordenes.views.any_provider_configured",
                return_value=True,
            ):
                response = self.client.post(
                    f"/api/ordenes/{self.orden.id}/enviar-pdf/",
                    {"correo": "nuevo@example.com"},
                    format="json",
                )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("ok"))
        self.assertTrue(response.data.get("correo_guardado_en_cliente"))
        self.cliente.refresh_from_db()
        self.assertEqual(self.cliente.correo, "nuevo@example.com")
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["nuevo@example.com"])
        self.assertEqual(mail.outbox[0].from_email, "tecnico@example.com")
        self.assertEqual(len(mail.outbox[0].attachments), 1)
