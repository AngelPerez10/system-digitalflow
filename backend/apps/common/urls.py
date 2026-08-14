from django.urls import path

from . import views

urlpatterns = [
    path("marca/", views.MarcaSistemaView.as_view(), name="marca-sistema"),
    path("marca/logo/", views.MarcaLogoUploadView.as_view(), name="marca-logo"),
]
