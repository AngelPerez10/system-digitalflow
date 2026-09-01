"""Frontera de seguridad de `ALLOWED_HOSTS`.

Solo `DEBUG=True` abre el comodín. Un host no permitido hace que Django
responda 400 con su página de depuración (traceback + configuración del
servidor); en producción esa lista debe seguir siendo explícita.
"""

from django.test import SimpleTestCase

from config.settings import resolve_allowed_hosts


class ResolveAllowedHostsTests(SimpleTestCase):
    def test_desarrollo_acepta_cualquier_host(self):
        # La IP LAN cambia al saltar de red y ALLOWED_HOSTS se evalúa al arrancar.
        self.assertEqual(resolve_allowed_hosts(True, ''), ['*'])

    def test_desarrollo_ignora_la_lista_del_entorno(self):
        # `.env` con "localhost,127.0.0.1" dejaba fuera al teléfono en la LAN.
        self.assertEqual(resolve_allowed_hosts(True, 'localhost,127.0.0.1'), ['*'])

    def test_produccion_usa_la_lista_explicita(self):
        self.assertEqual(
            resolve_allowed_hosts(False, 'midominio.com, api.midominio.com'),
            ['midominio.com', 'api.midominio.com'],
        )

    def test_produccion_nunca_abre_el_comodin(self):
        for env_value in ('', '   ', 'midominio.com'):
            with self.subTest(env_value=env_value):
                self.assertNotIn('*', resolve_allowed_hosts(False, env_value))

    def test_produccion_sin_entorno_cae_en_hosts_locales(self):
        self.assertEqual(resolve_allowed_hosts(False, ''), ['localhost', '127.0.0.1'])

    def test_ignora_entradas_vacias_del_entorno(self):
        self.assertEqual(
            resolve_allowed_hosts(False, 'midominio.com,,  ,otro.com'),
            ['midominio.com', 'otro.com'],
        )
