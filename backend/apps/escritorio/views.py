import os
import re
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Tarea
from .serializers import TareaSerializer

try:
    import cloudinary
    import cloudinary.uploader
except ImportError:
    cloudinary = None


def _is_data_url(s: str) -> bool:
    """Check if string is a data URL (base64)"""
    if not isinstance(s, str):
        return False
    return s.startswith('data:') and ';base64,' in s


def _upload_data_url(data_url: str, folder: str = 'tareas/fotos', max_size_kb: int = 100) -> str:
    """Upload a data URL to Cloudinary and return the URL"""
    if not cloudinary:
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
    except Exception as e:
        print(f"Error uploading to Cloudinary: {e}")
        return data_url


def _delete_cloudinary_resource(url: str):
    """Delete a resource from Cloudinary by its URL"""
    if not cloudinary or not url:
        return
    try:
        # Extract public_id from URL
        # Example: https://res.cloudinary.com/<cloud>/image/upload/v123/tareas/fotos/abc.jpg
        match = re.search(r'/upload/(?:v\d+/)?(.+?)(?:\.\w+)?$', url)
        if match:
            public_id = match.group(1)
            cloudinary.uploader.destroy(public_id, resource_type="image")
    except Exception as e:
        print(f"Error deleting from Cloudinary: {e}")


class TareaViewSet(viewsets.ModelViewSet):
    queryset = Tarea.objects.select_related('usuario_asignado', 'creado_por').order_by('-fecha_creacion')
    serializer_class = TareaSerializer

    def perform_create(self, serializer):
        data = serializer.validated_data
        # Upload photos if base64 list
        fotos = data.get('fotos_urls')
        if isinstance(fotos, list):
            new_fotos = []
            for f in fotos[:2]:  # Max 2 photos
                if isinstance(f, str) and _is_data_url(f):
                    new_fotos.append(_upload_data_url(f, folder='tareas/fotos'))
                else:
                    new_fotos.append(f)
            data['fotos_urls'] = new_fotos
        serializer.save(creado_por=self.request.user, **data)

    def perform_update(self, serializer):
        instance = serializer.instance
        old_fotos = list(instance.fotos_urls) if instance.fotos_urls else []
        
        data = serializer.validated_data

        # Handle photo updates - delete removed photos
        fotos = data.get('fotos_urls')
        if isinstance(fotos, list):
            new_fotos = []
            # Find photos that were removed
            for old_foto in old_fotos:
                if old_foto not in fotos and old_foto.startswith('http'):
                    _delete_cloudinary_resource(old_foto)
            
            # Process new photos
            for f in fotos[:2]:  # Max 2 photos
                if isinstance(f, str) and _is_data_url(f):
                    new_fotos.append(_upload_data_url(f, folder='tareas/fotos'))
                else:
                    new_fotos.append(f)
            data['fotos_urls'] = new_fotos
        
        serializer.save(**data)

    def perform_destroy(self, instance):
        # Delete all photos from Cloudinary before deleting the task
        if instance.fotos_urls:
            for foto_url in instance.fotos_urls:
                if isinstance(foto_url, str) and foto_url.startswith('http'):
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
        if not isinstance(data_url, str) or ';base64,' not in data_url:
            return Response({"detail": "data_url inválido"}, status=400)
        try:
            url = _upload_data_url(data_url, folder=folder)
            return Response({"url": url}, status=200)
        except Exception as e:
            return Response({"detail": "Error subiendo imagen a Cloudinary", "error": str(e)}, status=502)

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
        try:
            res = cloudinary.uploader.destroy(public_id, resource_type="image")
            return Response(res, status=200)
        except Exception as e:
            return Response({"detail": "Error eliminando imagen en Cloudinary", "error": str(e)}, status=502)
