from django.db import transaction
from rest_framework import serializers

from .models import Cotizacion, CotizacionItem


class CotizacionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CotizacionItem
        fields = [
            'id',
            'cotizacion',
            'producto_id',
            'producto_nombre',
            'producto_descripcion',
            'unidad',
            'thumbnail_url',
            'cantidad',
            'precio_lista',
            'descuento_pct',
            'orden',
        ]
        read_only_fields = ['id', 'cotizacion']


class CotizacionSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source='cliente_id.nombre', read_only=True)
    creado_por_username = serializers.CharField(source='creado_por.username', read_only=True)
    creado_por_full_name = serializers.SerializerMethodField()

    items = CotizacionItemSerializer(many=True, required=False)

    def get_creado_por_full_name(self, obj):
        if obj.creado_por:
            first = obj.creado_por.first_name
            last = obj.creado_por.last_name
            if first or last:
                return f"{first} {last}".strip()
            return obj.creado_por.username or obj.creado_por.email
        return None

    class Meta:
        model = Cotizacion
        fields = [
            'id',
            'idx',
            'cliente_id',
            'cliente_nombre',
            'cliente',
            'prospecto',
            'contacto',
            'fecha',
            'vencimiento',
            'subtotal',
            'iva_pct',
            'iva',
            'total',
            'texto_arriba_precios',
            'terminos',
            'creado_por',
            'creado_por_username',
            'creado_por_full_name',
            'fecha_creacion',
            'fecha_actualizacion',
            'items',
        ]
        read_only_fields = [
            'id',
            'idx',
            'cliente_nombre',
            'creado_por',
            'creado_por_username',
            'creado_por_full_name',
            'fecha_creacion',
            'fecha_actualizacion',
        ]

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        request = self.context.get('request')
        user = getattr(request, 'user', None)

        cot = Cotizacion.objects.create(creado_por=user, **validated_data)
        for i, item in enumerate(items_data or []):
            item_data = dict(item or {})
            orden = item_data.pop('orden', None)
            CotizacionItem.objects.create(
                cotizacion=cot,
                orden=int(orden) if orden is not None else i,
                **item_data,
            )
        return cot

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)

        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for i, item in enumerate(items_data or []):
                item_data = dict(item or {})
                orden = item_data.pop('orden', None)
                CotizacionItem.objects.create(
                    cotizacion=instance,
                    orden=int(orden) if orden is not None else i,
                    **item_data,
                )

        return instance
