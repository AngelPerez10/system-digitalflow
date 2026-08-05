from django.db import transaction
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.permissions import InventarioPermission

from .enrichment import enrich_from_catalogs
from .models import InventarioItem, InventarioMovimiento
from .serializers import (
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
