import os

import cloudinary
import cloudinary.uploader
from rest_framework import filters, status, viewsets
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from .models import Producto, ProductoDocumento, ProductoImagen
from .serializers import ProductoDocumentoSerializer, ProductoImagenSerializer, ProductoSerializer


class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.all()
    serializer_class = ProductoSerializer
    permission_classes = [IsAdminUser]
    pagination_class = None

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        'nombre',
        'categoria',
        'unidad',
        'descripcion',
        'modelo',
        'codigo_fabrica',
        'proveedor',
        'fabricante_marca',
        'sku',
        'codigo_sat',
        'unidad_sat',
    ]
    ordering_fields = ['idx', 'nombre', 'fecha_creacion', 'precio_venta', 'stock']
    ordering = ['idx']


class ProductoImagenViewSet(viewsets.ModelViewSet):
    queryset = ProductoImagen.objects.select_related('producto').all()
    serializer_class = ProductoImagenSerializer
    permission_classes = [IsAdminUser]
    pagination_class = None
    parser_classes = [MultiPartParser, FormParser]

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        public_id = getattr(obj, 'public_id', '') or ''

        cloudinary_url = os.environ.get('CLOUDINARY_URL')
        if public_id:
            if not cloudinary_url:
                return Response({'detail': 'CLOUDINARY_URL no está configurado en el entorno.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            cloudinary.config(secure=True)
            try:
                cloudinary.uploader.destroy(public_id, resource_type='image')
            except Exception as e:
                return Response({'detail': f'Error eliminando en Cloudinary: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def create(self, request, *args, **kwargs):
        producto_id = request.data.get('producto')
        archivo = request.FILES.get('archivo')
        if not producto_id:
            return Response({'producto': ['Este campo es requerido.']}, status=status.HTTP_400_BAD_REQUEST)
        if not archivo:
            return Response({'archivo': ['Este campo es requerido.']}, status=status.HTTP_400_BAD_REQUEST)

        allowed_ext = {'.jpeg', '.jpg', '.bmp', '.png'}
        name = (archivo.name or '').lower()
        ext = '.' + name.split('.')[-1] if '.' in name else ''
        if ext not in allowed_ext:
            return Response({'archivo': ['Formato no permitido.']}, status=status.HTTP_400_BAD_REQUEST)
        max_bytes = 10 * 1024 * 1024
        if getattr(archivo, 'size', 0) > max_bytes:
            return Response({'archivo': ['El archivo excede 10MB.']}, status=status.HTTP_400_BAD_REQUEST)

        cloudinary_url = os.environ.get('CLOUDINARY_URL')
        if not cloudinary_url:
            return Response({'detail': 'CLOUDINARY_URL no está configurado en el entorno.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        cloudinary.config(secure=True)

        try:
            upload = cloudinary.uploader.upload(
                archivo,
                resource_type='image',
                folder=f'productos/{producto_id}',
                use_filename=True,
                unique_filename=True,
            )
        except Exception:
            # Log interno para debugging, mensaje genérico al cliente
            return Response({'detail': 'Error al procesar el archivo. Intente nuevamente.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        img, _created = ProductoImagen.objects.get_or_create(producto_id=producto_id)
        img.url = upload.get('secure_url') or upload.get('url') or ''
        img.public_id = upload.get('public_id') or ''
        img.nombre_original = archivo.name or ''
        img.size_bytes = getattr(archivo, 'size', None)
        img.save()

        serializer = self.get_serializer(img)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ProductoDocumentoViewSet(viewsets.ModelViewSet):
    queryset = ProductoDocumento.objects.select_related('producto').all()
    serializer_class = ProductoDocumentoSerializer
    permission_classes = [IsAdminUser]
    pagination_class = None
    parser_classes = [MultiPartParser, FormParser]

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        public_id = getattr(obj, 'public_id', '') or ''

        cloudinary_url = os.environ.get('CLOUDINARY_URL')
        if public_id:
            if not cloudinary_url:
                return Response({'detail': 'CLOUDINARY_URL no está configurado en el entorno.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            cloudinary.config(secure=True)
            try:
                cloudinary.uploader.destroy(public_id, resource_type='raw')
            except Exception:
                return Response({'detail': 'Error al eliminar el archivo.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def create(self, request, *args, **kwargs):
        producto_id = request.data.get('producto')
        archivo = request.FILES.get('archivo')
        if not producto_id:
            return Response({'producto': ['Este campo es requerido.']}, status=status.HTTP_400_BAD_REQUEST)
        if not archivo:
            return Response({'archivo': ['Este campo es requerido.']}, status=status.HTTP_400_BAD_REQUEST)

        allowed_ext = {'.pdf', '.xls', '.xlsx', '.doc', '.docs', '.odt', '.ods', '.jpeg', '.jpg', '.bmp', '.png'}
        name = (archivo.name or '').lower()
        ext = '.' + name.split('.')[-1] if '.' in name else ''
        if ext not in allowed_ext:
            return Response({'archivo': ['Formato no permitido.']}, status=status.HTTP_400_BAD_REQUEST)
        max_bytes = 10 * 1024 * 1024
        if getattr(archivo, 'size', 0) > max_bytes:
            return Response({'archivo': ['El archivo excede 10MB.']}, status=status.HTTP_400_BAD_REQUEST)

        cloudinary_url = os.environ.get('CLOUDINARY_URL')
        if not cloudinary_url:
            return Response({'detail': 'CLOUDINARY_URL no está configurado en el entorno.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        cloudinary.config(secure=True)

        try:
            upload = cloudinary.uploader.upload(
                archivo,
                resource_type='raw',
                folder=f'productos/{producto_id}',
                use_filename=True,
                unique_filename=True,
            )
        except Exception:
            # Log interno para debugging, mensaje genérico al cliente
            return Response({'detail': 'Error al procesar el archivo. Intente nuevamente.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        doc, _created = ProductoDocumento.objects.get_or_create(producto_id=producto_id)
        doc.url = upload.get('secure_url') or upload.get('url') or ''
        doc.public_id = upload.get('public_id') or ''
        doc.nombre_original = archivo.name or ''
        doc.size_bytes = getattr(archivo, 'size', None)
        doc.save()

        serializer = self.get_serializer(doc)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
