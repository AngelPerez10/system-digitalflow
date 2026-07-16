from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .syscom_views import (
    SyscomCategoriasView,
    SyscomMarcasView,
    SyscomProductoDetalleView,
    SyscomProductosSearchView,
    SyscomTipoCambioView,
)
from .tvc_views import (
    TvcCategoriasView,
    TvcMarcasView,
    TvcProductoDetalleView,
    TvcProductosSearchView,
    TvcTipoCambioView,
)
from .views import ConceptoViewSet, ProductoManualViewSet, ServicioViewSet

router = DefaultRouter()
router.register(r'servicios', ServicioViewSet, basename='servicio')
router.register(r'conceptos', ConceptoViewSet, basename='concepto')
router.register(r'productos-manuales', ProductoManualViewSet, basename='producto-manual')

urlpatterns = [
    path('', include(router.urls)),
    path('productos/syscom/productos/', SyscomProductosSearchView.as_view()),
    path('productos/syscom/productos/<str:product_id>/', SyscomProductoDetalleView.as_view()),
    path('productos/syscom/categorias/', SyscomCategoriasView.as_view()),
    path('productos/syscom/marcas/', SyscomMarcasView.as_view()),
    path('productos/syscom/tipocambio/', SyscomTipoCambioView.as_view()),
    path('productos/tvc/productos/', TvcProductosSearchView.as_view()),
    path('productos/tvc/productos/<str:product_id>/', TvcProductoDetalleView.as_view()),
    path('productos/tvc/categorias/', TvcCategoriasView.as_view()),
    path('productos/tvc/marcas/', TvcMarcasView.as_view()),
    path('productos/tvc/tipocambio/', TvcTipoCambioView.as_view()),
]
