from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClienteContactoViewSet, ClienteDocumentoViewSet, ClienteViewSet

router = DefaultRouter()
router.register(r'clientes', ClienteViewSet, basename='cliente')
router.register(r'cliente-contactos', ClienteContactoViewSet, basename='cliente-contacto')
router.register(r'cliente-documentos', ClienteDocumentoViewSet, basename='cliente-documento')

urlpatterns = [
    path('', include(router.urls)),
]
