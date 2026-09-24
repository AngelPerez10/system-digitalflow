"""ViewSets for clientes app."""
import logging
import os

import cloudinary
import cloudinary.uploader
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from django.http import Http404
from rest_framework import filters, status, viewsets
from rest_framework.exceptions import APIException
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.serializers import ValidationError as DrfValidationError

from apps.users.permissions import (
    ModulePermission,
    user_has_any_cotizaciones_access,
    user_has_any_ordenes_access,
)

from .models import Cliente, ClienteContacto, ClienteDireccion, ClienteDocumento
from .serializers import (
    ClienteContactoSerializer,
    ClienteDireccionSerializer,
    ClienteDocumentoSerializer,
    ClienteSerializer,
)

logger = logging.getLogger(__name__)

ALLOWED_CLIENTE_TIPOS = frozenset(code for code, _label in Cliente.TIPO_CHOICES)


def parse_tipo_query(query_params) -> list[str]:
    """Acepta `?tipo=EMPRESA` o `?tipo=EMPRESA,PROVEEDOR` (y repeticiones)."""
    tipos: list[str] = []
    seen: set[str] = set()
    for raw in query_params.getlist("tipo"):
        for part in str(raw).split(","):
            tipo = part.strip().upper()
            if tipo in ALLOWED_CLIENTE_TIPOS and tipo not in seen:
                seen.add(tipo)
                tipos.append(tipo)
    return tipos


class ClientesModulePermission(ModulePermission):
    """Permisos estrictos del módulo clientes (contactos, documentos)."""

    module_key = 'clientes'


class ClientesCatalogPermission(ClientesModulePermission):
    """
    Clientes (lista/detalle): GET permitido también si el usuario usa órdenes de trabajo,
    para catálogos en formularios sin dar acceso al módulo Contactos en menú.
    """

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
            # También quien cotiza: elige al cliente de la cotización.
            if user_has_any_ordenes_access(permissions) or user_has_any_cotizaciones_access(permissions):
                return True
        return super().has_permission(request, view)


class ClientePagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 500

class ClienteViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Cliente instances.

    Provides CRUD operations for clients with permission-based access control.
    """
    queryset = Cliente.objects.prefetch_related('contactos', 'direcciones').select_related('documento').all()
    serializer_class = ClienteSerializer
    permission_classes = [ClientesCatalogPermission]
    pagination_class = ClientePagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]

    search_fields = [
        'nombre',
        'telefono',
        'celular',
        'clave',
        'representante',
        'direccion',
        'correo',
        'rfc',
        'ciudad',
        'estado',
        'pais',
        'portal_web',
    ]
    ordering_fields = ['idx', 'nombre', 'fecha_creacion']
    ordering = ['idx']

    def get_queryset(self):
        qs = super().get_queryset()
        tipos = parse_tipo_query(self.request.query_params)
        if tipos and len(tipos) < len(ALLOWED_CLIENTE_TIPOS):
            qs = qs.filter(tipo__in=tipos) if len(tipos) > 1 else qs.filter(tipo=tipos[0])
        return qs

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except (DrfValidationError, DjangoValidationError) as exc:
            detail = getattr(exc, 'detail', None) or getattr(exc, 'message_dict', None) or 'Error de validacion'
            return Response(detail, status=status.HTTP_400_BAD_REQUEST)
        except IntegrityError:
            return Response({'detail': 'El registro ya existe o viola una restriccion.'}, status=status.HTTP_409_CONFLICT)
        except (APIException, Http404):
            # 403/404 de DRF deben salir con su propio status: el `except Exception`
            # de abajo los convertía en 400 y el frontend no podía distinguir
            # «sin permiso» de «datos inválidos».
            raise
        except Exception:
            logger.exception("Error creando cliente")
            return Response({'detail': 'Error al crear el registro.'}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        try:
            return super().update(request, *args, **kwargs)
        except (DrfValidationError, DjangoValidationError) as exc:
            detail = getattr(exc, 'detail', None) or getattr(exc, 'message_dict', None) or 'Error de validacion'
            return Response(detail, status=status.HTTP_400_BAD_REQUEST)
        except IntegrityError:
            return Response({'detail': 'El registro ya existe o viola una restriccion.'}, status=status.HTTP_409_CONFLICT)
        except (APIException, Http404):
            # Ver nota en `create`: no degradar 403/404 a 400.
            raise
        except Exception:
            logger.exception("Error actualizando cliente")
            return Response({'detail': 'Error al actualizar el registro.'}, status=status.HTTP_400_BAD_REQUEST)


class ClienteContactoViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing ClienteContacto instances.

    Handles client contacts.
    Restricted to admin users only.
    """
    queryset = ClienteContacto.objects.select_related('cliente').all()
    serializer_class = ClienteContactoSerializer
    permission_classes = [ClientesModulePermission]
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


class ClienteDireccionViewSet(viewsets.ModelViewSet):
    """
    ViewSet para la libreta de direcciones del cliente (estilo Mercado Libre /
    Amazon: varias sucursales, una marcada como principal).
    """
    queryset = ClienteDireccion.objects.select_related('cliente').all()
    serializer_class = ClienteDireccionSerializer
    permission_classes = [ClientesModulePermission]
    pagination_class = None

    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['id', 'is_principal', 'fecha_creacion']
    ordering = ['-is_principal', 'id']

    def get_queryset(self):
        qs = super().get_queryset()
        cliente_id = self.request.query_params.get('cliente')
        if cliente_id:
            qs = qs.filter(cliente_id=cliente_id)
        return qs
    # La promoción a principal tras borrar vive en `ClienteDireccion.delete()`
    # (modelo), no aquí, para que también aplique fuera de la API (admin,
    # cascada al borrar un Cliente, shell).


class ClienteDocumentoViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing ClienteDocumento instances.

    Handles document uploads to Cloudinary for clients.
    Restricted to admin users only.
    """
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
        except Exception:
            return Response({'detail': 'Error al procesar el archivo. Intente nuevamente.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        doc, _created = ClienteDocumento.objects.get_or_create(cliente_id=cliente_id)
        doc.url = upload.get('secure_url') or upload.get('url') or ''
        doc.public_id = upload.get('public_id') or ''
        doc.nombre_original = archivo.name or ''
        doc.size_bytes = getattr(archivo, 'size', None)
        doc.save()

        serializer = self.get_serializer(doc)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
