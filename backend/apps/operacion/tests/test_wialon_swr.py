"""Stale-while-revalidate del listado de cuentas Wialon (sin red: todo simulado)."""

import time
from unittest import mock

from django.test import SimpleTestCase

from apps.operacion import wialon_client as wc


class FetchUsersAndIndexSwrTests(SimpleTestCase):
    def setUp(self):
        wc.invalidate_wialon_cache()
        wc._swr_running = False

    def tearDown(self):
        wc.invalidate_wialon_cache()
        wc._swr_running = False

    def _sembrar(self, *, vencido: bool):
        exp = time.monotonic() + (-5 if vencido else 60)
        wc._users_list_cache = ([{"wialon_id": 1, "name": "A"}], exp)
        wc._units_search_index_cache = ([{"unit_id": 9}], exp)

    def test_cache_vigente_no_refresca(self):
        self._sembrar(vencido=False)
        with mock.patch.object(wc, "_refresh_in_background") as bg, mock.patch.object(wc, "fetch_users") as fu:
            users, index, stale = wc.fetch_users_and_index()
        self.assertEqual(users, [{"wialon_id": 1, "name": "A"}])
        self.assertEqual(index, [{"unit_id": 9}])
        self.assertFalse(stale)
        bg.assert_not_called()
        fu.assert_not_called()

    def test_cache_vencida_responde_al_instante_y_refresca_en_segundo_plano(self):
        self._sembrar(vencido=True)
        with mock.patch.object(wc, "_refresh_in_background") as bg, mock.patch.object(wc, "fetch_users") as fu:
            users, index, stale = wc.fetch_users_and_index()
        self.assertEqual(len(users), 1)
        self.assertEqual(len(index), 1)
        self.assertTrue(stale)
        bg.assert_called_once()
        fu.assert_not_called()

    def test_sin_cache_consulta_en_el_momento(self):
        with (
            mock.patch.object(wc, "fetch_users", return_value=[{"wialon_id": 2}]) as fu,
            mock.patch.object(wc, "fetch_units_search_index", return_value=[]) as fi,
        ):
            users, index, stale = wc.fetch_users_and_index()
        self.assertEqual(users, [{"wialon_id": 2}])
        self.assertEqual(index, [])
        self.assertFalse(stale)
        fu.assert_called_once_with(use_cache=True)
        fi.assert_called_once_with(use_cache=True)

    def test_refresh_forzado_ignora_cache(self):
        self._sembrar(vencido=False)
        with (
            mock.patch.object(wc, "fetch_users", return_value=[]) as fu,
            mock.patch.object(wc, "fetch_units_search_index", return_value=[]),
        ):
            _, _, stale = wc.fetch_users_and_index(use_cache=False)
        self.assertFalse(stale)
        fu.assert_called_once_with(use_cache=False)

    def test_un_solo_refresco_a_la_vez(self):
        with mock.patch.object(wc, "_refresh_users_and_index", side_effect=lambda: time.sleep(0.2)):
            self.assertTrue(wc._refresh_in_background())
            self.assertFalse(wc._refresh_in_background())
            for _ in range(50):
                if not wc._swr_running:
                    break
                time.sleep(0.02)
        self.assertFalse(wc._swr_running)
