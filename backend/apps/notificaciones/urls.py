from django.urls import path

from . import views

urlpatterns = [
    path('push-devices/', views.PushDeviceRegistroView.as_view(), name='push-device-registro'),
    path('push-devices/baja/', views.PushDeviceBajaView.as_view(), name='push-device-baja'),
    path('notificaciones/', views.NotificacionesListView.as_view(), name='notificaciones-list'),
    path('notificaciones/resumen/', views.NotificacionesResumenView.as_view(), name='notificaciones-resumen'),
    path(
        'notificaciones/marcar-todas/',
        views.NotificacionesMarcarTodasView.as_view(),
        name='notificaciones-marcar-todas',
    ),
    path(
        'notificaciones/<int:pk>/leer/',
        views.NotificacionLeerView.as_view(),
        name='notificaciones-leer',
    ),
]
