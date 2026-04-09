from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ConceptoViewSet, ServicioViewSet
from .syscom_views import (
    SyscomCategoriasView,
    SyscomMarcasView,
    SyscomProductoDetalleView,
    SyscomProductosSearchView,
    SyscomTipoCambioView,
)

router = DefaultRouter()
router.register(r'servicios', ServicioViewSet, basename='servicio')
router.register(r'conceptos', ConceptoViewSet, basename='concepto')

urlpatterns = [
    path('', include(router.urls)),
    path('productos/syscom/productos/', SyscomProductosSearchView.as_view()),
    path('productos/syscom/productos/<str:product_id>/', SyscomProductoDetalleView.as_view()),
    path('productos/syscom/categorias/', SyscomCategoriasView.as_view()),
    path('productos/syscom/marcas/', SyscomMarcasView.as_view()),
    path('productos/syscom/tipocambio/', SyscomTipoCambioView.as_view()),
]
