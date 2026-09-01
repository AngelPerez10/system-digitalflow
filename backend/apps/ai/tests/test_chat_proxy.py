"""
Tests del proxy `POST /api/ai/chat/` (`apps.ai.views.chat`).

La vista abre una conexión HTTPS contra un servicio externo (`AI_API_URL`).
**Ningún test debe salir a la red**: todos parchan `http.client.HTTPSConnection`
con un doble que registra lo que se le pidió y devuelve respuestas fabricadas.

Los casos cubren los caminos donde un fallo del upstream podría convertirse en
un 500 sin control para el usuario final (timeout, conexión rechazada, 5xx del
upstream) y la configuración inválida del entorno.
"""

import os
from unittest import mock

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()

CHAT_URL = "/api/ai/chat/"
MENSAJES = [{"role": "user", "content": "hola"}]

# Entorno base: clave presente, sin reintentos y sin backoff para que los tests
# no duerman. Cada test lo ajusta con `mock.patch.dict`.
ENV_BASE = {
    "AI_API_KEY": "clave-de-prueba",
    "AI_API_URL": "https://ia.example.test",
    "AI_API_UPSTREAM_RETRIES": "0",
    "AI_API_UPSTREAM_RETRY_BACKOFF_S": "0",
}


class RespuestaUpstreamFalsa:
    """Doble de `http.client.HTTPResponse`."""

    def __init__(self, status_code=200, lineas=None, cuerpo=b""):
        self.status = status_code
        self.reason = "Simulado"
        self._lineas = list(lineas or [])
        self._cuerpo = cuerpo
        self.cerrada = False

    def readline(self):
        return self._lineas.pop(0) if self._lineas else b""

    def read(self):
        return self._cuerpo

    def close(self):
        self.cerrada = True


class ConexionFalsa:
    """Doble de `http.client.HTTPSConnection` que nunca abre un socket."""

    def __init__(self, respuesta):
        self._respuesta = respuesta
        self.sock = None
        self.cerrada = False
        self.peticion = None

    def request(self, method, path, body=None, headers=None):
        self.peticion = {
            "method": method,
            "path": path,
            "body": body,
            "headers": headers or {},
        }

    def getresponse(self):
        if isinstance(self._respuesta, BaseException):
            raise self._respuesta
        return self._respuesta

    def close(self):
        self.cerrada = True


class FabricaConexiones:
    """
    Reemplaza a `HTTPSConnection`: devuelve, en orden, una conexión por cada
    elemento de `guion`. Un elemento puede ser una `RespuestaUpstreamFalsa` o
    una excepción a levantar (para simular timeouts / DNS caído).
    """

    def __init__(self, guion):
        self.guion = list(guion)
        self.creadas = []
        self.hosts = []

    def __call__(self, host, port=None, timeout=None):
        self.hosts.append((host, port, timeout))
        siguiente = self.guion.pop(0) if self.guion else RespuestaUpstreamFalsa()
        conexion = ConexionFalsa(siguiente)
        self.creadas.append(conexion)
        return conexion


class ChatAuthTests(APITestCase):
    """El endpoint es un proxy con clave de API: exige sesión autenticada."""

    def test_chat_anonimo_es_rechazado(self):
        with mock.patch.dict(os.environ, ENV_BASE, clear=False), mock.patch(
            "http.client.HTTPSConnection"
        ) as conexion:
            response = self.client.post(CHAT_URL, {"messages": MENSAJES}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        # Lo importante: no se llegó a contactar al proveedor de IA.
        conexion.assert_not_called()

    def test_chat_solo_acepta_post(self):
        user = User.objects.create_user(username="ia_get", password="test-pass-123")
        self.client.force_authenticate(user=user)
        response = self.client.get(CHAT_URL)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class ChatValidacionTests(APITestCase):
    """Validación de entrada y de configuración antes de tocar la red."""

    def setUp(self):
        self.user = User.objects.create_user(username="ia_user", password="test-pass-123")
        self.client.force_authenticate(user=self.user)

    def test_sin_api_key_responde_500_con_detalle(self):
        entorno = dict(ENV_BASE)
        entorno.pop("AI_API_KEY")
        with mock.patch.dict(os.environ, entorno, clear=True), mock.patch(
            "http.client.HTTPSConnection"
        ) as conexion:
            response = self.client.post(CHAT_URL, {"messages": MENSAJES}, format="json")
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn("AI_API_KEY", response.data["detail"])
        conexion.assert_not_called()

    def test_messages_ausente_responde_400(self):
        with mock.patch.dict(os.environ, ENV_BASE, clear=False), mock.patch(
            "http.client.HTTPSConnection"
        ) as conexion:
            response = self.client.post(CHAT_URL, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        conexion.assert_not_called()

    def test_messages_vacio_responde_400(self):
        with mock.patch.dict(os.environ, ENV_BASE, clear=False), mock.patch(
            "http.client.HTTPSConnection"
        ) as conexion:
            response = self.client.post(CHAT_URL, {"messages": []}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        conexion.assert_not_called()

    def test_messages_no_lista_responde_400(self):
        """Un string no debe colarse: `json.dumps` lo aceptaría y el upstream fallaría."""
        with mock.patch.dict(os.environ, ENV_BASE, clear=False), mock.patch(
            "http.client.HTTPSConnection"
        ) as conexion:
            response = self.client.post(CHAT_URL, {"messages": "hola"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        conexion.assert_not_called()

    def test_url_no_https_se_rechaza_sin_conectar(self):
        """Nunca mandar la API key por texto plano aunque el env esté mal puesto."""
        entorno = dict(ENV_BASE, AI_API_URL="http://ia.example.test")
        with mock.patch.dict(os.environ, entorno, clear=False), mock.patch(
            "http.client.HTTPSConnection"
        ) as conexion:
            response = self.client.post(CHAT_URL, {"messages": MENSAJES}, format="json")
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn("https", response.data["detail"])
        conexion.assert_not_called()


class ChatUpstreamTests(APITestCase):
    """Comportamiento frente al servicio de IA externo (siempre simulado)."""

    def setUp(self):
        self.user = User.objects.create_user(username="ia_stream", password="test-pass-123")
        self.client.force_authenticate(user=self.user)

    def _post(self, guion, entorno=None):
        fabrica = FabricaConexiones(guion)
        env = dict(ENV_BASE)
        env.update(entorno or {})
        with mock.patch.dict(os.environ, env, clear=False), mock.patch(
            "http.client.HTTPSConnection", fabrica
        ):
            response = self.client.post(CHAT_URL, {"messages": MENSAJES}, format="json")
        return response, fabrica

    def test_stream_ok_devuelve_sse(self):
        lineas = [b'data: {"delta":"ho"}\n', b'data: {"delta":"la"}\n', b"data: [DONE]\n"]
        response, fabrica = self._post([RespuestaUpstreamFalsa(200, lineas=lineas)])

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.streaming)
        self.assertIn("text/event-stream", response["Content-Type"])
        self.assertEqual(response["Cache-Control"], "no-cache")
        self.assertEqual(response["X-Accel-Buffering"], "no")
        self.assertEqual(b"".join(response.streaming_content), b"".join(lineas))

        peticion = fabrica.creadas[0].peticion
        self.assertEqual(peticion["method"], "POST")
        self.assertEqual(peticion["path"], "/chat")
        self.assertEqual(peticion["headers"]["Authorization"], "Bearer clave-de-prueba")
        self.assertIn(b'"messages"', peticion["body"])
        self.assertEqual(fabrica.hosts[0][0], "ia.example.test")

    def test_timeout_del_upstream_responde_504_y_no_500(self):
        response, _ = self._post([TimeoutError("timed out")])
        self.assertEqual(response.status_code, status.HTTP_504_GATEWAY_TIMEOUT)
        self.assertIn("no responde", response.data["detail"])

    def test_conexion_rechazada_responde_502_y_no_500(self):
        response, _ = self._post([ConnectionRefusedError("connection refused")])
        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertIn("No se pudo conectar", response.data["detail"])

    def test_error_4xx_del_upstream_se_traduce_a_502_con_contexto(self):
        response, fabrica = self._post(
            [RespuestaUpstreamFalsa(429, cuerpo=b"rate limited")]
        )
        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(response.data["status"], 429)
        self.assertEqual(response.data["body"], "rate limited")
        # La conexión debe cerrarse: si no, se fuga un socket por cada error.
        self.assertTrue(fabrica.creadas[0].cerrada)

    def test_reintenta_ante_503_y_entrega_la_segunda_respuesta(self):
        response, fabrica = self._post(
            [
                RespuestaUpstreamFalsa(503, cuerpo=b"cold start"),
                RespuestaUpstreamFalsa(200, lineas=[b"data: ok\n"]),
            ],
            entorno={"AI_API_UPSTREAM_RETRIES": "1"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(fabrica.creadas), 2)
        self.assertEqual(b"".join(response.streaming_content), b"data: ok\n")

    def test_503_persistente_agota_reintentos_y_responde_502(self):
        response, fabrica = self._post(
            [
                RespuestaUpstreamFalsa(503, cuerpo=b"cold start"),
                RespuestaUpstreamFalsa(503, cuerpo=b"cold start"),
            ],
            entorno={"AI_API_UPSTREAM_RETRIES": "1"},
        )
        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(response.data["status"], 503)
        self.assertEqual(len(fabrica.creadas), 2)

    def test_timeout_transitorio_se_reintenta_antes_de_fallar(self):
        response, fabrica = self._post(
            [TimeoutError("timed out"), RespuestaUpstreamFalsa(200, lineas=[b"data: ok\n"])],
            entorno={"AI_API_UPSTREAM_RETRIES": "1"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(fabrica.creadas), 2)
