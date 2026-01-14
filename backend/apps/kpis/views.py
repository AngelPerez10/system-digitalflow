"""ViewSets for KPIs app."""
from rest_framework import filters, viewsets

from apps.users.permissions import ModulePermission

from .models import KpiVenta
from .serializers import KpiVentaSerializer


class KpisPermission(ModulePermission):
    """Permission class for KPIs module."""
    module_key = 'kpis'


class KpiVentaViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing KPI Venta instances.
    
    Provides CRUD operations for sales KPIs with permission-based access control.
    """
    queryset = KpiVenta.objects.all()
    serializer_class = KpiVentaSerializer
    permission_classes = [KpisPermission]
    pagination_class = None

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        'nombre_cliente',
        'telefono',
        'correo',
        'canal_contacto',
        'linea_sistema',
        'producto_servicio',
        'no_cotizacion',
        'status',
        'responsable',
        'proxima_accion',
        'notas',
    ]
    ordering_fields = ['idx', 'id', 'fecha_lead', 'fecha_cierre', 'fecha_proxima_accion', 'fecha_creacion']
    ordering = ['idx']
