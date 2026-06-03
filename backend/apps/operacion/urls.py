from django.urls import path

from .wialon_views import WialonUsuarioDetailView, WialonUsuarioUnidadesView, WialonUsuariosView

urlpatterns = [
    path("wialon/usuarios/", WialonUsuariosView.as_view(), name="wialon-usuarios"),
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
]
