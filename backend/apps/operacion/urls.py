from django.urls import path

from .wialon_unit_views import (
    WialonAccessUsersView,
    WialonUnitAccessRevokeView,
    WialonUnitAccessView,
    WialonUnitCatalogsView,
    WialonUnitDetailView,
)
from .wialon_views import (
    WialonUnitsSearchIndexView,
    WialonUsuarioDetailView,
    WialonUsuarioUnidadesView,
    WialonUsuariosView,
)

urlpatterns = [
    path("wialon/usuarios/", WialonUsuariosView.as_view(), name="wialon-usuarios"),
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
        "wialon/unidades/<int:unit_id>/accesos/",
        WialonUnitAccessView.as_view(),
        name="wialon-unit-access-grant",
    ),
    path(
        "wialon/unidades/<int:unit_id>/accesos/<int:user_id>/",
        WialonUnitAccessRevokeView.as_view(),
        name="wialon-unit-access-revoke",
    ),
]
