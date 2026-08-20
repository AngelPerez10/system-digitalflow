"""Smoke tests para desactivar unidades y purga de bloqueados Wialon."""
from __future__ import annotations

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.operacion.wialon_client import purge_blocked_accounts
from apps.users.models import UserPermissions


User = get_user_model()


class WialonUnitActiveAndPurgeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="wialon_op", password="x")
        UserPermissions.objects.create(
            user=self.user,
            permissions={
                "cuentas_antarix": {
                    "view": True,
                    "create": True,
                    "edit": True,
                    "delete": False,
                }
            },
        )
        self.client.force_authenticate(user=self.user)

    @patch("apps.operacion.wialon_unit_views.set_wialon_unit_active")
    def test_patch_unit_active_deactivates(self, mock_set_active):
        mock_set_active.return_value = {
            "wialon_id": 42,
            "name": "Unidad demo",
            "status": "Inactivo",
            "is_active": False,
        }
        res = self.client.patch(
            "/api/wialon/unidades/42/activo/",
            {"active": False},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["unit"]["status"], "Inactivo")
        mock_set_active.assert_called_once()
        args, kwargs = mock_set_active.call_args
        self.assertEqual(args[0], 42)
        self.assertFalse(args[1])

    @patch("apps.operacion.wialon_unit_views.set_wialon_unit_active")
    def test_patch_unit_active_requires_active_field(self, mock_set_active):
        res = self.client.patch("/api/wialon/unidades/42/activo/", {}, format="json")
        self.assertEqual(res.status_code, 400)
        mock_set_active.assert_not_called()

    @patch("apps.operacion.wialon_views.purge_blocked_accounts")
    def test_purge_blocked_endpoint(self, mock_purge):
        mock_purge.return_value = {
            "days": 35,
            "dry_run": True,
            "purged_count": 1,
            "skipped_count": 0,
            "error_count": 0,
            "purged": [{"wialon_id": 9}],
            "skipped": [],
            "errors": [],
        }
        res = self.client.patch(
            "/api/wialon/usuarios/limpiar-bloqueados/",
            {"days": 35, "dry_run": True},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["purged_count"], 1)
        mock_purge.assert_called_once_with(days=35, dry_run=True)

    @patch("apps.operacion.wialon_client.delete_wialon_user")
    @patch("apps.operacion.wialon_client.set_wialon_unit_active")
    @patch("apps.operacion.wialon_client.fetch_user_units")
    @patch("apps.operacion.wialon_client.fetch_users")
    @patch("apps.operacion.wialon_client.invalidate_wialon_cache")
    def test_purge_blocked_accounts_logic(
        self,
        mock_invalidate,
        mock_fetch_users,
        mock_fetch_units,
        mock_set_active,
        mock_delete_user,
    ):
        import time

        old_ts = int(time.time()) - 40 * 86400
        recent_ts = int(time.time()) - 5 * 86400
        mock_fetch_users.return_value = [
            {
                "wialon_id": 1,
                "user_id": "viejo",
                "name": "Viejo",
                "status": "Bloqueado",
                "blocked_at": old_ts,
            },
            {
                "wialon_id": 2,
                "user_id": "reciente",
                "name": "Reciente",
                "status": "Bloqueado",
                "blocked_at": recent_ts,
            },
            {
                "wialon_id": 3,
                "user_id": "activo",
                "name": "Activo",
                "status": "Activo",
                "blocked_at": None,
            },
        ]
        mock_fetch_units.return_value = {
            "units": [{"wialon_id": 100, "is_active": True}],
        }
        mock_set_active.return_value = {"wialon_id": 100, "is_active": False}

        result = purge_blocked_accounts(days=35, dry_run=False)
        self.assertEqual(result["purged_count"], 1)
        self.assertEqual(result["purged"][0]["wialon_id"], 1)
        mock_set_active.assert_called_once_with(100, False)
        mock_delete_user.assert_called_once_with(1)
        mock_invalidate.assert_called_once()

    @patch("apps.operacion.wialon_client.fetch_users")
    def test_purge_dry_run_does_not_mutate(self, mock_fetch_users):
        import time

        old_ts = int(time.time()) - 40 * 86400
        mock_fetch_users.return_value = [
            {
                "wialon_id": 1,
                "user_id": "viejo",
                "name": "Viejo",
                "status": "Bloqueado",
                "blocked_at": old_ts,
            },
        ]
        with patch("apps.operacion.wialon_client.fetch_user_units") as mock_units:
            mock_units.return_value = {"units": [{"wialon_id": 100}]}
            with patch("apps.operacion.wialon_client.set_wialon_unit_active") as mock_set:
                with patch("apps.operacion.wialon_client.delete_wialon_user") as mock_del:
                    result = purge_blocked_accounts(days=35, dry_run=True)
                    self.assertEqual(result["purged_count"], 1)
                    mock_set.assert_not_called()
                    mock_del.assert_not_called()

    def test_unit_active_forbidden_without_edit(self):
        limited = User.objects.create_user(username="wialon_view", password="x")
        UserPermissions.objects.create(
            user=limited,
            permissions={"cuentas_antarix": {"view": True, "edit": False}},
        )
        self.client.force_authenticate(user=limited)
        res = self.client.patch(
            "/api/wialon/unidades/42/activo/",
            {"active": False},
            format="json",
        )
        self.assertEqual(res.status_code, 403)

    def test_unit_active_forbidden_with_create_only(self):
        limited = User.objects.create_user(username="wialon_create", password="x")
        UserPermissions.objects.create(
            user=limited,
            permissions={
                "cuentas_antarix": {
                    "view": True,
                    "create": True,
                    "edit": False,
                    "delete": False,
                }
            },
        )
        self.client.force_authenticate(user=limited)
        with patch("apps.operacion.wialon_unit_views.set_wialon_unit_active") as mock_set:
            res = self.client.patch(
                "/api/wialon/unidades/42/activo/",
                {"active": False},
                format="json",
            )
            self.assertEqual(res.status_code, 403)
            mock_set.assert_not_called()

    def test_purge_forbidden_with_create_only(self):
        limited = User.objects.create_user(username="wialon_create2", password="x")
        UserPermissions.objects.create(
            user=limited,
            permissions={
                "cuentas_antarix": {
                    "view": True,
                    "create": True,
                    "edit": False,
                }
            },
        )
        self.client.force_authenticate(user=limited)
        with patch("apps.operacion.wialon_views.purge_blocked_accounts") as mock_purge:
            res = self.client.patch(
                "/api/wialon/usuarios/limpiar-bloqueados/",
                {"days": 35, "dry_run": True},
                format="json",
            )
            self.assertEqual(res.status_code, 403)
            mock_purge.assert_not_called()
