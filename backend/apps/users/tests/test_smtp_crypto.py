"""
Cifrado de credenciales SMTP (`apps.users.smtp_crypto`) y su exposición por API.

Estas contraseñas son de buzones webmail reales del cliente. Los caminos que
importan: que el round-trip funcione, que el texto plano nunca quede en BD ni
salga en una respuesta de la API, y que una clave equivocada dé un error
accionable en vez de devolver basura.
"""

import os
from unittest import expectedFailure, mock

from cryptography.fernet import Fernet
from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase, override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.models import UserSmtpCredentials
from apps.users.smtp_crypto import (
    _resolve_fernet_key,
    decrypt_smtp_password,
    encrypt_smtp_password,
)

User = get_user_model()

CLAVE_A = Fernet.generate_key().decode("ascii")
CLAVE_B = Fernet.generate_key().decode("ascii")


def _entorno(clave):
    """Aísla el entorno: `_resolve_fernet_key` lee `os.environ` primero."""
    return mock.patch.dict(os.environ, {"SMTP_CREDENTIALS_KEY": clave}, clear=False)


class SmtpCryptoTests(SimpleTestCase):
    def test_round_trip_conserva_la_contrasena(self):
        with _entorno(CLAVE_A):
            token = encrypt_smtp_password("Sup3r-S3cr3t@2026")
            self.assertEqual(decrypt_smtp_password(token), "Sup3r-S3cr3t@2026")

    def test_el_token_no_contiene_la_contrasena_en_claro(self):
        secreto = "ContrasenaEnClaro123"
        with _entorno(CLAVE_A):
            token = encrypt_smtp_password(secreto)
        self.assertNotIn(secreto, token)
        self.assertNotEqual(token, secreto)
        self.assertTrue(token.startswith("gAAAAA"))  # cabecera Fernet v1

    def test_dos_cifrados_de_lo_mismo_dan_tokens_distintos(self):
        """Fernet usa IV aleatorio: sin esto, dos usuarios con la misma
        contraseña serían identificables comparando la columna en BD."""
        with _entorno(CLAVE_A):
            self.assertNotEqual(
                encrypt_smtp_password("misma-clave"), encrypt_smtp_password("misma-clave")
            )

    def test_soporta_acentos_y_simbolos(self):
        secreto = "contraseña-ñÑ-áéíóú-€-🔐"
        with _entorno(CLAVE_A):
            self.assertEqual(decrypt_smtp_password(encrypt_smtp_password(secreto)), secreto)

    def test_soporta_contrasena_vacia_sin_reventar(self):
        with _entorno(CLAVE_A):
            self.assertEqual(decrypt_smtp_password(encrypt_smtp_password("")), "")

    def test_descifrar_con_otra_clave_da_error_accionable(self):
        """Escenario real: se rotó `SMTP_CREDENTIALS_KEY` en Render."""
        with _entorno(CLAVE_A):
            token = encrypt_smtp_password("secreta")
        with _entorno(CLAVE_B), self.assertRaises(ValueError) as ctx:
            decrypt_smtp_password(token)
        # El mensaje debe decirle al admin qué hacer, no filtrar la excepción cruda.
        self.assertIn("vuelve a guardar", str(ctx.exception).lower())

    def test_token_corrupto_da_valueerror_no_invalidtoken(self):
        with _entorno(CLAVE_A), self.assertRaises(ValueError):
            decrypt_smtp_password("esto-no-es-un-token-fernet")

    def test_token_vacio_da_valueerror(self):
        with _entorno(CLAVE_A), self.assertRaises(ValueError):
            decrypt_smtp_password("")

    def test_clave_fernet_valida_se_usa_tal_cual(self):
        with _entorno(CLAVE_A):
            self.assertEqual(_resolve_fernet_key(), CLAVE_A.encode("ascii"))

    def test_clave_con_comillas_y_espacios_se_normaliza(self):
        """
        Caso real documentado en `_normalize_secret`: al pegar el secreto en el
        dashboard de Render se cuelan comillas o espacios. Debe resolver a la
        misma clave, o las contraseñas ya guardadas dejan de descifrarse.
        """
        with _entorno(CLAVE_A):
            token = encrypt_smtp_password("secreta")
        for sucia in (f'  "{CLAVE_A}"  ', f"'{CLAVE_A}'", f"{CLAVE_A}\n"):
            with self.subTest(sucia=sucia), _entorno(sucia):
                self.assertEqual(decrypt_smtp_password(token), "secreta")

    def test_secreto_arbitrario_se_deriva_a_clave_fernet_estable(self):
        """`SMTP_CREDENTIALS_KEY` puede no ser una clave Fernet: se deriva."""
        with _entorno("un-secreto-cualquiera-no-fernet"):
            primera = _resolve_fernet_key()
            segunda = _resolve_fernet_key()
            self.assertEqual(primera, segunda)
            self.assertEqual(len(primera), 44)
            token = encrypt_smtp_password("secreta")
            self.assertEqual(decrypt_smtp_password(token), "secreta")

    def test_secretos_distintos_derivan_claves_distintas(self):
        with _entorno("secreto-uno"):
            uno = _resolve_fernet_key()
        with _entorno("secreto-dos"):
            dos = _resolve_fernet_key()
        self.assertNotEqual(uno, dos)

    def test_sin_smtp_key_se_deriva_de_secret_key(self):
        entorno_sin_clave = {k: v for k, v in os.environ.items() if k != "SMTP_CREDENTIALS_KEY"}
        with mock.patch.dict(os.environ, entorno_sin_clave, clear=True), override_settings(
            SMTP_CREDENTIALS_KEY="", SECRET_KEY="secret-key-de-respaldo"
        ):
            token = encrypt_smtp_password("secreta")
            self.assertEqual(decrypt_smtp_password(token), "secreta")

    def test_smtp_key_en_settings_se_usa_si_no_hay_env(self):
        entorno_sin_clave = {k: v for k, v in os.environ.items() if k != "SMTP_CREDENTIALS_KEY"}
        with mock.patch.dict(os.environ, entorno_sin_clave, clear=True), override_settings(
            SMTP_CREDENTIALS_KEY=CLAVE_B
        ):
            self.assertEqual(_resolve_fernet_key(), CLAVE_B.encode("ascii"))


class SmtpCredencialesModeloTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="smtp_modelo", password="test-pass-123")

    def test_is_configured_exige_correo_y_contrasena(self):
        creds = UserSmtpCredentials.objects.create(user=self.user)
        self.assertFalse(creds.is_configured)

        creds.smtp_email = "buzon@example.test"
        creds.save()
        self.assertFalse(creds.is_configured)

        with _entorno(CLAVE_A):
            creds.smtp_password_encrypted = encrypt_smtp_password("secreta")
        creds.save()
        self.assertTrue(creds.is_configured)

    def test_is_configured_ignora_espacios_en_blanco(self):
        creds = UserSmtpCredentials.objects.create(
            user=self.user, smtp_email="   ", smtp_password_encrypted="   "
        )
        self.assertFalse(creds.is_configured)


class SmtpCredencialesApiTests(APITestCase):
    """`/api/users/accounts/` — alta y edición de credenciales SMTP (solo admin)."""

    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin_smtp", password="test-pass-123", is_staff=True, is_superuser=True
        )
        self.client.force_authenticate(user=self.admin)

    def test_la_contrasena_no_se_guarda_en_claro_ni_se_devuelve(self):
        with _entorno(CLAVE_A):
            response = self.client.post(
                "/api/users/accounts/",
                {
                    "username": "tecnico_smtp",
                    "password": "login-pass-123",
                    "smtp_email": "tecnico@example.test",
                    "smtp_password": "Webmail-S3creta!",
                },
                format="json",
            )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        creds = UserSmtpCredentials.objects.get(user__username="tecnico_smtp")
        self.assertNotEqual(creds.smtp_password_encrypted, "Webmail-S3creta!")
        self.assertNotIn("Webmail-S3creta!", creds.smtp_password_encrypted)
        with _entorno(CLAVE_A):
            self.assertEqual(decrypt_smtp_password(creds.smtp_password_encrypted), "Webmail-S3creta!")

        # La API nunca debe devolver la contraseña (ni SMTP ni de login).
        cuerpo = str(response.data)
        self.assertNotIn("Webmail-S3creta!", cuerpo)
        self.assertNotIn("login-pass-123", cuerpo)
        self.assertNotIn("smtp_password", response.data)
        self.assertTrue(response.data["smtp_configured"])
        self.assertEqual(response.data["smtp_email"], "tecnico@example.test")

    def test_listado_de_usuarios_no_filtra_contrasenas(self):
        with _entorno(CLAVE_A):
            self.client.post(
                "/api/users/accounts/",
                {
                    "username": "tecnico_listado",
                    "password": "login-pass-123",
                    "smtp_email": "listado@example.test",
                    "smtp_password": "NoDebeSalir-123",
                },
                format="json",
            )
            response = self.client.get("/api/users/accounts/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("NoDebeSalir-123", str(response.data))

    def test_patch_sin_smtp_password_no_borra_la_guardada(self):
        """Editar el nombre de un usuario no debe tumbar su envío de PDF."""
        with _entorno(CLAVE_A):
            creacion = self.client.post(
                "/api/users/accounts/",
                {
                    "username": "tecnico_patch",
                    "password": "login-pass-123",
                    "smtp_email": "patch@example.test",
                    "smtp_password": "Persistente-1",
                },
                format="json",
            )
            user_id = creacion.data["id"]
            response = self.client.patch(
                f"/api/users/accounts/{user_id}/", {"first_name": "Nuevo"}, format="json"
            )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        creds = UserSmtpCredentials.objects.get(user_id=user_id)
        with _entorno(CLAVE_A):
            self.assertEqual(decrypt_smtp_password(creds.smtp_password_encrypted), "Persistente-1")
        self.assertTrue(response.data["smtp_configured"])

    def test_smtp_password_vacio_no_pisa_la_guardada(self):
        """El formulario manda el campo vacío cuando el admin no lo tocó."""
        with _entorno(CLAVE_A):
            creacion = self.client.post(
                "/api/users/accounts/",
                {
                    "username": "tecnico_vacio",
                    "password": "login-pass-123",
                    "smtp_email": "vacio@example.test",
                    "smtp_password": "NoLaBorres-1",
                },
                format="json",
            )
            user_id = creacion.data["id"]
            self.client.patch(
                f"/api/users/accounts/{user_id}/",
                {"smtp_email": "vacio@example.test", "smtp_password": ""},
                format="json",
            )
        creds = UserSmtpCredentials.objects.get(user_id=user_id)
        with _entorno(CLAVE_A):
            self.assertEqual(decrypt_smtp_password(creds.smtp_password_encrypted), "NoLaBorres-1")

    def _crear_tecnico_con_smtp(self, username, password_smtp="Borrame-1"):
        with _entorno(CLAVE_A):
            creacion = self.client.post(
                "/api/users/accounts/",
                {
                    "username": username,
                    "password": "login-pass-123",
                    "smtp_email": f"{username}@example.test",
                    "smtp_password": password_smtp,
                },
                format="json",
            )
        self.assertEqual(creacion.status_code, status.HTTP_201_CREATED)
        return creacion.data["id"]

    def test_smtp_clear_borra_correo_y_contrasena_en_bd(self):
        user_id = self._crear_tecnico_con_smtp("tecnico_clear")
        with _entorno(CLAVE_A):
            self.client.patch(
                f"/api/users/accounts/{user_id}/", {"smtp_clear": True}, format="json"
            )
        creds = UserSmtpCredentials.objects.get(user_id=user_id)
        self.assertEqual(creds.smtp_email, "")
        self.assertEqual(creds.smtp_password_encrypted, "")
        self.assertFalse(creds.is_configured)

    @expectedFailure
    def test_respuesta_del_patch_refleja_el_smtp_recien_borrado(self):
        """
        BUG DE PRODUCCIÓN (documentado, NO corregido en este ticket).

        `UserAccountSerializer._save_smtp` escribe sobre el objeto que devuelve
        `UserSmtpCredentials.objects.get_or_create(...)`, que es una instancia
        distinta a la relación ya cacheada en `instance.smtp_credentials`
        (`UserAccountViewSet.queryset` usa `select_related('smtp_credentials')`).
        `to_representation` lee la cacheada, así que la respuesta del PATCH
        devuelve el estado **anterior**.

        Efecto visible: el admin pulsa «borrar SMTP», la BD sí queda limpia,
        pero Gestión de usuarios sigue mostrando el buzón configurado hasta
        recargar la página.

        Arreglo sugerido: en `_save_smtp`, refrescar la relación cacheada
        (`user._state.fields_cache.pop('smtp_credentials', None)`) o asignar
        `user.smtp_credentials = creds` tras guardar.
        """
        user_id = self._crear_tecnico_con_smtp("tecnico_clear_resp")
        with _entorno(CLAVE_A):
            response = self.client.patch(
                f"/api/users/accounts/{user_id}/", {"smtp_clear": True}, format="json"
            )
        self.assertFalse(response.data["smtp_configured"])
        self.assertEqual(response.data["smtp_email"], "")

    def test_respuesta_del_patch_refleja_el_smtp_recien_configurado(self):
        """
        Contracaso del test anterior: configurar SMTP por primera vez con PATCH
        sí se refleja en la respuesta (aquí no había relación cacheada previa).
        Sirve de guardia para que un arreglo del bug de arriba no rompa este
        camino, que hoy funciona.
        """
        response_alta = self.client.post(
            "/api/users/accounts/",
            {"username": "tecnico_sin_smtp", "password": "login-pass-123"},
            format="json",
        )
        user_id = response_alta.data["id"]
        with _entorno(CLAVE_A):
            response = self.client.patch(
                f"/api/users/accounts/{user_id}/",
                {"smtp_email": "nuevo@example.test", "smtp_password": "Recien-1"},
                format="json",
            )

        creds = UserSmtpCredentials.objects.get(user_id=user_id)
        self.assertTrue(creds.is_configured)  # la BD sí quedó bien
        self.assertTrue(response.data["smtp_configured"])
        self.assertEqual(response.data["smtp_email"], "nuevo@example.test")

    def test_no_admin_no_puede_listar_ni_crear_cuentas(self):
        raso = User.objects.create_user(username="raso", password="test-pass-123")
        self.client.force_authenticate(user=raso)
        self.assertEqual(
            self.client.get("/api/users/accounts/").status_code, status.HTTP_403_FORBIDDEN
        )
        self.assertEqual(
            self.client.post(
                "/api/users/accounts/", {"username": "colado"}, format="json"
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )
