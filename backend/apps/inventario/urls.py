from django.urls import path

from . import views

urlpatterns = [
    path('inventario/scan/', views.ScanView.as_view(), name='inventario-scan'),
]
