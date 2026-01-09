from rest_framework import filters, viewsets
from rest_framework.permissions import IsAdminUser

from .models import KpiVenta
from .serializers import KpiVentaSerializer


class KpiVentaViewSet(viewsets.ModelViewSet):
    queryset = KpiVenta.objects.all()
    serializer_class = KpiVentaSerializer
    permission_classes = [IsAdminUser]
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
