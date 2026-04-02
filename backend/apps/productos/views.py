"""ViewSets for productos app (Servicios + SYSCOM proxy in syscom_views)."""
from rest_framework.pagination import PageNumberPagination
from rest_framework import filters, viewsets

from apps.users.permissions import ModulePermission, user_has_any_ordenes_access

from .models import Servicio
from .serializers import ServicioSerializer


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

