import logging
from datetime import datetime, time

from django.db import IntegrityError, transaction
from django.db.models import Case, Count, IntegerField, Q, Sum, Value, When
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework import status
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ordenes.image_services import cloudinary, delete_cloudinary_resource, upload_data_url
from apps.users.permissions import InventarioPermission

from .enrichment import (
    aplicar_seccion_desde_catalogo,
    enrich_from_catalogs,
    fetch_catalog_detail,
    search_catalogs,
    sincronizar_secciones_pendientes,
)
from .invoice_import import (
    FacturaInvalida,
    FacturaNoEncontrada,
    FacturaYaImportada,
    ProveedorNoSoportado,
    importar_factura,
)
from .models import InventarioItem, InventarioMovimiento
from .serializers import (
    ImportarFacturaSerializer,
    InventarioItemPatchSerializer,
    InventarioItemSerializer,
    InventarioMovimientoSerializer,
    RegistrarCatalogoSerializer,
    ScanSerializer,
)

logger = logging.getLogger(__name__)

ENRICHMENT_FIELDS = (
    'nombre',
    'marca',
    'modelo',
    'fuente',
    'ref_externa',
    'imagen_url',
    'precio_unitario',
    'seccion',
)

INVENTARIO_UPLOAD_FOLDER = 'inventario/productos'


class InventarioPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


def _parse_desde(valor: str):
    """Convierte ?desde=YYYY-MM-DD (o ISO datetime) a datetime aware (inicio del día local)."""
    parsed_dt = parse_datetime(valor)
    if parsed_dt is not None:
        if timezone.is_naive(parsed_dt):
            return timezone.make_aware(parsed_dt, timezone.get_current_timezone())
        return parsed_dt
    parsed_date = parse_date(valor)
    if parsed_date is None:
        return None
    return timezone.make_aware(
        datetime.combine(parsed_date, time.min),
        timezone.get_current_timezone(),
    )


def _paginate(request, queryset, serializer_class):
    paginator = InventarioPagination()
    page = paginator.paginate_queryset(queryset, request)
    serializer = serializer_class(page, many=True)
    return paginator.get_paginated_response(serializer.data)


class ScanView(APIView):
    permission_classes = [IsAuthenticated, InventarioPermission]

    def post(self, request):
        serializer = ScanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        codigo = (serializer.validated_data['codigo_barras'] or '').strip()
        if not codigo:
            return Response(
                {'detail': 'Código inválido.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        modo = serializer.validated_data['modo']
        creado = False
        enriquecido = False

        with transaction.atomic():
            item = (
                InventarioItem.objects.select_for_update()
                .filter(codigo_barras=codigo)
                .first()
            )

            if modo == InventarioMovimiento.Tipo.SALIDA:
                if item is None:
                    return Response(
                        {'detail': 'Producto no registrado; no hay existencia.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if item.cantidad == 0:
                    return Response(
                        {'detail': 'Sin existencia para este código.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                item.cantidad -= 1
            else:
                if item is None:
                    item = InventarioItem(codigo_barras=codigo, cantidad=0)
                    enrich_data = enrich_from_catalogs(codigo)
                    if enrich_data:
                        enriquecido = True
                        for field in ENRICHMENT_FIELDS:
                            value = enrich_data.get(field)
                            if value is None or value == '':
                                continue
                            if field == 'precio_unitario':
                                from decimal import Decimal, InvalidOperation

                                try:
                                    item.precio_unitario = Decimal(str(value))
                                except (InvalidOperation, TypeError, ValueError):
                                    continue
                            else:
                                setattr(item, field, value)
                        # El catálogo describe el producto; el ítem es nuevo, así
                        # que las notas están vacías y no se pisa nada del operador.
                        item.notas = enrich_data.get('caracteristicas') or ''
                    creado = True
                    item.cantidad += 1
                    try:
                        item.save()
                    except IntegrityError:
                        item = (
                            InventarioItem.objects.select_for_update()
                            .get(codigo_barras=codigo)
                        )
                        creado = False
                        enriquecido = False
                        item.cantidad += 1
                        item.save()
                else:
                    item.cantidad += 1
                    item.save()

            if modo == InventarioMovimiento.Tipo.SALIDA:
                item.save()
            movimiento = InventarioMovimiento.objects.create(
                item=item,
                tipo=modo,
                cantidad=1,
                usuario=request.user,
            )

        return Response(
            {
                'item': InventarioItemSerializer(item).data,
                'movimiento': InventarioMovimientoSerializer(movimiento).data,
                'creado': creado,
                'enriquecido': enriquecido,
            },
            status=status.HTTP_200_OK,
        )


class InventarioItemListView(APIView):
    permission_classes = [IsAuthenticated, InventarioPermission]

    def get(self, request):
        queryset = InventarioItem.objects.select_related('proveedor').all()
        search = (request.query_params.get('search') or '').strip()
        if search:
            # Nombre, marca, modelo, código de barras, ref externa y folio.
            # Coincidencia exacta de código/modelo primero (escáner / pegar EAN).
            queryset = (
                queryset.filter(
                    Q(codigo_barras__icontains=search)
                    | Q(nombre__icontains=search)
                    | Q(marca__icontains=search)
                    | Q(modelo__icontains=search)
                    | Q(ref_externa__icontains=search)
                    | Q(folio_factura__icontains=search)
                )
                .annotate(
                    _search_rank=Case(
                        When(codigo_barras__iexact=search, then=Value(0)),
                        When(modelo__iexact=search, then=Value(1)),
                        When(codigo_barras__istartswith=search, then=Value(2)),
                        When(modelo__istartswith=search, then=Value(3)),
                        default=Value(4),
                        output_field=IntegerField(),
                    )
                )
                .order_by('_search_rank', '-fecha_actualizacion')
            )
        seccion = (request.query_params.get('seccion') or '').strip().lower()
        if seccion == 'sin':
            queryset = queryset.filter(seccion='')
        elif seccion:
            from .secciones import SECCION_SLUGS

            if seccion not in SECCION_SLUGS:
                return Response(
                    {'detail': 'Sección inválida.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            queryset = queryset.filter(seccion=seccion)

        paginator = InventarioPagination()
        page = paginator.paginate_queryset(queryset, request)
        if page is not None:
            filled = 0
            for item in page:
                if filled >= 5:
                    break
                if item.seccion:
                    continue
                if aplicar_seccion_desde_catalogo(item):
                    filled += 1
            serializer = InventarioItemSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        # Fallback sin paginación (no debería ocurrir con PageNumberPagination).
        filled = 0
        for item in queryset[:5]:
            if item.seccion:
                continue
            if aplicar_seccion_desde_catalogo(item):
                filled += 1
                if filled >= 5:
                    break
        serializer = InventarioItemSerializer(queryset, many=True)
        return Response(serializer.data)


class _InventarioViewPermission(InventarioPermission):
    """Chequea `inventario.view` sin importar el método HTTP."""

    def has_permission(self, request, view):
        # Evitar mutar request.method (puede ser read-only en DRF Request).
        # Reutilizamos la lógica de ModulePermission forzando el camino GET.
        class _GetProxy:
            def __init__(self, wrapped):
                self._wrapped = wrapped

            @property
            def method(self):
                return 'GET'

            def __getattr__(self, name):
                return getattr(self._wrapped, name)

        return super().has_permission(_GetProxy(request), view)


class InventarioSincronizarSeccionesView(APIView):
    """Rellena secciones vacías desde SYSCOM/TVC (backfill de ítems viejos).

    Requiere `inventario.view` (no create): es mantenimiento de datos, no alta.
    """

    permission_classes = [IsAuthenticated, _InventarioViewPermission]

    def post(self, request):
        raw_limit = request.data.get('limit') if isinstance(request.data, dict) else None
        try:
            limit = int(raw_limit) if raw_limit is not None else 40
        except (TypeError, ValueError):
            limit = 40
        resultado = sincronizar_secciones_pendientes(limit=limit)
        return Response(resultado, status=status.HTTP_200_OK)


class InventarioStatsView(APIView):
    """Totales globales (no dependen de la página actual de la tabla)."""

    permission_classes = [IsAuthenticated, InventarioPermission]

    def get(self, request):
        aggregates = InventarioItem.objects.aggregate(
            total_items=Count('id'),
            total_unidades=Sum('cantidad'),
            sin_identificar=Count('id', filter=Q(nombre='')),
        )
        inicio_hoy = timezone.make_aware(
            datetime.combine(timezone.localdate(), time.min),
            timezone.get_current_timezone(),
        )
        movimientos_hoy = InventarioMovimiento.objects.filter(
            creado_en__gte=inicio_hoy
        ).count()
        return Response(
            {
                'total_items': aggregates['total_items'] or 0,
                'total_unidades': aggregates['total_unidades'] or 0,
                'sin_identificar': aggregates['sin_identificar'] or 0,
                'movimientos_hoy': movimientos_hoy,
            }
        )


class InventarioItemDetailView(APIView):
    permission_classes = [IsAuthenticated, InventarioPermission]

    def get(self, request, pk):
        item = get_object_or_404(InventarioItem.objects.select_related('proveedor'), pk=pk)
        return Response(InventarioItemSerializer(item).data)

    def patch(self, request, pk):
        item = get_object_or_404(InventarioItem, pk=pk)
        self.check_object_permissions(request, item)
        imagen_previa = item.imagen_url
        serializer = InventarioItemPatchSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        if imagen_previa and imagen_previa != item.imagen_url:
            delete_cloudinary_resource(imagen_previa)
        return Response(InventarioItemSerializer(item).data)

    def delete(self, request, pk):
        """Borra el ítem y su historial; sirve para limpiar escaneos equivocados."""
        item = get_object_or_404(InventarioItem, pk=pk)
        self.check_object_permissions(request, item)
        imagen = item.imagen_url
        item.delete()
        if imagen:
            delete_cloudinary_resource(imagen)
        return Response(status=status.HTTP_204_NO_CONTENT)


class InventarioUploadImageView(APIView):
    """Sube la foto del producto a Cloudinary (`inventario/productos`)."""

    permission_classes = [IsAuthenticated, InventarioPermission]

    def post(self, request):
        payload = request.data if isinstance(request.data, dict) else {}
        data_url = payload.get('data_url')
        if not isinstance(data_url, str) or ';base64,' not in data_url:
            return Response({'detail': 'data_url inválido'}, status=status.HTTP_400_BAD_REQUEST)
        if not cloudinary:
            return Response(
                {'detail': 'Cloudinary no está configurado en el servidor.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        try:
            url = upload_data_url(data_url, folder=INVENTARIO_UPLOAD_FOLDER, max_size_kb=120)
        except DRFValidationError:
            return Response(
                {'detail': 'Imagen inválida o demasiado grande'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception:
            logger.exception('Cloudinary inventario upload-image failed')
            return Response(
                {'detail': 'Error subiendo imagen a Cloudinary'},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response({'url': url}, status=status.HTTP_200_OK)


def _manuales_como_catalogo(search: str, limit: int = 8) -> list[dict]:
    """Candidatos de productos manuales (misma lista que Productos)."""
    from apps.productos.models import ProductoManual

    term = (search or '').strip()
    if len(term) < 2:
        return []
    qs = ProductoManual.objects.filter(
        Q(producto__icontains=term) | Q(marca__icontains=term) | Q(modelo__icontains=term),
        activo=True,
    ).order_by('-fecha_creacion')[:limit]
    out: list[dict] = []
    for pm in qs:
        modelo = (pm.modelo or '').strip()
        out.append(
            {
                'nombre': (pm.producto or '').strip() or modelo,
                'marca': (pm.marca or '').strip(),
                'modelo': modelo,
                'fuente': 'manual',
                'ref_externa': str(pm.pk),
                'imagen_url': (pm.imagen_url or '').strip(),
                'caracteristicas': (pm.caracteristicas or '').strip(),
                'precio_unitario': format(pm.precio, 'f') if pm.precio is not None else None,
                'seccion': '',
            }
        )
    return out


class InventarioCatalogoSearchView(APIView):
    """Busca candidatos en SYSCOM/TVC y productos manuales."""

    permission_classes = [IsAuthenticated, InventarioPermission]

    def get(self, request):
        search = (request.query_params.get('search') or '').strip()
        if len(search) < 3:
            return Response([])
        results = list(search_catalogs(search, limit=10))
        results.extend(_manuales_como_catalogo(search, limit=8))
        return Response(results)


class InventarioRegistrarCatalogoView(APIView):
    """Crea (o reutiliza) un ítem de inventario desde el catálogo, sin mover stock."""

    permission_classes = [IsAuthenticated, InventarioPermission]

    def post(self, request):
        serializer = RegistrarCatalogoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        fuente_in = str(data['fuente']).strip().lower()
        ref = str(data['ref']).strip()
        modelo = str(data.get('modelo') or '').strip()
        nombre = str(data.get('nombre') or '').strip()
        marca = str(data.get('marca') or '').strip()
        imagen_url = str(data.get('imagen_url') or '').strip()
        if imagen_url and not imagen_url.startswith(('http://', 'https://')):
            imagen_url = ''

        db_fuente = (
            InventarioItem.Fuente.SYSCOM
            if fuente_in == 'syscom'
            else InventarioItem.Fuente.TVC
            if fuente_in == 'tvc'
            else InventarioItem.Fuente.DESCONOCIDO
        )
        ref_externa = f'manual:{ref}' if fuente_in == 'manual' else ref
        codigo = modelo or ref_externa
        if len(codigo) > 64:
            codigo = codigo[:64]

        with transaction.atomic():
            qs = InventarioItem.objects.select_for_update()
            item = None
            if db_fuente != InventarioItem.Fuente.DESCONOCIDO and ref_externa:
                item = qs.filter(fuente=db_fuente, ref_externa=ref_externa).first()
            if item is None and fuente_in == 'manual' and ref_externa:
                item = qs.filter(ref_externa=ref_externa).first()
            if item is None and codigo:
                item = qs.filter(codigo_barras=codigo).first()

            creado = False
            if item is None:
                item = InventarioItem(
                    codigo_barras=codigo,
                    cantidad=0,
                    fuente=db_fuente,
                    ref_externa=ref_externa,
                    nombre=nombre,
                    marca=marca,
                    modelo=modelo or codigo,
                    imagen_url=imagen_url,
                )
                try:
                    item.save()
                    creado = True
                except IntegrityError:
                    item = qs.filter(codigo_barras=codigo).first()
                    if item is None:
                        raise

            updates: list[str] = []
            if nombre and not item.nombre:
                item.nombre = nombre
                updates.append('nombre')
            if marca and not item.marca:
                item.marca = marca
                updates.append('marca')
            if modelo and not item.modelo:
                item.modelo = modelo
                updates.append('modelo')
            if imagen_url and not item.imagen_url:
                item.imagen_url = imagen_url
                updates.append('imagen_url')
            if ref_externa and not item.ref_externa:
                item.ref_externa = ref_externa
                updates.append('ref_externa')
            if db_fuente != InventarioItem.Fuente.DESCONOCIDO and item.fuente == InventarioItem.Fuente.DESCONOCIDO:
                item.fuente = db_fuente
                updates.append('fuente')
            if updates:
                item.save(update_fields=updates)

        return Response(
            {
                'item': InventarioItemSerializer(item).data,
                'creado': creado,
            },
            status=status.HTTP_200_OK,
        )


class InventarioCatalogoDetallePorRefView(APIView):
    """Detalle del catálogo por fuente + referencia, sin necesidad de guardar antes.

    La búsqueda de SYSCOM no trae las características del producto; solo el
    detalle las tiene. Este endpoint deja que la ficha las pida en cuanto el
    operador elige un candidato, antes de que el vínculo exista en la base.
    """

    permission_classes = [IsAuthenticated, InventarioPermission]

    def get(self, request):
        fuente = (request.query_params.get('fuente') or '').strip().lower()
        ref = (request.query_params.get('ref') or '').strip()
        modelo = (request.query_params.get('modelo') or '').strip()
        if fuente not in {'syscom', 'tvc'} or not (ref or modelo):
            return Response(
                {'detail': 'Indica una fuente válida (syscom o tvc) y su referencia.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        detalle = fetch_catalog_detail(fuente, ref, modelo)
        if not detalle:
            return Response(
                {'detail': 'El catálogo ya no devuelve este producto.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(detalle)


class InventarioImportarFacturaView(APIView):
    """Importa todos los productos de una factura de proveedor (SYSCOM hoy; TVC después)."""

    permission_classes = [IsAuthenticated, InventarioPermission]

    def post(self, request):
        serializer = ImportarFacturaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            resultado = importar_factura(
                proveedor=serializer.validated_data['proveedor'],
                folio=serializer.validated_data['folio'],
                usuario=request.user,
            )
        except FacturaInvalida as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except FacturaNoEncontrada as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_404_NOT_FOUND)
        except FacturaYaImportada as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_409_CONFLICT)
        except ProveedorNoSoportado as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_501_NOT_IMPLEMENTED)

        return Response(
            {
                'importacion_id': resultado['importacion_id'],
                'proveedor': resultado['proveedor'],
                'folio': resultado['folio'],
                'creados': resultado['creados'],
                'actualizados': resultado['actualizados'],
                'movimientos': resultado['movimientos'],
                'items': InventarioItemSerializer(resultado['items'], many=True).data,
            },
            status=status.HTTP_200_OK,
        )


class InventarioMovimientoListView(APIView):
    permission_classes = [IsAuthenticated, InventarioPermission]

    def get(self, request):
        queryset = InventarioMovimiento.objects.select_related('item', 'usuario').all()
        item_id = (request.query_params.get('item') or '').strip()
        if item_id:
            queryset = queryset.filter(item_id=item_id)
        desde = (request.query_params.get('desde') or '').strip()
        if desde:
            inicio = _parse_desde(desde)
            if inicio is not None:
                queryset = queryset.filter(creado_en__gte=inicio)
        queryset = queryset.order_by('-creado_en')
        return _paginate(request, queryset, InventarioMovimientoSerializer)
