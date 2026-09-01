from rest_framework import serializers

from apps.clientes.portal_models import ClienteRegistroSolicitud
from apps.clientes.portal_services import RegistroPayload
from apps.ordenes.models import Orden, OrdenCalificacion


class PortalRegistroSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField(max_length=254)
    telefono = serializers.CharField(max_length=25)
    razon_social = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    rfc = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    codigo_postal = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    acepto_privacidad = serializers.BooleanField()

    def validate_telefono(self, value):
        digits = ''.join(ch for ch in value if ch.isdigit())
        if len(digits) < 10:
            raise serializers.ValidationError('Ingresa un celular de 10 dígitos.')
        return value

    def validate_acepto_privacidad(self, value):
        if not value:
            raise serializers.ValidationError('Debes aceptar el aviso de privacidad.')
        return value

    def to_payload(self) -> RegistroPayload:
        data = self.validated_data
        return RegistroPayload(
            first_name=data['first_name'].strip(),
            last_name=data['last_name'].strip(),
            email=data['email'].strip(),
            telefono=data['telefono'].strip(),
            razon_social=(data.get('razon_social') or '').strip(),
            rfc=(data.get('rfc') or '').strip(),
            codigo_postal=(data.get('codigo_postal') or '').strip(),
            acepto_privacidad=bool(data.get('acepto_privacidad')),
        )


class PortalCambiarContrasenaSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Las contraseñas no coinciden.'})
        return attrs


class PortalRegistroSolicitudSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ClienteRegistroSolicitud
        fields = [
            'id',
            'first_name',
            'last_name',
            'email',
            'telefono',
            'razon_social',
            'rfc',
            'codigo_postal',
            'dedup_result',
            'status',
            'cliente',
            'cliente_nombre',
            'portal_account',
            'reviewed_by',
            'reviewed_by_name',
            'reviewed_at',
            'rejection_reason',
            'created_at',
        ]
        read_only_fields = fields

    def get_cliente_nombre(self, obj):
        return obj.cliente.nombre if obj.cliente_id else ''

    def get_reviewed_by_name(self, obj):
        if not obj.reviewed_by_id:
            return ''
        u = obj.reviewed_by
        return f'{u.first_name} {u.last_name}'.strip() or u.username


def _nombre_completo(user) -> str | None:
    if not user:
        return None
    nombre = f'{user.first_name} {user.last_name}'.strip()
    return nombre or user.username or user.email or None


def _avatar_url(user) -> str:
    """Foto de perfil del técnico (`permissions_profile.avatar_url`), o ''."""
    if not user:
        return ''
    perfil = getattr(user, 'permissions_profile', None)
    return (getattr(perfil, 'avatar_url', '') or '').strip()


class PortalOrdenListSerializer(serializers.ModelSerializer):
    """Orden vista por su cliente. Lista **blanca** y explícita de campos.

    Nunca heredar de `OrdenSerializer`: ese contrato es del ERP y crece con
    campos internos (status administrativo, cotizaciones, equipos, quién la
    creó, teléfono del contacto). Aquí solo entra lo que el cliente puede ver
    de su propio servicio; añadir un campo al modelo no lo filtra al portal.
    """

    tecnico_asignado_full_name = serializers.SerializerMethodField()
    tecnico_asignado_avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = Orden
        fields = [
            'id',
            'folio',
            'status',
            'motivo_pausa',
            'prioridad',
            'direccion',
            'problematica',
            'fecha_inicio',
            'hora_inicio',
            'fecha_finalizacion',
            'hora_termino',
            'fecha_creacion',
            'tecnico_asignado_full_name',
            'tecnico_asignado_avatar_url',
        ]
        read_only_fields = fields

    def get_tecnico_asignado_full_name(self, obj):
        return _nombre_completo(getattr(obj, 'tecnico_asignado', None))

    def get_tecnico_asignado_avatar_url(self, obj):
        return _avatar_url(getattr(obj, 'tecnico_asignado', None))


class PortalCalificacionSerializer(serializers.ModelSerializer):
    """La calificación tal como la ve el cliente que la escribió."""

    class Meta:
        model = OrdenCalificacion
        fields = ['estrellas', 'comentario', 'fecha_creacion']
        read_only_fields = fields


class PortalCalificarSerializer(serializers.Serializer):
    """Entrada del formulario: estrellas obligatorias, comentario opcional."""

    estrellas = serializers.IntegerField(
        min_value=OrdenCalificacion.ESTRELLAS_MIN,
        max_value=OrdenCalificacion.ESTRELLAS_MAX,
    )
    comentario = serializers.CharField(
        required=False, allow_blank=True, default='', max_length=1000
    )


class PortalOrdenDetalleSerializer(PortalOrdenListSerializer):
    """Detalle «resumen para cliente»: lo de la lista + evidencia del servicio."""

    calificacion = serializers.SerializerMethodField()
    puede_calificar = serializers.SerializerMethodField()

    class Meta(PortalOrdenListSerializer.Meta):
        fields = PortalOrdenListSerializer.Meta.fields + [
            'nombre_encargado',
            'comentario_tecnico',
            'servicios_realizados',
            'fotos_urls',
            'firma_cliente_url',
            'calificacion',
            'puede_calificar',
        ]
        read_only_fields = fields

    def get_calificacion(self, obj):
        calificacion = getattr(obj, 'calificacion', None)
        if calificacion is None:
            return None
        return PortalCalificacionSerializer(calificacion).data

    def get_puede_calificar(self, obj) -> bool:
        """Como en un viaje: se califica al terminar, y una sola vez."""
        return obj.status == 'resuelto' and getattr(obj, 'calificacion', None) is None


class PortalSolicitudAprobarSerializer(serializers.Serializer):
    cliente_id = serializers.IntegerField(min_value=1)


class PortalSolicitudRechazarSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, default='')
