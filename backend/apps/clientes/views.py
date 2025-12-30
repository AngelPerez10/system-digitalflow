from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from .models import Cliente
from .serializers import ClienteSerializer


class ClienteViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar clientes.
    Permite listar, crear, actualizar y eliminar clientes.
    """
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None  # Deshabilitar paginación para esta vista
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre', 'telefono', 'direccion']
    ordering_fields = ['idx', 'nombre', 'fecha_creacion']
    ordering = ['idx']
