import base64
import os
import re
from pathlib import Path

from django.contrib.auth import authenticate, get_user_model
from django.db.models import Q
from django.conf import settings
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .throttling import LoginRateThrottle

from .models import UserPermissions, UserSignature
from .serializers import UserAccountSerializer, UserPermissionsSerializer, UserSignatureSerializer

# Solo estos usuarios pueden asignar permisos CRUD a otros (incl. otros administradores).
PERMISSION_DELEGATION_USERNAMES = frozenset({'angelperez10', 'ivancruz01'})


def _request_user_can_delegate_permissions(user) -> bool:
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    try:
        un = (user.get_username() or '').strip().lower()
    except Exception:
        un = (getattr(user, 'username', None) or '').strip().lower()
    return un in PERMISSION_DELEGATION_USERNAMES


try:
    import cloudinary
    import cloudinary.uploader
    CLOUDINARY_URL = os.environ.get("CLOUDINARY_URL")
    if CLOUDINARY_URL:
        cloudinary.config(cloudinary_url=CLOUDINARY_URL)
    else:
        cn = os.environ.get("CLOUDINARY_CLOUD_NAME")
        ak = os.environ.get("CLOUDINARY_API_KEY")
        sec = os.environ.get("CLOUDINARY_API_SECRET")
        if cn and ak and sec:
            cloudinary.config(cloud_name=cn, api_key=ak, api_secret=sec)
except Exception:
    cloudinary = None  # type: ignore


def _is_data_url(s: str) -> bool:
    return isinstance(s, str) and s.startswith("data:") and ";base64," in s


def _upload_signature_data_url(data_url: str) -> tuple[str, str]:
    if cloudinary is None:
        raise ValueError('Cloudinary no está configurado')

    up = cloudinary.uploader.upload(
        data_url,
        folder='users/firmas',
        resource_type='image',
        overwrite=True,
    )
    url = up.get('secure_url') or up.get('url') or ''
    public_id = up.get('public_id') or ''
    return url, public_id


def _delete_signature_public_id(public_id: str) -> None:
    if cloudinary is None:
        return
    if not public_id:
        return
    try:
        cloudinary.uploader.destroy(public_id, resource_type='image')
    except Exception:
        return


def _upload_avatar_data_url_local(user_id: int, data_url: str) -> tuple[str, str]:
    m = re.match(r'^data:(image/[\w.+-]+);base64,(.+)$', data_url, re.DOTALL | re.IGNORECASE)
    if not m:
        raise ValueError('Imagen inválida')
    raw = base64.b64decode(m.group(2), validate=True)
    if len(raw) > 5 * 1024 * 1024:
        raise ValueError('La imagen supera 5MB')
    sub = m.group(1).lower()
    ext = '.png' if 'png' in sub else '.jpg'
    rel = f'avatars/user_{user_id}{ext}'
    dest = Path(settings.MEDIA_ROOT) / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(raw)
    base = settings.MEDIA_URL.rstrip('/') + '/' + rel.replace('\\', '/')
    public_id = f'local:{rel}'
    return base, public_id


def _upload_avatar_data_url(user_id: int, data_url: str) -> tuple[str, str]:
    if cloudinary is not None:
        up = cloudinary.uploader.upload(
            data_url,
            folder='users/avatars',
            resource_type='image',
            overwrite=True,
        )
        url = up.get('secure_url') or up.get('url') or ''
        public_id = up.get('public_id') or ''
        return url, public_id
    return _upload_avatar_data_url_local(user_id, data_url)


def _delete_avatar_public_id(public_id: str) -> None:
    if not public_id:
        return
    if public_id.startswith('local:'):
        rel = public_id.split(':', 1)[1]
        p = Path(settings.MEDIA_ROOT) / rel
        try:
            if p.exists():
                p.unlink()
        except Exception:
            return
        return
    _delete_signature_public_id(public_id)


class UserAccountViewSet(viewsets.ModelViewSet):
    queryset = get_user_model().objects.all().order_by('id')
    serializer_class = UserAccountSerializer
    permission_classes = [IsAdminUser]


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def login_view(request):
    username = request.data.get('username')
    email = request.data.get('email')
    password = request.data.get('password')

    login_value = (email or username or '').strip()
    if not password or not login_value:
        return Response({'detail': 'Credenciales incompletas'}, status=status.HTTP_400_BAD_REQUEST)

    User = get_user_model()

    resolved_username = login_value
    if '@' in login_value:
        user_obj = User.objects.filter(Q(email__iexact=login_value)).first()
        if user_obj:
            resolved_username = user_obj.get_username()

    user = authenticate(request, username=resolved_username, password=password)
    if not user and '@' in login_value:
        user = authenticate(request, username=login_value, password=password)
    if not user:
        return Response({'detail': 'Credenciales inválidas'}, status=status.HTTP_401_UNAUTHORIZED)

    refresh = RefreshToken.for_user(user)
    access = refresh.access_token

    # Ensure the permissions profile exists for every authenticated user.
    perms_obj, _ = UserPermissions.objects.get_or_create(user=user)
    perms = perms_obj.permissions or {}

    resp = Response(
        {
            # compat con frontend (espera data.token)
            'token': str(access),
            # extra (por si lo quieres usar)
            'access': str(access),
            'refresh': str(refresh),
            'username': user.get_username(),
            'email': getattr(user, 'email', None),
            'is_staff': bool(getattr(user, 'is_staff', False)),
            'is_superuser': bool(getattr(user, 'is_superuser', False)),
            'first_name': getattr(user, 'first_name', ''),
            'last_name': getattr(user, 'last_name', ''),
            'id': user.id,
            'permissions': perms,
        }
    )
    return resp


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    return Response({'detail': 'ok'})


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def me(request):
    User = get_user_model()
    user = request.user

    if request.method == 'GET':
        UserPermissions.objects.get_or_create(user=user)
        user = User.objects.select_related('permissions_profile').get(pk=user.pk)
        serializer = UserAccountSerializer(user)
        return Response(serializer.data)

    # PATCH — actualizar nombre, correo y/o foto de perfil
    UserPermissions.objects.get_or_create(user=user)
    perms_obj = UserPermissions.objects.filter(user=user).first()

    if 'first_name' in request.data:
        user.first_name = (request.data.get('first_name') or '').strip()[:150]
    if 'last_name' in request.data:
        user.last_name = (request.data.get('last_name') or '').strip()[:150]
    if 'email' in request.data:
        email = (request.data.get('email') or '').strip().lower()
        if email:
            if User.objects.exclude(pk=user.pk).filter(email__iexact=email).exists():
                return Response({'detail': 'Ya existe otro usuario con ese correo.'}, status=status.HTTP_400_BAD_REQUEST)
            user.email = email[:254]

    if 'avatar' in request.data and perms_obj is not None:
        avatar = (request.data.get('avatar') or '').strip()
        if avatar == '':
            _delete_avatar_public_id(perms_obj.avatar_public_id)
            perms_obj.avatar_url = ''
            perms_obj.avatar_public_id = ''
            perms_obj.save(update_fields=['avatar_url', 'avatar_public_id', 'updated_at'])
        elif _is_data_url(avatar):
            try:
                _delete_avatar_public_id(perms_obj.avatar_public_id)
                url, public_id = _upload_avatar_data_url(user.id, avatar)
                perms_obj.avatar_url = url
                perms_obj.avatar_public_id = public_id
                perms_obj.save(update_fields=['avatar_url', 'avatar_public_id', 'updated_at'])
            except ValueError as e:
                return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
            except Exception:
                return Response(
                    {'detail': 'Error al procesar la imagen. Intente con otra foto o más tarde.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            return Response(
                {'detail': 'La foto debe ser una imagen en base64 (data URL).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

    user.save()
    user = User.objects.select_related('permissions_profile').get(pk=user.pk)
    return Response(UserAccountSerializer(user).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_permissions(request):
    obj, _ = UserPermissions.objects.get_or_create(user=request.user)
    serializer = UserPermissionsSerializer(obj)
    return Response(serializer.data)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def my_signature(request):
    obj, _ = UserSignature.objects.get_or_create(user=request.user)

    if request.method == 'GET':
        return Response(UserSignatureSerializer(obj).data)

    if request.method == 'DELETE':
        _delete_signature_public_id(obj.public_id)
        obj.url = ''
        obj.public_id = ''
        obj.save(update_fields=['url', 'public_id', 'updated_at'])
        return Response(UserSignatureSerializer(obj).data)

    signature = (request.data.get('signature') or '').strip()
    if signature == '':
        _delete_signature_public_id(obj.public_id)
        obj.url = ''
        obj.public_id = ''
        obj.save(update_fields=['url', 'public_id', 'updated_at'])
        return Response(UserSignatureSerializer(obj).data)

    if not _is_data_url(signature):
        return Response({'detail': 'La firma debe ser una imagen base64 (data URL).'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        _delete_signature_public_id(obj.public_id)
        url, public_id = _upload_signature_data_url(signature)
        obj.url = url
        obj.public_id = public_id
        obj.save(update_fields=['url', 'public_id', 'updated_at'])
        return Response(UserSignatureSerializer(obj).data)
    except Exception:
        # No exponer detalles internos al cliente
        return Response({'detail': 'Error al procesar la firma. Intente nuevamente.'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT'])
@permission_classes([IsAdminUser])
def user_permissions(request, user_id: int):
    User = get_user_model()
    user = User.objects.filter(id=user_id).first()
    if not user:
        return Response({'detail': 'Usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    obj, _ = UserPermissions.objects.get_or_create(user=user)

    if request.method == 'GET':
        serializer = UserPermissionsSerializer(obj)
        return Response(serializer.data)

    # PUT
    if not _request_user_can_delegate_permissions(request.user):
        return Response(
            {
                'detail': 'Solo AngelPerez10 e IvanCruz01 pueden modificar permisos de otros usuarios.',
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    serializer = UserPermissionsSerializer(obj, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    # only allow updating permissions payload
    perms = serializer.validated_data.get('permissions', None)
    if perms is not None:
        obj.permissions = perms
        obj.save(update_fields=['permissions', 'updated_at'])
    return Response(UserPermissionsSerializer(obj).data)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAdminUser])
def user_signature(request, user_id: int):
    User = get_user_model()
    user = User.objects.filter(id=user_id).first()
    if not user:
        return Response({'detail': 'Usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    obj, _ = UserSignature.objects.get_or_create(user=user)

    if request.method == 'GET':
        return Response(UserSignatureSerializer(obj).data)

    if request.method == 'DELETE':
        _delete_signature_public_id(obj.public_id)
        obj.url = ''
        obj.public_id = ''
        obj.save(update_fields=['url', 'public_id', 'updated_at'])
        return Response(UserSignatureSerializer(obj).data)

    signature = (request.data.get('signature') or '').strip()
    if signature == '':
        _delete_signature_public_id(obj.public_id)
        obj.url = ''
        obj.public_id = ''
        obj.save(update_fields=['url', 'public_id', 'updated_at'])
        return Response(UserSignatureSerializer(obj).data)

    if not _is_data_url(signature):
        return Response({'detail': 'La firma debe ser una imagen base64 (data URL).'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        _delete_signature_public_id(obj.public_id)
        url, public_id = _upload_signature_data_url(signature)
        obj.url = url
        obj.public_id = public_id
        obj.save(update_fields=['url', 'public_id', 'updated_at'])
        return Response(UserSignatureSerializer(obj).data)
    except Exception:
        # No exponer detalles internos al cliente
        return Response({'detail': 'Error al procesar la firma. Intente nuevamente.'}, status=status.HTTP_400_BAD_REQUEST)
