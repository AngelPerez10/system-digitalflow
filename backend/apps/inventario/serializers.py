from rest_framework import serializers

from .models import InventarioItem, InventarioMovimiento


class InventarioItemSerializer(serializers.ModelSerializer):
    proveedor_nombre = serializers.SerializerMethodField()

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
            'imagen_url',
            'seccion',
            'cantidad',
            'folio_factura',
            'proveedor',
            'proveedor_nombre',
            'precio_unitario',
            'fecha_creacion',
            'fecha_actualizacion',
        ]
        read_only_fields = fields

    def get_proveedor_nombre(self, obj: InventarioItem) -> str:
        prov = obj.proveedor
        if prov is None:
            return ''
        return (prov.nombre or '').strip()


class InventarioItemPatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventarioItem
        fields = [
            'nombre',
            'marca',
            'modelo',
            'notas',
            'fuente',
            'ref_externa',
            'imagen_url',
            'precio_unitario',
            'seccion',
        ]
        extra_kwargs = {
            'imagen_url': {'allow_blank': True},
            'precio_unitario': {'required': False, 'allow_null': True},
            'seccion': {'required': False, 'allow_blank': True},
        }


class InventarioMovimientoSerializer(serializers.ModelSerializer):
    """Incluye el nombre visible del operador y datos del ítem (paginación no trae la tabla)."""

    usuario_nombre = serializers.SerializerMethodField()
    item_codigo_barras = serializers.CharField(source='item.codigo_barras', read_only=True)
    item_nombre = serializers.CharField(source='item.nombre', read_only=True)
    item_marca = serializers.CharField(source='item.marca', read_only=True)
    item_modelo = serializers.CharField(source='item.modelo', read_only=True)

    class Meta:
        model = InventarioMovimiento
        fields = [
            'id',
            'item',
            'item_codigo_barras',
            'item_nombre',
            'item_marca',
            'item_modelo',
            'tipo',
            'cantidad',
            'usuario',
            'usuario_nombre',
            'nota',
            'creado_en',
        ]
        read_only_fields = fields

    def get_usuario_nombre(self, obj: InventarioMovimiento) -> str:
        user = obj.usuario
        if user is None:
            return ''
        full = (user.get_full_name() or '').strip()
        if full:
            return full
        return (getattr(user, 'username', '') or '').strip()


class ScanSerializer(serializers.Serializer):
    codigo_barras = serializers.CharField(required=True)
    modo = serializers.ChoiceField(choices=['entrada', 'salida'])


class ImportarFacturaSerializer(serializers.Serializer):
    proveedor = serializers.ChoiceField(choices=['syscom', 'tvc'])
    folio = serializers.CharField(required=True, max_length=64)
