from rest_framework import serializers

from .models import KpiVenta


class KpiVentaSerializer(serializers.ModelSerializer):
    class Meta:
        model = KpiVenta
        fields = [
            'id',
            'idx',
            'no_cliente',
            'fecha_lead',
            'nombre_cliente',
            'telefono',
            'correo',
            'canal_contacto',
            'linea_sistema',
            'producto_servicio',
            'no_cotizacion',
            'levantamiento',
            'monto_cotizado',
            'status',
            'probabilidad',
            'responsable',
            'fecha_cierre',
            'monto_vendido',
            'motivo_perdida',
            'proxima_accion',
            'fecha_proxima_accion',
            'notas',
            'fecha_creacion',
            'fecha_actualizacion',
        ]
        read_only_fields = ('id', 'idx', 'fecha_creacion', 'fecha_actualizacion')
