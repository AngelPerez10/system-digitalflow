from django.urls import path
from rest_framework.routers import DefaultRouter

from .m2m_views import (
    M2mSimDetailView,
    M2mSimResetView,
    M2mSimSmsView,
    M2mSimTestGprsView,
    M2mSimTestGsmView,
)
from .poliza_views import (
    PolizaMantenimientoPdfView,
    PolizaMantenimientoViewSet,
    PolizaMantenimientoXmlView,
)
from .reporte_mantenimiento_views import ReporteMantenimientoViewSet
from .views import ProyectoInstalacionViewSet, ProyectoViewSet
from .wialon_unit_views import (
    WialonAccessUsersView,
    WialonUnitAccessRevokeView,
    WialonUnitAccessView,
    WialonUnitActiveView,
    WialonUnitCatalogsView,
    WialonUnitDetailView,
    WialonUnitSmsView,
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
router.register(
    r"reportes-mantenimiento",
    ReporteMantenimientoViewSet,
    basename="reporte-mantenimiento",
)

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
        "wialon/unidades/<int:unit_id>/sms/",
        WialonUnitSmsView.as_view(),
        name="wialon-unit-sms",
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
    path("m2m/sims/detalle/", M2mSimDetailView.as_view(), name="m2m-sim-detalle"),
    path("m2m/sims/test-gsm/", M2mSimTestGsmView.as_view(), name="m2m-sim-test-gsm"),
    path("m2m/sims/test-gprs/", M2mSimTestGprsView.as_view(), name="m2m-sim-test-gprs"),
    path("m2m/sims/reset/", M2mSimResetView.as_view(), name="m2m-sim-reset"),
    path("m2m/sims/sms/", M2mSimSmsView.as_view(), name="m2m-sim-sms"),
] + router.urls
