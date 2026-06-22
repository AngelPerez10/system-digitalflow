from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .sicar_views import (
    SicarClienteDetailView,
    SicarClientesSearchView,
    SicarFacturaCatalogosView,
    SicarFacturaDetalleView,
    SicarFacturaPdfView,
    SicarFacturaXmlView,
    SicarFacturasListView,
)
from .views import CotizacionViewSet

router = DefaultRouter()
router.register(r'cotizaciones', CotizacionViewSet, basename='cotizacion')

urlpatterns = [
    path('', include(router.urls)),
    path('cotizaciones-sicar/facturas/', SicarFacturasListView.as_view(), name='cotizaciones-sicar-facturas'),
    path('cotizaciones-sicar/catalogos/', SicarFacturaCatalogosView.as_view(), name='cotizaciones-sicar-catalogos'),
    path('cotizaciones-sicar/clientes/', SicarClientesSearchView.as_view(), name='cotizaciones-sicar-clientes'),
    path(
        'cotizaciones-sicar/clientes/<int:cli_id>/',
        SicarClienteDetailView.as_view(),
        name='cotizaciones-sicar-cliente-detalle',
    ),
    path(
        'cotizaciones-sicar/facturas/<int:fcf_id>/detalle/',
        SicarFacturaDetalleView.as_view(),
        name='cotizaciones-sicar-facturas-detalle',
    ),
    path(
        'cotizaciones-sicar/facturas/<int:fcf_id>/xml/',
        SicarFacturaXmlView.as_view(),
        name='cotizaciones-sicar-facturas-xml',
    ),
    path(
        'cotizaciones-sicar/facturas/<int:fcf_id>/pdf/',
        SicarFacturaPdfView.as_view(),
        name='cotizaciones-sicar-facturas-pdf',
    ),
]
