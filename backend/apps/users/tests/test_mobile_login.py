"""Login desde la app nativa (`mobile/`).

El SPA web guarda el refresh **solo** en cookie HttpOnly. La app Expo no puede
leerla, así que el login devuelve `refresh` en el JSON únicamente cuando el
cliente se identifica como móvil (`X-Client: mobile` o `client: "mobile"`).
Estos tests fijan esa frontera: el camino web no debe filtrar el refresh nunca.
"""

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()

LOGIN_URL = "/api/login/"
REFRESH_URL = "/api/token/refresh/"
PASSWORD = "test-pass-123"


class MobileLoginRefreshTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient(enforce_csrf_checks=False)
        self.user = User.objects.create_user(username="tecnico", password=PASSWORD)

    def tearDown(self):
        cache.clear()

    def _login(self, payload=None, **extra):
        body = {"username": "tecnico", "password": PASSWORD}
        body.update(payload or {})
        return self.client.post(LOGIN_URL, body, format="json", **extra)

    def test_web_login_does_not_leak_refresh_in_body(self):
        resp = self._login()
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("access", resp.data)
        self.assertNotIn("refresh", resp.data)
        # El web sigue recibiendo el refresh por cookie HttpOnly.
        self.assertIn("refresh_token", resp.cookies)

    def test_mobile_header_returns_refresh_in_body(self):
        resp = self._login(HTTP_X_CLIENT="mobile")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data.get("refresh"))
        self.assertTrue(resp.data.get("access"))

    def test_mobile_body_flag_returns_refresh_in_body(self):
        resp = self._login({"client": "mobile"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data.get("refresh"))

    def test_mobile_flag_is_case_insensitive_and_trimmed(self):
        resp = self._login(HTTP_X_CLIENT="  Mobile ")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data.get("refresh"))

    def test_unknown_client_value_does_not_return_refresh(self):
        resp = self._login({"client": "cualquier-cosa"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertNotIn("refresh", resp.data)

    def test_refresh_from_body_rotates_access_without_cookies(self):
        """La app envía el refresh en el body; no depende de cookies."""
        login = self._login(HTTP_X_CLIENT="mobile")
        refresh = login.data["refresh"]

        bare = APIClient(enforce_csrf_checks=False)
        resp = bare.post(REFRESH_URL, {"refresh": refresh}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data.get("access"))

    def test_bad_credentials_never_return_refresh(self):
        resp = self._login({"password": "incorrecta"}, HTTP_X_CLIENT="mobile")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotIn("refresh", resp.data)

    def test_inactive_user_is_rejected_for_mobile_too(self):
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        resp = self._login(HTTP_X_CLIENT="mobile")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertNotIn("refresh", resp.data)

    def test_account_throttling_still_applies_to_mobile(self):
        for _ in range(10):
            self._login({"password": "incorrecta"}, HTTP_X_CLIENT="mobile")
        resp = self._login(HTTP_X_CLIENT="mobile")
        self.assertEqual(resp.status_code, status.HTTP_429_TOO_MANY_REQUESTS)


class MobileTokenRefreshTests(TestCase):
    """El refresh rota y el anterior queda en blacklist.

    El web recibe el rotado por cookie. La app nativa solo puede leerlo del
    body: sin eso, el segundo refresh de la sesión fallaría con 401.
    """

    def setUp(self):
        cache.clear()
        self.client = APIClient(enforce_csrf_checks=False)
        User.objects.create_user(username="tecnico", password=PASSWORD)
        login = self.client.post(
            LOGIN_URL,
            {"username": "tecnico", "password": PASSWORD},
            format="json",
            HTTP_X_CLIENT="mobile",
        )
        self.refresh = login.data["refresh"]

    def tearDown(self):
        cache.clear()

    def _refresh(self, token, mobile):
        # Cliente sin cookies: la app nativa solo manda el body.
        bare = APIClient(enforce_csrf_checks=False)
        extra = {"HTTP_X_CLIENT": "mobile"} if mobile else {}
        return bare.post(REFRESH_URL, {"refresh": token}, format="json", **extra)

    def test_web_refresh_does_not_return_rotated_refresh_in_body(self):
        resp = self._refresh(self.refresh, mobile=False)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertNotIn("refresh", resp.data)

    def test_mobile_refresh_returns_rotated_refresh(self):
        resp = self._refresh(self.refresh, mobile=True)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data.get("refresh"))
        self.assertNotEqual(resp.data["refresh"], self.refresh)

    def test_mobile_refresh_chain_survives_two_rotations(self):
        first = self._refresh(self.refresh, mobile=True)
        second = self._refresh(first.data["refresh"], mobile=True)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertTrue(second.data.get("access"))

    def test_used_refresh_is_rejected(self):
        self._refresh(self.refresh, mobile=True)
        reused = self._refresh(self.refresh, mobile=True)
        self.assertEqual(reused.status_code, status.HTTP_401_UNAUTHORIZED)
