"""«Recordarme» controla si las cookies JWT son de sesión o persistentes."""

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

LOGIN_URL = "/api/login/"
REFRESH_URL = "/api/token/refresh/"
PASSWORD = "test-pass-123"


def _cookie_max_age(cookie) -> str:
    return cookie.get("max-age") or ""


class LoginRememberCookieTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient(enforce_csrf_checks=False)
        User.objects.create_user(username="tecnico", password=PASSWORD)

    def tearDown(self):
        cache.clear()

    def _login(self, extra=None, **headers):
        body = {"username": "tecnico", "password": PASSWORD}
        body.update(extra or {})
        return self.client.post(LOGIN_URL, body, format="json", **headers)

    def test_web_without_remember_uses_session_cookies(self):
        resp = self._login()
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(_cookie_max_age(resp.cookies["refresh_token"]), "")
        self.assertEqual(_cookie_max_age(resp.cookies["access_token"]), "")

    def test_web_remember_true_sets_persistent_refresh_cookie(self):
        resp = self._login({"remember": True})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        max_age = int(_cookie_max_age(resp.cookies["refresh_token"]))
        self.assertGreater(max_age, 60 * 60 * 24)

    def test_remember_string_true_is_accepted(self):
        resp = self._login({"remember": "true"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(_cookie_max_age(resp.cookies["refresh_token"]))

    def test_mobile_stays_persistent_without_remember(self):
        resp = self._login(HTTP_X_CLIENT="mobile")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(_cookie_max_age(resp.cookies["refresh_token"]))

    def test_refresh_keeps_session_cookies_when_remember_was_false(self):
        login = self._login({"remember": False})
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        csrf = login.data.get("csrfToken") or ""
        refresh = self.client.post(
            REFRESH_URL,
            {},
            format="json",
            HTTP_X_CSRFTOKEN=csrf,
        )
        self.assertEqual(refresh.status_code, status.HTTP_200_OK)
        self.assertEqual(_cookie_max_age(refresh.cookies["refresh_token"]), "")

    def test_legacy_refresh_without_claim_stays_persistent(self):
        user = User.objects.get(username="tecnico")
        token = RefreshToken.for_user(user)
        self.assertNotIn("remember", token.payload)
        resp = APIClient(enforce_csrf_checks=False).post(
            REFRESH_URL, {"refresh": str(token)}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(_cookie_max_age(resp.cookies["refresh_token"]))
