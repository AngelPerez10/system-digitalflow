from rest_framework import filters, viewsets
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAdminUser

import os
import cloudinary
import cloudinary.uploader

from .models import Cliente, ClienteContacto, ClienteDocumento
from .serializers import ClienteContactoSerializer, ClienteDocumentoSerializer, ClienteSerializer


class ClienteViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar clientes.
    Permite listar, crear, actualizar y eliminar clientes.
    """
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    permission_classes = [IsAdminUser]
    pagination_class = None  # Deshabilitar paginación para esta vista
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        'nombre',
        'telefono',
        'direccion',
        'correo',
        'ciudad',
        'estado',
        'pais',
        'portal_web',
    ]
    ordering_fields = ['idx', 'nombre', 'fecha_creacion']
    ordering = ['idx']


class ClienteContactoViewSet(viewsets.ModelViewSet):
    queryset = ClienteContacto.objects.select_related('cliente').all()
    serializer_class = ClienteContactoSerializer
    permission_classes = [IsAdminUser]
    pagination_class = None

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre_apellido', 'celular', 'correo', 'titulo', 'area_puesto', 'cliente__nombre']
    ordering_fields = ['id', 'is_principal', 'fecha_creacion']
    ordering = ['-is_principal', 'id']

    def get_queryset(self):
        qs = super().get_queryset()
        cliente_id = self.request.query_params.get('cliente')
        if cliente_id:
            qs = qs.filter(cliente_id=cliente_id)
        return qs


class ClienteDocumentoViewSet(viewsets.ModelViewSet):
    queryset = ClienteDocumento.objects.select_related('cliente').all()
    serializer_class = ClienteDocumentoSerializer
    permission_classes = [IsAdminUser]
    pagination_class = None
    parser_classes = [MultiPartParser, FormParser]

    def create(self, request, *args, **kwargs):
        cliente_id = request.data.get('cliente')
        archivo = request.FILES.get('archivo')
        if not cliente_id:
            return Response({'cliente': ['Este campo es requerido.']}, status=status.HTTP_400_BAD_REQUEST)
        if not archivo:
            return Response({'archivo': ['Este campo es requerido.']}, status=status.HTTP_400_BAD_REQUEST)

        allowed_ext = {'.pdf', '.xls', '.xlsx', '.doc', '.docs', '.odt', '.ods'}
        name = (archivo.name or '').lower()
        ext = '.' + name.split('.')[-1] if '.' in name else ''
        if ext not in allowed_ext:
            return Response({'archivo': ['Formato no permitido.']}, status=status.HTTP_400_BAD_REQUEST)
        max_bytes = 15 * 1024 * 1024
        if getattr(archivo, 'size', 0) > max_bytes:
            return Response({'archivo': ['El archivo excede 15MB.']}, status=status.HTTP_400_BAD_REQUEST)

        cloudinary_url = os.environ.get('CLOUDINARY_URL')
        if not cloudinary_url:
            return Response({'detail': 'CLOUDINARY_URL no está configurado en el entorno.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        cloudinary.config(secure=True)

        try:
            upload = cloudinary.uploader.upload(
                archivo,
                resource_type='raw',
                folder=f'clientes/{cliente_id}',
                use_filename=True,
                unique_filename=True,
            )
        except Exception as e:
            return Response({'detail': f'Error subiendo a Cloudinary: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        doc, _created = ClienteDocumento.objects.get_or_create(cliente_id=cliente_id)
        doc.url = upload.get('secure_url') or upload.get('url') or ''
        doc.public_id = upload.get('public_id') or ''
        doc.nombre_original = archivo.name or ''
        doc.size_bytes = getattr(archivo, 'size', None)
        doc.save()

        serializer = self.get_serializer(doc)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
