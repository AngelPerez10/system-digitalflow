from django.urls import path
from rest_framework.routers import DefaultRouter

from . import public_views
from .views import ContratoViewSet

router = DefaultRouter()
router.register(r'contratos', ContratoViewSet, basename='contrato')

urlpatterns = [
    # Públicas (link de firma del cliente): credenciales en cabeceras, nunca en la URL.
    path('contratos-firma/estado/', public_views.EstadoFirmaView.as_view(), name='contrato-firma-estado'),
    path('contratos-firma/otp/enviar/', public_views.EnviarOtpView.as_view(), name='contrato-firma-otp-enviar'),
    path(
        'contratos-firma/otp/verificar/',
        public_views.VerificarOtpView.as_view(),
        name='contrato-firma-otp-verificar',
    ),
    path('contratos-firma/documento/', public_views.DocumentoFirmaView.as_view(), name='contrato-firma-documento'),
    path('contratos-firma/firmar/', public_views.FirmarView.as_view(), name='contrato-firma-firmar'),
    path('contratos-firma/pdf-final/', public_views.PdfFinalView.as_view(), name='contrato-firma-pdf-final'),
    *router.urls,
]
