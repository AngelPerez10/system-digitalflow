"""ViewSets for productos app (Servicios + SYSCOM proxy in syscom_views)."""
from rest_framework.pagination import PageNumberPagination
from rest_framework import filters, viewsets

from apps.users.permissions import ModulePermission

from .models import Servicio
from .serializers import ServicioSerializer


class ServiciosPermission(ModulePermission):
    """Permission class for servicios module."""
    module_key = 'servicios'


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

