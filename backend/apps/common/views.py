import logging

from django.db.utils import OperationalError, ProgrammingError
from rest_framework import status
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import SAFE_METHODS, AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ordenes.image_services import (
    delete_cloudinary_resource,
    extract_public_id_from_url,
    upload_data_url,
)

from .models import DEFAULT_NOMBRE, MarcaSistema
from .serializers import MarcaSistemaSerializer

logger = logging.getLogger(__name__)

MARCA_LOGO_FOLDER = "marca/logo"


class MarcaSistemaView(APIView):
    """GET público (login); PATCH solo admin."""

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [AllowAny()]
        return [IsAdminUser()]

    def get(self, request):
        try:
            marca = MarcaSistema.get_solo()
        except (ProgrammingError, OperationalError):
            logger.warning("MarcaSistema no disponible (¿migración pendiente?)")
            return Response({"nombre": DEFAULT_NOMBRE, "logo_url": ""})
        return Response(MarcaSistemaSerializer(marca).data)

    def patch(self, request):
        marca = MarcaSistema.get_solo()
        payload = request.data if isinstance(request.data, dict) else {}
        serializer = MarcaSistemaSerializer(marca, data=payload, partial=True)
        serializer.is_valid(raise_exception=True)
        marca = serializer.save()
        if payload.get("clear_logo") is True:
            previa = marca.logo_url
            marca.logo_url = ""
            marca.logo_public_id = ""
            marca.save(update_fields=["logo_url", "logo_public_id", "updated_at"])
            if previa:
                delete_cloudinary_resource(previa)
        return Response(MarcaSistemaSerializer(marca).data)


class MarcaLogoUploadView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        payload = request.data if isinstance(request.data, dict) else {}
        data_url = payload.get("data_url")
        if not isinstance(data_url, str) or ";base64," not in data_url:
            return Response({"detail": "data_url inválido"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            url = upload_data_url(data_url, folder=MARCA_LOGO_FOLDER, max_size_kb=120)
        except DRFValidationError:
            return Response(
                {"detail": "Imagen inválida o demasiado grande"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception:
            logger.exception("Cloudinary marca logo upload failed")
            return Response(
                {"detail": "Error subiendo imagen a Cloudinary"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        if not isinstance(url, str) or not url.startswith(("http://", "https://")):
            return Response(
                {"detail": "Error subiendo imagen a Cloudinary"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        marca = MarcaSistema.get_solo()
        previa = marca.logo_url
        marca.logo_url = url
        marca.logo_public_id = extract_public_id_from_url(url)
        marca.save(update_fields=["logo_url", "logo_public_id", "updated_at"])
        if previa and previa != url:
            delete_cloudinary_resource(previa)
        return Response(MarcaSistemaSerializer(marca).data)
