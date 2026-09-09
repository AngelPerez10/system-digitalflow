from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import PushDevice
from .serializers import PushDeviceBajaSerializer, PushDeviceRegistroSerializer


class PushDeviceRegistroView(APIView):
    """`POST /api/push-devices/` — alta o refresco del dispositivo actual.

    Idempotente y con upsert **por token**, no por usuario: Expo puede devolver
    el mismo token a otra cuenta si dos personas comparten el equipo, y en ese
    caso la fila debe cambiar de dueño en lugar de duplicarse (el token es
    único). Un registro repetido también reactiva un dispositivo dado de baja
    —la app volvió a instalarse— y refresca `last_seen_at`.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'push_devices'

    def post(self, request):
        serializer = PushDeviceRegistroSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        datos = serializer.validated_data

        dispositivo, creado = PushDevice.objects.update_or_create(
            expo_token=datos['expo_token'],
            defaults={
                'user': request.user,
                'platform': datos.get('platform') or '',
                'disabled_at': None,
            },
        )
        return Response(
            {'id': dispositivo.pk, 'creado': creado},
            status=status.HTTP_201_CREATED if creado else status.HTTP_200_OK,
        )


class PushDeviceBajaView(APIView):
    """`POST /api/push-devices/baja/` — el dispositivo deja de recibir avisos.

    Se llama al cerrar sesión. Solo borra tokens del propio usuario: con el
    token de otro no se puede darle de baja el suyo.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'push_devices'

    def post(self, request):
        serializer = PushDeviceBajaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        borrados, _ = PushDevice.objects.filter(
            expo_token=serializer.validated_data['expo_token'],
            user=request.user,
        ).delete()
        return Response({'borrados': borrados}, status=status.HTTP_200_OK)
