from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ProductoDocumentoViewSet, ProductoImagenViewSet, ProductoViewSet

router = DefaultRouter()
router.register(r'productos', ProductoViewSet, basename='producto')
router.register(r'producto-imagenes', ProductoImagenViewSet, basename='producto-imagen')
router.register(r'producto-documentos', ProductoDocumentoViewSet, basename='producto-documento')

urlpatterns = [
    path('', include(router.urls)),
]
