from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CotizacionViewSet
from .sicar_views import (
    SicarFacturaDetalleView,
    SicarFacturaPdfView,
    SicarFacturaXmlView,
    SicarFacturasListView,
)

router = DefaultRouter()
router.register(r'cotizaciones', CotizacionViewSet, basename='cotizacion')

urlpatterns = [
    path('', include(router.urls)),
    path('cotizaciones-sicar/facturas/', SicarFacturasListView.as_view(), name='cotizaciones-sicar-facturas'),
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
