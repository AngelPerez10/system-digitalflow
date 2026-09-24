from rest_framework import serializers

from .models import InventarioItem, InventarioMovimiento, InventarioPendiente


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
            'ubicacion',
            'precio_mercado',
            'precio_mercado_anterior',
            'precio_mercado_actualizado',
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
            'ubicacion',
        ]
        extra_kwargs = {
            # Una vez asignada no se puede dejar vacía (solo cambiar de lugar).
            'ubicacion': {'required': False, 'allow_blank': False},
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
    # Motivo opcional de la salida (también aceptado en entrada por compatibilidad).
    nota = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=255,
        default='',
        trim_whitespace=True,
    )
    # Obligatoria solo si el código es nuevo (la entrada crea el ítem).
    ubicacion = serializers.ChoiceField(
        choices=InventarioItem.Ubicacion.choices, required=False, allow_blank=True, default=''
    )


class PrevisualizarFacturaSerializer(serializers.Serializer):
    proveedor = serializers.ChoiceField(choices=['syscom', 'tvc'])
    folio = serializers.CharField(required=True, max_length=64)


class RecepcionLineaSerializer(serializers.Serializer):
    """Unidades que llegaron de una línea de la factura (por índice de la vista previa)."""

    indice = serializers.IntegerField(min_value=0)
    modelo = serializers.CharField(required=False, allow_blank=True, max_length=120, default='')
    recibida = serializers.IntegerField(min_value=0)
    # Obligatoria para líneas recibidas que crean un ítem nuevo.
    ubicacion = serializers.ChoiceField(
        choices=InventarioItem.Ubicacion.choices, required=False, allow_blank=True, default=''
    )


class ImportarFacturaSerializer(serializers.Serializer):
    proveedor = serializers.ChoiceField(choices=['syscom', 'tvc'])
    folio = serializers.CharField(required=True, max_length=64)
    # Opcional: sin `recepcion` se da entrada a toda la factura (comportamiento previo).
    recepcion = RecepcionLineaSerializer(many=True, required=False)


class RecibirPendienteSerializer(serializers.Serializer):
    # Sin cantidad → se reciben todas las unidades en espera.
    cantidad = serializers.IntegerField(required=False, min_value=1)
    # Obligatoria si el producto aún no existe en inventario.
    ubicacion = serializers.ChoiceField(
        choices=InventarioItem.Ubicacion.choices, required=False, allow_blank=True, default=''
    )


class InventarioPendienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventarioPendiente
        fields = [
            'id',
            'proveedor',
            'folio',
            'ref_externa',
            'modelo',
            'nombre',
            'marca',
            'imagen_url',
            'precio_unitario',
            'cantidad',
            'cantidad_facturada',
            'creado_en',
            'requiere_ubicacion',
        ]
        read_only_fields = fields

    requiere_ubicacion = serializers.SerializerMethodField()

    def get_requiere_ubicacion(self, obj: InventarioPendiente) -> bool:
        """True si recibirlo crea un ítem nuevo (hay que elegir exhibición o almacén)."""
        from .invoice_import import item_para_pendiente

        return item_para_pendiente(obj) is None


class RegistrarCatalogoSerializer(serializers.Serializer):
    """Alta en inventario (stock 0) desde SYSCOM, TVC o producto manual."""

    fuente = serializers.ChoiceField(choices=['syscom', 'tvc', 'manual'])
    ref = serializers.CharField(required=True, max_length=120, allow_blank=False)
    modelo = serializers.CharField(required=False, max_length=120, allow_blank=True, default='')
    nombre = serializers.CharField(required=False, max_length=255, allow_blank=True, default='')
    marca = serializers.CharField(required=False, max_length=120, allow_blank=True, default='')
    imagen_url = serializers.CharField(required=False, max_length=500, allow_blank=True, default='')
