from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ProductoImagenViewSet, ProductoViewSet, ServicioViewSet

router = DefaultRouter()
router.register(r'productos', ProductoViewSet, basename='producto')
router.register(r'servicios', ServicioViewSet, basename='servicio')
router.register(r'producto-imagenes', ProductoImagenViewSet, basename='producto-imagen')

urlpatterns = [
    path('', include(router.urls)),
]
