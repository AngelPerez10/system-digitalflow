from rest_framework import serializers

from .models import Servicio


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
