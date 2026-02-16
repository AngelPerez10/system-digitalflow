from rest_framework import serializers

from .models import Tarea


class TareaSerializer(serializers.ModelSerializer):
    """
    Serializer para Tarea usando el modelo simplificado (sin cliente ni estado).
    """

    usuario_asignado_username = serializers.CharField(
        source="usuario_asignado.username", read_only=True
    )
    usuario_asignado_full_name = serializers.SerializerMethodField()
    creado_por_username = serializers.CharField(
        source="creado_por.username", read_only=True
    )

    def get_usuario_asignado_full_name(self, obj):
        if obj.usuario_asignado:
            first = obj.usuario_asignado.first_name or ""
            last = obj.usuario_asignado.last_name or ""
            full = f"{first} {last}".strip()
            if full:
                return full
            return obj.usuario_asignado.username or obj.usuario_asignado.email
        return None

    class Meta:
        model = Tarea
        fields = [
            "id",
            "usuario_asignado",
            "usuario_asignado_username",
            "usuario_asignado_full_name",
            "estado",
            "orden",
            "descripcion",
            "fotos_urls",
            "fecha_creacion",
            "fecha_actualizacion",
            "creado_por",
            "creado_por_username",
        ]
        read_only_fields = [
            "id",
            "usuario_asignado_username",
            "usuario_asignado_full_name",
            "creado_por",
            "creado_por_username",
            "fecha_creacion",
            "fecha_actualizacion",
        ]