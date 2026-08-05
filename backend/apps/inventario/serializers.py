from rest_framework import serializers

from .models import InventarioItem, InventarioMovimiento


class InventarioItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventarioItem
        fields = [
            'id',
            'codigo_barras',
            'nombre',
            'marca',
            'modelo',
            'notas',
            'fuente',
            'ref_externa',
            'cantidad',
            'fecha_creacion',
            'fecha_actualizacion',
        ]
        read_only_fields = fields


class InventarioMovimientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventarioMovimiento
        fields = [
            'id',
            'item',
            'tipo',
            'cantidad',
            'usuario',
            'nota',
            'creado_en',
        ]
        read_only_fields = fields


class ScanSerializer(serializers.Serializer):
    codigo_barras = serializers.CharField(required=True)
    modo = serializers.ChoiceField(choices=['entrada', 'salida'])
