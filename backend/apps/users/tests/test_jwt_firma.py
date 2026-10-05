"""La firma del JWT se verifica en cada petición (cookie y header Bearer).

Un token válido entra; cualquier token alterado, firmado con otra clave, sin
firma (`alg: none`), con otro algoritmo, vencido o de otro tipo (refresh en
lugar de access) se rechaza con 401. Si alguna de estas pruebas falla, el
backend estaría aceptando tokens que no emitió él.
"""

import base64
import json
from datetime import timedelta

import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken
from rest_framework.test import APIClient

User = get_user_model()

ME_URL = "/api/me/"


def _b64(data: dict) -> str:
    raw = json.dumps(data, separators=(",", ":")).encode()
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def _partes(token: str) -> tuple[dict, dict, str]:
    header_b64, payload_b64, firma = token.split(".")

    def dec(s: str) -> dict:
        return json.loads(base64.urlsafe_b64decode(s + "=" * (-len(s) % 4)))

    return dec(header_b64), dec(payload_b64), firma


class FirmaJwtTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(username="victima", password="x-pass-123")
        self.otro = User.objects.create_superuser(username="admin", password="x-pass-123")
        self.valido = str(AccessToken.for_user(self.user))

    def tearDown(self):
        cache.clear()

    # ---------- helpers ----------

    def _status(self, token: str, via: str) -> int:
        client = APIClient()
        if via == "bearer":
            return client.get(ME_URL, HTTP_AUTHORIZATION=f"Bearer {token}").status_code
        client.cookies["access_token"] = token
        return client.get(ME_URL).status_code

    def _rechazado_en_ambos(self, token: str):
        for via in ("bearer", "cookie"):
            with self.subTest(via=via):
                self.assertEqual(self._status(token, via), 401)

    # ---------- casos ----------

    def test_token_valido_entra(self):
        for via in ("bearer", "cookie"):
            with self.subTest(via=via):
                self.assertEqual(self._status(self.valido, via), 200)

    def test_payload_alterado_se_rechaza(self):
        """Cambiar user_id para hacerse pasar por otro (p. ej. el admin) rompe la firma."""
        header, payload, firma = _partes(self.valido)
        payload["user_id"] = self.otro.id
        alterado = f"{_b64(header)}.{_b64(payload)}.{firma}"
        self._rechazado_en_ambos(alterado)

    def test_firmado_con_otra_clave_se_rechaza(self):
        _, payload, _ = _partes(self.valido)
        falso = jwt.encode(payload, "clave-que-no-es-la-del-servidor", algorithm="HS256")
        self._rechazado_en_ambos(falso)

    def test_sin_firma_alg_none_se_rechaza(self):
        _, payload, _ = _partes(self.valido)
        sin_firma = f"{_b64({'alg': 'none', 'typ': 'JWT'})}.{_b64(payload)}."
        self._rechazado_en_ambos(sin_firma)

    def test_otro_algoritmo_con_la_clave_correcta_se_rechaza(self):
        """Solo se acepta HS256: no se puede elegir el algoritmo desde el token."""
        _, payload, _ = _partes(self.valido)
        otro_alg = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS512")
        self._rechazado_en_ambos(otro_alg)

    def test_firma_recortada_se_rechaza(self):
        self._rechazado_en_ambos(self.valido[:-6])

    def test_token_vencido_se_rechaza(self):
        vencido = AccessToken.for_user(self.user)
        vencido.set_exp(lifetime=-timedelta(minutes=1))
        self._rechazado_en_ambos(str(vencido))

    def test_refresh_no_sirve_como_access(self):
        self._rechazado_en_ambos(str(RefreshToken.for_user(self.user)))
