import os

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

    perms_obj = UserPermissions.objects.filter(user=user).first()
    perms = perms_obj.permissions if perms_obj else {}

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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    serializer = UserAccountSerializer(request.user)
    return Response(serializer.data)


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
