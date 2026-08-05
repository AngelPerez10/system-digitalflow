from django.db import IntegrityError, transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.permissions import InventarioPermission

from .enrichment import enrich_from_catalogs
from .models import InventarioItem, InventarioMovimiento
from .serializers import (
    InventarioItemPatchSerializer,
    InventarioItemSerializer,
    InventarioMovimientoSerializer,
    ScanSerializer,
)

ENRICHMENT_FIELDS = ('nombre', 'marca', 'modelo', 'fuente', 'ref_externa')


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
                            if value is not None:
                                setattr(item, field, value)
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
        queryset = InventarioItem.objects.all()
        search = (request.query_params.get('search') or '').strip()
        if search:
            queryset = queryset.filter(
                Q(codigo_barras__icontains=search)
                | Q(nombre__icontains=search)
                | Q(marca__icontains=search)
                | Q(modelo__icontains=search)
            )
        data = InventarioItemSerializer(queryset, many=True).data
        return Response(data)


class InventarioItemDetailView(APIView):
    permission_classes = [IsAuthenticated, InventarioPermission]

    def get(self, request, pk):
        item = get_object_or_404(InventarioItem, pk=pk)
        return Response(InventarioItemSerializer(item).data)

    def patch(self, request, pk):
        item = get_object_or_404(InventarioItem, pk=pk)
        self.check_object_permissions(request, item)
        serializer = InventarioItemPatchSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(InventarioItemSerializer(item).data)


class InventarioMovimientoListView(APIView):
    permission_classes = [IsAuthenticated, InventarioPermission]

    def get(self, request):
        queryset = InventarioMovimiento.objects.select_related('item', 'usuario').all()
        item_id = (request.query_params.get('item') or '').strip()
        if item_id:
            queryset = queryset.filter(item_id=item_id)
        desde = (request.query_params.get('desde') or '').strip()
        if desde:
            parsed_dt = parse_datetime(desde)
            if parsed_dt:
                queryset = queryset.filter(creado_en__gte=parsed_dt)
            else:
                parsed_date = parse_date(desde)
                if parsed_date:
                    queryset = queryset.filter(creado_en__date__gte=parsed_date)
        data = InventarioMovimientoSerializer(queryset, many=True).data
        return Response(data)
