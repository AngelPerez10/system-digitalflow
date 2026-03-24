import json
import os
import re
import logging
import base64
import io
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.exceptions import ValidationError, PermissionDenied, NotFound

from django.contrib.auth import get_user_model
from django.http import HttpResponse
from django.db import transaction
from django.db.models import Exists, F, OuterRef, Q
from django.utils import timezone

from apps.users.permissions import ModulePermission

from PIL import Image

from datetime import date, datetime, time, timedelta

from .models import Orden
from .models import OrdenLevantamiento, ReporteSemanal
from .serializers import OrdenLevantamientoSerializer, OrdenSerializer, ReporteSemanalSerializer
from apps.users.models import UserSignature

logger = logging.getLogger(__name__)

User = get_user_model()


class ReportesPermission(ModulePermission):
    """Permisos JSON del módulo reportes (reportes semanales)."""

    module_key = 'reportes'


def _pdf_response_from_html(html: str, filename: str):
    """Convierte HTML a PDF vía htmldocs; sin API key devuelve HTML para vista previa."""
    if not html:
        return Response({"detail": "No se pudo generar el HTML del PDF."}, status=500)

    api_key = os.environ.get('HTMLEDOCS_API_KEY')
    if not api_key:
        return HttpResponse(html, content_type="text/html; charset=utf-8")

    payload = {
        "html": html,
        "format": "pdf",
        "size": "A4",
        "orientation": "portrait",
    }

    req = Request(
        url="https://htmldocs.com/api/generate",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(req, timeout=60) as resp:
            pdf_bytes = resp.read()
    except HTTPError as e:
        body = ""
        try:
            body = e.read().decode("utf-8", errors="ignore")
        except Exception:
            pass
        return Response({"detail": "Error generando PDF en htmldocs", "status": e.code, "body": body}, status=502)
    except URLError:
        logger.exception("No se pudo conectar a htmldocs")
        return Response({"detail": "No se pudo conectar a htmldocs"}, status=502)
    except Exception:
        logger.exception("Error inesperado generando PDF")
        return Response({"detail": "Error inesperado generando PDF"}, status=500)

    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    response["Content-Disposition"] = f'inline; filename="{filename}"'
    return response


def _filename_reporte_semanal_pdf(reporte: ReporteSemanal) -> str:
    """Nombre descargable: Reporte_semanal_tecnico_YYYY-MM-DD_YYYY-MM-DD.pdf"""
    t = reporte.tecnico
    nombre = (
        f"{t.first_name} {t.last_name}".strip()
        or (t.username or "")
        or f"tecnico_{t.pk}"
    )
    slug = re.sub(r"\s+", "_", nombre.strip())
    slug = re.sub(r"[^\w\-]", "_", slug, flags=re.UNICODE)
    slug = re.sub(r"_+", "_", slug).strip("_") or "tecnico"
    if len(slug) > 80:
        slug = slug[:80]
    ini = reporte.semana_inicio.isoformat()
    fin = reporte.semana_fin.isoformat()
    return f"Reporte_semanal_{slug}_{ini}_{fin}.pdf"


# Image safety limits (protect against decompression bombs / huge base64 payloads)
MAX_IMAGE_PIXELS = int(os.environ.get("MAX_IMAGE_PIXELS", "10000000"))
MAX_EMBED_REMOTE_BYTES = int(os.environ.get("MAX_EMBED_REMOTE_BYTES", str(6 * 1024 * 1024)))
MAX_BASE64_INPUT_MULTIPLIER = int(os.environ.get("MAX_BASE64_INPUT_MULTIPLIER", "8"))

ALLOWED_IMAGE_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}

ALLOWED_CLOUDINARY_PUBLIC_ID_PREFIXES = (
    "ordenes/fotos/",
    "ordenes/firmas/",
    "ordenes/levantamiento/dibujos/",
)

_allowed_embed_hosts_env = os.environ.get("IMG_EMBED_ALLOW_HOSTS", "").strip()
IMG_EMBED_ALLOW_HOSTS = {
    h.strip().lower() for h in (_allowed_embed_hosts_env.split(",") if _allowed_embed_hosts_env else []) if h.strip()
}

# Cloudinary setup (enabled if credentials are provided)
try:
    import cloudinary
    import cloudinary.uploader
    CLOUDINARY_URL = os.environ.get("CLOUDINARY_URL")
    if CLOUDINARY_URL:
        cloudinary.config(cloudinary_url=CLOUDINARY_URL)
    else:
        # Fallback to individual variables
        cn = os.environ.get("CLOUDINARY_CLOUD_NAME")
        ak = os.environ.get("CLOUDINARY_API_KEY")
        sec = os.environ.get("CLOUDINARY_API_SECRET")
        if cn and ak and sec:
            cloudinary.config(cloud_name=cn, api_key=ak, api_secret=sec)
except Exception:
    cloudinary = None  # type: ignore


def _is_data_url(s: str) -> bool:
    return isinstance(s, str) and s.startswith("data:") and ";base64," in s


def _parse_data_url_image(data_url: str) -> tuple[str, str]:
    """
    Parse a base64 data URL and return (mime, base64_payload).
    Validates the MIME type against ALLOWED_IMAGE_MIME_TYPES.
    """
    if not isinstance(data_url, str):
        raise ValueError("data_url inválido")
    if not data_url.startswith("data:") or ";base64," not in data_url:
        raise ValueError("data_url inválido")

    header, b64_data = data_url.split(",", 1)
    # header example: data:image/png;base64
    mime_part = header[5:].split(";base64", 1)[0].strip().lower()
    if mime_part == "image/jpg":
        mime_part = "image/jpeg"

    if mime_part not in ALLOWED_IMAGE_MIME_TYPES:
        raise ValueError("Formato de imagen no permitido")
    return mime_part, b64_data


def _decode_base64_image_bytes(data_url: str, max_input_bytes: int) -> tuple[str, bytes]:
    mime, b64_data = _parse_data_url_image(data_url)
    b64_clean = "".join(str(b64_data).split())

    # Approximation: decoded_bytes ~= len(b64) * 3/4
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


def _open_and_verify_image(raw: bytes) -> Image.Image:
    # Protect against decompression bombs (Pillow will throw on too-large pixel counts)
    try:
        Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS
        img = Image.open(io.BytesIO(raw))
        img.verify()
        # verify() invalidates the image; reopen and load safely.
        img2 = Image.open(io.BytesIO(raw))
        img2.load()
        return img2
    except Exception:
        # Normalize any Pillow error into ValueError so callers can reject safely.
        raise ValueError("Imagen inválida o peligrosa")


def _is_cloudinary_host(host: str) -> bool:
    host = (host or "").lower()
    return host.endswith("cloudinary.com")


def _is_embed_url_allowed(url: str) -> bool:
    """
    Allow only data: URLs and approved remote hosts (Cloudinary/allowlist),
    to avoid SSRF when embedding into HTML/PDF.
    """
    if not isinstance(url, str) or not url:
        return False
    if url.startswith("data:"):
        return True
    if not (url.startswith("http://") or url.startswith("https://")):
        return False
    host = urlparse(url).hostname or ""
    host = host.lower()
    return host in IMG_EMBED_ALLOW_HOSTS or _is_cloudinary_host(host)


def _optimize_image(data_url: str, max_size_kb: int = 80) -> str:
    """Optimize image to reduce file size while maintaining transparency.
    
    Args:
        data_url: Base64 data URL of the image
        max_size_kb: Maximum file size in KB (default 80KB)
    
    Returns:
        Optimized data URL
    """
    try:
        max_input_bytes = max_size_kb * 1024 * MAX_BASE64_INPUT_MULTIPLIER
        # Validate base64 payload size + image safety before processing
        _, img_data = _decode_base64_image_bytes(data_url, max_input_bytes)
        img = _open_and_verify_image(img_data)
        
        # Determine if image has transparency
        has_transparency = img.mode in ('RGBA', 'LA', 'P')
        
        # Convert palette images to RGBA if they have transparency
        if img.mode == 'P':
            img = img.convert('RGBA')
            has_transparency = True
        
        max_size_bytes = max_size_kb * 1024
        
        if has_transparency:
            # Use PNG for images with transparency
            # Start with compression level 6 (default)
            compress_level = 6
            
            # Try different compression levels
            for level in range(6, 10):
                output = io.BytesIO()
                img.save(output, format='PNG', optimize=True, compress_level=level)
                size = output.tell()
                
                if size <= max_size_bytes:
                    break
                compress_level = level
            
            # If still too large, resize image
            if size > max_size_bytes:
                scale = (max_size_bytes / size) ** 0.5
                new_width = int(img.width * scale)
                new_height = int(img.height * scale)
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                
                output = io.BytesIO()
                img.save(output, format='PNG', optimize=True, compress_level=9)
            
            # Convert back to base64
            output.seek(0)
            optimized_b64 = base64.b64encode(output.read()).decode('utf-8')
            return f"data:image/png;base64,{optimized_b64}"
        else:
            # Use JPEG for images without transparency
            # Convert to RGB if needed
            if img.mode not in ('RGB', 'L'):
                img = img.convert('RGB')
            
            # Start with quality 85
            quality = 85
            
            # Try to compress until we reach target size
            while quality > 20:
                output = io.BytesIO()
                img.save(output, format='JPEG', quality=quality, optimize=True)
                size = output.tell()
                
                if size <= max_size_bytes:
                    break
                
                # Reduce quality for next iteration
                quality -= 5
            
            # If still too large, resize image
            if size > max_size_bytes:
                scale = (max_size_bytes / size) ** 0.5
                new_width = int(img.width * scale)
                new_height = int(img.height * scale)
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                
                output = io.BytesIO()
                img.save(output, format='JPEG', quality=quality, optimize=True)
            
            # Convert back to base64
            output.seek(0)
            optimized_b64 = base64.b64encode(output.read()).decode('utf-8')
            return f"data:image/jpeg;base64,{optimized_b64}"
    
    except ValueError:
        # Invalid/unsafe payload: propagate so endpoints can reject (HTTP 400).
        raise
    except Exception:
        # If optimization fails after validation, return original (already validated/safe).
        return data_url


def _extract_public_id_from_url(url: str) -> str:
    """Extract Cloudinary public_id from URL.
    
    Example: https://res.cloudinary.com/cloud/image/upload/v123/ordenes/fotos/abc.jpg
    Returns: ordenes/fotos/abc
    """
    try:
        if not url or not isinstance(url, str):
            return ""

        parsed = urlparse(url)
        if not parsed.hostname or not _is_cloudinary_host(parsed.hostname):
            return ""
        
        # Find the part after /upload/
        parts = url.split('/upload/')
        if len(parts) < 2:
            return ""
        
        # Get the path after version (v123456/)
        path = parts[1]
        # Remove version if present
        if path.startswith('v') and '/' in path:
            path = path.split('/', 1)[1]
        
        # Remove file extension
        if '.' in path:
            path = path.rsplit('.', 1)[0]
        
        public_id = path.lstrip("/")
        if public_id and not public_id.startswith(ALLOWED_CLOUDINARY_PUBLIC_ID_PREFIXES):
            return ""
        return public_id
    except Exception:
        return ""


def _delete_cloudinary_resource(url: str, resource_type: str = "image"):
    """Delete a resource from Cloudinary by its URL."""
    if not cloudinary or not url:
        return
    
    try:
        public_id = _extract_public_id_from_url(url)
        if public_id:
            cloudinary.uploader.destroy(public_id, resource_type=resource_type)
    except Exception:
        pass


def _upload_data_url(data_url: str, folder: str, max_size_kb: int = 80) -> str:
    """Upload a data URL (base64) to Cloudinary and return the secure URL.
    If Cloudinary is not configured, returns the original data URL.
    
    Args:
        data_url: Base64 data URL
        folder: Cloudinary folder path
        max_size_kb: Maximum file size in KB (default 80KB)
    """
    try:
        # Validate + optimize first (reject invalid/unsafe payloads).
        optimized_url = _optimize_image(data_url, max_size_kb)
    except ValueError:
        # Avoid leaking details to clients.
        raise ValidationError("Imagen inválida o demasiado grande")

    if not cloudinary:
        # Cloudinary disabled: keep the safe (validated) data URI.
        return optimized_url

    try:
        res = cloudinary.uploader.upload(
            optimized_url,
            folder=folder,
            resource_type="image",
            overwrite=True,
        )
        return res.get("secure_url") or res.get("url") or optimized_url
    except Exception:
        logger.exception("Cloudinary upload failed")
        return optimized_url


def _img_url_to_data_uri(url: str) -> str:
    """Download an image URL and embed as data URI for reliable PDF rendering.

    If anything fails (timeout, non-image response, too large, disallowed host),
    returns '' to avoid SSRF / external fetches.
    """
    if not isinstance(url, str) or not url:
        return ''
    if not _is_embed_url_allowed(url):
        return ''
    try:
        req = Request(
            url=url,
            headers={
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
            },
            method='GET',
        )
        with urlopen(req, timeout=30) as resp:
            content_type = (resp.headers.get('Content-Type') or '').split(';')[0].strip().lower()
            raw = resp.read()

        # Guardrail: avoid embedding extremely large images
        if raw and len(raw) > MAX_EMBED_REMOTE_BYTES:
            return ''
        if not content_type.startswith('image/'):
            return ''
        b64 = base64.b64encode(raw).decode('ascii')
        return f'data:{content_type};base64,{b64}'
    except Exception:
        return ''


class OrdenViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    # Evitar paginación por defecto para que el frontend reciba todas las órdenes
    # y no “se corten” (p.ej. mostrar solo hasta idx=10).
    pagination_class = None
    queryset = Orden.objects.all()
    serializer_class = OrdenSerializer

    def get_permissions(self):
        # Administrative reindex must be limited to staff/admin users.
        if self.action == 'reindex':
            return [IsAdminUser()]
        if self.action in ('reportes_semanales', 'reporte_semanal_pdf', 'reporte_semanal_delete'):
            return [IsAuthenticated(), ReportesPermission()]
        if self.action == 'reportes_tecnico_opciones':
            return [IsAuthenticated()]
        return super().get_permissions()

    def get_queryset(self):
        # IMPORTANTE: usar `.all()` para obtener un queryset fresco en cada request
        # y evitar cache accidental de resultados en el queryset de clase.
        qs = (
            self.queryset.all()
            .annotate(tiene_levantamiento=Exists(OrdenLevantamiento.objects.filter(orden_id=OuterRef('pk'))))
            .select_related('cliente_id', 'tecnico_asignado', 'creado_por')
            .order_by(
                F('fecha_inicio').desc(nulls_last=True),
                F('fecha_creacion').desc(nulls_last=True),
                '-id',
            )
        )
        user = getattr(self.request, 'user', None)
        if user and (user.is_authenticated and (user.is_staff or user.is_superuser)):
            return qs
        if not user or not getattr(user, 'is_authenticated', False):
            return qs.none()
        return qs.filter(Q(tecnico_asignado=user) | Q(creado_por=user))

    def get_object(self):
        """
        Evita que DRF oculte autorización como `404`.
        - Si la orden NO existe: `404`
        - Si existe pero no pertenece al usuario: `403`
        """
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs.get(lookup_url_kwarg)
        if lookup_value is None:
            raise NotFound()

        try:
            # Usar una consulta simple (sin anotaciones/Exists) para evitar
            # casos donde el listado muestra registros pero el detalle falla.
            obj = Orden.objects.filter(**{self.lookup_field: lookup_value}).first()
        except Exception:
            obj = None

        if not obj:
            raise NotFound()

        user = getattr(self.request, 'user', None)
        if user and getattr(user, 'is_authenticated', False) and (user.is_staff or user.is_superuser):
            return obj

        if user and getattr(user, 'is_authenticated', False):
            if obj.tecnico_asignado_id == user.id or obj.creado_por_id == user.id:
                return obj

        raise PermissionDenied()

    @action(detail=False, methods=['get', 'post'], url_path='reportes-semanales')
    def reportes_semanales(self, request):
        if request.method.upper() == 'POST':
            return self._crear_reporte_semanal(request)
        user = request.user
        qs = ReporteSemanal.objects.select_related('tecnico').all()
        if not (user.is_staff or user.is_superuser):
            qs = qs.filter(tecnico=user)
        serializer = ReporteSemanalSerializer(qs, many=True)
        return Response(serializer.data)

    def _crear_reporte_semanal(self, request):
        user = request.user
        payload = request.data if isinstance(request.data, dict) else {}

        target_user = user
        tecnico_raw = payload.get('tecnico_id')
        if tecnico_raw is not None and str(tecnico_raw).strip() != '':
            if not (user.is_staff or user.is_superuser):
                raise PermissionDenied('Solo administradores pueden generar el reporte para otro técnico.')
            try:
                tid = int(tecnico_raw)
            except (TypeError, ValueError):
                raise ValidationError('tecnico_id inválido.')
            target = User.objects.filter(pk=tid).first()
            if not target:
                raise ValidationError('Técnico no encontrado.')
            if not target.is_active:
                raise ValidationError('El usuario seleccionado no está activo.')
            target_user = target

        semana_fin_raw = str(payload.get('semana_fin') or '').strip()
        try:
            semana_fin = None
            if semana_fin_raw:
                semana_fin = date.fromisoformat(semana_fin_raw)
        except Exception:
            semana_fin = None

        # Si no envían fecha, usamos el sábado de la semana actual.
        now_date = timezone.now().date()
        if semana_fin is None:
            # weekday: lunes=0 ... domingo=6. sábado=5
            delta_to_saturday = (5 - now_date.weekday()) % 7
            semana_fin = now_date + timedelta(days=delta_to_saturday)

        # Forzamos que la fecha límite no pase de sábado.
        if semana_fin.weekday() != 5:
            raise ValidationError("La fecha límite del reporte debe ser sábado (YYYY-MM-DD).")

        semana_inicio = semana_fin - timedelta(days=5)  # lunes

        ordenes_qs = Orden.objects.filter(
            Q(fecha_inicio__gte=semana_inicio, fecha_inicio__lte=semana_fin)
            & (Q(tecnico_asignado=target_user) | Q(creado_por=target_user))
        ).order_by('fecha_inicio', 'id')

        ordenes_payload = []
        for o in ordenes_qs:
            prob = (o.problematica or "").strip()
            ordenes_payload.append({
                "id": o.id,
                "idx": o.idx,
                "folio": o.folio,
                "cliente": o.cliente,
                "status": o.status,
                "fecha_inicio": o.fecha_inicio.isoformat() if o.fecha_inicio else None,
                "hora_inicio": o.hora_inicio.isoformat() if o.hora_inicio else None,
                "fecha_finalizacion": o.fecha_finalizacion.isoformat() if o.fecha_finalizacion else None,
                "hora_termino": o.hora_termino.isoformat() if o.hora_termino else None,
                "servicios_realizados": o.servicios_realizados if isinstance(o.servicios_realizados, list) else [],
                "problematica": prob[:500] if prob else "",
            })

        reporte = ReporteSemanal.objects.create(
            tecnico=target_user,
            semana_inicio=semana_inicio,
            semana_fin=semana_fin,
            ordenes=ordenes_payload,
            total_ordenes=len(ordenes_payload),
        )
        serializer = ReporteSemanalSerializer(reporte)
        return Response(serializer.data, status=201)

    def _get_reporte_semanal_for_user(self, request, reporte_id):
        try:
            rid = int(reporte_id)
        except (TypeError, ValueError):
            raise NotFound()
        reporte = ReporteSemanal.objects.select_related('tecnico').filter(pk=rid).first()
        if not reporte:
            raise NotFound()
        user = request.user
        if user.is_staff or user.is_superuser:
            return reporte
        if reporte.tecnico_id == user.id:
            return reporte
        raise PermissionDenied()

    def _generate_reporte_semanal_pdf_html(self, reporte: ReporteSemanal) -> str:
        """HTML para PDF del reporte semanal (mismo flujo que cotizaciones / orden pdf)."""

        def esc(v):
            return (
                str(v if v is not None else '')
                .replace('&', '&amp;')
                .replace('<', '&lt;')
                .replace('>', '&gt;')
                .replace('"', '&quot;')
                .replace("'", '&#39;')
            )

        logo_data_uri = ""
        try:
            repo_root = Path(__file__).resolve().parents[3]
            logo_path = repo_root / "frontend" / "public" / "images" / "logo" / "intrax-logo.png"
            if logo_path.exists():
                b64 = base64.b64encode(logo_path.read_bytes()).decode("ascii")
                logo_data_uri = f"data:image/png;base64,{b64}"
        except Exception:
            logo_data_uri = ""

        t = reporte.tecnico
        tecnico_nombre = (
            f"{t.first_name} {t.last_name}".strip()
            or getattr(t, 'email', None)
            or getattr(t, 'username', None)
            or f"#{t.id}"
        )

        def fmt_date(d):
            if not d:
                return '-'
            if hasattr(d, 'strftime'):
                return d.strftime('%d/%m/%Y')
            return esc(str(d))

        creado = reporte.fecha_creacion
        creado_str = creado.strftime('%d/%m/%Y %H:%M') if creado else '-'

        ordenes = reporte.ordenes if isinstance(reporte.ordenes, list) else []

        def status_text(raw):
            s = str(raw or '').strip()
            return esc(s or '—')

        def parse_fecha_val(raw):
            if raw is None:
                return None
            try:
                return date.fromisoformat(str(raw)[:10])
            except Exception:
                return None

        def parse_hora_val(raw):
            if raw is None:
                return None
            s = str(raw).strip()
            if not s:
                return None
            try:
                if 'T' in s:
                    return datetime.fromisoformat(s.replace('Z', '').split('+')[0].split('.')[0]).time()
                return time.fromisoformat(s.split('.')[0])
            except Exception:
                return None

        def fmt_fecha_hora(fecha_raw, hora_raw):
            d = parse_fecha_val(fecha_raw)
            if not d:
                return '—'
            t = parse_hora_val(hora_raw)
            ds = d.strftime('%d/%m/%Y')
            if t:
                return f"{ds} {t.strftime('%H:%M')}"
            return ds

        def duracion_str(o):
            d0 = parse_fecha_val(o.get('fecha_inicio'))
            d1 = parse_fecha_val(o.get('fecha_finalizacion'))
            if not d0 or not d1:
                return '—'
            t0 = parse_hora_val(o.get('hora_inicio'))
            t1 = parse_hora_val(o.get('hora_termino'))
            try:
                if t0 is not None and t1 is not None:
                    dt0 = datetime.combine(d0, t0)
                    dt1 = datetime.combine(d1, t1)
                    if dt1 < dt0:
                        return '—'
                    sec = int((dt1 - dt0).total_seconds())
                    if sec <= 0:
                        return '—'
                    days, rem = divmod(sec, 86400)
                    hours, rem = divmod(rem, 3600)
                    mins, _ = divmod(rem, 60)
                    parts = []
                    if days:
                        parts.append(f'{days}d')
                    if hours:
                        parts.append(f'{hours}h')
                    if mins or not parts:
                        parts.append(f'{mins}min')
                    return ' '.join(parts) if parts else '—'
                days = (d1 - d0).days
                if days < 0:
                    return '—'
                if days == 0:
                    return 'Mismo día'
                return f'{days} día(s)' if days != 1 else '1 día'
            except Exception:
                return '—'

        def texto_problematica(o):
            # Mismo campo que el textarea "Problemática" en órdenes (sin sustituir por servicios).
            prob = (o.get('problematica') or '').strip()
            if not prob:
                return '—'
            text = prob if len(prob) <= 500 else prob[:497] + '…'
            return esc(text)

        n_resueltas = 0
        n_pendientes = 0
        rows = []
        for o in ordenes:
            if not isinstance(o, dict):
                continue
            folio = o.get('folio') or o.get('idx') or o.get('id') or '-'
            cliente = o.get('cliente') or '-'
            st = o.get('status') or ''
            st_l = str(st).lower().strip()
            if st_l == 'resuelto':
                n_resueltas += 1
            else:
                n_pendientes += 1
            fini = fmt_fecha_hora(o.get('fecha_inicio'), o.get('hora_inicio'))
            ffin = fmt_fecha_hora(o.get('fecha_finalizacion'), o.get('hora_termino'))
            dur = duracion_str(o)
            col_problematica = texto_problematica(o)
            rows.append(
                f"""
                <tr>
                  <td class='mono td-folio'>{esc(folio)}</td>
                  <td class='td-cliente'>{esc(cliente)}</td>
                  <td class='td-status capitalize'>{status_text(st)}</td>
                  <td class='td-date'>{esc(fini)}</td>
                  <td class='td-date'>{esc(ffin)}</td>
                  <td class='td-dur'>{esc(dur)}</td>
                  <td class='td-problematica'>{col_problematica}</td>
                </tr>
                """
            )
        rows_html = ''.join(rows) or (
            "<tr><td colspan='7' class='empty-row'>No hay órdenes registradas en este periodo.</td></tr>"
        )

        periodo = f"{fmt_date(reporte.semana_inicio)} — {fmt_date(reporte.semana_fin)}"
        logo_html = (
            f"<div class='logo'><img src='{esc(logo_data_uri)}' alt='Intrax' /></div>"
            if logo_data_uri
            else ""
        )

        html = f"""<!doctype html>
<html lang='es'>
<head>
  <meta charset='utf-8' />
  <meta name='viewport' content='width=device-width, initial-scale=1' />
  <title>Reporte semanal de trabajo</title>
  <style>
    @page {{ size: A4; margin: 12mm; }}
    * {{ box-sizing: border-box; }}
    body {{
      font-family: Arial, Helvetica, sans-serif;
      color: #111827;
      margin: 0;
      font-size: 11px;
      line-height: 1.45;
    }}
    .top {{ display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; margin-bottom: 12px; }}
    .head-text {{ flex: 1; min-width: 0; }}
    .k {{ font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #9ca3af; font-weight: 600; margin: 0 0 4px 0; }}
    .doc-title {{ font-size: 16px; font-weight: 700; color: #111827; margin: 0 0 4px 0; }}
    .doc-sub {{ font-size: 10px; color: #6b7280; margin: 0; line-height: 1.4; max-width: 420px; }}
    .logo {{ width: 200px; flex-shrink: 0; display: flex; align-items: flex-start; justify-content: flex-end; }}
    .logo img {{ max-width: 200px; max-height: 72px; object-fit: contain; }}
    .hr {{ height: 1px; background: #e5e7eb; margin: 12px 0; }}
    .kv {{ display: grid; grid-template-columns: 88px 1fr; gap: 6px 14px; font-size: 11px; margin-bottom: 10px; }}
    .kv .l {{ color: #6b7280; }}
    .kv .v {{ color: #111827; font-weight: 500; }}
    .summary {{ font-size: 10px; color: #6b7280; margin: 0 0 12px 0; padding: 8px 10px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; }}
    .summary strong {{ color: #374151; font-weight: 600; }}
    .section-title {{ font-size: 11px; font-weight: 600; color: #111827; margin: 0 0 8px 0; letter-spacing: .02em; }}
    table.data {{ width: 100%; border-collapse: collapse; font-size: 9px; border: 1px solid #93c5fd; }}
    table.data th, table.data td {{ border: 1px solid #e5e7eb; padding: 7px 8px; vertical-align: top; }}
    table.data thead th {{
      background: #dbeafe;
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: .05em;
      color: #1e3a8a;
      font-weight: 700;
      text-align: left;
      border-color: #93c5fd;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }}
    table.data thead th:nth-child(3) {{ text-align: center; }}
    table.data tbody td {{ border-top: none; }}
    table.data tbody tr:nth-child(even) td {{ background: #fafafa; }}
    .center {{ text-align: center; }}
    .mono {{ font-family: Consolas, 'Courier New', monospace; color: #111827; }}
    .capitalize {{ text-transform: capitalize; }}
    .td-status {{ text-align: center; }}
    .td-date {{ font-size: 9.5px; white-space: nowrap; }}
    .td-dur {{ font-size: 9.5px; white-space: nowrap; color: #374151; }}
    .td-problematica {{
      font-size: 9px;
      line-height: 1.35;
      color: #374151;
      white-space: pre-wrap;
      word-wrap: break-word;
    }}
    .empty-row {{
      text-align: center;
      padding: 20px 12px !important;
      color: #9ca3af;
      font-style: italic;
      background: #f9fafb !important;
    }}
    .foot {{
      margin-top: 14px;
      padding-top: 10px;
      border-top: 1px solid #e5e7eb;
      font-size: 9px;
      color: #9ca3af;
      text-align: center;
    }}
  </style>
</head>
<body>
  <div class='top'>
    <div class='head-text'>
      <p class='k'>Reporte operativo</p>
      <h1 class='doc-title'>Reporte semanal de trabajo</h1>
      <p class='doc-sub'>Resumen de órdenes de servicio del periodo (lunes a sábado). Documento interno Intrax.</p>
    </div>
    {logo_html}
  </div>

  <div class='hr'></div>

  <div class='kv'>
    <span class='l'>Técnico</span><span class='v'>{esc(tecnico_nombre)}</span>
    <span class='l'>Periodo</span><span class='v'>{esc(periodo)}</span>
    <span class='l'>Generado</span><span class='v'>{esc(creado_str)}</span>
  </div>

  <p class='summary'>
    <strong>Resumen:</strong> {n_resueltas} resuelta{'s' if n_resueltas != 1 else ''} · {n_pendientes} pendiente{'s' if n_pendientes != 1 else ''}
  </p>

  <p class='section-title'>Detalle de órdenes</p>
  <table class='data'>
    <thead>
      <tr>
        <th>Folio</th>
        <th>Cliente</th>
        <th>Estado</th>
        <th>Fecha inicio</th>
        <th>Fecha fin</th>
        <th>Duración</th>
        <th>Problemática</th>
      </tr>
    </thead>
    <tbody>
      {rows_html}
    </tbody>
  </table>

  <div class='foot'>
    Intrax · Documento generado electrónicamente
  </div>
</body>
</html>"""
        return html

    @action(detail=False, methods=['get'], url_path=r'reportes-semanales/(?P<reporte_id>[^/.]+)/pdf')
    def reporte_semanal_pdf(self, request, reporte_id=None):
        reporte = self._get_reporte_semanal_for_user(request, reporte_id)
        html = self._generate_reporte_semanal_pdf_html(reporte)
        filename = _filename_reporte_semanal_pdf(reporte)
        return _pdf_response_from_html(html, filename)

    @action(detail=False, methods=['delete'], url_path=r'reportes-semanales/(?P<reporte_id>[^/.]+)')
    def reporte_semanal_delete(self, request, reporte_id=None):
        """Eliminar: permiso JSON reportes.delete (o staff, vía ReportesPermission)."""
        try:
            rid = int(reporte_id)
        except (TypeError, ValueError):
            raise NotFound()
        deleted, _ = ReporteSemanal.objects.filter(pk=rid).delete()
        if not deleted:
            raise NotFound()
        return Response(status=204)

    @action(detail=False, methods=['get'], url_path='reportes-tecnico-opciones')
    def reportes_tecnico_opciones(self, request):
        """Usuarios activos para selector de técnico al generar reporte (solo staff/superuser)."""
        user = request.user
        if not user.is_authenticated:
            raise PermissionDenied()
        if not (user.is_staff or user.is_superuser):
            raise PermissionDenied()
        qs = User.objects.filter(is_active=True).order_by('first_name', 'last_name', 'id')
        data = [
            {
                'id': u.id,
                'nombre': (
                    f"{u.first_name} {u.last_name}".strip()
                    or u.username
                    or u.email
                    or f"#{u.id}"
                ),
                'username': u.username or '',
            }
            for u in qs
        ]
        return Response(data)

    @action(detail=True, methods=['get', 'put', 'patch'], url_path='levantamiento')
    def levantamiento(self, request, pk=None):
        orden = self.get_object()
        existing = getattr(orden, 'levantamiento', None)

        if request.method.upper() == 'GET':
            if not existing:
                return Response({
                    'id': None,
                    'orden': orden.id,
                    'payload': {},
                    'dibujo_url': '',
                    'creado_por': None,
                    'fecha_creacion': None,
                    'fecha_actualizacion': None,
                })
            ser = OrdenLevantamientoSerializer(existing)
            return Response(ser.data)

        payload = request.data if isinstance(request.data, dict) else {}
        if existing:
            ser = OrdenLevantamientoSerializer(existing, data=payload, partial=(request.method.upper() == 'PATCH'))
        else:
            ser = OrdenLevantamientoSerializer(data=payload)

        ser.is_valid(raise_exception=True)

        # Si el dibujo viene como data URL (base64), subirlo a Cloudinary para que sea persistente y visible por otros usuarios
        validated = ser.validated_data
        dibujo_url = validated.get('dibujo_url') or ''
        if _is_data_url(dibujo_url):
            dibujo_url = _upload_data_url(
                dibujo_url,
                folder='ordenes/levantamiento/dibujos',
                max_size_kb=200,
            )
            validated['dibujo_url'] = dibujo_url

        if existing:
            obj = ser.save()
        else:
            obj = OrdenLevantamiento.objects.create(
                orden=orden,
                payload=validated.get('payload', {}),
                dibujo_url=validated.get('dibujo_url', ''),
                creado_por=getattr(request, 'user', None) if getattr(request, 'user', None) and request.user.is_authenticated else None,
            )

        return Response(OrdenLevantamientoSerializer(obj).data)

    @action(detail=False, methods=['post'], url_path='reindex')
    def reindex(self, request):
        """Reasigna idx de todas las órdenes.
        Reglas:
         - Ordenar por fecha de inicio (ascendente) para alinear IDs con fechas.
         - IDs 1 a 564 son secuenciales.
         - A partir del 565 (el siguiente después de 564), el ID salta a 5000.
        """
        # Usar fecha_inicio como criterio principal para que coincida con el orden visual
        qs = Orden.objects.all().order_by(
            F('fecha_inicio').asc(nulls_last=True),
            F('fecha_creacion').asc(nulls_last=True),
            'id'
        )
        
        with transaction.atomic():
            # Limpiar IDs para evitar unique constraint violations
            qs.update(idx=None)
            
            for i, orden in enumerate(qs, start=1):
                if i <= 588:
                    new_idx = i
                else:
                    # El 589 se convierte en 5000, 590 en 5001, etc.
                    # Formula: 5000 + (i - 589)
                    new_idx = 5000 + (i - 589)
                
                Orden.objects.filter(id=orden.id).update(idx=new_idx)
                
        return Response({"detail": "IDX reindexado correctamente", "total": qs.count()})

    def _generate_pdf_html(self, orden):
        """Genera el HTML para el PDF de la orden (usado por el endpoint /pdf)"""
        # El HTML se puede generar siempre. La conversión a PDF requiere HTMLEDOCS_API_KEY
        # (en local, si no está configurada, regresamos el HTML para poder visualizar/imprimir).
        api_key = os.environ.get('HTMLEDOCS_API_KEY')
        
        tecnico = orden.tecnico_asignado
        tecnico_nombre = None
        if tecnico:
            tecnico_nombre = (f"{tecnico.first_name} {tecnico.last_name}".strip() or getattr(tecnico, 'email', None) or getattr(tecnico, 'username', None))
        if not tecnico_nombre:
            tecnico_nombre = getattr(orden, 'nombre_encargado', None) or None

        def esc(s):
            if s is None:
                return ""
            s = str(s)
            return (
                s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace('"', "&quot;")
                .replace("'", "&#39;")
            )

        servicios = orden.servicios_realizados if isinstance(orden.servicios_realizados, list) else []
        fotos = orden.fotos_urls if isinstance(orden.fotos_urls, list) else []
        fotos = fotos[:5]
        fotos_limpias = [url for url in fotos if url]
        fotos_embedded = [_img_url_to_data_uri(url) for url in fotos_limpias]
        fotos_embedded = [src for src in fotos_embedded if src]
        has_photos = bool(fotos_embedded)

        firma_tecnico = _img_url_to_data_uri(getattr(orden, 'firma_encargado_url', None) or '')
        firma_cliente = _img_url_to_data_uri(getattr(orden, 'firma_cliente_url', None) or '')

        status_text = "RESUELTO" if orden.status == "resuelto" else "PENDIENTE"
        status_bg = "#dcfce7" if orden.status == "resuelto" else "#fef3c7"
        status_border = "#86efac" if orden.status == "resuelto" else "#fcd34d"
        status_fg = "#166534" if orden.status == "resuelto" else "#92400e"

        folio_display = getattr(orden, 'folio', None) or getattr(orden, 'idx', None) or '-'

        servicios_pills_html = "".join(
            f"<span class='service-pill'>{esc(s)}</span>" for s in servicios if s
        ) or "<span class='muted'>-</span>"

        fotos_grid_html = "".join(
            f"<div class='photo-box'><img src='{esc(src)}' /></div>" for src in fotos_embedded
        ) or "<div class='muted'>No hay fotos adjuntas.</div>"

        logo_data_uri = ""
        try:
            repo_root = Path(__file__).resolve().parents[3]
            logo_path = repo_root / "frontend" / "public" / "images" / "logo" / "intrax-logo.png"
            if logo_path.exists():
                b64 = base64.b64encode(logo_path.read_bytes()).decode("ascii")
                logo_data_uri = f"data:image/png;base64,{b64}"
        except Exception:
            logo_data_uri = ""

        evidencias_html = ""
        if has_photos:
            evidencias_html = f"""

    <div class='pagebreak'></div>
    <div class='page'>
      <div class='content'>
        <div class='section'>
          <div class='section-title'>Evidencias</div>
          <div class='box'>
            <div class='photos'>
              {fotos_grid_html}
            </div>
          </div>
        </div>
      </div>
    </div>
"""

        html = f"""<!doctype html>
<html>
  <head>
    <meta charset='utf-8' />
    <meta name='viewport' content='width=device-width, initial-scale=1' />
    <style>
      :root {{
        --blue-900: #1e3a8a;
        --blue-700: #1d4ed8;
        --blue-600: #2563eb;
        --blue-100: #dbeafe;
        --blue-50: #eff6ff;
        --text: #0f172a;
        --muted: #64748b;
        --border: #dbeafe;
        --bg: #ffffff;
        --green: #16a34a;
        --amber: #f59e0b;
      }}
      @page {{
        size: A4;
        margin-left: 12mm;
        margin-right: 16mm;
        margin-top: 12mm;
        margin-bottom: 14mm;
      }}
      * {{ box-sizing: border-box; }}
      body {{ font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; font-size: 14px; color: var(--text); background: var(--bg); margin: 0; }}
      .page {{ width: 210mm; min-height: 297mm; padding: 0; margin: 0 auto; }}
      .content {{ padding: 0; }}
      .topbar {{ display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 14px; }}
      .brandwrap {{ display: flex; align-items: flex-start; gap: 12px; min-width: 0; }}
      .logo {{ width: 96px; height: 96px; border-radius: 0; background: transparent; border: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; flex: 0 0 auto; }}
      .logo img {{ width: 100%; height: 100%; object-fit: contain; }}
      .brand {{ min-width: 0; }}
      .brand .name {{ font-size: 15px; font-weight: 700; color: var(--blue-900); letter-spacing: -0.2px; }}
      .brand .meta {{ margin-top: 6px; font-size: 11px; line-height: 1.25; color: var(--muted); max-width: 330px; }}
      .brand .meta b {{ color: var(--text); font-weight: 600; }}
      .status {{ text-align: right; max-width: 45%; margin-left: auto; }}
      .status .pill {{ display: inline-block; font-size: 12px; font-weight: 600; letter-spacing: .7px; padding: 6px 12px; border-radius: 999px; border: 1px solid var(--border); }}
      .status .dates {{ margin-top: 8px; font-size: 12px; color: var(--muted); line-height: 1.35; }}
      .status .folio {{ font-size: 17px; color: var(--muted); margin-bottom: 6px; font-weight: 600; }}
      .status .folio .num {{ color: #dc2626; font-weight: 700; }}
      .hero {{ border: 1px solid var(--border); border-left: 6px solid var(--blue-700); border-radius: 14px; padding: 14px 14px 12px 14px; background: #eff6ff; margin-bottom: 14px; }}
      .hero .title {{ font-size: 19px; font-weight: 700; color: var(--blue-900); letter-spacing: -0.3px; }}
      .hero .sub {{ margin-top: 5px; font-size: 11px; color: var(--muted); }}
      .grid2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }}
      .card {{ border: 1px solid var(--border); border-radius: 14px; padding: 12px; background: #fff; }}
      .card h3 {{ margin: 0 0 10px 0; font-size: 13px; font-weight: 700; color: var(--blue-900); letter-spacing: .3px; text-transform: uppercase; }}
      .row {{ display: flex; gap: 12px; }}
      .col {{ flex: 1; min-width: 0; }}
      .label {{ font-size: 11px; font-weight: 600; color: var(--muted); letter-spacing: .5px; text-transform: uppercase; }}
      .value {{ margin-top: 4px; font-size: 13px; color: var(--text); }}
      .pre {{ white-space: pre-wrap; overflow-wrap: anywhere; }}
      .muted {{ color: var(--muted); font-size: 13px; }}
      .services {{ margin-top: 6px; }}
      .service-pill {{ display: inline-block; font-size: 11px; font-weight: 600; color: #fff; padding: 4px 10px; border-radius: 999px; background: #2563eb; margin: 4px 6px 0 0; }}
      .section {{ margin-top: 12px; }}
      .section-title {{ margin: 0 0 10px 0; font-size: 13px; font-weight: 700; color: var(--blue-900); letter-spacing: .3px; text-transform: uppercase; }}
      .box {{ border: 1px solid var(--border); border-radius: 14px; padding: 12px; background: #fff; }}
      .photos {{ display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }}
      .photo-box {{ border: 1px solid var(--border); border-radius: 14px; overflow: hidden; background: var(--blue-50); height: 260px; display: flex; align-items: center; justify-content: center; }}
      .photo-box img {{ width: 100%; height: 100%; object-fit: cover; }}
      .pagebreak {{ page-break-before: always; }}
      .sigs {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }}
      .sigbox {{ border: 1px solid var(--border); border-radius: 14px; padding: 12px; background: #fff; }}
      .sigimgwrap {{ height: 105px; border-radius: 12px; border: 1px dashed var(--border); display: flex; align-items: center; justify-content: center; overflow: hidden; background: var(--blue-50); margin-top: 8px; }}
      .sigimgwrap img {{ width: 100%; height: 100%; object-fit: contain; }}
      .sigline {{ margin-top: 10px; border-top: 1px solid var(--border); padding-top: 8px; font-size: 12px; color: var(--muted); }}
      .sigline b {{ font-weight: 700; color: var(--text); }}
    </style>
  </head>
  <body>
    <div class='page'>
      <div class='content'>
      <div class='topbar'>
        <div class='brandwrap'>
          <div class='logo'>
            {f"<img src='{logo_data_uri}' />" if logo_data_uri else ""}
          </div>
          <div class='brand'>
            <div class='name'>GRUPO INTRAX SEGURIDAD Y RASTREO</div>
            <div class='meta'>
              <b>RFC:</b> IMA200110CI4<br/>
              Av. Elias Zamora Verduzco No. 149 Barrio 2, Valle de las garzas. #149<br/>
              Col: Valle de las Garzas C.P.: 20219 Barrio 2, Manzanillo, Colima, México<br/>
              <b>Tel:</b> 3141130469 &nbsp;|&nbsp; <b>Cel:</b> 3141245830 &nbsp;|&nbsp; <b>Mail:</b> hola@intrax.mx
            </div>
          </div>
        </div>
        <div class='status'>
          <div class='folio'><b>FOLIO:</b> <span class='num'>{esc(folio_display)}</span></div>
          <div class='pill' style='background: {status_bg}; border-color: {status_border}; color: {status_fg};'>
            {esc(status_text)}
          </div>
          <div class='dates'>
            <div><b>Inicio:</b> {esc(orden.fecha_inicio or '-') } {esc(orden.hora_inicio or '')}</div>
            <div><b>Término:</b> {esc(orden.fecha_finalizacion or '-') } {esc(orden.hora_termino or '')}</div>
          </div>
        </div>
      </div>

      <div class='hero'>
        <div class='title'>Orden de Servicio</div>
        <div class='sub'>Cliente: {esc(orden.cliente or getattr(orden.cliente_id, 'nombre', '') or '-')}</div>
      </div>

      <div class='grid2'>
        <div class='card'>
          <h3>Datos del cliente</h3>
          <div class='label'>Dirección</div>
          <div class='value pre'>{esc(orden.direccion or '-')}</div>
          <div class='row' style='margin-top: 10px;'>
            <div class='col'>
              <div class='label'>Teléfono</div>
              <div class='value'>{esc(orden.telefono_cliente or '-')}</div>
            </div>
            <div class='col'>
              <div class='label'>Contacto</div>
              <div class='value'>{esc(orden.nombre_cliente or '-')}</div>
            </div>
          </div>
        </div>

        <div class='card'>
          <h3>Servicio</h3>
          <div class='label'>Técnico</div>
          <div class='value'>{esc(tecnico_nombre or orden.nombre_encargado or '-')}</div>
          <div class='label' style='margin-top: 10px;'>Servicios realizados</div>
          <div class='value services'>{servicios_pills_html}</div>
        </div>
      </div>

      <div class='section'>
        <div class='section-title'>Detalle del servicio</div>
        <div class='box'>
          <div class='label'>Problemática</div>
          <div class='value pre'>{esc(orden.problematica or '-')}</div>
          <div class='label' style='margin-top: 10px;'>Comentario del técnico</div>
          <div class='value pre'>{esc(orden.comentario_tecnico or '-')}</div>
        </div>
      </div>

      <div class='section'>
        <div class='section-title'>Firmas</div>
        <div class='sigs'>
          <div class='sigbox'>
            <div class='label'>Firma técnico</div>
            <div class='sigimgwrap'>
              {f"<img src='{firma_tecnico}' />" if firma_tecnico else "<div class='muted'>Sin firma</div>"}
            </div>
            <div class='sigline'><b>Nombre:</b> {esc(tecnico_nombre or orden.nombre_encargado or '-') }</div>
          </div>
          <div class='sigbox'>
            <div class='label'>Firma cliente</div>
            <div class='sigimgwrap'>
              {f"<img src='{firma_cliente}' />" if firma_cliente else "<div class='muted'>Sin firma</div>"}
            </div>
            <div class='sigline'><b>Nombre:</b> {esc(orden.nombre_cliente or '-') }</div>
          </div>
        </div>
      </div>

      </div>
    </div>

    {evidencias_html}
  </body>
</html>"""

        return html

    def perform_create(self, serializer):
        data = serializer.validated_data
        # Firma del encargado: siempre se toma desde el perfil del usuario (no subir desde órdenes)
        sig = UserSignature.objects.filter(user=self.request.user).first()
        if sig and sig.url:
            data['firma_encargado_url'] = sig.url
        firma_cliente = data.get('firma_cliente_url')
        if isinstance(firma_cliente, str):
            if firma_cliente == "":
                # allow cleared signature on create
                data['firma_cliente_url'] = ""
            elif _is_data_url(firma_cliente):
                data['firma_cliente_url'] = _upload_data_url(firma_cliente, folder='ordenes/firmas', max_size_kb=80)
            elif _extract_public_id_from_url(firma_cliente):
                # Only allow Cloudinary URLs within our scope.
                data['firma_cliente_url'] = firma_cliente
            else:
                raise ValidationError("firma_cliente_url inválida")
        # Upload photos if base64 list
        fotos = data.get('fotos_urls')
        if isinstance(fotos, list):
            if len(fotos) > 5:
                raise ValidationError("Máximo 5 fotos")
            new_fotos = []
            for f in fotos:
                if isinstance(f, str) and _is_data_url(f):
                    new_fotos.append(_upload_data_url(f, folder='ordenes/fotos', max_size_kb=80))
                elif isinstance(f, str) and f and _extract_public_id_from_url(f):
                    new_fotos.append(f)
                else:
                    raise ValidationError("fotos_urls contiene una entrada inválida")
            data['fotos_urls'] = new_fotos
        serializer.save(creado_por=self.request.user, **data)

    def perform_update(self, serializer):
        instance = serializer.instance
        old_firma_cliente = instance.firma_cliente_url
        old_fotos = list(instance.fotos_urls) if instance.fotos_urls else []
        old_pdf_url = instance.pdf_url
        
        data = serializer.validated_data

        # Firma del encargado: siempre se toma desde el perfil del usuario (no subir/borrar desde órdenes)
        sig = UserSignature.objects.filter(user=self.request.user).first()
        if sig and sig.url:
            data['firma_encargado_url'] = sig.url
        
        firma_cliente = data.get('firma_cliente_url')
        if isinstance(firma_cliente, str) and _is_data_url(firma_cliente):
            # Delete old signature from Cloudinary (only within our scope) if exists
            if old_firma_cliente and _extract_public_id_from_url(old_firma_cliente):
                _delete_cloudinary_resource(old_firma_cliente)
            # Upload new optimized signature (80KB max)
            data['firma_cliente_url'] = _upload_data_url(firma_cliente, folder='ordenes/firmas', max_size_kb=80)
        elif firma_cliente == '' or firma_cliente is None:
            # Signature was cleared - delete from Cloudinary (only within our scope)
            if old_firma_cliente and _extract_public_id_from_url(old_firma_cliente):
                _delete_cloudinary_resource(old_firma_cliente)
            data['firma_cliente_url'] = "" if firma_cliente == '' else None
        elif isinstance(firma_cliente, str):
            # Allow only safe Cloudinary URLs within our scope.
            if not _extract_public_id_from_url(firma_cliente):
                raise ValidationError("firma_cliente_url inválida")
            data['firma_cliente_url'] = firma_cliente
        else:
            # Unexpected type
            raise ValidationError("firma_cliente_url inválida")
        
        # Handle photo updates - delete removed photos
        fotos = data.get('fotos_urls')
        if isinstance(fotos, list):
            if len(fotos) > 5:
                raise ValidationError("Máximo 5 fotos")
            new_fotos = []
            # Find photos that were removed
            for old_foto in old_fotos:
                if old_foto not in fotos and isinstance(old_foto, str) and _extract_public_id_from_url(old_foto):
                    _delete_cloudinary_resource(old_foto)
            
            # Process new photos
            for f in fotos:
                if isinstance(f, str) and _is_data_url(f):
                    # Upload new optimized photo (80KB max)
                    new_fotos.append(_upload_data_url(f, folder='ordenes/fotos', max_size_kb=80))
                elif isinstance(f, str) and f and _extract_public_id_from_url(f):
                    new_fotos.append(f)
                else:
                    raise ValidationError("fotos_urls contiene una entrada inválida")
            data['fotos_urls'] = new_fotos
        
        # Save updated instance
        instance = serializer.save(**data)
        
        return instance

    @action(detail=False, methods=['post'], url_path='upload-image')
    def upload_image(self, request):
        """Sube una imagen (data URL base64) a Cloudinary y regresa su URL.
        Body JSON: { "data_url": "data:image/...;base64,....", "folder": "ordenes/fotos" }
        """
        if not cloudinary:
            return Response({"detail": "Cloudinary no está configurado en el servidor."}, status=500)
        try:
            payload = request.data if isinstance(request.data, dict) else json.loads(request.body.decode('utf-8'))
        except Exception:
            payload = {}
        data_url = payload.get('data_url')
        folder = payload.get('folder') or 'ordenes/fotos'
        allowed_folders = {
            'ordenes/fotos',
            'ordenes/firmas',
            'ordenes/levantamiento/dibujos',
        }
        if not isinstance(folder, str) or folder not in allowed_folders:
            return Response({"detail": "folder inválido"}, status=400)
        if not isinstance(data_url, str) or ';base64,' not in data_url:
            return Response({"detail": "data_url inválido"}, status=400)
        try:
            url = _upload_data_url(data_url, folder=folder, max_size_kb=80)
            return Response({"url": url}, status=200)
        except ValidationError:
            return Response({"detail": "data_url inválido"}, status=400)
        except Exception:
            logger.exception("Error subiendo imagen a Cloudinary")
            return Response({"detail": "Error subiendo imagen a Cloudinary"}, status=502)

    @action(detail=False, methods=['post'], url_path='delete-image')
    def delete_image(self, request):
        """Elimina una imagen en Cloudinary por su public_id.
        Body JSON: { "public_id": "ordenes/fotos/abc123" }
        """
        if not cloudinary:
            return Response({"detail": "Cloudinary no está configurado en el servidor."}, status=500)
        try:
            payload = request.data if isinstance(request.data, dict) else json.loads(request.body.decode('utf-8'))
        except Exception:
            payload = {}
        public_id = payload.get('public_id')
        if not isinstance(public_id, str) or not public_id:
            return Response({"detail": "public_id inválido"}, status=400)
        allowed_prefixes = (
            'ordenes/fotos/',
            'ordenes/firmas/',
            'ordenes/levantamiento/dibujos/',
        )
        if not any(public_id.startswith(p) for p in allowed_prefixes):
            return Response({"detail": "public_id fuera de alcance"}, status=400)
        try:
            res = cloudinary.uploader.destroy(public_id, resource_type="image")
            return Response(res, status=200)
        except Exception:
            logger.exception("Error eliminando imagen en Cloudinary")
            return Response({"detail": "Error eliminando imagen en Cloudinary"}, status=502)

    @action(detail=True, methods=['patch'], url_path='update-photos')
    def update_photos(self, request, pk=None):
        """Actualiza solo el campo fotos_urls de una orden.
        Body JSON: { "fotos_urls": ["url1", "url2", ...] }
        """
        orden = self.get_object()
        try:
            payload = request.data if isinstance(request.data, dict) else json.loads(request.body.decode('utf-8'))
        except Exception:
            payload = {}
        
        fotos_urls = payload.get('fotos_urls')
        if not isinstance(fotos_urls, list):
            return Response({"detail": "fotos_urls debe ser una lista"}, status=400)

        if len(fotos_urls) > 5:
            raise ValidationError("Máximo 5 fotos")

        new_fotos = []
        for f in fotos_urls:
            if isinstance(f, str) and _is_data_url(f):
                new_fotos.append(_upload_data_url(f, folder='ordenes/fotos', max_size_kb=80))
            elif isinstance(f, str) and f and _extract_public_id_from_url(f):
                new_fotos.append(f)
            else:
                raise ValidationError("fotos_urls contiene una entrada inválida")

        orden.fotos_urls = new_fotos
        orden.save(update_fields=['fotos_urls'])
        
        serializer = self.get_serializer(orden)
        return Response(serializer.data, status=200)

    @action(detail=True, methods=['get'], url_path='pdf')
    def pdf(self, request, pk=None):
        orden = self.get_object()
        html = self._generate_pdf_html(orden)
        filename = f"Ordenes_Servicio_{orden.id}.pdf"
        return _pdf_response_from_html(html, filename)
