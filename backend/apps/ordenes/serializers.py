from rest_framework import serializers

from .models import Orden


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
