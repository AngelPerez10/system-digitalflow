"""ViewSets for productos app (Servicios + SYSCOM proxy in syscom_views)."""
from rest_framework.pagination import PageNumberPagination
from rest_framework import filters, viewsets

from apps.users.permissions import ModulePermission, user_has_any_ordenes_access

from .models import Concepto, ProductoManual, Servicio
from .serializers import ConceptoSerializer, ProductoManualSerializer, ServicioSerializer


class ServiciosPermission(ModulePermission):
    """Permission class for servicios module."""

    module_key = 'servicios'

    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        if not user or not getattr(user, 'is_authenticated', False):
            return False
        if getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False):
            return True
        method = (request.method or '').upper()
        if method in ('GET', 'HEAD', 'OPTIONS'):
            perms_obj = getattr(user, 'permissions_profile', None)
            permissions = getattr(perms_obj, 'permissions', None) or {}
            if user_has_any_ordenes_access(permissions):
                return True
        return super().has_permission(request, view)


class ProductosPermission(ModulePermission):
    module_key = 'productos'


class ServiciosPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200


class ServicioViewSet(viewsets.ModelViewSet):
    """ViewSet for managing Servicio instances."""

    queryset = Servicio.objects.all()
    serializer_class = ServicioSerializer
    permission_classes = [ServiciosPermission]
    pagination_class = ServiciosPagination

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre', 'categoria', 'descripcion']
    ordering_fields = ['idx', 'nombre', 'fecha_creacion', 'activo', 'categoria']
    ordering = ['idx']


class ConceptoViewSet(viewsets.ModelViewSet):
    """ViewSet for managing Concepto instances."""

    queryset = Concepto.objects.all()
    serializer_class = ConceptoSerializer
    permission_classes = [ServiciosPermission]
    pagination_class = ServiciosPagination

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['folio', 'concepto']
    ordering_fields = ['folio', 'concepto', 'precio1', 'fecha_creacion']
    ordering = ['folio']

    def perform_update(self, serializer):
        from apps.ordenes.views import _delete_cloudinary_resource

        instance = serializer.instance
        old_url = (instance.imagen_url or '').strip()
        serializer.save()
        new_url = (serializer.instance.imagen_url or '').strip()
        if old_url and old_url != new_url:
            _delete_cloudinary_resource(old_url)

    def perform_destroy(self, instance):
        from apps.ordenes.views import _delete_cloudinary_resource

        url = (instance.imagen_url or '').strip()
        if url:
            _delete_cloudinary_resource(url)
        instance.delete()


class ProductoManualViewSet(viewsets.ModelViewSet):
    queryset = ProductoManual.objects.all()
    serializer_class = ProductoManualSerializer
    permission_classes = [ProductosPermission]
    pagination_class = ServiciosPagination

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['producto', 'marca', 'modelo']
    ordering_fields = ['producto', 'marca', 'modelo', 'precio', 'stock', 'fecha_creacion']
    ordering = ['-fecha_creacion']

    def perform_update(self, serializer):
        from apps.ordenes.views import _delete_cloudinary_resource

        instance = serializer.instance
        old_url = (instance.imagen_url or '').strip()
        serializer.save()
        new_url = (serializer.instance.imagen_url or '').strip()
        if old_url and old_url != new_url:
            _delete_cloudinary_resource(old_url)

    def perform_destroy(self, instance):
        from apps.ordenes.views import _delete_cloudinary_resource

        url = (instance.imagen_url or '').strip()
        if url:
            _delete_cloudinary_resource(url)
        instance.delete()

