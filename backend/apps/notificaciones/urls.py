from django.urls import path

from . import views

urlpatterns = [
    path('push-devices/', views.PushDeviceRegistroView.as_view(), name='push-device-registro'),
    path('push-devices/baja/', views.PushDeviceBajaView.as_view(), name='push-device-baja'),
]
