"""
Matriz de casos frontera de `apps.users.permissions`.

`ModulePermission` es el único guardián del backend para los módulos JSON: si
concede de más, cualquier usuario autenticado entra a módulos ajenos; si
concede de menos, técnicos legítimos quedan bloqueados. Estos tests fijan el
contrato en los bordes reales de datos sucios en `UserPermissions.permissions`
(claves faltantes, `None`, strings, mayúsculas, valores no-dict).
"""


from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIRequestFactory, APITestCase

from apps.users.models import UserPermissions
from apps.users.permissions import (
    CotizacionesSendPdfPermission,
    InventarioPermission,
    ModulePermission,
    OrdenesAnyAccessPermission,
    OrdenesPermission,
    OrdenesSendPdfPermission,
    ProyectosSendPdfPermission,
    user_has_any_cotizaciones_access,
    user_has_any_ordenes_access,
    user_module_own_only,
)

User = get_user_model()


class _SinModuleKey(ModulePermission):
    """Subclase mal escrita a propósito: no define `module_key`."""


class _ReportesPermission(ModulePermission):
    """Réplica local de la clase de `apps.ordenes` para probar el fallback."""

    module_key = 'reportes'


class _ObjetoConDueno:
    """Doble mínimo de un modelo con `creado_por_id`."""

    def __init__(self, creado_por_id=None):
        self.creado_por_id = creado_por_id


class PermisosBaseTests(TestCase):
    """`has_permission`: método HTTP → clave de permiso."""

    def setUp(self):
        self.factory = APIRequestFactory()

    def _usuario(self, nombre, permisos=None, **kwargs):
        user = User.objects.create_user(username=nombre, password="test-pass-123", **kwargs)
        if permisos is not None:
            UserPermissions.objects.create(user=user, permissions=permisos)
        return user

    def _permite(self, permiso, metodo, user):
        request = getattr(self.factory, metodo.lower())("/api/ordenes/")
        request.user = user
        return permiso.has_permission(request, None)

    def test_subclase_sin_module_key_falla_ruidosamente(self):
        """Mejor un 500 en desarrollo que un permiso que concede por accidente."""
        request = self.factory.get("/api/lo-que-sea/")
        request.user = self._usuario("sin_key")
        with self.assertRaises(NotImplementedError):
            _SinModuleKey().has_permission(request, None)

    def test_usuario_anonimo_denegado(self):
        request = self.factory.get("/api/ordenes/")
        request.user = AnonymousUser()
        self.assertFalse(OrdenesPermission().has_permission(request, None))

    def test_sin_request_user_denegado(self):
        request = self.factory.get("/api/ordenes/")
        self.assertFalse(OrdenesPermission().has_permission(request, None))

    def test_usuario_sin_userpermissions_denegado(self):
        """
        Caso real: usuario creado por script/admin sin fila en `UserPermissions`.
        No debe heredar acceso implícito a ningún módulo.
        """
        user = self._usuario("sin_perfil")  # sin UserPermissions
        self.assertFalse(self._permite(OrdenesPermission(), "get", user))
        self.assertFalse(self._permite(OrdenesPermission(), "post", user))
        self.assertFalse(self._permite(OrdenesPermission(), "patch", user))
        self.assertFalse(self._permite(OrdenesPermission(), "delete", user))

    def test_modulo_ausente_en_el_json_denegado(self):
        user = self._usuario("otros_modulos", {"cotizaciones": {"view": True}})
        self.assertFalse(self._permite(OrdenesPermission(), "get", user))

    def test_view_ausente_es_denegado(self):
        """`{}` no es lo mismo que `{"view": True}`: sin la clave se niega."""
        user = self._usuario("view_ausente", {"ordenes": {"create": True}})
        self.assertFalse(self._permite(OrdenesPermission(), "get", user))

    def test_view_none_es_denegado(self):
        """El front a veces guarda `null`; `null` nunca debe leerse como `True`."""
        user = self._usuario("view_none", {"ordenes": {"view": None}})
        self.assertFalse(self._permite(OrdenesPermission(), "get", user))

    def test_view_false_es_denegado(self):
        user = self._usuario("view_false", {"ordenes": {"view": False}})
        self.assertFalse(self._permite(OrdenesPermission(), "get", user))

    def test_view_string_true_es_concedido(self):
        """JSON legado guardaba strings; `"true"` sí concede (tolerancia explícita)."""
        user = self._usuario("view_str", {"ordenes": {"view": "true"}})
        self.assertTrue(self._permite(OrdenesPermission(), "get", user))

    def test_view_string_arbitrario_es_denegado(self):
        """Cualquier otro string (`"1"`, `"yes"`) NO debe conceder."""
        for valor in ("1", "yes", "sí", "on", ""):
            with self.subTest(valor=valor):
                user = self._usuario(f"view_raro_{valor or 'vacio'}", {"ordenes": {"view": valor}})
                self.assertFalse(self._permite(OrdenesPermission(), "get", user))

    def test_modulo_no_es_dict_no_revienta_y_deniega(self):
        """`{"ordenes": true}` es dato corrupto: denegar sin lanzar excepción."""
        for corrupto in (True, "todo", 1, ["view"]):
            with self.subTest(corrupto=corrupto):
                user = self._usuario(
                    f"corrupto_{type(corrupto).__name__}_{corrupto!s:.4}",
                    {"ordenes": corrupto},
                )
                self.assertFalse(self._permite(OrdenesPermission(), "get", user))

    def test_permissions_no_es_dict_no_revienta_y_deniega(self):
        """Regresión: un `permissions` no-dict debe denegar, nunca lanzar 500.

        `has_permission` hacía `permissions.get(...)` antes de comprobar el tipo
        (el `isinstance` venía después), así que una lista guardada en el
        JSONField provocaba `AttributeError: 'list' object has no attribute
        'get'` → HTTP 500 en **cada** petición de esa cuenta.
        Corregido normalizando `permissions` a `{}` al leerlo.
        """
        user = self._usuario("perms_lista", ["ordenes"])
        self.assertFalse(self._permite(OrdenesPermission(), "get", user))

    def test_clave_de_modulo_con_mayusculas_es_tolerada(self):
        """Admins que guardaron "Ordenes" no deben perder el acceso."""
        user = self._usuario("mayusculas", {"Ordenes": {"view": True}})
        self.assertTrue(self._permite(OrdenesPermission(), "get", user))

    def test_metodos_http_exigen_su_propia_clave(self):
        user = self._usuario(
            "solo_view",
            {"ordenes": {"view": True, "create": False, "edit": False, "delete": False}},
        )
        self.assertTrue(self._permite(OrdenesPermission(), "get", user))
        self.assertTrue(self._permite(OrdenesPermission(), "head", user))
        self.assertTrue(self._permite(OrdenesPermission(), "options", user))
        self.assertFalse(self._permite(OrdenesPermission(), "post", user))
        self.assertFalse(self._permite(OrdenesPermission(), "put", user))
        self.assertFalse(self._permite(OrdenesPermission(), "patch", user))
        self.assertFalse(self._permite(OrdenesPermission(), "delete", user))

    def test_create_implica_poder_intentar_patch(self):
        """`create` habilita PUT/PATCH a nivel vista; la autoría la valida el objeto."""
        user = self._usuario("solo_create", {"ordenes": {"create": True}})
        self.assertTrue(self._permite(OrdenesPermission(), "patch", user))
        self.assertTrue(self._permite(OrdenesPermission(), "put", user))
        self.assertFalse(self._permite(OrdenesPermission(), "delete", user))
        self.assertFalse(self._permite(OrdenesPermission(), "get", user))

    def test_delete_no_se_deduce_de_edit(self):
        user = self._usuario("editor", {"ordenes": {"view": True, "edit": True}})
        self.assertTrue(self._permite(OrdenesPermission(), "patch", user))
        self.assertFalse(self._permite(OrdenesPermission(), "delete", user))

    def test_staff_y_superuser_hacen_bypass(self):
        staff = self._usuario("staff_bypass", {"ordenes": {"view": False}}, is_staff=True)
        superuser = self._usuario("super_bypass", {"ordenes": {"view": False}}, is_superuser=True)
        for metodo in ("get", "post", "patch", "delete"):
            with self.subTest(metodo=metodo):
                self.assertTrue(self._permite(OrdenesPermission(), metodo, staff))
                self.assertTrue(self._permite(OrdenesPermission(), metodo, superuser))

    def test_reportes_hereda_de_ordenes_cuando_falta_la_clave(self):
        """Usuarios previos a la creación del módulo `reportes` no deben quedar fuera."""
        user = self._usuario(
            "reportes_legacy",
            {"ordenes": {"view": True, "create": True, "edit": True, "delete": True}},
        )
        self.assertTrue(self._permite(_ReportesPermission(), "get", user))
        self.assertTrue(self._permite(_ReportesPermission(), "post", user))
        self.assertTrue(self._permite(_ReportesPermission(), "delete", user))
        # `edit` se fuerza a False en el fallback, pero `create` habilita PATCH.
        self.assertTrue(self._permite(_ReportesPermission(), "patch", user))

    def test_reportes_explicito_gana_sobre_el_fallback(self):
        user = self._usuario(
            "reportes_explicito",
            {"ordenes": {"view": True}, "reportes": {"view": False}},
        )
        self.assertFalse(self._permite(_ReportesPermission(), "get", user))


class PermisosDeObjetoTests(TestCase):
    """`has_object_permission`: autoría cuando solo hay `create`."""

    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = User.objects.create_user(username="obj_user", password="test-pass-123")

    def _set_permisos(self, permisos):
        UserPermissions.objects.update_or_create(
            user=self.user, defaults={"permissions": permisos}
        )
        self.user.refresh_from_db()
        # Invalidar la caché de la relación OneToOne.
        if hasattr(self.user, "_state"):
            self.user._state.fields_cache.pop("permissions_profile", None)

    def _check(self, metodo, obj):
        request = getattr(self.factory, metodo.lower())("/api/ordenes/1/")
        request.user = self.user
        return OrdenesPermission().has_object_permission(request, None, obj)

    def test_lectura_de_objeto_siempre_permitida_tras_has_permission(self):
        self._set_permisos({"ordenes": {"view": True}})
        self.assertTrue(self._check("get", _ObjetoConDueno(creado_por_id=999)))

    def test_delete_exige_delete_aunque_tenga_edit(self):
        self._set_permisos({"ordenes": {"edit": True, "delete": False}})
        self.assertFalse(self._check("delete", _ObjetoConDueno(creado_por_id=self.user.id)))

    def test_edit_permite_modificar_objeto_ajeno(self):
        self._set_permisos({"ordenes": {"edit": True}})
        self.assertTrue(self._check("patch", _ObjetoConDueno(creado_por_id=999)))

    def test_solo_create_permite_modificar_lo_propio(self):
        self._set_permisos({"ordenes": {"create": True}})
        self.assertTrue(self._check("patch", _ObjetoConDueno(creado_por_id=self.user.id)))

    def test_solo_create_no_permite_modificar_lo_ajeno(self):
        """El caso que evita que un capturista edite órdenes de otro."""
        self._set_permisos({"ordenes": {"create": True}})
        self.assertFalse(self._check("patch", _ObjetoConDueno(creado_por_id=999)))

    def test_solo_create_con_objeto_sin_dueno_es_denegado(self):
        """Sin `creado_por` no se puede probar autoría: negar, no asumir."""
        self._set_permisos({"ordenes": {"create": True}})
        self.assertFalse(self._check("patch", _ObjetoConDueno(creado_por_id=None)))

    def test_inventario_comparte_ficha_entre_usuarios_con_create(self):
        """
        Inventario es la excepción documentada: la ficha del ítem es compartida,
        así que `create` basta para PATCH de cualquier ítem (no solo los propios).
        """
        self._set_permisos({"inventario": {"create": True}})
        request = self.factory.patch("/api/inventario/items/1/")
        request.user = self.user
        self.assertTrue(
            InventarioPermission().has_object_permission(
                request, None, _ObjetoConDueno(creado_por_id=999)
            )
        )

    def test_inventario_delete_sigue_exigiendo_delete(self):
        self._set_permisos({"inventario": {"create": True, "edit": True}})
        request = self.factory.delete("/api/inventario/items/1/")
        request.user = self.user
        self.assertFalse(
            InventarioPermission().has_object_permission(
                request, None, _ObjetoConDueno(creado_por_id=self.user.id)
            )
        )


class OwnOnlyTests(TestCase):
    """`user_module_own_only`: alcance «solo sus registros»."""

    def _usuario(self, nombre, permisos=None, **kwargs):
        user = User.objects.create_user(username=nombre, password="test-pass-123", **kwargs)
        if permisos is not None:
            UserPermissions.objects.create(user=user, permissions=permisos)
        return user

    def test_anonimo_no_es_own_only(self):
        self.assertFalse(user_module_own_only(AnonymousUser(), "ordenes"))
        self.assertFalse(user_module_own_only(None, "ordenes"))

    def test_ordenes_default_tecnico_es_own_only(self):
        """Sin la clave explícita, un no-staff solo ve sus órdenes."""
        user = self._usuario("tecnico_default", {"ordenes": {"view": True}})
        self.assertTrue(user_module_own_only(user, "ordenes"))

    def test_ordenes_default_staff_no_es_own_only(self):
        staff = self._usuario("staff_ordenes", {"ordenes": {"view": True}}, is_staff=True)
        self.assertFalse(user_module_own_only(staff, "ordenes"))

    def test_ordenes_own_only_false_explicito_abre_el_listado(self):
        """Switch «Ver todas las órdenes» de Gestión de usuarios."""
        user = self._usuario("ve_todas", {"ordenes": {"view": True, "own_only": False}})
        self.assertFalse(user_module_own_only(user, "ordenes"))

    def test_own_only_acepta_strings(self):
        user_true = self._usuario("own_str_true", {"ordenes": {"own_only": "true"}})
        user_false = self._usuario("own_str_false", {"ordenes": {"own_only": "false"}})
        self.assertTrue(user_module_own_only(user_true, "ordenes"))
        self.assertFalse(user_module_own_only(user_false, "ordenes"))

    def test_own_only_none_explicito_cae_a_false(self):
        """`{"own_only": null}` está presente, así que no aplica el default de órdenes."""
        user = self._usuario("own_none", {"ordenes": {"own_only": None}})
        self.assertFalse(user_module_own_only(user, "ordenes"))

    def test_otros_modulos_no_son_own_only_por_defecto(self):
        user = self._usuario("proy_user", {"proyectos": {"view": True}})
        self.assertFalse(user_module_own_only(user, "proyectos"))

    def test_ordenes_sin_perfil_de_permisos_es_own_only(self):
        user = self._usuario("sin_perfil_own")
        self.assertTrue(user_module_own_only(user, "ordenes"))


class AccesoTransversalTests(TestCase):
    """Helpers que abren catálogos a usuarios de órdenes / cotizaciones."""

    def setUp(self):
        self.factory = APIRequestFactory()

    def test_any_ordenes_access_con_cualquier_flag(self):
        for clave in ("view", "create", "edit", "delete"):
            with self.subTest(clave=clave):
                self.assertTrue(user_has_any_ordenes_access({"ordenes": {clave: True}}))

    def test_any_ordenes_access_falso_con_todo_apagado(self):
        self.assertFalse(
            user_has_any_ordenes_access(
                {"ordenes": {"view": False, "create": False, "edit": False, "delete": False}}
            )
        )
        self.assertFalse(user_has_any_ordenes_access({}))
        self.assertFalse(user_has_any_ordenes_access(None))

    def test_any_ordenes_access_ignora_own_only(self):
        """`own_only` no es un flag CRUD: no debe conceder acceso por sí solo."""
        self.assertFalse(user_has_any_ordenes_access({"ordenes": {"own_only": True}}))

    def test_any_cotizaciones_access(self):
        self.assertTrue(user_has_any_cotizaciones_access({"cotizaciones": {"edit": True}}))
        self.assertFalse(user_has_any_cotizaciones_access({"cotizaciones": {"view": False}}))

    def test_ordenes_any_access_permission_no_da_bypass_a_anonimos(self):
        request = self.factory.get("/api/clientes/")
        request.user = AnonymousUser()
        self.assertFalse(OrdenesAnyAccessPermission().has_permission(request, None))

    def test_ordenes_any_access_permission_con_solo_create(self):
        user = User.objects.create_user(username="any_access", password="test-pass-123")
        UserPermissions.objects.create(user=user, permissions={"ordenes": {"create": True}})
        request = self.factory.get("/api/clientes/")
        request.user = user
        self.assertTrue(OrdenesAnyAccessPermission().has_permission(request, None))


class EnvioPdfPermisosTests(TestCase):
    """Enviar PDF por correo: basta `view` en el módulo correspondiente."""

    def setUp(self):
        self.factory = APIRequestFactory()

    def _usuario(self, nombre, permisos, **kwargs):
        user = User.objects.create_user(username=nombre, password="test-pass-123", **kwargs)
        UserPermissions.objects.create(user=user, permissions=permisos)
        return user

    def test_enviar_pdf_orden_con_view(self):
        user = self._usuario("pdf_orden", {"ordenes": {"view": True}})
        request = self.factory.post("/api/ordenes/1/enviar-pdf/")
        request.user = user
        self.assertTrue(OrdenesSendPdfPermission().has_permission(request, None))

    def test_enviar_pdf_orden_sin_view_denegado(self):
        """Sin acceso al listado no se puede mandar el PDF de una orden ajena."""
        user = self._usuario("pdf_orden_no", {"ordenes": {"create": True}})
        request = self.factory.post("/api/ordenes/1/enviar-pdf/")
        request.user = user
        self.assertFalse(OrdenesSendPdfPermission().has_permission(request, None))

    def test_enviar_pdf_proyecto_y_cotizacion_no_se_cruzan(self):
        """Tener `view` en proyectos no debe habilitar el envío de cotizaciones."""
        user = self._usuario("pdf_cruce", {"proyectos": {"view": True}})
        request = self.factory.post("/api/cotizaciones/1/enviar-pdf/")
        request.user = user
        self.assertTrue(ProyectosSendPdfPermission().has_permission(request, None))
        self.assertFalse(CotizacionesSendPdfPermission().has_permission(request, None))


class DelegacionDePermisosApiTests(APITestCase):
    """
    `PUT /api/users/accounts/{id}/permissions/` — escalada de privilegios.

    Ser staff NO basta: solo la lista blanca `PERMISSION_DELEGATION_USERNAMES`
    puede repartir permisos, para que un admin comprometido no se auto-eleve ni
    eleve a terceros.
    """

    def setUp(self):
        self.objetivo = User.objects.create_user(username="objetivo", password="test-pass-123")
        UserPermissions.objects.create(user=self.objetivo, permissions={"ordenes": {"view": False}})
        self.url = f"/api/users/accounts/{self.objetivo.id}/permissions/"

    def _admin(self, username):
        return User.objects.create_user(
            username=username, password="test-pass-123", is_staff=True, is_superuser=True
        )

    def test_admin_fuera_de_la_lista_blanca_no_puede_delegar(self):
        self.client.force_authenticate(user=self._admin("otro_admin"))
        response = self.client.put(
            self.url, {"permissions": {"ordenes": {"view": True}}}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.objetivo.permissions_profile.refresh_from_db()
        self.assertEqual(
            self.objetivo.permissions_profile.permissions, {"ordenes": {"view": False}}
        )

    def test_no_admin_no_puede_ni_leer_permisos_ajenos(self):
        self.client.force_authenticate(user=self.objetivo)
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_403_FORBIDDEN)

    def test_usuario_delegado_si_puede_asignar_permisos(self):
        self.client.force_authenticate(user=self._admin("AngelPerez10"))
        response = self.client.put(
            self.url,
            {"permissions": {"ordenes": {"view": True, "create": True}}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.objetivo.permissions_profile.refresh_from_db()
        self.assertTrue(self.objetivo.permissions_profile.permissions["ordenes"]["view"])

    def test_permissions_no_dict_deja_la_cuenta_inutilizable(self):
        """Regresión: el serializer debe rechazar un `permissions` no-dict.

        Antes se persistía con 200 OK y dejaba la cuenta con permisos
        irrecuperables desde la UI. Ahora `validate_permissions` exige un objeto
        por módulo y responde 400.
        """
        self.client.force_authenticate(user=self._admin("AngelPerez10"))
        response = self.client.put(self.url, {"permissions": ["ordenes"]}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
