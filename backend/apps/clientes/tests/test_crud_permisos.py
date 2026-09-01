"""
CRM (`apps.clientes`): permisos por módulo, tipos de entidad y aislamiento de
los sub-recursos.

El punto sensible es `ClientesCatalogPermission`: abre el GET de clientes a
usuarios del módulo órdenes para que los formularios tengan catálogo. Esa
excepción debe quedar acotada — no debe filtrar escritura ni alcanzar contactos
ni documentos.
"""


from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.clientes.models import Cliente, ClienteContacto
from apps.users.models import UserPermissions

User = get_user_model()

CLIENTES_URL = "/api/clientes/"


def _crear_usuario(username, permisos=None, **kwargs):
    user = User.objects.create_user(username=username, password="test-pass-123", **kwargs)
    if permisos is not None:
        UserPermissions.objects.create(user=user, permissions=permisos)
    return user


class ClientesPermisosTests(APITestCase):
    """Listado y detalle por ID deben negarse igual cuando falta `view`."""

    def setUp(self):
        self.cliente = Cliente.objects.create(nombre="ACME S.A. de C.V.")
        self.detalle_url = f"{CLIENTES_URL}{self.cliente.id}/"

    def test_anonimo_denegado_en_listado_y_detalle(self):
        self.assertEqual(
            self.client.get(CLIENTES_URL).status_code, status.HTTP_401_UNAUTHORIZED
        )
        self.assertEqual(
            self.client.get(self.detalle_url).status_code, status.HTTP_401_UNAUTHORIZED
        )

    def test_sin_permiso_403_en_listado_y_tambien_en_detalle_por_id(self):
        """
        Un 403 en el listado no sirve de nada si el detalle por ID se cuela:
        el ID es adivinable (autoincremental).
        """
        user = _crear_usuario("sin_clientes_crud", {"clientes": {}})
        self.client.force_authenticate(user=user)
        self.assertEqual(self.client.get(CLIENTES_URL).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get(self.detalle_url).status_code, status.HTTP_403_FORBIDDEN)

    def test_view_false_explicito_tambien_deniega_el_detalle(self):
        user = _crear_usuario("clientes_view_false", {"clientes": {"view": False}})
        self.client.force_authenticate(user=user)
        self.assertEqual(self.client.get(self.detalle_url).status_code, status.HTTP_403_FORBIDDEN)

    def test_detalle_de_cliente_inexistente_no_filtra_existencia(self):
        """Sin permiso, el 403 debe llegar antes que cualquier 404."""
        user = _crear_usuario("clientes_404", {"clientes": {}})
        self.client.force_authenticate(user=user)
        response = self.client.get(f"{CLIENTES_URL}999999/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_view_permite_listar_y_ver_detalle(self):
        user = _crear_usuario("clientes_lector", {"clientes": {"view": True}})
        self.client.force_authenticate(user=user)
        self.assertEqual(self.client.get(CLIENTES_URL).status_code, status.HTTP_200_OK)
        detalle = self.client.get(self.detalle_url)
        self.assertEqual(detalle.status_code, status.HTTP_200_OK)
        self.assertEqual(detalle.data["nombre"], "ACME S.A. de C.V.")

    def test_lector_no_puede_crear_editar_ni_borrar(self):
        user = _crear_usuario("clientes_solo_lectura", {"clientes": {"view": True}})
        self.client.force_authenticate(user=user)
        self.assertEqual(
            self.client.post(CLIENTES_URL, {"nombre": "Nuevo"}, format="json").status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(
            self.client.patch(self.detalle_url, {"nombre": "Otro"}, format="json").status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(
            self.client.delete(self.detalle_url).status_code, status.HTTP_403_FORBIDDEN
        )
        self.cliente.refresh_from_db()
        self.assertEqual(self.cliente.nombre, "ACME S.A. de C.V.")

    def test_delete_exige_delete_aunque_tenga_edit(self):
        user = _crear_usuario(
            "clientes_editor", {"clientes": {"view": True, "edit": True, "delete": False}}
        )
        self.client.force_authenticate(user=user)
        self.assertEqual(
            self.client.delete(self.detalle_url).status_code, status.HTTP_403_FORBIDDEN
        )
        self.assertTrue(Cliente.objects.filter(pk=self.cliente.pk).exists())

    def test_delete_con_permiso_borra(self):
        user = _crear_usuario(
            "clientes_borrador", {"clientes": {"view": True, "delete": True}}
        )
        self.client.force_authenticate(user=user)
        response = self.client.delete(self.detalle_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Cliente.objects.filter(pk=self.cliente.pk).exists())

    def test_solo_create_no_modifica_un_cliente_ajeno(self):
        """
        `ModulePermission` deja pasar el PATCH y delega la autoría a
        `has_object_permission`. Como `Cliente` no tiene `creado_por`, nunca hay
        autoría demostrable: el registro NO debe cambiar.
        """
        user = _crear_usuario("clientes_capturista", {"clientes": {"create": True}})
        self.client.force_authenticate(user=user)
        response = self.client.patch(self.detalle_url, {"nombre": "Secuestrado"}, format="json")
        self.assertIn(
            response.status_code,
            (status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN),
        )
        self.cliente.refresh_from_db()
        self.assertEqual(self.cliente.nombre, "ACME S.A. de C.V.")

    def test_patch_denegado_devuelve_403_no_400(self):
        """Regresión: un `PermissionDenied` debe salir como 403, no como 400.

        El `except Exception` de `update()` atrapaba también las excepciones de
        DRF, así que el frontend no podía distinguir «sin permiso» de «datos
        inválidos» y en logs el 403 quedaba como error de validación.
        Corregido dejando pasar `APIException`/`Http404` antes del genérico.
        """
        user = _crear_usuario("clientes_capturista_403", {"clientes": {"create": True}})
        self.client.force_authenticate(user=user)
        response = self.client.patch(self.detalle_url, {"nombre": "Secuestrado"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_patch_de_cliente_inexistente_devuelve_404_no_400(self):
        """Regresión: PATCH a un ID inexistente devuelve 404, igual que GET/DELETE.

        El mismo `except Exception` convertía el `NotFound` en 400 y dejaba la
        API incoherente consigo misma.
        """
        admin = _crear_usuario("clientes_admin_404", None, is_staff=True)
        self.client.force_authenticate(user=admin)
        response = self.client.patch(f"{CLIENTES_URL}999999/", {"nombre": "X"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_y_delete_de_cliente_inexistente_si_devuelven_404(self):
        """Contraparte del bug anterior: los verbos no envueltos sí dan 404."""
        admin = _crear_usuario("clientes_admin_404_ok", None, is_staff=True)
        self.client.force_authenticate(user=admin)
        self.assertEqual(
            self.client.get(f"{CLIENTES_URL}999999/").status_code, status.HTTP_404_NOT_FOUND
        )
        self.assertEqual(
            self.client.delete(f"{CLIENTES_URL}999999/").status_code, status.HTTP_404_NOT_FOUND
        )

    def test_admin_hace_bypass(self):
        admin = _crear_usuario("clientes_admin", {"clientes": {"view": False}}, is_staff=True)
        self.client.force_authenticate(user=admin)
        self.assertEqual(self.client.get(CLIENTES_URL).status_code, status.HTTP_200_OK)


class ClientesCatalogoParaOrdenesTests(APITestCase):
    """
    Excepción documentada: quien usa órdenes puede leer el catálogo de clientes
    sin tener el módulo Contactos. La excepción es de **solo lectura**.
    """

    def setUp(self):
        self.cliente = Cliente.objects.create(nombre="Cliente de orden")
        self.user = _crear_usuario("tecnico_ordenes", {"ordenes": {"view": True}})
        self.client.force_authenticate(user=self.user)

    def test_usuario_de_ordenes_puede_leer_clientes(self):
        self.assertEqual(self.client.get(CLIENTES_URL).status_code, status.HTTP_200_OK)
        self.assertEqual(
            self.client.get(f"{CLIENTES_URL}{self.cliente.id}/").status_code, status.HTTP_200_OK
        )

    def test_usuario_de_ordenes_no_puede_escribir_clientes(self):
        self.assertEqual(
            self.client.post(CLIENTES_URL, {"nombre": "Colado"}, format="json").status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(
            self.client.patch(
                f"{CLIENTES_URL}{self.cliente.id}/", {"nombre": "X"}, format="json"
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(
            self.client.delete(f"{CLIENTES_URL}{self.cliente.id}/").status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_la_excepcion_no_alcanza_contactos_ni_documentos(self):
        """
        `ClienteContactoViewSet` usa el permiso estricto y documentos exige
        admin: el atajo de órdenes no debe abrir datos personales de contactos.
        """
        self.assertEqual(
            self.client.get("/api/cliente-contactos/").status_code, status.HTTP_403_FORBIDDEN
        )
        self.assertEqual(
            self.client.get("/api/cliente-documentos/").status_code, status.HTTP_403_FORBIDDEN
        )

    def test_ordenes_sin_ningun_flag_no_abre_el_catalogo(self):
        pelado = _crear_usuario(
            "ordenes_apagado",
            {"ordenes": {"view": False, "create": False, "edit": False, "delete": False}},
        )
        self.client.force_authenticate(user=pelado)
        self.assertEqual(self.client.get(CLIENTES_URL).status_code, status.HTTP_403_FORBIDDEN)


class ClientesCrudTests(APITestCase):
    """Alta / edición y validación de tipo de entidad."""

    def setUp(self):
        self.user = _crear_usuario(
            "crm_full",
            {"clientes": {"view": True, "create": True, "edit": True, "delete": True}},
        )
        self.client.force_authenticate(user=self.user)

    def test_alta_asigna_idx_automatico(self):
        response = self.client.post(CLIENTES_URL, {"nombre": "Primero"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["idx"], 1)

    def test_idx_reutiliza_huecos_y_no_choca(self):
        """`Cliente.save()` busca el primer `idx` libre; `idx` es UNIQUE."""
        Cliente.objects.create(nombre="Uno")  # idx 1
        segundo = Cliente.objects.create(nombre="Dos")  # idx 2
        segundo_id = segundo.id
        Cliente.objects.filter(pk=segundo_id).delete()

        response = self.client.post(CLIENTES_URL, {"nombre": "Tres"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["idx"], 2)
        self.assertEqual(Cliente.objects.filter(idx=2).count(), 1)

    def test_idx_es_de_solo_lectura(self):
        """No debe poderse pisar el consecutivo desde el payload."""
        response = self.client.post(
            CLIENTES_URL, {"nombre": "Con idx", "idx": 5000}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["idx"], 1)

    def test_nombre_es_obligatorio(self):
        response = self.client.post(CLIENTES_URL, {"telefono": "555"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("nombre", response.data)

    def test_tipo_por_defecto_es_empresa(self):
        response = self.client.post(CLIENTES_URL, {"nombre": "Sin tipo"}, format="json")
        self.assertEqual(response.data["tipo"], "EMPRESA")

    def test_acepta_los_tres_tipos_del_catalogo(self):
        for tipo in ("EMPRESA", "PERSONA_FISICA", "PROVEEDOR"):
            with self.subTest(tipo=tipo):
                response = self.client.post(
                    CLIENTES_URL, {"nombre": f"Entidad {tipo}", "tipo": tipo}, format="json"
                )
                self.assertEqual(response.status_code, status.HTTP_201_CREATED)
                self.assertEqual(response.data["tipo"], tipo)

    def test_tipo_invalido_es_rechazado(self):
        """
        Inventario resuelve el proveedor de una factura filtrando por
        `tipo='PROVEEDOR'` (`obtener_o_crear_proveedor`). Un tipo libre
        rompería silenciosamente ese enlace.
        """
        for tipo in ("proveedor", "PROVEEDORES", "CLIENTE", ""):
            with self.subTest(tipo=tipo):
                response = self.client.post(
                    CLIENTES_URL, {"nombre": "Tipo malo", "tipo": tipo}, format="json"
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn("tipo", response.data)

    def test_filtro_por_tipo_aisla_proveedores(self):
        """`GET /api/clientes/?tipo=PROVEEDOR` alimenta el selector de inventario."""
        Cliente.objects.create(nombre="SYSCOM", tipo="PROVEEDOR")
        Cliente.objects.create(nombre="TVC", tipo="PROVEEDOR")
        Cliente.objects.create(nombre="Cliente normal", tipo="EMPRESA")

        response = self.client.get(f"{CLIENTES_URL}?tipo=PROVEEDOR")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        nombres = {c["nombre"] for c in response.data["results"]}
        self.assertEqual(nombres, {"SYSCOM", "TVC"})

    def test_correo_invalido_es_rechazado(self):
        response = self.client.post(
            CLIENTES_URL, {"nombre": "Correo malo", "correo": "no-es-correo"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("correo", response.data)

    def test_patch_actualiza_sin_perder_campos(self):
        cliente = Cliente.objects.create(nombre="Original", rfc="XAXX010101000", tipo="EMPRESA")
        response = self.client.patch(
            f"{CLIENTES_URL}{cliente.id}/", {"telefono": "5551234567"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        cliente.refresh_from_db()
        self.assertEqual(cliente.telefono, "5551234567")
        self.assertEqual(cliente.rfc, "XAXX010101000")
        self.assertEqual(cliente.nombre, "Original")

    def test_busqueda_por_rfc_y_correo(self):
        Cliente.objects.create(nombre="Buscable", rfc="ABC010101XYZ", correo="hola@example.test")
        Cliente.objects.create(nombre="Otro", rfc="ZZZ999999ZZZ")

        por_rfc = self.client.get(f"{CLIENTES_URL}?search=ABC010101XYZ")
        self.assertEqual(por_rfc.data["count"], 1)
        self.assertEqual(por_rfc.data["results"][0]["nombre"], "Buscable")

        por_correo = self.client.get(f"{CLIENTES_URL}?search=hola@example.test")
        self.assertEqual(por_correo.data["count"], 1)

    def test_listado_pagina_con_page_size(self):
        for i in range(5):
            Cliente.objects.create(nombre=f"Cliente {i}")
        response = self.client.get(f"{CLIENTES_URL}?page_size=2")
        self.assertEqual(response.data["count"], 5)
        self.assertEqual(len(response.data["results"]), 2)


class ClienteContactosTests(APITestCase):
    """Contactos: permiso estricto del módulo y regla del contacto principal."""

    def setUp(self):
        self.cliente = Cliente.objects.create(nombre="Con contactos")
        self.user = _crear_usuario(
            "crm_contactos",
            {"clientes": {"view": True, "create": True, "edit": True, "delete": True}},
        )
        self.client.force_authenticate(user=self.user)

    def test_primer_contacto_queda_como_principal(self):
        response = self.client.post(
            "/api/cliente-contactos/",
            {"cliente": self.cliente.id, "nombre_apellido": "Ana Pérez"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["is_principal"])

    def test_segundo_contacto_no_se_vuelve_principal_solo(self):
        ClienteContacto.objects.create(cliente=self.cliente, nombre_apellido="Ana Pérez")
        response = self.client.post(
            "/api/cliente-contactos/",
            {"cliente": self.cliente.id, "nombre_apellido": "Luis Gómez"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(response.data["is_principal"])

    def test_filtro_por_cliente_no_mezcla_contactos_de_otro(self):
        otro = Cliente.objects.create(nombre="Otro cliente")
        ClienteContacto.objects.create(cliente=self.cliente, nombre_apellido="Ana Pérez")
        ClienteContacto.objects.create(cliente=otro, nombre_apellido="Ajeno")

        response = self.client.get(f"/api/cliente-contactos/?cliente={self.cliente.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([c["nombre_apellido"] for c in response.data], ["Ana Pérez"])

    def test_contactos_exigen_el_modulo_clientes_sin_atajos(self):
        lector_ordenes = _crear_usuario("solo_ordenes_contactos", {"ordenes": {"view": True}})
        self.client.force_authenticate(user=lector_ordenes)
        self.assertEqual(
            self.client.get("/api/cliente-contactos/").status_code, status.HTTP_403_FORBIDDEN
        )

    def test_borrar_cliente_arrastra_sus_contactos(self):
        ClienteContacto.objects.create(cliente=self.cliente, nombre_apellido="Ana Pérez")
        self.client.delete(f"{CLIENTES_URL}{self.cliente.id}/")
        self.assertEqual(ClienteContacto.objects.count(), 0)


class ClienteDocumentosTests(APITestCase):
    """Documentos: solo admin (`IsAdminUser`), sin excepción por módulo."""

    def test_usuario_con_crm_completo_sigue_sin_acceso(self):
        user = _crear_usuario(
            "crm_docs",
            {"clientes": {"view": True, "create": True, "edit": True, "delete": True}},
        )
        self.client.force_authenticate(user=user)
        self.assertEqual(
            self.client.get("/api/cliente-documentos/").status_code, status.HTTP_403_FORBIDDEN
        )

    def test_admin_puede_listar(self):
        admin = _crear_usuario("docs_admin", None, is_staff=True)
        self.client.force_authenticate(user=admin)
        self.assertEqual(
            self.client.get("/api/cliente-documentos/").status_code, status.HTTP_200_OK
        )

    def test_alta_sin_archivo_responde_400_sin_tocar_cloudinary(self):
        admin = _crear_usuario("docs_admin_post", None, is_staff=True)
        cliente = Cliente.objects.create(nombre="Doc")
        self.client.force_authenticate(user=admin)
        response = self.client.post(
            "/api/cliente-documentos/", {"cliente": cliente.id}, format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("archivo", response.data)
