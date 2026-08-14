from rest_framework import serializers

from .marca import public_logo_url
from .models import MarcaSistema


class MarcaSistemaSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarcaSistema
        fields = ("nombre", "logo_url")
        extra_kwargs = {"logo_url": {"read_only": True}}

    def validate_nombre(self, value: str) -> str:
        nombre = (value or "").strip()
        if not nombre:
            raise serializers.ValidationError("El nombre no puede quedar vacío.")
        return nombre

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["logo_url"] = public_logo_url(data.get("logo_url") or "")
        return data
