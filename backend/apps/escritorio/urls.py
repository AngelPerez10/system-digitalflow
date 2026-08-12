from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import DashboardStatsView, TareaViewSet

router = DefaultRouter()
router.register(r'tareas', TareaViewSet, basename='tarea')

urlpatterns = [
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
] + router.urls
