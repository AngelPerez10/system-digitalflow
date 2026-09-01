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

    @patch("apps.operacion.wialon_unit_views.send_wialon_unit_sms")
    def test_post_unit_sms_ok(self, mock_sms):
        mock_sms.return_value = {
            "wialon_id": 42,
            "phone": "5215512345678",
            "message": "RELAY,1#",
            "result": "ok",
            "detail": "Comando SMS encolado en Wialon (canal GSM).",
        }
        res = self.client.post(
            "/api/wialon/unidades/42/sms/",
            {"message": "RELAY,1#"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["source"], "wialon")
        self.assertEqual(res.data["message"], "RELAY,1#")
        mock_sms.assert_called_once_with(42, "RELAY,1#")

    @patch("apps.operacion.wialon_unit_views.send_wialon_unit_sms")
    def test_post_unit_sms_requires_message(self, mock_sms):
        res = self.client.post("/api/wialon/unidades/42/sms/", {}, format="json")
        self.assertEqual(res.status_code, 400)
        mock_sms.assert_not_called()

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


class WialonUnitSmsClientTests(TestCase):
    """send_wialon_unit_sms crea el comando GSM si falta y luego exec_cmd."""

    @patch("apps.operacion.wialon_client.get_session", return_value="sid-test")
    @patch("apps.operacion.wialon_client._call")
    def test_creates_sms_command_then_executes(self, mock_call, _mock_sid):
        from apps.operacion.wialon_client import send_wialon_unit_sms

        def side_effect(svc, params, sid=None):
            if svc == "core/search_item":
                return {
                    "item": {
                        "id": 402143803,
                        "ph": "523141500655",
                        "cml": {},
                    }
                }
            if svc == "unit/update_command_definition":
                self.assertEqual(params["callMode"], "create")
                self.assertEqual(params["c"], "custom_msg")
                self.assertEqual(params["l"], "gsm")
                return [1, {"id": 1, "n": "SMS Intrax", "c": "custom_msg", "l": "gsm"}]
            if svc == "unit/exec_cmd":
                self.assertEqual(params["commandName"], "SMS Intrax")
                self.assertEqual(params["linkType"], "gsm")
                self.assertEqual(params["param"], "RELAY,1#")
                return {}
            raise AssertionError(f"svc inesperado: {svc}")

        mock_call.side_effect = side_effect
        result = send_wialon_unit_sms(402143803, "RELAY,1#")
        self.assertEqual(result["result"], "ok")
        self.assertEqual(result["command_name"], "SMS Intrax")
        svcs = [c.args[0] for c in mock_call.call_args_list]
        self.assertEqual(
            svcs,
            [
                "core/search_item",
                "unit/update_command_definition",
                "unit/exec_cmd",
            ],
        )

    @patch("apps.operacion.wialon_client.get_session", return_value="sid-test")
    @patch("apps.operacion.wialon_client._call")
    def test_reuses_existing_gsm_custom_msg(self, mock_call, _mock_sid):
        from apps.operacion.wialon_client import send_wialon_unit_sms

        def side_effect(svc, params, sid=None):
            if svc == "core/search_item":
                return {
                    "item": {
                        "id": 42,
                        "ph": "5215512345678",
                        "cml": {
                            "3": {
                                "id": 3,
                                "n": "Mensaje SMS",
                                "c": "custom_msg",
                                "l": "gsm",
                                "p": "",
                            }
                        },
                    }
                }
            if svc == "unit/exec_cmd":
                self.assertEqual(params["commandName"], "Mensaje SMS")
                return {}
            raise AssertionError(f"svc inesperado: {svc}")

        mock_call.side_effect = side_effect
        result = send_wialon_unit_sms(42, "RESET#")
        self.assertEqual(result["command_name"], "Mensaje SMS")
        svcs = [c.args[0] for c in mock_call.call_args_list]
        self.assertNotIn("unit/update_command_definition", svcs)
