"""ViewSets for cotizaciones app."""
from django.db.models import Prefetch
from rest_framework import filters, viewsets

from apps.users.permissions import ModulePermission

from .models import Cotizacion
from .serializers import CotizacionSerializer


class CotizacionesPermission(ModulePermission):
    """Permission class for cotizaciones module."""
    module_key = 'cotizaciones'


class CotizacionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Cotizacion instances.
    
    Provides CRUD operations for quotations with permission-based access control.
    Supports both client-based and prospect-based quotations.
    """
    queryset = Cotizacion.objects.all()
    serializer_class = CotizacionSerializer
    permission_classes = [CotizacionesPermission]
    pagination_class = None

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        'idx',
        'cliente',
        'contacto',
        'creado_por__username',
        'creado_por__first_name',
        'creado_por__last_name',
    ]
    ordering_fields = ['idx', 'fecha', 'vencimiento', 'fecha_creacion', 'total']
    ordering = ['-idx']

    def get_queryset(self):
        """
        Get optimized queryset with prefetched items and related objects.
        
        Returns:
            QuerySet: Cotizacion queryset ordered by idx descending
        """
        queryset = super().get_queryset()
        queryset = queryset.prefetch_related(
            Prefetch(
                'items',
                queryset=Cotizacion.items.rel.related_model.objects.order_by('orden')
            )
        )
        queryset = queryset.select_related('cliente_id', 'creado_por')
        return queryset.order_by('-idx')
