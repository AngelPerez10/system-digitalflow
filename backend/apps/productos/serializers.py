from rest_framework import serializers

from .models import Concepto, ProductoManual, Servicio


class ServicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Servicio
        fields = [
            'id',
            'idx',
            'nombre',
            'descripcion',
            'activo',
            'categoria',
            'fecha_creacion',
            'fecha_actualizacion',
        ]
        read_only_fields = ['id', 'idx', 'fecha_creacion', 'fecha_actualizacion']


class ConceptoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Concepto
        fields = [
            'id',
            'folio',
            'concepto',
            'precio1',
            'imagen_url',
            'fecha_creacion',
            'fecha_actualizacion',
        ]
        read_only_fields = ['id', 'fecha_creacion', 'fecha_actualizacion']


class ProductoManualSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductoManual
        fields = [
            'id',
            'producto',
            'marca',
            'modelo',
            'imagen_url',
            'fuente',
            'precio',
            'stock',
            'activo',
            'fecha_creacion',
            'fecha_actualizacion',
        ]
        read_only_fields = ['id', 'fuente', 'fecha_creacion', 'fecha_actualizacion']

    def validate_stock(self, value):
        if value < 0:
            raise serializers.ValidationError('El stock no puede ser negativo.')
        return value

    def validate_precio(self, value):
        if value < 0:
            raise serializers.ValidationError('El precio no puede ser negativo.')
        return value
