"""Guardado de clientes: choque de `idx` en altas simultáneas y PATCH parcial."""
from unittest import mock

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from rest_framework.test import APIClient, APITestCase

from apps.clientes.models import Cliente


class ClienteGuardadoTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.admin = User.objects.create_user(username="adm-guardado", password="x", is_staff=True, is_superuser=True)
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def test_alta_reintenta_si_choca_el_idx(self):
        original_save = Cliente.save
        calls = {"n": 0}

        def flaky_save(instance, *args, **kwargs):
            calls["n"] += 1
            if calls["n"] == 1:
                raise IntegrityError("UNIQUE constraint failed: clientes_cliente.idx")
            return original_save(instance, *args, **kwargs)

        with mock.patch.object(Cliente, "save", flaky_save):
            res = self.client.post("/api/clientes/", {"nombre": "ACME", "telefono": "+526621234567"}, format="json")

        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(calls["n"], 2)
        self.assertEqual(Cliente.objects.filter(nombre="ACME").count(), 1)

    def test_alta_responde_409_si_el_choque_persiste(self):
        with mock.patch.object(Cliente, "save", side_effect=IntegrityError("dup")):
            res = self.client.post("/api/clientes/", {"nombre": "ACME"}, format="json")
        self.assertEqual(res.status_code, 409)
        self.assertEqual(Cliente.objects.count(), 0)

    def test_patch_no_borra_campos_que_no_envia(self):
        cliente = Cliente.objects.create(nombre="ACME", telefono="+526621234567", calle="Juárez", ciudad="Colima")
        res = self.client.patch(f"/api/clientes/{cliente.id}/", {"nombre": "ACME SA"}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        cliente.refresh_from_db()
        self.assertEqual(cliente.nombre, "ACME SA")
        self.assertEqual(cliente.calle, "Juárez")
        self.assertEqual(cliente.ciudad, "Colima")
