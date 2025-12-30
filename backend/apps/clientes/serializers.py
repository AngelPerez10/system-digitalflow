from rest_framework import serializers
from .models import Cliente


class ClienteSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = Cliente
        fields = [
            'id',
            'idx',
            'nombre',
            'direccion',
            'telefono',
            'fecha_creacion',
            'fecha_actualizacion'
        ]
        read_only_fields = ['id', 'idx', 'fecha_creacion', 'fecha_actualizacion']
