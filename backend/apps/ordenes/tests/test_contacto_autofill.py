"""Autollenado de `nombre_cliente` / `telefono_cliente` de la orden con los
datos que el cliente dio al registrarse en el portal.
"""

from datetime import date

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.clientes.models import Cliente
from apps.clientes.portal_models import ClientePortalAccount
from apps.ordenes.models import Orden
from apps.users.models import UserPermissions

User = get_user_model()


class ContactoAutofillTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin_af", password="test-pass-123", is_staff=True
        )
        UserPermissions.objects.create(user=self.admin, permissions={"ordenes": {"view": True}})
        self.client.force_authenticate(user=self.admin)

        # Cliente con cuenta de portal (registro del cliente)
        self.cliente_portal = Cliente.objects.create(
            nombre="ACME SA", celular="5512345678", telefono="0000000000"
        )
        self.portal_user = User.objects.create_user(
            username="10454001", password="x", first_name="Juan", last_name="Pérez López"
        )
        ClientePortalAccount.objects.create(
            user=self.portal_user, cliente=self.cliente_portal, portal_username="10454001"
        )

        # Cliente sin cuenta de portal
        self.cliente_sin_portal = Cliente.objects.create(nombre="Sin Portal SA", celular="5599999999")

    def test_crear_autollena_nombre_y_telefono(self):
        resp = self.client.post(
            "/api/ordenes/",
            {"cliente_id": self.cliente_portal.id, "status": "pendiente", "tipo_orden": "servicio_tecnico", "fecha_inicio": "2026-06-05"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        orden = Orden.objects.get(id=resp.data["id"])
        self.assertEqual(orden.nombre_cliente, "Juan Pérez López")
        self.assertEqual(orden.telefono_cliente, "5512345678")

    def test_crear_no_pisa_valor_dado(self):
        resp = self.client.post(
            "/api/ordenes/",
            {
                "cliente_id": self.cliente_portal.id,
                "nombre_cliente": "Contacto Manual",
                "telefono_cliente": "5500001111",
                "status": "pendiente",
                "tipo_orden": "servicio_tecnico",
                "fecha_inicio": "2026-06-05",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        orden = Orden.objects.get(id=resp.data["id"])
        self.assertEqual(orden.nombre_cliente, "Contacto Manual")
        self.assertEqual(orden.telefono_cliente, "5500001111")

    def test_crear_cliente_sin_portal_no_autollena(self):
        resp = self.client.post(
            "/api/ordenes/",
            {"cliente_id": self.cliente_sin_portal.id, "status": "pendiente", "tipo_orden": "servicio_tecnico", "fecha_inicio": "2026-06-05"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        orden = Orden.objects.get(id=resp.data["id"])
        self.assertFalse((orden.nombre_cliente or "").strip())

    def test_editar_rellena_campo_vacio(self):
        orden = Orden.objects.create(
            cliente_id=self.cliente_portal, status="pendiente", nombre_cliente="",
            fecha_inicio=date(2026, 6, 5)
        )
        resp = self.client.patch(
            f"/api/ordenes/{orden.id}/", {"problematica": "algo"}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        orden.refresh_from_db()
        self.assertEqual(orden.nombre_cliente, "Juan Pérez López")
        self.assertEqual(orden.telefono_cliente, "5512345678")
