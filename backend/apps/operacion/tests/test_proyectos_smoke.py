from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.operacion.close_validation import CLOSE_BLOCKED_MESSAGE
from apps.operacion.models import Proyecto
from apps.users.models import UserPermissions

User = get_user_model()


class ProyectosSmokeTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="proy_user", password="test-pass-123")
        UserPermissions.objects.create(
            user=self.user,
            permissions={
                "proyectos": {"view": True, "create": True, "edit": True, "delete": True},
            },
        )
        self.client.force_authenticate(user=self.user)

    def test_list_proyectos_denied_without_view(self):
        denied = User.objects.create_user(username="proy_bloqueado", password="test-pass-123")
        UserPermissions.objects.create(user=denied, permissions={"ordenes": {"view": True}})
        self.client.force_authenticate(user=denied)
        response = self.client.get("/api/proyectos/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_ordenes_permission_alone_does_not_grant_proyectos(self):
        only_ordenes = User.objects.create_user(username="solo_ordenes", password="test-pass-123")
        UserPermissions.objects.create(
            user=only_ordenes,
            permissions={"ordenes": {"view": True, "create": True, "edit": True, "delete": True}},
        )
        self.client.force_authenticate(user=only_ordenes)
        response = self.client.get("/api/proyectos/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_list_retrieve_patch_smoke(self):
        payload = {
            "cliente_nombre": "Cliente proyecto",
            "status": "en_proceso",
            "tipo_trabajo_nombre": "Instalación",
            "equipos": [
                {
                    "lineaId": "eq-1",
                    "modelo": "GPS X",
                    "modeloOriginal": "GPS X",
                    "estadoInstalacion": "instalado",
                    "equipoEntregado": True,
                }
            ],
            "cotizaciones": [
                {
                    "vinculoId": "vin-1",
                    "orden": 1,
                    "cotizacion": {
                        "id": "cot-1",
                        "origen": "digitalflow",
                        "folio": "10001",
                        "cliente": "Cliente proyecto",
                        "fecha": "2026-07-01",
                    },
                    "lineas": [],
                }
            ],
            "porcentaje_avance": 25,
        }
        create_res = self.client.post("/api/proyectos/", payload, format="json")
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED, create_res.data)
        self.assertIn("id", create_res.data)
        self.assertTrue(str(create_res.data.get("folio", "")).startswith("PRJ-"))
        proyecto_id = create_res.data["id"]

        list_res = self.client.get("/api/proyectos/")
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertTrue(any(row["id"] == proyecto_id for row in list_res.data))

        detail_res = self.client.get(f"/api/proyectos/{proyecto_id}/")
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_res.data["cliente_nombre"], "Cliente proyecto")
        self.assertEqual(detail_res.data["equipos_total"], 1)
        self.assertEqual(detail_res.data["equipos_instalados"], 1)

        patch_res = self.client.patch(
            f"/api/proyectos/{proyecto_id}/",
            {"status": "pausado", "motivo_pausa": "Clima"},
            format="json",
        )
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK, patch_res.data)
        self.assertEqual(patch_res.data["status"], "pausado")
        self.assertEqual(Proyecto.objects.get(pk=proyecto_id).motivo_pausa, "Clima")

    def test_reject_invalid_close_without_cotizacion_adicional(self):
        create_res = self.client.post(
            "/api/proyectos/",
            {
                "cliente_nombre": "Cliente cierre",
                "status": "en_proceso",
                "requiere_presupuesto_adicional": True,
            },
            format="json",
        )
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED, create_res.data)
        proyecto_id = create_res.data["id"]

        patch_res = self.client.patch(
            f"/api/proyectos/{proyecto_id}/",
            {"status": "cerrado"},
            format="json",
        )
        self.assertEqual(patch_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn(CLOSE_BLOCKED_MESSAGE, str(patch_res.data))

    def test_delete_proyecto(self):
        create_res = self.client.post(
            "/api/proyectos/",
            {"cliente_nombre": "A borrar", "status": "en_proceso"},
            format="json",
        )
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED, create_res.data)
        proyecto_id = create_res.data["id"]
        del_res = self.client.delete(f"/api/proyectos/{proyecto_id}/")
        self.assertEqual(del_res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Proyecto.objects.filter(pk=proyecto_id).exists())

    def test_upload_image_rejects_invalid_folder(self):
        res = self.client.post(
            "/api/proyectos/upload-image/",
            {"data_url": "data:image/png;base64,aaa", "folder": "ordenes/fotos"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_upload_image_allowed_with_edit_only(self):
        """Técnicos suelen tener edit sin create; no deben recibir 403 al subir fotos."""
        tech = User.objects.create_user(username="proy_edit_only", password="test-pass-123")
        UserPermissions.objects.create(
            user=tech,
            permissions={
                "proyectos": {"view": True, "create": False, "edit": True, "delete": False},
            },
        )
        self.client.force_authenticate(user=tech)
        res = self.client.post(
            "/api/proyectos/upload-image/",
            {"data_url": "data:image/png;base64,aaa", "folder": "ordenes/fotos"},
            format="json",
        )
        # Pasa el permiso; falla por folder inválido (400), no por 403.
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_tipos_trabajo_multi_and_legacy_sync(self):
        create_res = self.client.post(
            "/api/proyectos/",
            {
                "cliente_nombre": "Multi tipos",
                "status": "en_proceso",
                "tipos_trabajo": [
                    {"id": 10, "nombre": "Instalación"},
                    {"id": 20, "nombre": "Mantenimiento"},
                    {"id": 10, "nombre": "Instalación dup"},
                ],
            },
            format="json",
        )
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED, create_res.data)
        self.assertEqual(len(create_res.data["tipos_trabajo"]), 2)
        self.assertEqual(create_res.data["tipo_trabajo_id"], 10)
        self.assertEqual(create_res.data["tipo_trabajo_nombre"], "Instalación")

    def test_multi_tecnicos_sync_legacy_and_visibility(self):
        tech_a = User.objects.create_user(username="tech_a", password="test-pass-123")
        tech_b = User.objects.create_user(username="tech_b", password="test-pass-123")
        aux = User.objects.create_user(username="aux_1", password="test-pass-123")
        for u in (tech_a, tech_b, aux):
            UserPermissions.objects.create(
                user=u,
                permissions={
                    "proyectos": {
                        "view": True,
                        "create": False,
                        "edit": True,
                        "delete": False,
                        "own_only": True,
                    },
                },
            )

        create_res = self.client.post(
            "/api/proyectos/",
            {
                "cliente_nombre": "Multi equipo",
                "status": "en_proceso",
                "tecnicos": [
                    {"id": tech_a.id, "nombre": "tech_a", "responsable": False},
                    {"id": tech_b.id, "nombre": "tech_b", "responsable": True},
                ],
                "auxiliares": [{"id": aux.id, "nombre": "aux_1"}],
            },
            format="json",
        )
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED, create_res.data)
        self.assertEqual(create_res.data["tecnico_id"], tech_b.id)
        self.assertEqual(create_res.data["auxiliar_id"], aux.id)
        self.assertEqual(len(create_res.data["tecnicos"]), 2)
        responsables = [t for t in create_res.data["tecnicos"] if t.get("responsable")]
        self.assertEqual(len(responsables), 1)
        self.assertEqual(responsables[0]["id"], tech_b.id)

        proyecto_id = create_res.data["id"]
        for u in (tech_a, tech_b, aux):
            self.client.force_authenticate(user=u)
            list_res = self.client.get("/api/proyectos/")
            self.assertEqual(list_res.status_code, status.HTTP_200_OK)
            ids = [row["id"] for row in list_res.data]
            self.assertIn(proyecto_id, ids, f"{u.username} debería ver el proyecto")

        stranger = User.objects.create_user(username="tech_x", password="test-pass-123")
        UserPermissions.objects.create(
            user=stranger,
            permissions={
                "proyectos": {
                    "view": True,
                    "create": False,
                    "edit": True,
                    "delete": False,
                    "own_only": True,
                },
            },
        )
        self.client.force_authenticate(user=stranger)
        list_res = self.client.get("/api/proyectos/")
        ids = [row["id"] for row in list_res.data]
        self.assertNotIn(proyecto_id, ids)

    def test_assigned_technician_cannot_change_locked_fields(self):
        tech = User.objects.create_user(username="proy_tech", password="test-pass-123")
        UserPermissions.objects.create(
            user=tech,
            permissions={
                "proyectos": {
                    "view": True,
                    "create": False,
                    "edit": True,
                    "delete": False,
                    "own_only": True,
                },
            },
        )
        create_res = self.client.post(
            "/api/proyectos/",
            {
                "cliente_nombre": "Con técnico",
                "status": "en_proceso",
                "tecnico_id": tech.id,
                "tecnico_nombre": "proy_tech",
                "fecha_autorizacion": "2026-08-01",
                "tipos_trabajo": [{"id": 1, "nombre": "GPS"}],
                "cotizaciones": [
                    {
                        "vinculoId": "vin-1",
                        "orden": 1,
                        "cotizacion": {
                            "id": "cot-1",
                            "origen": "digitalflow",
                            "folio": "10001",
                            "cliente": "Con técnico",
                            "fecha": "2026-07-01",
                        },
                        "lineas": [],
                    }
                ],
                "equipos": [
                    {
                        "lineaId": "eq-1",
                        "modelo": "GPS X",
                        "modeloOriginal": "GPS X",
                        "estadoInstalacion": "pendiente",
                        "equipoEntregado": False,
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED, create_res.data)
        proyecto_id = create_res.data["id"]

        self.client.force_authenticate(user=tech)
        bad_fecha = self.client.patch(
            f"/api/proyectos/{proyecto_id}/",
            {"fecha_autorizacion": "2026-08-15"},
            format="json",
        )
        self.assertEqual(bad_fecha.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("fecha_autorizacion", bad_fecha.data)

        bad_tipos = self.client.patch(
            f"/api/proyectos/{proyecto_id}/",
            {"tipos_trabajo": [{"id": 99, "nombre": "Otro"}]},
            format="json",
        )
        self.assertEqual(bad_tipos.status_code, status.HTTP_400_BAD_REQUEST)

        bad_cot = self.client.patch(
            f"/api/proyectos/{proyecto_id}/",
            {"cotizaciones": []},
            format="json",
        )
        self.assertEqual(bad_cot.status_code, status.HTTP_400_BAD_REQUEST)

        # Tampoco puede agregar cotizaciones nuevas.
        bad_add = self.client.patch(
            f"/api/proyectos/{proyecto_id}/",
            {
                "cotizaciones": [
                    {
                        "vinculoId": "vin-1",
                        "orden": 1,
                        "cotizacion": {
                            "id": "cot-1",
                            "origen": "digitalflow",
                            "folio": "10001",
                            "cliente": "Con técnico",
                            "fecha": "2026-07-01",
                        },
                        "lineas": [],
                    },
                    {
                        "vinculoId": "vin-2",
                        "orden": 2,
                        "cotizacion": {
                            "id": "df-99999",
                            "origen": "digitalflow",
                            "folio": "19999",
                            "cliente": "Con técnico",
                            "fecha": "2026-07-02",
                        },
                        "lineas": [],
                    },
                ]
            },
            format="json",
        )
        self.assertEqual(bad_add.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cotizaciones", bad_add.data)

        # Sí puede marcar entrega de equipos.
        ok_entrega = self.client.patch(
            f"/api/proyectos/{proyecto_id}/",
            {
                "equipos": [
                    {
                        "lineaId": "eq-1",
                        "modelo": "GPS X",
                        "modeloOriginal": "GPS X",
                        "estadoInstalacion": "entregado",
                        "equipoEntregado": True,
                    }
                ]
            },
            format="json",
        )
        self.assertEqual(ok_entrega.status_code, status.HTTP_200_OK, ok_entrega.data)
        self.assertTrue(ok_entrega.data["equipos"][0]["equipoEntregado"])

        # PATCH completo estilo frontend: mismos ids de tipos/cotización (con ruido
        # de nombre / prefijo df-) + marcar instalado — no debe bloquearse.
        ok_instalado = self.client.patch(
            f"/api/proyectos/{proyecto_id}/",
            {
                "cliente_nombre": "Con técnico",
                "status": "en_proceso",
                "fecha_autorizacion": "2026-08-01",
                "tipos_trabajo": [{"id": 1, "nombre": ""}],
                "tipo_trabajo_id": 1,
                "tipo_trabajo_nombre": "",
                "cotizaciones": [
                    {
                        "vinculoId": "vin-1",
                        "orden": 1,
                        "cotizacion": {
                            "id": "df-cot-1",
                            "origen": "digitalflow",
                            "folio": "10001",
                            "cliente": "Con técnico",
                            "fecha": "2026-07-01",
                        },
                        "lineas": [{"id": "l1", "descripcion": "extra"}],
                    }
                ],
                "equipos": [
                    {
                        "lineaId": "eq-1",
                        "modelo": "GPS X",
                        "modeloOriginal": "GPS X",
                        "estadoInstalacion": "instalado",
                        "equipoEntregado": True,
                    }
                ],
                "evidencias_urls": ["https://res.cloudinary.com/demo/image/upload/v1/proyectos/evidencias/x.jpg"],
                "incidencias": "Instalado en sitio",
            },
            format="json",
        )
        self.assertEqual(ok_instalado.status_code, status.HTTP_200_OK, ok_instalado.data)
        self.assertEqual(ok_instalado.data["equipos"][0]["estadoInstalacion"], "instalado")
        self.assertEqual(ok_instalado.data["equipos_instalados"], 1)
        self.assertEqual(len(ok_instalado.data["evidencias_urls"]), 1)

        # Sí puede actualizar campos no bloqueados (p. ej. incidencias).
        ok = self.client.patch(
            f"/api/proyectos/{proyecto_id}/",
            {"incidencias": "Sin novedades"},
            format="json",
        )
        self.assertEqual(ok.status_code, status.HTTP_200_OK, ok.data)
        self.assertEqual(ok.data["incidencias"], "Sin novedades")

    def test_quien_autorizo_persists(self):
        create_res = self.client.post(
            "/api/proyectos/",
            {
                "cliente_nombre": "Cliente auth",
                "quien_autorizo": "Ana Pérez",
                "status": "en_proceso",
            },
            format="json",
        )
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED, create_res.data)
        self.assertEqual(create_res.data["quien_autorizo"], "Ana Pérez")
        proyecto_id = create_res.data["id"]

        patch_res = self.client.patch(
            f"/api/proyectos/{proyecto_id}/",
            {"quien_autorizo": "Luis Gómez"},
            format="json",
        )
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK, patch_res.data)
        self.assertEqual(patch_res.data["quien_autorizo"], "Luis Gómez")
        self.assertEqual(Proyecto.objects.get(pk=proyecto_id).quien_autorizo, "Luis Gómez")

    def test_save_autoriza_digitalflow_pendiente_no_cancelada(self):
        from apps.cotizaciones.models import Cotizacion

        pend = Cotizacion.objects.create(cliente="Pendiente DF", status="PENDIENTE")
        canc = Cotizacion.objects.create(cliente="Cancelada DF", status="CANCELADA")
        already = Cotizacion.objects.create(cliente="Ya auth", status="AUTORIZADA")

        create_res = self.client.post(
            "/api/proyectos/",
            {
                "cliente_nombre": "Cliente DF",
                "status": "en_proceso",
                "quien_autorizo": "Director",
                "cotizaciones": [
                    {
                        "vinculoId": "vin-p",
                        "orden": 1,
                        "cotizacion": {
                            "id": f"df-{pend.id}",
                            "origen": "digitalflow",
                            "folio": "10001",
                            "cliente": "Cliente DF",
                            "fecha": "2026-07-01",
                        },
                        "lineas": [],
                    },
                    {
                        "vinculoId": "vin-c",
                        "orden": 2,
                        "cotizacion": {
                            "id": f"df-{canc.id}",
                            "origen": "digitalflow",
                            "folio": "10002",
                            "cliente": "Cliente DF",
                            "fecha": "2026-07-02",
                        },
                        "lineas": [],
                    },
                    {
                        "vinculoId": "vin-a",
                        "orden": 3,
                        "cotizacion": {
                            "id": f"df-{already.id}",
                            "origen": "digitalflow",
                            "folio": "10003",
                            "cliente": "Cliente DF",
                            "fecha": "2026-07-03",
                        },
                        "lineas": [],
                    },
                    {
                        "vinculoId": "vin-s",
                        "orden": 4,
                        "cotizacion": {
                            "id": "sicar-999",
                            "origen": "sicar",
                            "folio": "SIC-9",
                            "cliente": "Cliente DF",
                            "fecha": "2026-07-04",
                        },
                        "lineas": [],
                    },
                ],
            },
            format="json",
        )
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED, create_res.data)

        pend.refresh_from_db()
        canc.refresh_from_db()
        already.refresh_from_db()
        self.assertEqual(pend.status, "AUTORIZADA")
        self.assertEqual(canc.status, "CANCELADA")
        self.assertEqual(already.status, "AUTORIZADA")
