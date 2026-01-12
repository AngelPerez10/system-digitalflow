from rest_framework import filters, viewsets
from rest_framework.permissions import IsAdminUser

from .models import Cotizacion
from .serializers import CotizacionSerializer


class CotizacionViewSet(viewsets.ModelViewSet):
    serializer_class = CotizacionSerializer
    pagination_class = None

    permission_classes = [IsAdminUser]

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
        return (
            Cotizacion.objects.select_related('cliente_id', 'creado_por')
            .prefetch_related('items')
            .all()
        )
