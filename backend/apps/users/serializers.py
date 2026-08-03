from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers

from .models import UserPermissions, UserSignature, UserSmtpCredentials
from .smtp_crypto import encrypt_smtp_password

User = get_user_model()


class UserAccountSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    avatar_url = serializers.SerializerMethodField()
    smtp_email = serializers.EmailField(required=False, allow_blank=True)
    smtp_password = serializers.CharField(
        write_only=True, required=False, allow_blank=True, style={'input_type': 'password'}
    )
    smtp_clear = serializers.BooleanField(write_only=True, required=False)
    smtp_configured = serializers.SerializerMethodField()

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
            'smtp_email',
            'smtp_password',
            'smtp_clear',
            'smtp_configured',
        ]
        read_only_fields = ['id', 'date_joined', 'avatar_url', 'smtp_configured']

    def get_avatar_url(self, obj):
        try:
            return (obj.permissions_profile.avatar_url or '').strip()
        except ObjectDoesNotExist:
            return ''

    def get_smtp_configured(self, obj) -> bool:
        try:
            return bool(obj.smtp_credentials.is_configured)
        except ObjectDoesNotExist:
            return False

    def to_representation(self, instance):
        data = super().to_representation(instance)
        try:
            creds = instance.smtp_credentials
            data['smtp_email'] = (creds.smtp_email or '').strip()
            data['smtp_configured'] = bool(creds.is_configured)
        except ObjectDoesNotExist:
            data['smtp_email'] = ''
            data['smtp_configured'] = False
        return data

    def _smtp_keys_in_request(self) -> set[str]:
        initial = self.initial_data
        if not isinstance(initial, dict):
            return set()
        return {k for k in ('smtp_email', 'smtp_password', 'smtp_clear') if k in initial}

    def _save_smtp(self, user, *, smtp_email, smtp_password, smtp_clear, keys: set[str]):
        if not keys:
            return
        creds, _ = UserSmtpCredentials.objects.get_or_create(user=user)
        if 'smtp_clear' in keys and smtp_clear:
            creds.smtp_email = ''
            creds.smtp_password_encrypted = ''
            creds.save(update_fields=['smtp_email', 'smtp_password_encrypted', 'updated_at'])
            return
        update_fields: list[str] = []
        if 'smtp_email' in keys:
            creds.smtp_email = (smtp_email or '').strip()
            update_fields.append('smtp_email')
        if 'smtp_password' in keys and str(smtp_password or '').strip():
            creds.smtp_password_encrypted = encrypt_smtp_password(str(smtp_password).strip())
            update_fields.append('smtp_password_encrypted')
        if update_fields:
            update_fields.append('updated_at')
            creds.save(update_fields=list(dict.fromkeys(update_fields)))

    def create(self, validated_data):
        keys = self._smtp_keys_in_request()
        smtp_email = validated_data.pop('smtp_email', None)
        smtp_password = validated_data.pop('smtp_password', None)
        smtp_clear = bool(validated_data.pop('smtp_clear', False))
        password = validated_data.pop('password', None)
        user = User.objects.create_user(**validated_data)
        if password:
            user.set_password(password)
            user.save()
        self._save_smtp(
            user,
            smtp_email=smtp_email,
            smtp_password=smtp_password,
            smtp_clear=smtp_clear,
            keys=keys,
        )
        return user

    def update(self, instance, validated_data):
        keys = self._smtp_keys_in_request()
        smtp_email = validated_data.pop('smtp_email', None)
        smtp_password = validated_data.pop('smtp_password', None)
        smtp_clear = bool(validated_data.pop('smtp_clear', False))
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        self._save_smtp(
            instance,
            smtp_email=smtp_email,
            smtp_password=smtp_password,
            smtp_clear=smtp_clear,
            keys=keys,
        )
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
