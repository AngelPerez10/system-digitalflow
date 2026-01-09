from rest_framework import serializers

from .models import KpiVenta


class KpiVentaSerializer(serializers.ModelSerializer):
    class Meta:
        model = KpiVenta
        fields = '__all__'
        read_only_fields = ('id', 'idx', 'fecha_creacion', 'fecha_actualizacion')
