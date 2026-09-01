from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .portal_views import (
    portal_cambiar_contrasena_view,
    portal_orden_calificar_view,
    portal_orden_detalle_view,
    portal_ordenes_list_view,
    portal_registro_view,
    portal_solicitud_aprobar_view,
    portal_solicitud_rechazar_view,
    portal_solicitudes_list_view,
)
from .views import ClienteContactoViewSet, ClienteDocumentoViewSet, ClienteViewSet

router = DefaultRouter()
router.register(r'clientes', ClienteViewSet, basename='cliente')
router.register(r'cliente-contactos', ClienteContactoViewSet, basename='cliente-contacto')
router.register(r'cliente-documentos', ClienteDocumentoViewSet, basename='cliente-documento')

urlpatterns = [
    path('portal-cliente/registro/', portal_registro_view, name='portal-cliente-registro'),
    path('portal-cliente/cambiar-contrasena/', portal_cambiar_contrasena_view, name='portal-cliente-cambiar-contrasena'),
    path('portal-cliente/ordenes/', portal_ordenes_list_view, name='portal-cliente-ordenes'),
    path(
        'portal-cliente/ordenes/<int:orden_id>/',
        portal_orden_detalle_view,
        name='portal-cliente-orden-detalle',
    ),
    path(
        'portal-cliente/ordenes/<int:orden_id>/calificar/',
        portal_orden_calificar_view,
        name='portal-cliente-orden-calificar',
    ),
    path('portal-cliente/solicitudes/', portal_solicitudes_list_view, name='portal-cliente-solicitudes'),
    path(
        'portal-cliente/solicitudes/<int:solicitud_id>/aprobar/',
        portal_solicitud_aprobar_view,
        name='portal-cliente-solicitud-aprobar',
    ),
    path(
        'portal-cliente/solicitudes/<int:solicitud_id>/rechazar/',
        portal_solicitud_rechazar_view,
        name='portal-cliente-solicitud-rechazar',
    ),
    path('', include(router.urls)),
]
