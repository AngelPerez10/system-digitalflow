from rest_framework import serializers

from .models import Concepto, Servicio


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
