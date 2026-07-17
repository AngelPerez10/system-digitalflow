from rest_framework import serializers

from .models import Concepto, ProductoManual, Servicio


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
    class Meta:
        model = ProductoManual
        fields = [
            'id',
            'producto',
            'marca',
            'modelo',
            'caracteristicas',
            'imagen_url',
            'fuente',
            'precio',
            'stock',
            'activo',
            'fecha_creacion',
            'fecha_actualizacion',
        ]
        read_only_fields = ['id', 'fuente', 'fecha_creacion', 'fecha_actualizacion']

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

    def validate_stock(self, value):
        if value < 0:
            raise serializers.ValidationError('El stock no puede ser negativo.')
        return value

    def validate_precio(self, value):
        if value < 0:
            raise serializers.ValidationError('El precio no puede ser negativo.')
        return value
