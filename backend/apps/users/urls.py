from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import UserAccountViewSet, login_view, logout_view, me, my_permissions, my_signature, user_permissions, user_signature

router = DefaultRouter()
router.register(r'users/accounts', UserAccountViewSet, basename='user-accounts')

urlpatterns = [
    path('', include(router.urls)),
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),
    path('me/', me, name='me'),
    path('me/permissions/', my_permissions, name='my-permissions'),
    path('me/signature/', my_signature, name='my-signature'),
    path('users/accounts/<int:user_id>/permissions/', user_permissions, name='user-permissions'),
    path('users/accounts/<int:user_id>/signature/', user_signature, name='user-signature'),
]
