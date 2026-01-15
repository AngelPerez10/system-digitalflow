from rest_framework import serializers

from .models import Cliente, ClienteContacto, ClienteDocumento


class ClienteContactoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClienteContacto
        fields = '__all__'
        read_only_fields = ['id', 'fecha_creacion', 'fecha_actualizacion']


class ClienteDocumentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClienteDocumento
        fields = '__all__'
        read_only_fields = ['id', 'cliente', 'url', 'public_id', 'nombre_original', 'size_bytes', 'fecha_creacion', 'fecha_actualizacion']


class ClienteSerializer(serializers.ModelSerializer):
    contactos = ClienteContactoSerializer(many=True, read_only=True)
    documento = ClienteDocumentoSerializer(read_only=True)

    class Meta:
        model = Cliente
        fields = '__all__'
        read_only_fields = ['id', 'idx', 'fecha_creacion', 'fecha_actualizacion']
