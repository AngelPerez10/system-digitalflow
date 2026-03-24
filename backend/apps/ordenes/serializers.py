from rest_framework import serializers

from .models import Orden, OrdenLevantamiento, ReporteSemanal


class OrdenSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source='cliente_id.nombre', read_only=True)
    tecnico_asignado_username = serializers.CharField(source='tecnico_asignado.username', read_only=True)
    tecnico_asignado_full_name = serializers.SerializerMethodField()
    quien_instalo_username = serializers.CharField(source='quien_instalo.username', read_only=True)
    quien_instalo_full_name = serializers.SerializerMethodField()
    quien_entrego_username = serializers.CharField(source='quien_entrego.username', read_only=True)
    quien_entrego_full_name = serializers.SerializerMethodField()
    creado_por_username = serializers.CharField(source='creado_por.username', read_only=True)
    tipo_orden = serializers.SerializerMethodField()

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

    def get_tipo_orden(self, obj):
        if getattr(obj, 'tiene_levantamiento', False):
            return 'levantamiento'
        try:
            if hasattr(obj, 'levantamiento') and obj.levantamiento is not None:
                return 'levantamiento'
        except Exception:
            pass
        return 'servicio_tecnico'

    def get_quien_instalo_full_name(self, obj):
        if obj.quien_instalo:
            first = obj.quien_instalo.first_name
            last = obj.quien_instalo.last_name
            if first or last:
                return f"{first} {last}".strip()
            return obj.quien_instalo.username or obj.quien_instalo.email
        return None

    def get_quien_entrego_full_name(self, obj):
        if obj.quien_entrego:
            first = obj.quien_entrego.first_name
            last = obj.quien_entrego.last_name
            if first or last:
                return f"{first} {last}".strip()
            return obj.quien_entrego.username or obj.quien_entrego.email
        return None

    class Meta:
        model = Orden
        fields = [
            'id',
            'idx',
            'folio',
            'tipo_orden',
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
            'quien_instalo',
            'quien_instalo_username',
            'quien_instalo_full_name',
            'quien_entrego',
            'quien_entrego_username',
            'quien_entrego_full_name',
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
            'tipo_orden',
            'cliente_nombre',
            'tecnico_asignado_username',
            'tecnico_asignado_full_name',
            'quien_instalo_username',
            'quien_instalo_full_name',
            'quien_entrego_username',
            'quien_entrego_full_name',
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

        # Normalizar datos de cerco para levantamientos tipo cerco
        if payload.get('tipo') == 'cerco':
            # cerco_metrajes: lista de strings
            metrajes = payload.get('cerco_metrajes')
            if metrajes is not None:
                if not isinstance(metrajes, list):
                    payload['cerco_metrajes'] = [str(metrajes).strip()] if metrajes else ['']
                else:
                    payload['cerco_metrajes'] = [str(m).strip() if m is not None else '' for m in metrajes]
                    if not payload['cerco_metrajes']:
                        payload['cerco_metrajes'] = ['']
            else:
                payload['cerco_metrajes'] = ['']

            # cerco_metraje_distribucion: '' | 'si' | 'no'
            dist = payload.get('cerco_metraje_distribucion')
            if dist not in ('', 'si', 'no'):
                payload['cerco_metraje_distribucion'] = ''

            # cerco_metros y metros por tramo: strings
            for key in (
                'cerco_metros',
                'cerco_metros_tramo_1',
                'cerco_metros_tramo_2',
            ):
                val = payload.get(key)
                payload[key] = str(val).strip() if val is not None else ''

            # cerco_lineas, cerco_cables_tierra: enteros >= 0
            for key in (
                'cerco_lineas',
                'cerco_lineas_tramo_1',
                'cerco_lineas_tramo_2',
                'cerco_cables_tierra',
            ):
                val = payload.get(key)
                try:
                    n = int(val) if val is not None else 0
                    payload[key] = max(0, n)
                except (TypeError, ValueError):
                    payload[key] = 0

            # Valores fijos de líneas por tramo
            payload['cerco_lineas_tramo_1'] = 5
            payload['cerco_lineas_tramo_2'] = 3

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


class ReporteSemanalSerializer(serializers.ModelSerializer):
    tecnico_nombre = serializers.SerializerMethodField()

    def get_tecnico_nombre(self, obj):
        if not obj.tecnico:
            return "-"
        nombre = f"{obj.tecnico.first_name or ''} {obj.tecnico.last_name or ''}".strip()
        return nombre or obj.tecnico.username or obj.tecnico.email or "-"

    class Meta:
        model = ReporteSemanal
        fields = [
            'id',
            'tecnico',
            'tecnico_nombre',
            'semana_inicio',
            'semana_fin',
            'ordenes',
            'total_ordenes',
            'fecha_creacion',
            'fecha_actualizacion',
        ]
        read_only_fields = [
            'id',
            'tecnico',
            'tecnico_nombre',
            'total_ordenes',
            'fecha_creacion',
            'fecha_actualizacion',
        ]
