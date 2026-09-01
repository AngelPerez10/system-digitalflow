import re
from calendar import monthrange
from datetime import date, datetime, time, timedelta

from django.db.models import F, Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from apps.clientes.portal_models import ClienteRegistroSolicitud
from apps.clientes.portal_permissions import (
    PortalClienteCalificarPermission,
    PortalClientePermission,
)
from apps.clientes.portal_serializers import (
    PortalCalificacionSerializer,
    PortalCalificarSerializer,
    PortalCambiarContrasenaSerializer,
    PortalOrdenDetalleSerializer,
    PortalOrdenListSerializer,
    PortalRegistroSerializer,
    PortalRegistroSolicitudSerializer,
    PortalSolicitudAprobarSerializer,
    PortalSolicitudRechazarSerializer,
)
from apps.clientes.portal_services import (
    approve_registro_solicitud,
    change_portal_password,
    register_portal_cliente,
    reject_registro_solicitud,
)
from apps.clientes.portal_throttling import (
    PortalConsultaRateThrottle,
    PortalRegistroEmailThrottle,
    PortalRegistroRateThrottle,
)
from apps.ordenes.models import Orden, OrdenCalificacion


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PortalRegistroRateThrottle, PortalRegistroEmailThrottle])
def portal_registro_view(request):
    serializer = PortalRegistroSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    result = register_portal_cliente(serializer.to_payload())

    if result.outcome == 'rejected':
        return Response({'detail': result.message}, status=status.HTTP_400_BAD_REQUEST)
    if result.outcome == 'pending_review':
        return Response(
            {'detail': result.message, 'status': 'pending_review', 'solicitud_id': result.solicitud_id},
            status=status.HTTP_202_ACCEPTED,
        )
    return Response(
        {
            'detail': result.message,
            'status': 'created',
            'solicitud_id': result.solicitud_id,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def portal_cambiar_contrasena_view(request):
    if not hasattr(request.user, 'cliente_portal_account'):
        return Response(
            {'detail': 'Esta acción solo aplica a cuentas de portal cliente.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    serializer = PortalCambiarContrasenaSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        change_portal_password(
            user=request.user,
            current_password=serializer.validated_data['current_password'],
            new_password=serializer.validated_data['new_password'],
        )
    except ValueError as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    return Response({'detail': 'Contraseña actualizada.', 'must_change_password': False})


def _ordenes_del_cliente(request):
    """Órdenes del cliente dueño de la cuenta de portal. Nunca las de otro."""
    cliente_id = request.user.cliente_portal_account.cliente_id
    return Orden.objects.filter(cliente_id=cliente_id).select_related(
        'tecnico_asignado', 'tecnico_asignado__permissions_profile'
    )


def _filtrar_por_mes(qs, mes: str):
    """`mes=YYYY-MM` sobre `fecha_inicio`, con respaldo en `fecha_creacion`.

    Mismo criterio que el listado del ERP (`OrdenViewSet._apply_list_filters`)
    para que cliente y técnico vean la orden en el mismo mes.
    """
    if not re.match(r'^\d{4}-\d{2}$', mes):
        return qs
    year, month = int(mes[:4]), int(mes[5:7])
    if not 1 <= month <= 12:
        return qs

    inicio = date(year, month, 1)
    fin = date(year, month, monthrange(year, month)[1])
    inicio_naive = datetime.combine(inicio, time.min)
    fin_exclusivo_naive = datetime.combine(fin + timedelta(days=1), time.min)
    if timezone.is_aware(timezone.now()):
        tz = timezone.get_current_timezone()
        inicio_dt = timezone.make_aware(inicio_naive, tz)
        fin_exclusivo = timezone.make_aware(fin_exclusivo_naive, tz)
    else:
        inicio_dt = inicio_naive
        fin_exclusivo = fin_exclusivo_naive

    return qs.filter(
        Q(fecha_inicio__gte=inicio, fecha_inicio__lte=fin)
        | Q(
            fecha_inicio__isnull=True,
            fecha_creacion__gte=inicio_dt,
            fecha_creacion__lt=fin_exclusivo,
        )
    )


@api_view(['GET'])
@permission_classes([PortalClientePermission])
@throttle_classes([PortalConsultaRateThrottle])
def portal_ordenes_list_view(request):
    """Órdenes del cliente autenticado. Solo lectura; `?mes=YYYY-MM` opcional."""
    qs = _ordenes_del_cliente(request).order_by(
        F('fecha_inicio').desc(nulls_last=True),
        F('fecha_creacion').desc(nulls_last=True),
        '-id',
    )
    qs = _filtrar_por_mes(qs, (request.query_params.get('mes') or '').strip())
    return Response(PortalOrdenListSerializer(qs, many=True).data)


@api_view(['GET'])
@permission_classes([PortalClientePermission])
@throttle_classes([PortalConsultaRateThrottle])
def portal_orden_detalle_view(request, orden_id: int):
    """Detalle de una orden propia. Una orden ajena es **404**, no 403: el
    portal no confirma la existencia de servicios de otros clientes."""
    orden = (
        _ordenes_del_cliente(request)
        .select_related('calificacion')
        .filter(pk=orden_id)
        .first()
    )
    if orden is None:
        return Response({'detail': 'Orden no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
    return Response(PortalOrdenDetalleSerializer(orden).data)


@api_view(['POST'])
@permission_classes([PortalClienteCalificarPermission])
@throttle_classes([PortalConsultaRateThrottle])
def portal_orden_calificar_view(request, orden_id: int):
    """El cliente califica al técnico de una orden suya: estrellas + comentario.

    Como al terminar un viaje: solo cuando el servicio está **resuelto** y solo
    **una vez**. La orden ajena es 404, igual que en el detalle.
    """
    orden = (
        _ordenes_del_cliente(request)
        .select_related('calificacion', 'tecnico_asignado')
        .filter(pk=orden_id)
        .first()
    )
    if orden is None:
        return Response({'detail': 'Orden no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

    if orden.status != 'resuelto':
        return Response(
            {'detail': 'Podrás calificar cuando el servicio esté resuelto.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if getattr(orden, 'calificacion', None) is not None:
        return Response(
            {'detail': 'Este servicio ya fue calificado.'},
            status=status.HTTP_409_CONFLICT,
        )

    serializer = PortalCalificarSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    calificacion = OrdenCalificacion.objects.create(
        orden=orden,
        tecnico=orden.tecnico_asignado,
        estrellas=serializer.validated_data['estrellas'],
        comentario=(serializer.validated_data.get('comentario') or '').strip(),
        creado_por=request.user,
    )
    return Response(
        PortalCalificacionSerializer(calificacion).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(['GET'])
@permission_classes([IsAdminUser])
def portal_solicitudes_list_view(request):
    qs = ClienteRegistroSolicitud.objects.filter(
        status=ClienteRegistroSolicitud.STATUS_PENDING,
    ).select_related('cliente', 'reviewed_by')
    serializer = PortalRegistroSolicitudSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def portal_solicitud_aprobar_view(request, solicitud_id: int):
    try:
        solicitud = ClienteRegistroSolicitud.objects.get(pk=solicitud_id)
    except ClienteRegistroSolicitud.DoesNotExist:
        return Response({'detail': 'Solicitud no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

    serializer = PortalSolicitudAprobarSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        account = approve_registro_solicitud(
            solicitud=solicitud,
            reviewer=request.user,
            cliente_id=serializer.validated_data['cliente_id'],
        )
    except ValueError as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(
        {
            'detail': 'Solicitud aprobada. Se enviaron credenciales por correo.',
            'portal_username': account.portal_username,
            'cliente_id': account.cliente_id,
        }
    )


@api_view(['POST'])
@permission_classes([IsAdminUser])
def portal_solicitud_rechazar_view(request, solicitud_id: int):
    try:
        solicitud = ClienteRegistroSolicitud.objects.get(pk=solicitud_id)
    except ClienteRegistroSolicitud.DoesNotExist:
        return Response({'detail': 'Solicitud no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

    serializer = PortalSolicitudRechazarSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        reject_registro_solicitud(
            solicitud=solicitud,
            reviewer=request.user,
            reason=serializer.validated_data.get('reason') or '',
        )
    except ValueError as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    return Response({'detail': 'Solicitud rechazada.'})
