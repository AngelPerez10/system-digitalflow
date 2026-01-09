from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import KpiVentaViewSet

router = DefaultRouter()
router.register(r'kpi-ventas', KpiVentaViewSet, basename='kpi-ventas')

urlpatterns = [
    path('', include(router.urls)),
]
