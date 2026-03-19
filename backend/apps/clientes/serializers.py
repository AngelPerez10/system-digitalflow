from rest_framework import serializers

from .models import Cliente, ClienteContacto, ClienteDocumento


class ClienteContactoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClienteContacto
        fields = [
            'id',
            'cliente',
            'nombre_apellido',
            'titulo',
            'area_puesto',
            'celular',
            'correo',
            'is_principal',
            'fecha_creacion',
            'fecha_actualizacion',
        ]
        read_only_fields = ['id', 'fecha_creacion', 'fecha_actualizacion']


class ClienteDocumentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClienteDocumento
        fields = [
            'id',
            'cliente',
            'url',
            'public_id',
            'nombre_original',
            'size_bytes',
            'fecha_creacion',
            'fecha_actualizacion',
        ]
        read_only_fields = ['id', 'cliente', 'url', 'public_id', 'nombre_original', 'size_bytes', 'fecha_creacion', 'fecha_actualizacion']


class ClienteSerializer(serializers.ModelSerializer):
    contactos = ClienteContactoSerializer(many=True, read_only=True)
    documento = ClienteDocumentoSerializer(read_only=True)

    class Meta:
        model = Cliente
        fields = [
            'id',
            'idx',
            'nombre',
            'direccion',
            'telefono',
            'rfc',
            'curp',
            'correo',
            'calle',
            'numero_exterior',
            'interior',
            'colonia',
            'localidad',
            'municipio',
            'codigo_postal',
            'ciudad',
            'pais',
            'estado',
            'aplica_retenciones',
            'desglosar_ieps',
            'numero_precio',
            'limite_credito',
            'dias_credito',
            'tipo',
            'is_prospecto',
            'notas',
            'descuento_pct',
            'portal_web',
            'nombre_facturacion',
            'numero_facturacion',
            'domicilio_facturacion',
            'calle_envio',
            'numero_envio',
            'colonia_envio',
            'codigo_postal_envio',
            'pais_envio',
            'estado_envio',
            'ciudad_envio',
            'fecha_creacion',
            'fecha_actualizacion',
            'contactos',
            'documento',
        ]
        read_only_fields = ['id', 'idx', 'fecha_creacion', 'fecha_actualizacion']
