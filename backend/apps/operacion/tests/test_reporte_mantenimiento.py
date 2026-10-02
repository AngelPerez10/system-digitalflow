from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.operacion.models import Proyecto, ReporteMantenimiento
from apps.ordenes.models import Orden

User = get_user_model()

LIST_URL = "/api/reportes-mantenimiento/"


class ReporteMantenimientoCrudTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="rm_admin",
            password="test-pass-123",
            is_staff=True,
        )
        self.proyecto = Proyecto.objects.create(cliente_nombre="Cliente Demo RM")
        self.payload = {
            "proyecto_id": self.proyecto.id,
            "fecha_servicio": "2026-08-20",
            "tecnico_nombre": "Juan Pérez",
            "foto_orden_url": "",
            "secciones": [
                {
                    "id": "sec-1",
                    "titulo": "Cámara entrada",
                    "fotos_antes": [
                        "https://res.cloudinary.com/demo/image/upload/a1.jpg",
                        "https://res.cloudinary.com/demo/image/upload/a2.jpg",
                    ],
                    "fotos_despues": [
                        "https://res.cloudinary.com/demo/image/upload/b1.jpg",
                    ],
                }
            ],
        }

    def _auth_admin(self):
        self.client.force_authenticate(user=self.admin)

    def _payload_con_proyecto_nuevo(self, nombre="Otro cliente"):
        return {**self.payload, "proyecto_id": Proyecto.objects.create(cliente_nombre=nombre).id}

    def _reporte_legacy_con_orden(self):
        """Reporte creado antes del cambio, cuando el origen podía ser una orden de trabajo."""
        orden = Orden.objects.create(cliente="Cliente Orden", fecha_inicio="2026-08-20", status="resuelto")
        reporte = ReporteMantenimiento.objects.create(
            orden=orden,
            orden_folio="ODT-1",
            orden_cliente="Cliente Orden",
            fecha_servicio="2026-08-20",
            tecnico_nombre="Juan Pérez",
            secciones=[],
            creado_por=self.admin,
        )
        return orden, reporte

    def test_list_requiere_autenticacion(self):
        res = self.client.get(LIST_URL)
        self.assertIn(res.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_list_requiere_admin(self):
        operador = User.objects.create_user(username="rm_operador", password="test-pass-123")
        self.client.force_authenticate(user=operador)
        res = self.client.get(LIST_URL)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_list_retrieve_patch_delete(self):
        self._auth_admin()
        create_res = self.client.post(LIST_URL, self.payload, format="json")
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED, create_res.data)
        self.assertEqual(create_res.data["folio"], "RM-10001")
        self.assertEqual(create_res.data["idx"], 10001)
        self.assertEqual(create_res.data["proyecto_id"], self.proyecto.id)
        self.assertEqual(create_res.data["origen_tipo"], "proyecto")
        self.assertIsNone(create_res.data["orden_id"])
        self.assertTrue(str(create_res.data["orden_folio"]).startswith("PRJ-"))
        self.assertEqual(create_res.data["orden_cliente"], "Cliente Demo RM")
        self.assertEqual(create_res.data["tecnico_nombre"], "Juan Pérez")
        self.assertEqual(len(create_res.data["secciones"]), 1)
        self.assertEqual(len(create_res.data["secciones"][0]["fotos_antes"]), 2)
        self.assertEqual(len(create_res.data["secciones"][0]["fotos_despues"]), 1)
        reporte_id = create_res.data["id"]

        list_res = self.client.get(LIST_URL)
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertTrue(any(row["id"] == reporte_id for row in list_res.data))

        detail_res = self.client.get(f"{LIST_URL}{reporte_id}/")
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)

        patch_res = self.client.patch(
            f"{LIST_URL}{reporte_id}/",
            {
                "tecnico_nombre": "Ana López",
                "secciones": [
                    {
                        "id": "sec-1",
                        "titulo": "DVR principal",
                        "fotos_antes": [],
                        "fotos_despues": [],
                    },
                ],
            },
            format="json",
        )
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK, patch_res.data)
        self.assertEqual(patch_res.data["tecnico_nombre"], "Ana López")
        self.assertEqual(patch_res.data["secciones"][0]["titulo"], "DVR principal")

        delete_res = self.client.delete(f"{LIST_URL}{reporte_id}/")
        self.assertEqual(delete_res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(ReporteMantenimiento.objects.filter(pk=reporte_id).exists())

    def test_acepta_foto_legacy_single_url(self):
        self._auth_admin()
        res = self.client.post(
            LIST_URL,
            {
                **self.payload,
                "secciones": [
                    {
                        "id": "sec-legacy",
                        "titulo": "Legacy",
                        "foto_antes_url": "https://res.cloudinary.com/demo/image/upload/legacy-a.jpg",
                        "foto_despues_url": "https://res.cloudinary.com/demo/image/upload/legacy-b.jpg",
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        sec = res.data["secciones"][0]
        self.assertEqual(sec["fotos_antes"], ["https://res.cloudinary.com/demo/image/upload/legacy-a.jpg"])
        self.assertEqual(sec["fotos_despues"], ["https://res.cloudinary.com/demo/image/upload/legacy-b.jpg"])

    def test_rechaza_mas_de_10_fotos_por_lado(self):
        self._auth_admin()
        urls = [f"https://res.cloudinary.com/demo/image/upload/x{i}.jpg" for i in range(11)]
        res = self.client.post(
            LIST_URL,
            {
                **self.payload,
                "secciones": [
                    {
                        "id": "sec-overflow",
                        "titulo": "Overflow",
                        "fotos_antes": urls,
                        "fotos_despues": [],
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_segundo_folio_es_rm_10002(self):
        self._auth_admin()
        first = self.client.post(LIST_URL, self.payload, format="json")
        self.assertEqual(first.status_code, status.HTTP_201_CREATED, first.data)
        # Un proyecto admite un solo reporte: el segundo va en otro proyecto.
        second = self.client.post(LIST_URL, self._payload_con_proyecto_nuevo(), format="json")
        self.assertEqual(second.status_code, status.HTTP_201_CREATED, second.data)
        self.assertEqual(second.data["folio"], "RM-10002")

    def test_create_requiere_proyecto_fecha_y_tecnico(self):
        self._auth_admin()
        res = self.client.post(
            LIST_URL,
            {"fecha_servicio": "", "tecnico_nombre": "", "secciones": []},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_con_orden_ya_no_se_permite(self):
        self._auth_admin()
        orden = Orden.objects.create(cliente="Cliente Orden", fecha_inicio="2026-08-20", status="resuelto")
        payload = {k: v for k, v in self.payload.items() if k != "proyecto_id"}
        res = self.client.post(LIST_URL, {**payload, "orden_id": orden.id}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("orden_id", res.data)
        self.assertFalse(ReporteMantenimiento.objects.exists())

    def test_create_rechaza_orden_y_proyecto_juntos_o_ninguno(self):
        self._auth_admin()
        orden = Orden.objects.create(cliente="X", fecha_inicio="2026-08-20", status="resuelto")
        ambos = {**self.payload, "orden_id": orden.id}
        self.assertEqual(self.client.post(LIST_URL, ambos, format="json").status_code, status.HTTP_400_BAD_REQUEST)
        ninguno = {k: v for k, v in self.payload.items() if k != "proyecto_id"}
        self.assertEqual(self.client.post(LIST_URL, ninguno, format="json").status_code, status.HTTP_400_BAD_REQUEST)

    def test_reporte_legacy_con_orden_se_sigue_editando(self):
        self._auth_admin()
        orden, reporte = self._reporte_legacy_con_orden()
        # La web reenvía el mismo `orden_id` al guardar: sigue siendo válido.
        res = self.client.patch(
            f"{LIST_URL}{reporte.id}/",
            {"orden_id": orden.id, "proyecto_id": None, "tecnico_nombre": "Ana López"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data["origen_tipo"], "orden")
        self.assertEqual(res.data["tecnico_nombre"], "Ana López")

    def test_reporte_legacy_no_se_liga_a_otra_orden(self):
        self._auth_admin()
        _, reporte = self._reporte_legacy_con_orden()
        otra = Orden.objects.create(cliente="Otra", fecha_inicio="2026-08-21", status="resuelto")
        res = self.client.patch(f"{LIST_URL}{reporte.id}/", {"orden_id": otra.id}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_cambia_de_orden_a_proyecto(self):
        self._auth_admin()
        _, reporte = self._reporte_legacy_con_orden()
        proyecto = Proyecto.objects.create(cliente_nombre="Destino")
        res = self.client.patch(f"{LIST_URL}{reporte.id}/", {"proyecto_id": proyecto.id}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data["origen_tipo"], "proyecto")
        self.assertIsNone(res.data["orden_id"])

    def test_un_proyecto_solo_puede_tener_un_reporte(self):
        self._auth_admin()
        proyecto = self.proyecto
        payload = self.payload
        primero = self.client.post(LIST_URL, payload, format="json")
        self.assertEqual(primero.status_code, status.HTTP_201_CREATED, primero.data)
        segundo = self.client.post(LIST_URL, payload, format="json")
        self.assertEqual(segundo.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn(primero.data["folio"], str(segundo.data))
        # Editar el mismo reporte con su propio proyecto sigue siendo válido.
        patch = self.client.patch(f"{LIST_URL}{primero.data['id']}/", {"proyecto_id": proyecto.id}, format="json")
        self.assertEqual(patch.status_code, status.HTTP_200_OK, patch.data)

    def test_proyectos_ocupados_lista_y_excluye_el_reporte_actual(self):
        self._auth_admin()
        proyecto = self.proyecto
        creado = self.client.post(LIST_URL, self.payload, format="json")
        res = self.client.get(f"{LIST_URL}proyectos-ocupados/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["by_id"][str(proyecto.id)]["folio"], creado.data["folio"])
        excl = self.client.get(f"{LIST_URL}proyectos-ocupados/?exclude_reporte_id={creado.data['id']}")
        self.assertNotIn(str(proyecto.id), excl.data["by_id"])
        self.assertEqual(self.client.get(f"{LIST_URL}proyectos-ocupados/?exclude_reporte_id=x").status_code, 400)

    def test_secciones_malformadas_400(self):
        self._auth_admin()
        res = self.client.post(
            LIST_URL,
            {
                **self.payload,
                "secciones": "no-es-lista",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_upload_image_requiere_admin_y_data_url(self):
        url = f"{LIST_URL}upload-image/"
        res = self.client.post(url, {"data_url": "data:image/png;base64,aaa"}, format="json")
        self.assertIn(res.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

        self._auth_admin()
        bad = self.client.post(url, {"data_url": "no-es-imagen"}, format="json")
        self.assertEqual(bad.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_image_requiere_admin_y_url_valida(self):
        url = f"{LIST_URL}delete-image/"
        res = self.client.post(url, {"url": "https://res.cloudinary.com/demo/image/upload/x.jpg"}, format="json")
        self.assertIn(res.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

        self._auth_admin()
        bad = self.client.post(url, {"url": "https://example.com/not-cloudinary.jpg"}, format="json")
        self.assertEqual(bad.status_code, status.HTTP_400_BAD_REQUEST)

        outside = self.client.post(
            url,
            {"public_id": "ordenes/fotos/abc"},
            format="json",
        )
        self.assertEqual(outside.status_code, status.HTTP_400_BAD_REQUEST)

    def test_pdf_endpoint_devuelve_documento(self):
        self._auth_admin()
        create_res = self.client.post(LIST_URL, self.payload, format="json")
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED, create_res.data)
        reporte_id = create_res.data["id"]

        pdf_res = self.client.get(f"{LIST_URL}{reporte_id}/pdf/?html=1")
        self.assertEqual(pdf_res.status_code, status.HTTP_200_OK)
        self.assertIn("text/html", pdf_res["Content-Type"])
        body = pdf_res.content.decode("utf-8")
        self.assertIn("Reporte de mantenimiento", body)
        self.assertIn("Cámara entrada", body)
        self.assertIn("Antes", body)
        self.assertIn("Después", body)
        self.assertIn("Proyecto:", body)


class ReporteMantenimientoOwnOnlyTests(APITestCase):
    """Técnico con permiso del módulo solo ve reportes de sus órdenes/proyectos (o creados por él)."""

    def setUp(self):
        from apps.users.models import UserPermissions

        self.tecnico = User.objects.create_user(username="rm_tech", password="test-pass-123")
        self.otro = User.objects.create_user(username="rm_otro", password="test-pass-123")
        UserPermissions.objects.create(
            user=self.tecnico,
            permissions={
                "reportes_mantenimiento": {
                    "view": True,
                    "create": True,
                    "edit": True,
                    "delete": False,
                    "own_only": True,
                }
            },
        )
        self.orden_propia = Orden.objects.create(
            cliente="Cliente Propio",
            fecha_inicio="2026-08-20",
            status="resuelto",
            tecnico_asignado=self.tecnico,
            servicios_realizados=["Mantenimiento"],
        )
        self.orden_ajena = Orden.objects.create(
            cliente="Cliente Ajeno",
            fecha_inicio="2026-08-21",
            status="resuelto",
            tecnico_asignado=self.otro,
            servicios_realizados=["Mantenimiento"],
        )
        self.reporte_propio = ReporteMantenimiento.objects.create(
            orden=self.orden_propia,
            orden_folio="ODT-1",
            orden_cliente="Cliente Propio",
            fecha_servicio="2026-08-20",
            tecnico_nombre="Técnico Propio",
            secciones=[],
            creado_por=self.tecnico,
        )
        self.reporte_ajeno = ReporteMantenimiento.objects.create(
            orden=self.orden_ajena,
            orden_folio="ODT-2",
            orden_cliente="Cliente Ajeno",
            fecha_servicio="2026-08-21",
            tecnico_nombre="Otro",
            secciones=[],
            creado_por=self.otro,
        )

    def test_list_solo_reportes_de_ordenes_asignadas(self):
        self.client.force_authenticate(user=self.tecnico)
        res = self.client.get(LIST_URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = {row["id"] for row in res.data}
        self.assertIn(self.reporte_propio.id, ids)
        self.assertNotIn(self.reporte_ajeno.id, ids)

    def test_detail_ajeno_403(self):
        self.client.force_authenticate(user=self.tecnico)
        res = self.client.get(f"{LIST_URL}{self.reporte_ajeno.id}/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_con_orden_ya_no_se_permite_ni_propia(self):
        self.client.force_authenticate(user=self.tecnico)
        for orden in (self.orden_propia, self.orden_ajena):
            res = self.client.post(
                LIST_URL,
                {"orden_id": orden.id, "fecha_servicio": "2026-08-22", "tecnico_nombre": "Técnico Propio", "secciones": []},
                format="json",
            )
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST, res.data)

    def test_proyecto_propio_visible_y_ajeno_no(self):
        propio = Proyecto.objects.create(cliente_nombre="PP", tecnico=self.tecnico)
        ajeno = Proyecto.objects.create(cliente_nombre="PA", tecnico=self.otro)
        self.client.force_authenticate(user=self.tecnico)
        base = {"fecha_servicio": "2026-08-22", "tecnico_nombre": "Técnico Propio", "secciones": []}
        ok = self.client.post(LIST_URL, {**base, "proyecto_id": propio.id}, format="json")
        self.assertEqual(ok.status_code, status.HTTP_201_CREATED, ok.data)
        bad = self.client.post(LIST_URL, {**base, "proyecto_id": ajeno.id}, format="json")
        self.assertEqual(bad.status_code, status.HTTP_400_BAD_REQUEST)
        rep_ajeno = ReporteMantenimiento.objects.create(
            proyecto=ajeno, fecha_servicio="2026-08-22", tecnico_nombre="X", secciones=[], creado_por=self.otro
        )
        ids = {row["id"] for row in self.client.get(LIST_URL).data}
        self.assertIn(ok.data["id"], ids)
        self.assertNotIn(rep_ajeno.id, ids)

    def test_own_only_false_ve_todos(self):
        from apps.users.models import UserPermissions

        perfil = UserPermissions.objects.get(user=self.tecnico)
        perfil.permissions = {
            "reportes_mantenimiento": {
                "view": True,
                "create": True,
                "edit": True,
                "delete": False,
                "own_only": False,
            }
        }
        perfil.save(update_fields=["permissions"])
        # Evitar caché del related permissions_profile en la instancia del setUp.
        tecnico = User.objects.select_related("permissions_profile").get(pk=self.tecnico.pk)
        self.client.force_authenticate(user=tecnico)
        res = self.client.get(LIST_URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = {row["id"] for row in res.data}
        self.assertIn(self.reporte_propio.id, ids)
        self.assertIn(self.reporte_ajeno.id, ids)
