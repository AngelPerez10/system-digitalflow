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
