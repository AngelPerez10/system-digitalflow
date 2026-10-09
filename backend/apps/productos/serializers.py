from rest_framework import serializers

from apps.clientes.models import Cliente

from .models import Concepto, ProductoManual, Servicio
from .proveedores import nombre_proveedor_visible


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
            'descripcion',
            'precio1',
            'imagen_url',
            'fecha_creacion',
            'fecha_actualizacion',
        ]
        read_only_fields = ['id', 'fecha_creacion', 'fecha_actualizacion']

    def validate_folio(self, value):
        folio = ' '.join(str(value or '').strip().split())
        if not folio:
            raise serializers.ValidationError('El folio es requerido.')
        qs = Concepto.objects.filter(folio__iexact=folio)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                f'Ya existe un concepto con el folio "{folio}".'
            )
        return folio


class ProductoManualSerializer(serializers.ModelSerializer):
    # Solo se acepta un contacto existente de tipo proveedor.
    proveedor = serializers.PrimaryKeyRelatedField(
        queryset=Cliente.objects.filter(tipo='PROVEEDOR'),
        allow_null=True,
        required=False,
        error_messages={
            'does_not_exist': 'Elige un proveedor dado de alta en Contactos.',
            'incorrect_type': 'Proveedor inválido.',
        },
    )
    proveedor_nombre = serializers.SerializerMethodField()

    class Meta:
        model = ProductoManual
        fields = [
            'id',
            'producto',
            'marca',
            'modelo',
            'caracteristicas',
            'sat_key',
            'imagen_url',
            'fuente',
            'costo',
            'precio',
            'precio_2',
            'precio_3',
            'precio_4',
            'utilidad_1',
            'utilidad_2',
            'utilidad_3',
            'utilidad_4',
            'aplica_iva',
            'stock',
            'proveedor',
            'proveedor_nombre',
            'activo',
            'fecha_creacion',
            'fecha_actualizacion',
        ]
        read_only_fields = ['id', 'fuente', 'fecha_creacion', 'fecha_actualizacion']

    def get_proveedor_nombre(self, obj: ProductoManual) -> str:
        prov = obj.proveedor
        return nombre_proveedor_visible(prov.nombre) if prov else ''

    def validate_modelo(self, value):
        modelo = ' '.join(str(value or '').strip().split())
        if not modelo:
            raise serializers.ValidationError('El modelo es requerido.')
        qs = ProductoManual.objects.filter(modelo__iexact=modelo)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                f'Ya existe un producto manual con el modelo "{modelo}".'
            )
        return modelo

    def validate_sat_key(self, value):
        clave = ''.join(str(value or '').strip().split())
        if not clave:
            return ''
        if len(clave) > 32:
            raise serializers.ValidationError('La clave SAT no puede superar 32 caracteres.')
        return clave

    def validate_stock(self, value):
        if value < 0:
            raise serializers.ValidationError('El stock no puede ser negativo.')
        return value

    def validate_precio(self, value):
        if value < 0:
            raise serializers.ValidationError('El precio no puede ser negativo.')
        return value

    def _no_negativo(self, value, campo):
        if value is not None and value < 0:
            raise serializers.ValidationError(f'{campo} no puede ser negativo.')
        return value

    def validate_costo(self, value):
        return self._no_negativo(value, 'El costo')

    def validate_precio_2(self, value):
        return self._no_negativo(value, 'El precio 2')

    def validate_precio_3(self, value):
        return self._no_negativo(value, 'El precio 3')

    def validate_precio_4(self, value):
        return self._no_negativo(value, 'El precio 4')
