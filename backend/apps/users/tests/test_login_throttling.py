from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework import status
from rest_framework.parsers import JSONParser
from rest_framework.request import Request
from rest_framework.test import APIClient, APIRequestFactory

from apps.users.throttling import LoginAccountRateThrottle

User = get_user_model()

LOGIN_URL = "/api/login/"


class LoginAccountRateThrottleKeyTests(TestCase):
    """La clave de caché no debe exponer el username en claro."""

    def setUp(self):
        self.factory = APIRequestFactory()
        self.throttle = LoginAccountRateThrottle()

    def _key_for(self, payload):
        django_request = self.factory.post(LOGIN_URL, payload, format="json")
        request = Request(django_request, parsers=[JSONParser()])
        return self.throttle.get_cache_key(request, None)

    def test_cache_key_does_not_leak_username(self):
        key = self._key_for({"username": "admin", "password": "x"})
        self.assertIsNotNone(key)
        self.assertNotIn("admin", key)
        self.assertTrue(key.startswith("throttle_login_account_"))

    def test_cache_key_is_case_insensitive(self):
        lower = self._key_for({"username": "admin", "password": "x"})
        upper = self._key_for({"username": "  ADMIN ", "password": "x"})
        self.assertEqual(lower, upper)

    def test_cache_key_differs_per_account(self):
        a = self._key_for({"username": "admin", "password": "x"})
        b = self._key_for({"username": "operador", "password": "x"})
        self.assertNotEqual(a, b)

    def test_no_key_without_identifier(self):
        # Sin username/email el throttle por cuenta no aplica (lo cubre el de IP).
        self.assertIsNone(self._key_for({"password": "x"}))


class LoginAccountRateThrottleViewTests(TestCase):
    """El límite por cuenta debe aplicar aunque el atacante rote de IP."""

    def setUp(self):
        cache.clear()
        self.client = APIClient(enforce_csrf_checks=False)
        self.user = User.objects.create_user(
            username="objetivo", password="test-pass-123"
        )

    def tearDown(self):
        cache.clear()

    def _attempt(self, username, ip):
        return self.client.post(
            LOGIN_URL,
            {"username": username, "password": "contrasena-incorrecta"},
            format="json",
            REMOTE_ADDR=ip,
        )

    def test_throttles_same_account_across_different_ips(self):
        rate_limit = 10  # LoginAccountRateThrottle.rate = '10/minute'

        for i in range(rate_limit):
            # Cada intento desde una IP distinta: LoginRateThrottle (20/min por IP)
            # no puede dispararse, así que un 429 solo puede venir del throttle por cuenta.
            response = self._attempt("objetivo", f"203.0.113.{i + 1}")
            self.assertEqual(
                response.status_code,
                status.HTTP_401_UNAUTHORIZED,
                f"intento {i + 1} debería ser 401, fue {response.status_code}",
            )

        blocked = self._attempt("objetivo", "203.0.113.200")
        self.assertEqual(blocked.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_other_account_not_affected(self):
        for i in range(10):
            self._attempt("objetivo", f"203.0.113.{i + 1}")

        # Otra cuenta, misma IP "quemada": el contador es por cuenta, no global.
        otra = self._attempt("otro-usuario", "203.0.113.201")
        self.assertEqual(otra.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_successful_login_still_works_under_limit(self):
        response = self.client.post(
            LOGIN_URL,
            {"username": "objetivo", "password": "test-pass-123"},
            format="json",
            REMOTE_ADDR="203.0.113.10",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
