from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import Notificacion, PushDevice
from .serializers import (
    NotificacionSerializer,
    PushDeviceBajaSerializer,
    PushDeviceRegistroSerializer,
)

# Tope de filas devueltas por el listado del header (la campanita no pagina).
NOTIFICACIONES_LIMITE = 50


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


class NotificacionesListView(APIView):
    """`GET /api/notificaciones/` — últimas notificaciones del usuario.

    Query params: `?no_leidas=1` filtra a solo las pendientes. Devuelve como
    mucho `NOTIFICACIONES_LIMITE` (la campanita del header no pagina) más un
    contador `no_leidas` para el badge.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Notificacion.objects.filter(destinatario=request.user)
        if request.query_params.get('no_leidas') in ('1', 'true', 'True'):
            qs = qs.filter(leida_at__isnull=True)
        filas = list(qs[:NOTIFICACIONES_LIMITE])
        no_leidas = Notificacion.objects.filter(
            destinatario=request.user, leida_at__isnull=True
        ).count()
        return Response({
            'results': NotificacionSerializer(filas, many=True).data,
            'no_leidas': no_leidas,
        })


class NotificacionesResumenView(APIView):
    """`GET /api/notificaciones/resumen/` — solo contadores, para el polling."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        base = Notificacion.objects.filter(destinatario=request.user)
        return Response({
            'total': base.count(),
            'no_leidas': base.filter(leida_at__isnull=True).count(),
        })


class NotificacionLeerView(APIView):
    """`POST /api/notificaciones/<pk>/leer/` — marca una como leída (idempotente)."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        actualizadas = Notificacion.objects.filter(
            pk=pk, destinatario=request.user, leida_at__isnull=True
        ).update(leida_at=timezone.now())
        no_leidas = Notificacion.objects.filter(
            destinatario=request.user, leida_at__isnull=True
        ).count()
        return Response({'actualizadas': actualizadas, 'no_leidas': no_leidas})


class NotificacionesMarcarTodasView(APIView):
    """`POST /api/notificaciones/marcar-todas/` — marca todas como leídas."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        actualizadas = Notificacion.objects.filter(
            destinatario=request.user, leida_at__isnull=True
        ).update(leida_at=timezone.now())
        return Response({'actualizadas': actualizadas, 'no_leidas': 0})
