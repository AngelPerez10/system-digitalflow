from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import UserAccountViewSet, login_view, me, my_permissions, user_permissions

router = DefaultRouter()
router.register(r'users/accounts', UserAccountViewSet, basename='user-accounts')

urlpatterns = [
    path('', include(router.urls)),
    path('login/', login_view, name='login'),
    path('me/', me, name='me'),
    path('me/permissions/', my_permissions, name='my-permissions'),
    path('users/accounts/<int:user_id>/permissions/', user_permissions, name='user-permissions'),
]
