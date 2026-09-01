"""`CookieJWTAuthentication` no debe atrapar a los clientes Bearer.

La app nativa manda `Authorization: Bearer` y autentica con ese header, pero el
stack HTTP de iOS/Android reenvía solo las cookies (`access_token`, `csrftoken`)
que el backend puso en el `Set-Cookie` del login. Si la auth por cookie corre
para esas peticiones, el checar CSRF sin `X-CSRFToken` rompe el segundo
login/logout de la sesión con "CSRF Failed: CSRF token missing".
"""

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()

LOGIN_URL = "/api/login/"
LOGOUT_URL = "/api/logout/"
REFRESH_URL = "/api/token/refresh/"
PASSWORD = "test-pass-123"


class MobileBearerBypassesCookieCsrfTests(TestCase):
    def setUp(self):
        cache.clear()
        User.objects.create_user(username="tecnico", password=PASSWORD)

    def tearDown(self):
        cache.clear()

    def _login_mobile(self, client):
        return client.post(
            LOGIN_URL,
            {"username": "tecnico", "password": PASSWORD},
            format="json",
            HTTP_X_CLIENT="mobile",
        )

    def test_relogin_with_stale_auth_cookies_still_succeeds(self):
        """Reproduce el bloqueo: login -> (cookies quedan en el jar) -> login."""
        client = APIClient(enforce_csrf_checks=True)

        first = self._login_mobile(client)
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        # El APIClient guarda las cookies del login igual que hace React Native.
        self.assertIn("access_token", client.cookies)

        second = self._login_mobile(client)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertTrue(second.data.get("refresh"))

    def test_logout_with_bearer_and_stale_cookies_succeeds(self):
        client = APIClient(enforce_csrf_checks=True)
        login = self._login_mobile(client)
        access = login.data["access"]
        refresh = login.data["refresh"]

        resp = client.post(
            LOGOUT_URL,
            {"refresh": refresh},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {access}",
            HTTP_X_CLIENT="mobile",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_refresh_with_cookie_never_echoes_refresh_even_with_forged_x_client(self):
        """Un navegador (cookie `refresh_token`) que falsifica `X-Client: mobile`
        no debe recibir el refresh rotado en el cuerpo: un XSS mismo-origen lo
        leería. Solo la app nativa, que manda el refresh por el cuerpo, lo recibe.
        """
        web = APIClient(enforce_csrf_checks=True)
        login = web.post(
            LOGIN_URL,
            {"username": "tecnico", "password": PASSWORD},
            format="json",
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        self.assertIn("refresh_token", web.cookies)

        resp = web.post(REFRESH_URL, {}, format="json", HTTP_X_CLIENT="mobile")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("access", resp.data)
        self.assertNotIn("refresh", resp.data)
