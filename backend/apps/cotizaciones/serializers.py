from decimal import Decimal, InvalidOperation

from django.db import transaction
from rest_framework import serializers

from .models import Cotizacion, CotizacionItem


class CotizacionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CotizacionItem
        fields = [
            'id',
            'cotizacion',
            'producto_externo_id',
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
    actualizado_por_username = serializers.CharField(source='actualizado_por.username', read_only=True)
    actualizado_por_full_name = serializers.SerializerMethodField()

    items = CotizacionItemSerializer(many=True, required=False)

    def get_creado_por_full_name(self, obj):
        if obj.creado_por:
            first = obj.creado_por.first_name
            last = obj.creado_por.last_name
            if first or last:
                return f"{first} {last}".strip()
            return obj.creado_por.username or obj.creado_por.email
        return None

    def get_actualizado_por_full_name(self, obj):
        if obj.actualizado_por:
            first = obj.actualizado_por.first_name
            last = obj.actualizado_por.last_name
            if first or last:
                return f"{first} {last}".strip()
            return obj.actualizado_por.username or obj.actualizado_por.email
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
            'medio_contacto',
            'status',
            'fecha',
            'vencimiento',
            'subtotal',
            'descuento_cliente_pct',
            'iva_pct',
            'iva',
            'total',
            'texto_arriba_precios',
            'terminos',
            'creado_por',
            'creado_por_username',
            'creado_por_full_name',
            'actualizado_por',
            'actualizado_por_username',
            'actualizado_por_full_name',
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
            'actualizado_por',
            'actualizado_por_username',
            'actualizado_por_full_name',
            'fecha_creacion',
            'fecha_actualizacion',
        ]

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        request = self.context.get('request')
        user = getattr(request, 'user', None)

        totals = self._calculate_totals(items_data, validated_data)
        validated_data.update(totals)

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
        current_items = items_data if items_data is not None else list(instance.items.all().values(
            'cantidad', 'precio_lista', 'descuento_pct'
        ))

        totals = self._calculate_totals(current_items, validated_data, instance)
        validated_data.update(totals)

        for k, v in validated_data.items():
            setattr(instance, k, v)
        
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user:
            instance.actualizado_por = user
            
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

    @staticmethod
    def _to_decimal(value, default='0'):
        try:
            return Decimal(str(value))
        except (InvalidOperation, TypeError, ValueError):
            return Decimal(default)

    def _calculate_totals(self, items_data, data, instance=None):
        """
        Recalcula subtotal/iva/total en backend para evitar inconsistencias
        o doble IVA por cálculos de cliente.
        """
        items = list(items_data or [])
        subtotal_lineas = Decimal('0')
        for item in items:
            cantidad = self._to_decimal((item or {}).get('cantidad', 0))
            precio_lista = self._to_decimal((item or {}).get('precio_lista', 0))
            descuento_pct = self._to_decimal((item or {}).get('descuento_pct', 0))

            if descuento_pct < 0:
                descuento_pct = Decimal('0')
            if descuento_pct > 100:
                descuento_pct = Decimal('100')

            pu = precio_lista * (Decimal('1') - (descuento_pct / Decimal('100')))
            importe = cantidad * pu
            if importe > 0:
                subtotal_lineas += importe

        src_desc = data.get('descuento_cliente_pct')
        if src_desc is None and instance is not None:
            src_desc = instance.descuento_cliente_pct
        descuento_cliente_pct = self._to_decimal(src_desc, '0')
        if descuento_cliente_pct < 0:
            descuento_cliente_pct = Decimal('0')
        if descuento_cliente_pct > 100:
            descuento_cliente_pct = Decimal('100')

        src_iva = data.get('iva_pct')
        if src_iva is None and instance is not None:
            src_iva = instance.iva_pct
        iva_pct = self._to_decimal(src_iva, '16')
        if iva_pct < 0:
            iva_pct = Decimal('0')
        if iva_pct > 100:
            iva_pct = Decimal('100')

        descuento_cliente = subtotal_lineas * (descuento_cliente_pct / Decimal('100'))
        subtotal = subtotal_lineas - descuento_cliente
        if subtotal < 0:
            subtotal = Decimal('0')

        iva = subtotal * (iva_pct / Decimal('100'))
        total = subtotal + iva

        q = Decimal('0.01')
        return {
            'descuento_cliente_pct': descuento_cliente_pct.quantize(q),
            'iva_pct': iva_pct.quantize(q),
            'subtotal': subtotal.quantize(q),
            'iva': iva.quantize(q),
            'total': total.quantize(q),
        }
