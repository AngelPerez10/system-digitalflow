"""Smoke tests para proxy M2M Dataglobal (SIMs)."""
from __future__ import annotations

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.operacion.m2m_client import M2mError, map_sim_detail
from apps.users.models import UserPermissions

User = get_user_model()


class M2mSimApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="m2m_op", password="x")
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

    def test_map_sim_detail_normalizes_imei_digits(self):
        mapped = map_sim_detail(
            {
                "icc": "8934075200093532065",
                "msisdn": "345901037113837",
                "imei": "86-440302-456315-6",
                "planName": "Demo",
                "planCode": "P1",
                "operator": "Op",
                "simCycleState": "ACTIVATED",
                "gprsStatus": 1,
                "consumptionMonthlyData": "1535426",
                "consumptionDailyData": 46080,
                "lastConnStart": "2021-01-14T14:07:03.000Z",
                "apn": "m2m.demo",
                "ip": "10.0.0.1",
            }
        )
        self.assertEqual(mapped["imei"], "864403024563156")
        self.assertEqual(mapped["consumptionMonthlyData"], 1535426)
        self.assertEqual(mapped["simCycleState"], "ACTIVATED")
        self.assertEqual(mapped["apn"], "m2m.demo")

    def test_map_sim_detail_emnify_without_apn(self):
        mapped = map_sim_detail(
            {
                "icc": "89883030000140420982",
                "msisdn": "423663926931917",
                "imei": "860121060291013",
                "planName": "M2M Global 10 MB",
                "planCode": "EMF_MX_10MB_2025",
                "simCycleState": "ACTIVE",
                "simType": "Emnify",
                "gprsStatus": "1",
                "ip": "100.65.249.188",
            }
        )
        self.assertEqual(mapped["simCycleState"], "ACTIVATED")
        self.assertEqual(mapped["apn"], "")
        self.assertEqual(mapped["simType"], "Emnify")
        self.assertEqual(mapped["operator"], "Emnify")
        self.assertEqual(mapped["gprsStatus"], 1)

    @patch("apps.operacion.m2m_views.m2m_configured", return_value=False)
    def test_detalle_without_key_returns_503(self, _mock_cfg):
        res = self.client.get("/api/m2m/sims/detalle/", {"imei": "864403024563156"})
        self.assertEqual(res.status_code, 503)
        self.assertIn("M2M_API_KEY", res.data["detail"])

    @patch("apps.operacion.m2m_views.fetch_sim_details")
    @patch("apps.operacion.m2m_views.m2m_configured", return_value=True)
    def test_detalle_ok(self, _cfg, mock_fetch):
        mock_fetch.return_value = {
            "icc": "8934",
            "msisdn": "52",
            "imei": "864403024563156",
            "planName": "Plan",
            "planCode": "P",
            "operator": "Op",
            "simCycleState": "ACTIVATED",
            "gprsStatus": 1,
            "consumptionMonthlyData": 1,
            "consumptionDailyData": 1,
            "lastConnStart": "",
            "lastConnStop": "",
            "apn": "apn",
            "ip": "1.1.1.1",
            "commModuleManufacturer": "",
            "commModuleModel": "",
            "customField1": "",
            "customField2": "",
        }
        res = self.client.get("/api/m2m/sims/detalle/", {"imei": "864403024563156"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["source"], "m2m")
        self.assertEqual(res.data["sim"]["imei"], "864403024563156")
        mock_fetch.assert_called_once()

    @patch("apps.operacion.m2m_views.test_gsm")
    def test_test_gsm_requires_edit(self, mock_gsm):
        limited = User.objects.create_user(username="m2m_view", password="x")
        UserPermissions.objects.create(
            user=limited,
            permissions={"cuentas_antarix": {"view": True, "edit": False}},
        )
        self.client.force_authenticate(user=limited)
        res = self.client.post(
            "/api/m2m/sims/test-gsm/",
            {"imei": "864403024563156"},
            format="json",
        )
        self.assertEqual(res.status_code, 403)
        mock_gsm.assert_not_called()

    @patch("apps.operacion.m2m_views.send_sms")
    def test_sms_ok(self, mock_sms):
        mock_sms.return_value = {"message": "SMS sended successfully"}
        res = self.client.post(
            "/api/m2m/sims/sms/",
            {"imei": "864403024563156", "message": "ping"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        mock_sms.assert_called_once()

    @patch("apps.operacion.m2m_views.reset_sim")
    def test_reset_maps_m2m_error(self, mock_reset):
        mock_reset.side_effect = M2mError("Simcard not found", status_code=404)
        res = self.client.post(
            "/api/m2m/sims/reset/",
            {"imei": "864403024563156"},
            format="json",
        )
        self.assertEqual(res.status_code, 404)
        self.assertIn("no tiene una SIM", res.data["detail"])
        self.assertEqual(res.data.get("code"), "not_found")

    @patch("apps.operacion.m2m_views.fetch_sim_details")
    @patch("apps.operacion.m2m_views.m2m_configured", return_value=True)
    def test_detalle_not_found_spanish(self, _cfg, mock_fetch):
        mock_fetch.side_effect = M2mError("Simcard not found", status_code=404)
        res = self.client.get("/api/m2m/sims/detalle/", {"imei": "864403024563156"})
        self.assertEqual(res.status_code, 404)
        self.assertIn("no tiene una SIM", res.data["detail"])
        self.assertEqual(res.data.get("code"), "not_found")
