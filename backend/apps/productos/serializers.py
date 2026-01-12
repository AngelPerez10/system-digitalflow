from rest_framework import serializers

from .models import Producto, ProductoDocumento, ProductoImagen


class ProductoImagenSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductoImagen
        fields = '__all__'
        read_only_fields = ['id', 'producto', 'url', 'public_id', 'nombre_original', 'size_bytes', 'fecha_creacion', 'fecha_actualizacion']


class ProductoDocumentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductoDocumento
        fields = '__all__'
        read_only_fields = ['id', 'producto', 'url', 'public_id', 'nombre_original', 'size_bytes', 'fecha_creacion', 'fecha_actualizacion']


class ProductoSerializer(serializers.ModelSerializer):
    imagen = ProductoImagenSerializer(read_only=True)
    documento = ProductoDocumentoSerializer(read_only=True)

    class Meta:
        model = Producto
        fields = '__all__'
        read_only_fields = ['id', 'idx', 'fecha_creacion', 'fecha_actualizacion']
