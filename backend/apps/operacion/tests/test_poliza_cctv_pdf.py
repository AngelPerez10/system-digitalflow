from datetime import date

from django.contrib.auth import get_user_model
from django.http import QueryDict
from django.test import SimpleTestCase, TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from apps.cotizaciones.models import Cotizacion, CotizacionItem
from apps.operacion.pdf_templates.poliza_cctv import (
    generate_poliza_cctv_pdf_html,
    generate_poliza_cctv_xml,
    overlay_from_cotizacion,
)
from apps.operacion.poliza_views import overlay_from_query
from apps.productos.models import Servicio

User = get_user_model()

PDF_URL = "/api/polizas-mantenimiento/pdf/"


class PolizaCctvPlantillaTests(SimpleTestCase):
    def test_plantilla_incluye_secciones_del_pdf_de_referencia(self):
        html = generate_poliza_cctv_pdf_html()
        self.assertIn("POL-CCTV-0002", html)
        self.assertIn("MCT LOGISTIC", html)
        self.assertIn("videovigilancia CCTV", html)
        self.assertIn("Equipos instalados y amparados", html)
        self.assertIn("interior y exterior", html)
        self.assertIn("equipos de videovigilancia", html)
        self.assertNotIn("torniquetes", html.lower())
        self.assertIn("$23,297.21", html)
        self.assertIn("Aceptación y firmas", html)
        self.assertNotIn("Elías Zamora", html)
        self.assertNotIn("transporte@mctlogistic.com", html)

    def test_overlay_cubre_folio_cliente_y_visitas(self):
        params = QueryDict(mutable=True)
        params.update(
            {
                "folio": "POL-10001",
                "cliente": "MCT LOGISTIC S.A. DE C.V.",
                "cotizacion": "COT-10261",
                "v1": "2026-04-20",
                "v2": "2026-08-20",
                "v3": "2026-12-20",
            }
        )
        html = generate_poliza_cctv_pdf_html(overlay_from_query(params))
        self.assertIn("POL-10001", html)
        self.assertIn("MCT LOGISTIC", html)
        self.assertIn("Cotización No. 10261", html)
        self.assertIn("20/04/2026", html)
        self.assertIn("20/08/2026", html)
        self.assertIn("20/12/2026", html)
        self.assertNotIn("POL-CCTV-0002", html)
        cal_idx = html.find("1er Mantenimiento")
        self.assertGreater(cal_idx, 0)
        self.assertIn("20/04/2026", html[cal_idx:])

    def test_xml_incluye_folio_y_cliente(self):
        xml = generate_poliza_cctv_xml(
            {"folio": "POL-10001", "cliente_nombre": "MCT LOGISTIC S.A. DE C.V."}
        )
        self.assertIn('<?xml version="1.0" encoding="UTF-8"?>', xml)
        self.assertIn("<PolizaMantenimiento", xml)
        self.assertIn("POL-10001", xml)
        self.assertIn("MCT LOGISTIC", xml)
        self.assertNotIn("<script", xml.lower())


User = get_user_model()

PDF_URL = "/api/polizas-mantenimiento/pdf/"


class PolizaCctvPdfTests(APITestCase):
    def test_plantilla_incluye_secciones_del_pdf_de_referencia(self):
        html = generate_poliza_cctv_pdf_html()
        self.assertIn("POL-CCTV-0002", html)
        self.assertIn("MCT LOGISTIC", html)
        self.assertIn("videovigilancia CCTV", html)
        self.assertIn("Equipos instalados y amparados", html)
        self.assertIn("interior y exterior", html)
        self.assertIn("equipos de videovigilancia", html)
        self.assertNotIn("torniquetes", html.lower())
        self.assertIn("$23,297.21", html)
        self.assertIn("Aceptación y firmas", html)
        self.assertNotIn("Elías Zamora", html)

    def test_pdf_requiere_autenticacion(self):
        res = self.client.get(PDF_URL, {"tipo": "cctv"})
        self.assertIn(res.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_pdf_requiere_admin(self):
        user = User.objects.create_user(username="operador", password="test-pass-123")
        self.client.force_authenticate(user=user)
        res = self.client.get(PDF_URL, {"tipo": "cctv"})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_genera_plantilla_cctv(self):
        admin = User.objects.create_user(
            username="admin", password="test-pass-123", is_staff=True
        )
        self.client.force_authenticate(user=admin)
        res = self.client.get(PDF_URL, {"tipo": "cctv"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        disposition = res.get("Content-Disposition") or ""
        self.assertIn("Poliza_POL-CCTV-0002", disposition)
        content_type = (res.get("Content-Type") or "").lower()
        self.assertTrue("pdf" in content_type or "html" in content_type)

    def test_tipo_desconocido_devuelve_400(self):
        admin = User.objects.create_user(
            username="admin", password="test-pass-123", is_staff=True
        )
        self.client.force_authenticate(user=admin)
        res = self.client.get(PDF_URL, {"tipo": "torniquetes"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_xml_requiere_admin_y_devuelve_xml(self):
        xml_url = "/api/polizas-mantenimiento/xml/"
        res = self.client.get(xml_url, {"tipo": "cctv"})
        self.assertIn(res.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

        user = User.objects.create_user(username="operador", password="test-pass-123")
        self.client.force_authenticate(user=user)
        res = self.client.get(xml_url, {"tipo": "cctv"})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        admin = User.objects.create_user(
            username="admin_xml", password="test-pass-123", is_staff=True
        )
        self.client.force_authenticate(user=admin)
        res = self.client.get(xml_url, {"tipo": "cctv"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        content_type = (res.get("Content-Type") or "").lower()
        self.assertIn("xml", content_type)
        body = res.content.decode("utf-8")
        self.assertIn("<PolizaMantenimiento", body)
        self.assertIn("POL-CCTV-0002", body)


class PolizaCotizacionOverlayTests(TestCase):
    def setUp(self):
        self.cotizacion = Cotizacion.objects.create(
            cliente="Cliente CCTV",
            status="AUTORIZADA",
            fecha=date(2026, 8, 13),
            subtotal=1148.40,
            iva=0,
            iva_pct=0,
            total=1148.40,
        )

    def test_totales_parten_iva_aunque_la_cotizacion_guarde_iva_cero(self):
        data = overlay_from_cotizacion(self.cotizacion)
        self.assertAlmostEqual(data["subtotal"], 990.0)
        self.assertAlmostEqual(data["iva"], 158.4)
        self.assertAlmostEqual(data["total"], 1148.4)
        html = generate_poliza_cctv_pdf_html(data)
        self.assertIn("$990.00", html)
        self.assertIn("$158.40", html)
        self.assertIn("$1,148.40", html)
        self.assertIn("IVA (16%)", html)

    def test_tipo_servicio_lista_todos_los_servicios_ligados(self):
        s1 = Servicio.objects.create(nombre="Mantenimiento preventivo CCTV")
        s2 = Servicio.objects.create(nombre="Monitoreo remoto")
        self.cotizacion.tipo_trabajo.set([s1, s2])
        data = overlay_from_cotizacion(self.cotizacion)
        self.assertEqual(
            data["servicio"]["tipo"],
            "Mantenimiento preventivo CCTV y Monitoreo remoto",
        )
        html = generate_poliza_cctv_pdf_html(data)
        self.assertIn("Mantenimiento preventivo CCTV y Monitoreo remoto", html)
        self.assertNotIn(
            "<td>Tipo de servicio</td><td>Mantenimiento Preventivo para 6 DVR y 63 cámaras</td>",
            html,
        )

    def test_equipos_atendidos_cuenta_camaras_y_dvr(self):
        CotizacionItem.objects.create(
            cotizacion=self.cotizacion,
            producto_nombre="Cámara IP 4MP",
            producto_externo_id="SYS-CAM-1",
            cantidad=2,
            precio_lista=500,
            orden=0,
        )
        CotizacionItem.objects.create(
            cotizacion=self.cotizacion,
            producto_nombre="DVR 8 canales",
            producto_externo_id="SYS-DVR-1",
            cantidad=1,
            precio_lista=148.40,
            orden=1,
        )
        data = overlay_from_cotizacion(self.cotizacion)
        self.assertEqual(data["servicio"]["equipos"], "1 DVR y 2 cámaras")
        html = generate_poliza_cctv_pdf_html(data)
        self.assertIn("<td>Equipos atendidos</td><td>1 DVR y 2 cámaras</td>", html)
        self.assertNotIn("<td>Equipos atendidos</td><td>6 DVR y 63 cámaras</td>", html)
