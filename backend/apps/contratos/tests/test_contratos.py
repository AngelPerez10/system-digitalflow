import base64
import io
import re
from datetime import timedelta
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from PIL import Image, ImageDraw
from rest_framework.test import APIClient

from apps.contratos import services
from apps.contratos.models import Contrato, ContratoEnlaceFirma
from apps.contratos.pdf_templates.contrato_internet import dinero_con_letra
from apps.users.models import UserPermissions

LIST_URL = "/api/v1/contratos/"
PUB = "/api/v1/contratos-firma/"
ORIGIN = "http://localhost:5173"


def firma_png(color=(20, 20, 20, 255), size=(400, 160)) -> str:
    img = Image.new("RGBA", size, (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    draw.line([(20, 120), (120, 30), (220, 130), (380, 40)], fill=color, width=6)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


PAYLOAD = {
    "cliente_tipo_persona": "moral",
    "cliente_razon_social": "SEGADI LOGISTIC & TRANSPORT S. DE R.L. DE C.V.",
    "cliente_rfc": "ELT051208PW4",
    "cliente_regimen_fiscal": "624. Coordinados",
    "cliente_domicilio_fiscal": "Carretera Tlajomulco Buenavista 515, Jalisco",
    "cliente_representante": "LAURA ELENA GONZÁLEZ RODRÍGUEZ",
    "cliente_clave_elector": "GNRDLR96021414M200",
    "cliente_curp": "GORL960214MJCNDR00",
    "cliente_correo": "laura@segadi.test",
    "domicilio_instalacion": "Parcela 222 El Colomo, CP 28800",
    "plan_mbps": 100,
    "precio_mensual": "8000.00",
    "vigencia_meses": 36,
    "fecha_firma": "2026-10-06",
    "ciudad_firma": "Manzanillo, Colima",
    "prestador_datos": {"correo": "contratos@interpro.test"},
}


@override_settings(FRONTEND_PUBLIC_URL="https://app.test")
class ContratosBase(TestCase):
    def setUp(self):
        cache.clear()
        self.admin = get_user_model().objects.create_user(username="ctr-admin", password="x", is_staff=True)
        self.api = APIClient()
        self.api.force_authenticate(self.admin)
        patcher = mock.patch("apps.contratos.services.enviar_correo")
        self.correo = patcher.start()
        self.addCleanup(patcher.stop)
        pdf = mock.patch("apps.contratos.services.render_html_to_pdf", return_value=b"%PDF-1.7 test")
        self.render = pdf.start()
        self.addCleanup(pdf.stop)

    def crear(self, **extra):
        res = self.api.post(LIST_URL, {**PAYLOAD, **extra}, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        return res.data

    def enlace(self, contrato_id):
        res = self.api.post(f"{LIST_URL}{contrato_id}/enlace-firma/", {}, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        token = res.data["url"].split("#t=", 1)[1]
        return token, res.data

    def pub(self, token, sesion=None):
        c = APIClient()
        headers = {"HTTP_X_FIRMA_TOKEN": token}
        if sesion:
            headers["HTTP_X_FIRMA_SESION"] = sesion
        c.credentials(**headers)
        return c

    def codigo_enviado(self):
        cuerpo = self.correo.call_args.kwargs["cuerpo"]
        return re.search(r"\b(\d{6})\b", cuerpo).group(1)

    def verificar(self, token):
        c = self.pub(token)
        self.assertEqual(c.post(f"{PUB}otp/enviar/").status_code, 200)
        res = c.post(f"{PUB}otp/verificar/", {"codigo": self.codigo_enviado()}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        return res.data["sesion"]


class PermisosTests(ContratosBase):
    def test_sin_permiso_no_ve_contratos(self):
        user = get_user_model().objects.create_user(username="sin-perm", password="x")
        c = APIClient()
        c.force_authenticate(user)
        self.assertEqual(c.get(LIST_URL).status_code, 403)

    def test_con_solo_create_no_puede_mandar_a_firma(self):
        ctr = self.crear()
        user = get_user_model().objects.create_user(username="solo-create", password="x")
        UserPermissions.objects.create(user=user, permissions={"contratos": {"view": True, "create": True}})
        c = APIClient()
        c.force_authenticate(user)
        self.assertEqual(c.get(LIST_URL).status_code, 200)
        self.assertEqual(c.post(f"{LIST_URL}{ctr['id']}/enlace-firma/").status_code, 403)
        self.assertEqual(
            c.post(f"{LIST_URL}{ctr['id']}/firmar-prestador/", {"firma": firma_png()}, format="json").status_code,
            403,
        )

    def test_crud_y_folio(self):
        ctr = self.crear()
        self.assertTrue(ctr["folio"].startswith("CTR-"))
        self.assertEqual(ctr["estado"], "borrador")
        res = self.api.patch(f"{LIST_URL}{ctr['id']}/", {"plan_mbps": 200}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["plan_mbps"], 200)

    def test_rfc_invalido(self):
        res = self.api.post(LIST_URL, {**PAYLOAD, "cliente_rfc": "XX"}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_prestador_no_acepta_claves_extra(self):
        res = self.api.post(LIST_URL, {**PAYLOAD, "prestador_datos": {"hack": "x"}}, format="json")
        self.assertEqual(res.status_code, 400)


class EnlaceTests(ContratosBase):
    def test_solo_se_guarda_el_hash_del_token(self):
        ctr = self.crear()
        token, data = self.enlace(ctr["id"])
        self.assertTrue(data["url"].startswith("https://app.test/firmar/contrato#t="))
        enlace = ContratoEnlaceFirma.objects.get(contrato_id=ctr["id"])
        self.assertNotEqual(enlace.token_hash, token)
        self.assertNotIn(token, str(ContratoEnlaceFirma.objects.values().first()))

    def test_estado_no_expone_datos_del_contrato(self):
        ctr = self.crear()
        token, _ = self.enlace(ctr["id"])
        res = self.pub(token).get(f"{PUB}estado/")
        self.assertEqual(res.status_code, 200)
        cuerpo = str(res.data)
        self.assertNotIn("SEGADI", cuerpo)
        self.assertNotIn("8000", cuerpo)
        self.assertNotIn("laura@segadi.test", cuerpo)
        self.assertEqual(res.data["correo"], "la***@segadi.test")
        self.assertEqual(res["Cache-Control"], "no-store, max-age=0")

    def test_token_invalido_es_404_generico(self):
        self.crear()
        res = self.pub("A" * 43).get(f"{PUB}estado/")
        self.assertEqual(res.status_code, 404)
        res = APIClient().get(f"{PUB}estado/")
        self.assertEqual(res.status_code, 404)

    def test_regenerar_revoca_el_anterior(self):
        ctr = self.crear()
        viejo, _ = self.enlace(ctr["id"])
        nuevo, _ = self.enlace(ctr["id"])
        self.assertEqual(self.pub(viejo).get(f"{PUB}estado/").status_code, 410)
        self.assertEqual(self.pub(nuevo).get(f"{PUB}estado/").status_code, 200)

    def test_enlace_expirado(self):
        ctr = self.crear()
        token, _ = self.enlace(ctr["id"])
        ContratoEnlaceFirma.objects.update(expira_at=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self.pub(token).get(f"{PUB}estado/").status_code, 410)

    def test_editar_despues_de_enviar_revoca_el_link(self):
        ctr = self.crear()
        token, _ = self.enlace(ctr["id"])
        res = self.api.patch(f"{LIST_URL}{ctr['id']}/", {"precio_mensual": "9000.00"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["estado"], "borrador")
        self.assertEqual(self.pub(token).get(f"{PUB}estado/").status_code, 410)

    def test_faltan_datos_para_firma(self):
        ctr = self.crear(cliente_correo="")
        res = self.api.post(f"{LIST_URL}{ctr['id']}/enlace-firma/")
        self.assertEqual(res.status_code, 400)
        self.assertIn("correo del cliente", res.data["detail"])

    @override_settings(FRONTEND_PUBLIC_URL="")
    def test_origin_no_permitido_no_construye_link(self):
        ctr = self.crear()
        res = self.api.post(f"{LIST_URL}{ctr['id']}/enlace-firma/", HTTP_ORIGIN="https://evil.test")
        self.assertEqual(res.status_code, 500)


class OtpTests(ContratosBase):
    def test_documento_requiere_sesion(self):
        ctr = self.crear()
        token, _ = self.enlace(ctr["id"])
        self.assertEqual(self.pub(token).get(f"{PUB}documento/").status_code, 401)
        self.assertEqual(self.pub(token, "B" * 43).get(f"{PUB}documento/").status_code, 401)

    def test_flujo_otp_ok(self):
        ctr = self.crear()
        token, _ = self.enlace(ctr["id"])
        sesion = self.verificar(token)
        res = self.pub(token, sesion).get(f"{PUB}documento/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res["X-Documento-Sha256"], Contrato.objects.get(pk=ctr["id"]).documento_sha256)

    def test_otp_es_de_un_solo_uso(self):
        ctr = self.crear()
        token, _ = self.enlace(ctr["id"])
        c = self.pub(token)
        c.post(f"{PUB}otp/enviar/")
        codigo = self.codigo_enviado()
        self.assertEqual(c.post(f"{PUB}otp/verificar/", {"codigo": codigo}, format="json").status_code, 200)
        self.assertEqual(c.post(f"{PUB}otp/verificar/", {"codigo": codigo}, format="json").status_code, 400)

    def test_sesion_de_otro_link_no_sirve(self):
        a = self.crear()
        b = self.crear()
        token_a, _ = self.enlace(a["id"])
        token_b, _ = self.enlace(b["id"])
        sesion_a = self.verificar(token_a)
        self.assertEqual(self.pub(token_b, sesion_a).get(f"{PUB}documento/").status_code, 401)

    def test_bloqueo_tras_cinco_intentos(self):
        ctr = self.crear()
        token, _ = self.enlace(ctr["id"])
        c = self.pub(token)
        c.post(f"{PUB}otp/enviar/")
        bueno = self.codigo_enviado()
        malo = "000000" if bueno != "000000" else "111111"
        for _ in range(4):
            self.assertEqual(c.post(f"{PUB}otp/verificar/", {"codigo": malo}, format="json").status_code, 400)
        self.assertEqual(c.post(f"{PUB}otp/verificar/", {"codigo": malo}, format="json").status_code, 423)
        # Ni el código correcto sirve ya.
        self.assertEqual(c.post(f"{PUB}otp/verificar/", {"codigo": bueno}, format="json").status_code, 423)
        self.assertEqual(c.post(f"{PUB}otp/enviar/").status_code, 423)

    def test_otp_expirado(self):
        ctr = self.crear()
        token, _ = self.enlace(ctr["id"])
        c = self.pub(token)
        c.post(f"{PUB}otp/enviar/")
        codigo = self.codigo_enviado()
        ContratoEnlaceFirma.objects.update(otp_expira_at=timezone.now() - timedelta(seconds=1))
        self.assertEqual(c.post(f"{PUB}otp/verificar/", {"codigo": codigo}, format="json").status_code, 400)

    def test_espera_entre_reenvios(self):
        ctr = self.crear()
        token, _ = self.enlace(ctr["id"])
        c = self.pub(token)
        self.assertEqual(c.post(f"{PUB}otp/enviar/").status_code, 200)
        res = c.post(f"{PUB}otp/enviar/")
        self.assertEqual(res.status_code, 429)

    def test_fallo_smtp_no_consume_envio(self):
        ctr = self.crear()
        token, _ = self.enlace(ctr["id"])
        self.correo.side_effect = RuntimeError("smtp caído")
        self.assertEqual(self.pub(token).post(f"{PUB}otp/enviar/").status_code, 503)
        enlace = ContratoEnlaceFirma.objects.get(contrato_id=ctr["id"])
        self.assertEqual(enlace.otp_enviados, 0)
        self.assertEqual(enlace.otp_hash, "")


class FirmaTests(ContratosBase):
    def _firmar(self, token, sesion, **extra):
        from apps.contratos.security import hash_token

        sha = ContratoEnlaceFirma.objects.get(token_hash=hash_token(token)).contrato.documento_sha256
        body = {"firma": firma_png(), "nombre": "Laura Elena González", "acepta": True, "documento_sha256": sha}
        body.update(extra)
        return self.pub(token, sesion).post(f"{PUB}firmar/", body, format="json")

    def test_firma_completa_y_sellado(self):
        ctr = self.crear()
        res = self.api.post(f"{LIST_URL}{ctr['id']}/firmar-prestador/", {"firma": firma_png()}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["estado"], "firmado_prestador")

        token, _ = self.enlace(ctr["id"])
        sesion = self.verificar(token)
        res = self._firmar(token, sesion)
        self.assertEqual(res.status_code, 200, res.data)
        self.assertTrue(res.data["completado"])

        contrato = Contrato.objects.get(pk=ctr["id"])
        self.assertEqual(contrato.estado, "completado")
        self.assertTrue(contrato.pdf_sellado_sha256)
        self.assertEqual(contrato.firmado_cliente_correo, "laura@segadi.test")
        # El link ya no sirve para volver a firmar…
        self.assertEqual(self._firmar(token, sesion).status_code, 410)
        # …pero sí para bajar el PDF final mientras dure la sesión.
        pdf = self.pub(token, sesion).get(f"{PUB}pdf-final/")
        self.assertEqual(pdf.status_code, 200)
        self.assertEqual(pdf["Content-Type"], "application/pdf")
        # Un contrato completado no se edita ni se borra.
        self.assertEqual(self.api.patch(f"{LIST_URL}{ctr['id']}/", {"plan_mbps": 1}, format="json").status_code, 400)
        self.assertEqual(self.api.delete(f"{LIST_URL}{ctr['id']}/").status_code, 400)

    def test_hash_distinto_se_rechaza(self):
        ctr = self.crear()
        token, _ = self.enlace(ctr["id"])
        sesion = self.verificar(token)
        res = self._firmar(token, sesion, documento_sha256="0" * 64)
        self.assertEqual(res.status_code, 409)

    def test_firma_no_png_se_rechaza(self):
        ctr = self.crear()
        token, _ = self.enlace(ctr["id"])
        sesion = self.verificar(token)
        buf = io.BytesIO()
        Image.new("RGB", (200, 80), (0, 0, 0)).save(buf, format="JPEG")
        jpeg = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
        self.assertEqual(self._firmar(token, sesion, firma=jpeg).status_code, 400)
        self.assertEqual(self._firmar(token, sesion, firma="data:image/png;base64,PHNjcmlwdD4=").status_code, 400)
        enorme = "data:image/png;base64," + "A" * (500 * 1024)
        self.assertEqual(self._firmar(token, sesion, firma=enorme).status_code, 400)

    def test_firma_vacia_se_rechaza(self):
        ctr = self.crear()
        token, _ = self.enlace(ctr["id"])
        sesion = self.verificar(token)
        vacia = firma_png(color=(255, 255, 255, 0))
        self.assertEqual(self._firmar(token, sesion, firma=vacia).status_code, 400)

    def test_sin_aceptar_no_firma(self):
        ctr = self.crear()
        token, _ = self.enlace(ctr["id"])
        sesion = self.verificar(token)
        self.assertEqual(self._firmar(token, sesion, acepta=False).status_code, 400)
        self.assertEqual(self._firmar(token, sesion, acepta="true").status_code, 400)


class PlantillaTests(ContratosBase):
    def test_datos_del_cliente_se_escapan(self):
        ctr = self.crear(cliente_razon_social="<script>alert(1)</script> SA")
        contrato = Contrato.objects.get(pk=ctr["id"])
        html = services.generar_html(contrato)
        self.assertNotIn("<script>alert(1)</script>", html)
        self.assertIn("&lt;script&gt;", html)

    def test_texto_corregido(self):
        contrato = Contrato.objects.get(pk=self.crear()["id"])
        html = services.generar_html(contrato)
        self.assertNotIn("quince 30", html)
        self.assertIn("treinta y seis (36)", html)
        self.assertIn("100 Mbps", html)
        self.assertIn("contratos@interpro.test", html)
        self.assertIn("BORRADOR", html)

    def test_importe_con_letra(self):
        self.assertEqual(dinero_con_letra("8000"), "$8,000.00 (Ocho Mil Pesos 00/100 M.N.)")
        self.assertEqual(dinero_con_letra("1250.5"), "$1,250.50 (Mil Doscientos Cincuenta Pesos 50/100 M.N.)")

    def test_hash_estable_y_sensible_al_contenido(self):
        contrato = Contrato.objects.get(pk=self.crear()["id"])
        a = services.hash_contenido(contrato)
        self.assertEqual(a, services.hash_contenido(contrato))
        contrato.plan_mbps = 50
        self.assertNotEqual(a, services.hash_contenido(contrato))
