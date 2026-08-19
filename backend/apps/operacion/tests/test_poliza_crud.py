from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.clientes.models import Cliente
from apps.cotizaciones.models import Cotizacion, CotizacionItem
from apps.operacion.models import PolizaMantenimiento

User = get_user_model()

LIST_URL = "/api/polizas-mantenimiento/"


class PolizaMantenimientoCrudTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="poliza_admin",
            password="test-pass-123",
            is_staff=True,
        )
        self.cliente = Cliente.objects.create(nombre="MCT LOGISTIC S.A. DE C.V.")
        self.otro_cliente = Cliente.objects.create(nombre="Otro cliente")
        self.cotizacion = Cotizacion.objects.create(
            cliente_id=self.cliente,
            cliente=self.cliente.nombre,
            status="AUTORIZADA",
            fecha="2026-08-13",
        )
        self.otra_cotizacion = Cotizacion.objects.create(
            cliente_id=self.otro_cliente,
            cliente=self.otro_cliente.nombre,
            status="AUTORIZADA",
            fecha="2026-07-01",
        )
        self.payload = {
            "cliente_id": self.cliente.id,
            "tipo": "cctv",
            "cotizacion_id": self.cotizacion.id,
            "fecha1": "2026-04-20",
            "fecha2": "2026-08-20",
            "fecha3": "2026-12-20",
        }

    def _auth_admin(self):
        self.client.force_authenticate(user=self.admin)

    def test_list_requiere_autenticacion(self):
        res = self.client.get(LIST_URL)
        self.assertIn(res.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_list_requiere_admin(self):
        operador = User.objects.create_user(username="operador", password="test-pass-123")
        self.client.force_authenticate(user=operador)
        res = self.client.get(LIST_URL)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_list_retrieve_patch_delete(self):
        self._auth_admin()
        create_res = self.client.post(LIST_URL, self.payload, format="json")
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED, create_res.data)
        self.assertEqual(create_res.data["folio"], "POL-10001")
        self.assertEqual(create_res.data["idx"], 10001)
        self.assertEqual(create_res.data["cliente_nombre"], self.cliente.nombre)
        self.assertEqual(create_res.data["tipo"], "cctv")
        self.assertEqual(create_res.data["tipo_label"], "Videovigilancia CCTV")
        self.assertTrue(str(create_res.data["cotizacion_folio"]).startswith("COT-"))
        poliza_id = create_res.data["id"]

        list_res = self.client.get(LIST_URL)
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertTrue(any(row["id"] == poliza_id for row in list_res.data))

        detail_res = self.client.get(f"{LIST_URL}{poliza_id}/")
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_res.data["fecha1"], "2026-04-20")

        patch_res = self.client.patch(
            f"{LIST_URL}{poliza_id}/",
            {"fecha3": "2026-12-21"},
            format="json",
        )
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK, patch_res.data)
        self.assertEqual(patch_res.data["fecha3"], "2026-12-21")
        self.assertEqual(PolizaMantenimiento.objects.get(pk=poliza_id).fecha3.isoformat(), "2026-12-21")

        delete_res = self.client.delete(f"{LIST_URL}{poliza_id}/")
        self.assertEqual(delete_res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(PolizaMantenimiento.objects.filter(pk=poliza_id).exists())

    def test_segundo_folio_es_pol_10002(self):
        self._auth_admin()
        first = self.client.post(LIST_URL, self.payload, format="json")
        self.assertEqual(first.status_code, status.HTTP_201_CREATED, first.data)
        second = self.client.post(LIST_URL, self.payload, format="json")
        self.assertEqual(second.status_code, status.HTTP_201_CREATED, second.data)
        self.assertEqual(first.data["folio"], "POL-10001")
        self.assertEqual(second.data["folio"], "POL-10002")

    def test_create_rechaza_tipo_desconocido(self):
        self._auth_admin()
        payload = {**self.payload, "tipo": "torniquetes"}
        res = self.client.post(LIST_URL, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_exige_cliente_cotizacion_y_tres_fechas(self):
        self._auth_admin()
        res = self.client.post(LIST_URL, {"tipo": "cctv"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cliente_id", res.data)
        self.assertIn("cotizacion_id", res.data)
        self.assertIn("fecha1", res.data)

    def test_create_rechaza_cotizacion_de_otro_cliente(self):
        self._auth_admin()
        payload = {**self.payload, "cotizacion_id": self.otra_cotizacion.id}
        res = self.client.post(LIST_URL, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cotizacion_id", res.data)

    def test_create_rechaza_fechas_fuera_de_orden(self):
        self._auth_admin()
        payload = {**self.payload, "fecha2": "2026-03-01"}
        res = self.client.post(LIST_URL, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_search_filtra_por_cliente(self):
        self._auth_admin()
        self.client.post(LIST_URL, self.payload, format="json")
        other_cot = Cotizacion.objects.create(
            cliente_id=self.otro_cliente,
            cliente=self.otro_cliente.nombre,
            status="AUTORIZADA",
            fecha="2026-06-01",
        )
        self.client.post(
            LIST_URL,
            {
                "cliente_id": self.otro_cliente.id,
                "tipo": "cctv",
                "cotizacion_id": other_cot.id,
                "fecha1": "2026-01-10",
                "fecha2": "2026-05-10",
                "fecha3": "2026-09-10",
            },
            format="json",
        )
        res = self.client.get(LIST_URL, {"search": "MCT"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertIn("MCT", res.data[0]["cliente_nombre"])

    def test_pdf_por_id_usa_datos_guardados(self):
        self._auth_admin()
        created = self.client.post(LIST_URL, self.payload, format="json")
        self.assertEqual(created.status_code, status.HTTP_201_CREATED, created.data)
        poliza_id = created.data["id"]
        folio = created.data["folio"]

        from unittest.mock import patch

        with patch("apps.operacion.views.any_provider_configured", return_value=False):
            res = self.client.get(f"{LIST_URL}{poliza_id}/pdf/", {"format": "html"})
        self.assertEqual(
            res.status_code,
            status.HTTP_200_OK,
            getattr(res, "data", None) or res.content[:500],
        )
        body = res.content.decode("utf-8", errors="replace")
        self.assertIn(folio, body)
        self.assertIn("MCT LOGISTIC", body)
        self.assertIn("20/04/2026", body)
        self.assertNotIn("POL-CCTV-0002", body)

    def test_pdf_usa_contacto_del_cliente(self):
        self.cliente.telefono = "555 111 2222"
        self.cliente.celular = "555 333 4444"
        self.cliente.correo = "contacto@cliente.test"
        self.cliente.portal_web = "www.cliente.test"
        self.cliente.direccion = "Calle Cliente 10, Manzanillo"
        self.cliente.save(update_fields=["telefono", "celular", "correo", "portal_web", "direccion"])
        self._auth_admin()
        created = self.client.post(LIST_URL, self.payload, format="json")
        self.assertEqual(created.status_code, status.HTTP_201_CREATED, created.data)
        poliza_id = created.data["id"]
        res = self.client.get(f"{LIST_URL}{poliza_id}/pdf/", {"format": "html"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.content.decode("utf-8")
        self.assertIn("555 111 2222", body)
        self.assertIn("555 333 4444", body)
        self.assertIn("contacto@cliente.test", body)
        self.assertIn("www.cliente.test", body)
        self.assertIn("Calle Cliente 10", body)
        self.assertNotIn("transporte@mctlogistic.com", body)
        self.assertNotIn("Elías Zamora", body)

    def test_pdf_incluye_lineas_de_la_cotizacion_ligada(self):
        CotizacionItem.objects.create(
            cotizacion=self.cotizacion,
            producto_nombre="Cámara IP de prueba",
            producto_descripcion="Lente 2.8 mm",
            unidad="PZA",
            cantidad=2,
            precio_lista=1500,
            descuento_pct=0,
            orden=0,
        )
        self.cotizacion.subtotal = 3000
        self.cotizacion.iva = 480
        self.cotizacion.total = 3480
        self.cotizacion.save(update_fields=["subtotal", "iva", "total"])
        self._auth_admin()
        created = self.client.post(LIST_URL, self.payload, format="json")
        self.assertEqual(created.status_code, status.HTTP_201_CREATED, created.data)
        poliza_id = created.data["id"]
        res = self.client.get(f"{LIST_URL}{poliza_id}/pdf/", {"format": "html"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.content.decode("utf-8")
        self.assertIn("Cámara IP de prueba", body)
        self.assertIn("Lente 2.8 mm", body)
        self.assertIn("$3,000.00", body)
        self.assertIn("$3,480.00", body)
        self.assertNotIn("SILIMEX", body)
        self.assertIn("Foto", body)

    def test_pdf_por_id_requiere_admin(self):
        self._auth_admin()
        created = self.client.post(LIST_URL, self.payload, format="json")
        poliza_id = created.data["id"]
        operador = User.objects.create_user(username="visor", password="test-pass-123")
        self.client.force_authenticate(user=operador)
        res = self.client.get(f"{LIST_URL}{poliza_id}/pdf/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_picker_cotizaciones_incluye_fk_y_misma_razon_social(self):
        self._auth_admin()
        por_nombre = Cotizacion.objects.create(
            cliente_id=None,
            cliente=self.cliente.nombre,
            status="PENDIENTE",
            fecha="2026-06-02",
        )
        res = self.client.get(f"{LIST_URL}cotizaciones/", {"cliente_id": self.cliente.id})
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        ids = {row["id"] for row in res.data}
        self.assertIn(self.cotizacion.id, ids)
        self.assertIn(por_nombre.id, ids)
        self.assertNotIn(self.otra_cotizacion.id, ids)
        folios = {row["folio"] for row in res.data}
        self.assertTrue(any(str(f).startswith("COT-") for f in folios))

    def test_picker_cotizaciones_requiere_admin(self):
        operador = User.objects.create_user(username="picker_op", password="test-pass-123")
        self.client.force_authenticate(user=operador)
        res = self.client.get(f"{LIST_URL}cotizaciones/", {"cliente_id": self.cliente.id})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_acepta_cotizacion_por_razon_social_sin_fk(self):
        self._auth_admin()
        por_nombre = Cotizacion.objects.create(
            cliente_id=None,
            cliente=self.cliente.nombre,
            status="AUTORIZADA",
            fecha="2026-05-30",
        )
        payload = {**self.payload, "cotizacion_id": por_nombre.id}
        res = self.client.post(LIST_URL, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data["cotizacion_id"], por_nombre.id)
