from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers

from .models import UserPermissions, UserSignature


User = get_user_model()


class UserAccountSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'is_active',
            'is_staff',
            'is_superuser',
            'date_joined',
            'password',
            'avatar_url',
        ]
        read_only_fields = ['id', 'date_joined', 'avatar_url']

    def get_avatar_url(self, obj):
        try:
            return (obj.permissions_profile.avatar_url or '').strip()
        except ObjectDoesNotExist:
            return ''

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User.objects.create_user(**validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class UserPermissionsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPermissions
        fields = ['user', 'permissions', 'updated_at']
        read_only_fields = ['user', 'updated_at']


class UserSignatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSignature
        fields = ['user', 'url', 'public_id', 'updated_at']
        read_only_fields = ['user', 'public_id', 'updated_at']
