from rest_framework import serializers

from .models import Orden, OrdenLevantamiento


class OrdenSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source='cliente_id.nombre', read_only=True)
    tecnico_asignado_username = serializers.CharField(source='tecnico_asignado.username', read_only=True)
    tecnico_asignado_full_name = serializers.SerializerMethodField()
    creado_por_username = serializers.CharField(source='creado_por.username', read_only=True)

    def validate_folio(self, value):
        if isinstance(value, str) and value.strip() == '':
            return None
        return value

    def get_tecnico_asignado_full_name(self, obj):
        if obj.tecnico_asignado:
            first = obj.tecnico_asignado.first_name
            last = obj.tecnico_asignado.last_name
            if first or last:
                return f"{first} {last}".strip()
            return obj.tecnico_asignado.username or obj.tecnico_asignado.email
        return None

    class Meta:
        model = Orden
        fields = [
            'id',
            'idx',
            'folio',
            'cliente_id',
            'cliente_nombre',
            'cliente',
            'direccion',
            'telefono_cliente',
            'problematica',
            'servicios_realizados',
            'status',
            'prioridad',
            'comentario_tecnico',
            'fecha_inicio',
            'hora_inicio',
            'fecha_finalizacion',
            'hora_termino',
            'nombre_encargado',
            'tecnico_asignado',
            'tecnico_asignado_username',
            'tecnico_asignado_full_name',
            'nombre_cliente',
            'fotos_urls',
            'pdf_generado',
            'pdf_url',
            'firma_encargado_url',
            'firma_cliente_url',
            'creado_por',
            'creado_por_username',
            'fecha_creacion',
            'fecha_actualizacion',
        ]
        read_only_fields = [
            'id',
            'idx',
            'cliente_nombre',
            'tecnico_asignado_username',
            'tecnico_asignado_full_name',
            'creado_por',
            'creado_por_username',
            'pdf_url',
            'fecha_creacion',
            'fecha_actualizacion',
        ]


class OrdenLevantamientoSerializer(serializers.ModelSerializer):
    def validate_payload(self, value):
        payload = value if isinstance(value, dict) else {}

        cantidad_raw = payload.get('bobina_cable_cantidad', 0)
        try:
            cantidad = int(cantidad_raw or 0)
        except (TypeError, ValueError):
            cantidad = 0
        cantidad = max(0, cantidad)

        metrajes = payload.get('bobina_cable_metrajes', None)

        if metrajes is None:
            legacy = payload.get('bobina_cable_metraje', None)
            if legacy is not None and cantidad > 0:
                metrajes = [legacy for _ in range(cantidad)]

        if metrajes is not None:
            if not isinstance(metrajes, list):
                raise serializers.ValidationError('bobina_cable_metrajes debe ser una lista.')

            allowed = {'', '100', '152', '305', '1000'}
            normalized = []
            for m in metrajes:
                if m is None:
                    s = ''
                else:
                    s = str(m).strip()
                if s not in allowed:
                    raise serializers.ValidationError('Metraje de bobina inválido.')
                normalized.append(s)

            if cantidad > 0:
                normalized = normalized[:cantidad]
                while len(normalized) < cantidad:
                    normalized.append('')

            payload['bobina_cable_metrajes'] = normalized
            if 'bobina_cable_metraje' in payload:
                payload.pop('bobina_cable_metraje', None)

        return payload

    class Meta:
        model = OrdenLevantamiento
        fields = [
            'id',
            'orden',
            'payload',
            'dibujo_url',
            'creado_por',
            'fecha_creacion',
            'fecha_actualizacion',
        ]
        read_only_fields = [
            'id',
            'orden',
            'creado_por',
            'fecha_creacion',
            'fecha_actualizacion',
        ]
