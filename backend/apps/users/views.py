from django.contrib.auth import authenticate, get_user_model
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import UserPermissions
from .serializers import UserAccountSerializer, UserPermissionsSerializer


class UserAccountViewSet(viewsets.ModelViewSet):
    queryset = get_user_model().objects.all().order_by('id')
    serializer_class = UserAccountSerializer
    permission_classes = [IsAdminUser]


@api_view(['POST'])
@permission_classes([AllowAny])
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

    return Response(
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
            'id': user.id,
            'permissions': perms,
        }
    )


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
