from rest_framework import serializers

from .models import EXPO_TOKEN_RE, PushDevice


class PushDeviceRegistroSerializer(serializers.Serializer):
    expo_token = serializers.CharField(max_length=255)
    platform = serializers.ChoiceField(
        choices=PushDevice.PLATAFORMAS, required=False, allow_blank=True, default=''
    )

    def validate_expo_token(self, value: str) -> str:
        token = (value or '').strip()
        if not EXPO_TOKEN_RE.match(token):
            raise serializers.ValidationError(
                'Formato de token inválido; se espera ExponentPushToken[…].'
            )
        return token


class PushDeviceBajaSerializer(serializers.Serializer):
    expo_token = serializers.CharField(max_length=255)

    def validate_expo_token(self, value: str) -> str:
        return (value or '').strip()
