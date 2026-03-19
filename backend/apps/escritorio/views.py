import os
import re
import io
import base64
import logging
from urllib.parse import urlparse

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from django.db.models import Q
from PIL import Image

from .models import Tarea
from .serializers import TareaSerializer

logger = logging.getLogger(__name__)

# Image safety limits (protect against decompression bombs / huge base64 payloads)
MAX_IMAGE_PIXELS = int(os.environ.get("MAX_IMAGE_PIXELS", "10000000"))
MAX_BASE64_INPUT_MULTIPLIER = int(os.environ.get("MAX_BASE64_INPUT_MULTIPLIER", "8"))

ALLOWED_IMAGE_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}

try:
    import cloudinary
    import cloudinary.uploader
except ImportError:
    cloudinary = None


def _parse_data_url_image(data_url: str) -> tuple[str, str]:
    if not isinstance(data_url, str):
        raise ValueError("data_url inválido")
    if not data_url.startswith("data:") or ";base64," not in data_url:
        raise ValueError("data_url inválido")

    header, b64_data = data_url.split(",", 1)
    mime_part = header[5:].split(";base64", 1)[0].strip().lower()
    if mime_part == "image/jpg":
        mime_part = "image/jpeg"
    if mime_part not in ALLOWED_IMAGE_MIME_TYPES:
        raise ValueError("Formato de imagen no permitido")
    return mime_part, b64_data


def _decode_base64_image_bytes(data_url: str, max_input_bytes: int) -> tuple[str, bytes]:
    mime, b64_data = _parse_data_url_image(data_url)
    b64_clean = "".join(str(b64_data).split())
    approx_decoded = int(len(b64_clean) * 3 / 4)
    if approx_decoded > max_input_bytes:
        raise ValueError("Imagen demasiado grande")
    try:
        raw = base64.b64decode(b64_clean, validate=True)
    except Exception:
        raise ValueError("data_url base64 inválido")
    if len(raw) > max_input_bytes:
        raise ValueError("Imagen demasiado grande")
    return mime, raw


def _open_and_verify_image(raw: bytes) -> None:
    try:
        Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS
        img = Image.open(io.BytesIO(raw))
        img.verify()
        img2 = Image.open(io.BytesIO(raw))
        img2.load()
    except Exception:
        raise ValueError("Imagen inválida o peligrosa")


def _validate_image_data_url(data_url: str, max_size_kb: int) -> None:
    max_input_bytes = max_size_kb * 1024 * MAX_BASE64_INPUT_MULTIPLIER
    _mime, raw = _decode_base64_image_bytes(data_url, max_input_bytes=max_input_bytes)
    _open_and_verify_image(raw)


def _extract_tareas_public_id_from_url(url: str) -> str:
    """
    Extract Cloudinary public_id from URL, but only if it points to tareas/fotos.
    Prevents deleting/accepting assets outside our scope.
    """
    if not isinstance(url, str) or not url:
        return ""
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    if not host.endswith("cloudinary.com"):
        return ""

    # Example:
    # https://res.cloudinary.com/<cloud>/image/upload/v123/tareas/fotos/abc.jpg
    match = re.search(r"/upload/(?:v\d+/)?(.+?)(?:\.\w+)?$", url)
    if not match:
        return ""
    public_id = match.group(1).lstrip("/")
    if not public_id.startswith("tareas/fotos/"):
        return ""
    return public_id


def _is_allowed_tareas_photo_url(url: str) -> bool:
    return bool(_extract_tareas_public_id_from_url(url))


def _is_data_url(s: str) -> bool:
    """Check if string is a data URL (base64)"""
    if not isinstance(s, str):
        return False
    return s.startswith('data:') and ';base64,' in s


def _upload_data_url(data_url: str, folder: str = 'tareas/fotos', max_size_kb: int = 100) -> str:
    """Upload a data URL to Cloudinary and return the URL"""
    # Validate early (size + Pillow verify) before uploading/processing.
    try:
        _validate_image_data_url(data_url, max_size_kb=max_size_kb)
    except ValueError:
        raise ValidationError("data_url inválido")
    if not cloudinary:
        # Cloudinary disabled: return the validated data URI.
        return data_url
    try:
        res = cloudinary.uploader.upload(
            data_url,
            folder=folder,
            resource_type="image",
            overwrite=True,
            transformation=[
                {'quality': 'auto:low'},
                {'fetch_format': 'auto'}
            ]
        )
        return res.get("secure_url") or res.get("url") or data_url
    except Exception:
        logger.exception("Error uploading to Cloudinary")
        return data_url


def _delete_cloudinary_resource(url: str):
    """Delete a resource from Cloudinary by its URL"""
    if not cloudinary or not url:
        return
    try:
        public_id = _extract_tareas_public_id_from_url(url)
        if public_id:
            cloudinary.uploader.destroy(public_id, resource_type="image")
    except Exception:
        logger.exception("Error deleting from Cloudinary")


class TareaViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Tarea.objects.select_related('usuario_asignado', 'creado_por').order_by('estado', 'orden', '-fecha_creacion')
    serializer_class = TareaSerializer

    def get_queryset(self):
        qs = self.queryset
        user = getattr(self.request, 'user', None)
        if user and (user.is_authenticated and (user.is_staff or user.is_superuser)):
            return qs
        if not user or not getattr(user, 'is_authenticated', False):
            return qs.none()
        return qs.filter(Q(usuario_asignado=user) | Q(creado_por=user))

    def perform_create(self, serializer):
        data = serializer.validated_data
        # Upload photos if base64 list
        fotos = data.get('fotos_urls')
        if isinstance(fotos, list):
            if len(fotos) > 2:
                raise ValidationError("Máximo 2 fotos")
            new_fotos = []
            for f in fotos:
                if isinstance(f, str) and _is_data_url(f):
                    new_fotos.append(_upload_data_url(f, folder='tareas/fotos', max_size_kb=100))
                elif isinstance(f, str) and f and _is_allowed_tareas_photo_url(f):
                    new_fotos.append(f)
                else:
                    raise ValidationError("fotos_urls contiene una entrada inválida")
            data['fotos_urls'] = new_fotos
        serializer.save(creado_por=self.request.user, **data)

    def perform_update(self, serializer):
        instance = serializer.instance
        old_fotos = list(instance.fotos_urls) if instance.fotos_urls else []
        
        data = serializer.validated_data

        # Handle photo updates - delete removed photos
        fotos = data.get('fotos_urls')
        if isinstance(fotos, list):
            if len(fotos) > 2:
                raise ValidationError("Máximo 2 fotos")
            new_fotos = []
            # Find photos that were removed
            for old_foto in old_fotos:
                if old_foto not in fotos and isinstance(old_foto, str) and _is_allowed_tareas_photo_url(old_foto):
                    _delete_cloudinary_resource(old_foto)
            
            # Process new photos
            for f in fotos:
                if isinstance(f, str) and _is_data_url(f):
                    new_fotos.append(_upload_data_url(f, folder='tareas/fotos', max_size_kb=100))
                elif isinstance(f, str) and f and _is_allowed_tareas_photo_url(f):
                    new_fotos.append(f)
                else:
                    raise ValidationError("fotos_urls contiene una entrada inválida")
            data['fotos_urls'] = new_fotos
        
        serializer.save(**data)

    def perform_destroy(self, instance):
        # Delete all photos from Cloudinary before deleting the task
        if instance.fotos_urls:
            for foto_url in instance.fotos_urls:
                if isinstance(foto_url, str) and _is_allowed_tareas_photo_url(foto_url):
                    _delete_cloudinary_resource(foto_url)
        instance.delete()

    @action(detail=False, methods=['post'], url_path='upload-image')
    def upload_image(self, request):
        """Upload an image (data URL base64) to Cloudinary and return its URL."""
        if not cloudinary:
            return Response({"detail": "Cloudinary no está configurado en el servidor."}, status=500)
        try:
            payload = request.data if isinstance(request.data, dict) else {}
        except Exception:
            payload = {}
        data_url = payload.get('data_url')
        folder = payload.get('folder') or 'tareas/fotos'
        if not isinstance(folder, str) or folder != 'tareas/fotos':
            return Response({"detail": "folder inválido"}, status=400)
        if not isinstance(data_url, str) or ';base64,' not in data_url:
            return Response({"detail": "data_url inválido"}, status=400)
        try:
            url = _upload_data_url(data_url, folder=folder)
            return Response({"url": url}, status=200)
        except ValueError:
            return Response({"detail": "data_url inválido"}, status=400)
        except ValidationError:
            return Response({"detail": "data_url inválido"}, status=400)
        except Exception:
            logger.exception("Error subiendo imagen a Cloudinary")
            return Response({"detail": "Error subiendo imagen a Cloudinary"}, status=502)

    @action(detail=False, methods=['post'], url_path='delete-image')
    def delete_image(self, request):
        """Delete an image in Cloudinary by its public_id."""
        if not cloudinary:
            return Response({"detail": "Cloudinary no está configurado en el servidor."}, status=500)
        try:
            payload = request.data if isinstance(request.data, dict) else {}
        except Exception:
            payload = {}
        public_id = payload.get('public_id')
        if not isinstance(public_id, str) or not public_id:
            return Response({"detail": "public_id inválido"}, status=400)
        if not public_id.startswith('tareas/fotos/'):
            return Response({"detail": "public_id fuera de alcance"}, status=400)
        try:
            res = cloudinary.uploader.destroy(public_id, resource_type="image")
            return Response(res, status=200)
        except Exception:
            logger.exception("Error eliminando imagen en Cloudinary")
            return Response({"detail": "Error eliminando imagen en Cloudinary"}, status=502)
