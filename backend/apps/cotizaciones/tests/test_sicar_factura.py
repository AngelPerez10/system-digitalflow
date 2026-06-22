"""Tests smoke para facturación SICAR."""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.cotizaciones.sicar_cfdi_builder import build_cfdi_xml
from apps.cotizaciones.sicar_factura_service import SicarFacturaError, create_timbrada_factura
from apps.users.models import UserPermissions

User = get_user_model()


class SicarFacturaSmokeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="facturador", password="test-pass-123")
        UserPermissions.objects.create(
            user=self.user,
            permissions={"cotizaciones": {"view": True, "create": True, "edit": True, "delete": False}},
        )
        self.client.force_authenticate(user=self.user)

    def test_build_cfdi_xml_generates_totals(self):
        xml_bytes, totals = build_cfdi_xml(
            emisor={"rfc": "IMA200110CI4", "nombre": "EMISOR TEST", "regimen": "601", "codigo_postal": "28219"},
            receptor={
                "rfc": "XAXX010101000",
                "nombre": "PUBLICO EN GENERAL",
                "codigo_postal": "28219",
                "regimen": "616",
                "uso_cfdi": "G03",
            },
            conceptos=[
                {
                    "descripcion": "Servicio de prueba",
                    "cantidad": 1,
                    "precio_sin": 100,
                    "clave_prod_serv": "84111506",
                    "clave_unidad": "E48",
                }
            ],
            forma_pago="99",
            metodo_pago="PPD",
            lugar_expedicion="28219",
            serie="TST",
            folio=1,
        )
        self.assertIn(b"Comprobante", xml_bytes)
        self.assertEqual(float(totals["subtotal"]), 100.0)
        self.assertEqual(float(totals["iva"]), 16.0)
        self.assertEqual(float(totals["total"]), 116.0)

    def test_create_factura_requires_conceptos(self):
        with self.assertRaises(SicarFacturaError):
            create_timbrada_factura({"cli_id": 1, "conceptos": []})

    def test_post_factura_requires_payload(self):
        response = self.client.post("/api/cotizaciones-sicar/facturas/", {"cli_id": 0, "conceptos": []}, format="json")
        self.assertIn(response.status_code, (400, 502))

    def test_catalogos_requires_auth(self):
        anon = APIClient()
        response = anon.get("/api/cotizaciones-sicar/catalogos/")
        self.assertEqual(response.status_code, 401)
