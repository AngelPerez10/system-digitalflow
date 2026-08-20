from django.urls import path
from rest_framework.routers import DefaultRouter

from .poliza_views import (
    PolizaMantenimientoPdfView,
    PolizaMantenimientoViewSet,
    PolizaMantenimientoXmlView,
)
from .views import ProyectoInstalacionViewSet, ProyectoViewSet
from .wialon_unit_views import (
    WialonAccessUsersView,
    WialonUnitAccessRevokeView,
    WialonUnitAccessView,
    WialonUnitActiveView,
    WialonUnitCatalogsView,
    WialonUnitDetailView,
)
from .wialon_views import (
    WialonPurgeBlockedView,
    WialonUnitsSearchIndexView,
    WialonUsuarioDetailView,
    WialonUsuariosView,
    WialonUsuarioUnidadesView,
)

router = DefaultRouter()
router.register(r"proyectos", ProyectoViewSet, basename="proyecto")
router.register(r"proyecto-instalaciones", ProyectoInstalacionViewSet, basename="proyecto-instalacion")
router.register(r"polizas-mantenimiento", PolizaMantenimientoViewSet, basename="poliza-mantenimiento")

urlpatterns = [
    path(
        "polizas-mantenimiento/pdf/",
        PolizaMantenimientoPdfView.as_view(),
        name="poliza-mantenimiento-pdf",
    ),
    path(
        "polizas-mantenimiento/xml/",
        PolizaMantenimientoXmlView.as_view(),
        name="poliza-mantenimiento-xml",
    ),
    path("wialon/usuarios/", WialonUsuariosView.as_view(), name="wialon-usuarios"),
    path(
        "wialon/usuarios/limpiar-bloqueados/",
        WialonPurgeBlockedView.as_view(),
        name="wialon-purge-blocked",
    ),
    path(
        "wialon/indice-unidades/",
        WialonUnitsSearchIndexView.as_view(),
        name="wialon-units-search-index",
    ),
    path(
        "wialon/usuarios/<int:wialon_user_id>/",
        WialonUsuarioDetailView.as_view(),
        name="wialon-usuario-detail",
    ),
    path(
        "wialon/usuarios/<int:wialon_user_id>/unidades/",
        WialonUsuarioUnidadesView.as_view(),
        name="wialon-usuario-unidades",
    ),
    path(
        "wialon/catalogos/unidades/",
        WialonUnitCatalogsView.as_view(),
        name="wialon-unit-catalogs",
    ),
    path(
        "wialon/usuarios-acceso/",
        WialonAccessUsersView.as_view(),
        name="wialon-access-users",
    ),
    path(
        "wialon/unidades/<int:unit_id>/",
        WialonUnitDetailView.as_view(),
        name="wialon-unit-detail",
    ),
    path(
        "wialon/unidades/<int:unit_id>/activo/",
        WialonUnitActiveView.as_view(),
        name="wialon-unit-active",
    ),
    path(
        "wialon/unidades/<int:unit_id>/accesos/",
        WialonUnitAccessView.as_view(),
        name="wialon-unit-access-grant",
    ),
    path(
        "wialon/unidades/<int:unit_id>/accesos/<int:user_id>/",
        WialonUnitAccessRevokeView.as_view(),
        name="wialon-unit-access-revoke",
    ),
] + router.urls
