from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

api_urlpatterns = [
    path('', include('apps.users.urls')),
    path('', include('apps.clientes.urls')),
    path('', include('apps.productos.urls')),
    path('', include('apps.ordenes.urls')),
    path('', include('apps.operacion.urls')),
    path('', include('apps.cotizaciones.urls')),
    path('', include('apps.escritorio.urls')),
    path('', include('apps.ai.urls')),
]

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(api_urlpatterns)),
    path('api/v1/', include(api_urlpatterns)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
