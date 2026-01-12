import json
import os
import base64
import io
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from django.http import HttpResponse
from django.db import transaction
from django.db.models import F

from PIL import Image

from .models import Orden
from .serializers import OrdenSerializer
from apps.users.models import UserSignature

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


def _optimize_image(data_url: str, max_size_kb: int = 50) -> str:
    """Optimize image to reduce file size while maintaining transparency.
    
    Args:
        data_url: Base64 data URL of the image
        max_size_kb: Maximum file size in KB (default 50KB)
    
    Returns:
        Optimized data URL
    """
    try:
        # Extract base64 data
        header, b64_data = data_url.split(",", 1)
        img_data = base64.b64decode(b64_data)
        
        # Open image with PIL
        img = Image.open(io.BytesIO(img_data))
        
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
    
    except Exception as e:
        # If optimization fails, return original
        return data_url


def _extract_public_id_from_url(url: str) -> str:
    """Extract Cloudinary public_id from URL.
    
    Example: https://res.cloudinary.com/cloud/image/upload/v123/ordenes/fotos/abc.jpg
    Returns: ordenes/fotos/abc
    """
    try:
        if not url or not isinstance(url, str):
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
        
        return path
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


def _upload_data_url(data_url: str, folder: str, max_size_kb: int = 50) -> str:
    """Upload a data URL (base64) to Cloudinary and return the secure URL.
    If Cloudinary is not configured, returns the original data URL.
    
    Args:
        data_url: Base64 data URL
        folder: Cloudinary folder path
        max_size_kb: Maximum file size in KB (default 50KB)
    """
    if not cloudinary:
        return data_url
    try:
        # Optimize image before upload
        optimized_url = _optimize_image(data_url, max_size_kb)
        
        # Upload to Cloudinary
        res = cloudinary.uploader.upload(
            optimized_url,
            folder=folder,
            resource_type="image",
            overwrite=True,
        )
        return res.get("secure_url") or res.get("url") or data_url
    except Exception:
        return data_url


def _img_url_to_data_uri(url: str) -> str:
    """Download an image URL and embed as data URI for reliable PDF rendering.

    If anything fails (timeout, non-image response, too large), returns the original URL.
    """
    if not isinstance(url, str) or not url:
        return ''
    if url.startswith('data:'):
        return url
    if not (url.startswith('http://') or url.startswith('https://')):
        return url
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
        if raw and len(raw) > 6 * 1024 * 1024:
            return url
        if not content_type.startswith('image/'):
            content_type = 'image/png'
        b64 = base64.b64encode(raw).decode('ascii')
        return f'data:{content_type};base64,{b64}'
    except Exception:
        return url


class OrdenViewSet(viewsets.ModelViewSet):
    queryset = Orden.objects.select_related('cliente_id', 'tecnico_asignado', 'creado_por').order_by(
        F('fecha_inicio').desc(nulls_last=True),
        F('fecha_creacion').desc(nulls_last=True),
        '-id',
    )
    serializer_class = OrdenSerializer

    @action(detail=False, methods=['post'], url_path='reindex')
    def reindex(self, request):
        """Reasigna idx de todas las órdenes a una secuencia 1..N.

        """
        qs = Orden.objects.all().order_by(
            F('fecha_inicio').asc(nulls_last=True),
            F('fecha_creacion').asc(nulls_last=True),
            'id',
        )
        with transaction.atomic():
            # Evitar conflictos por unique=True en idx.
            # En PostgreSQL (Render), UNIQUE permite múltiples NULL.
            qs.update(idx=None)
            for i, orden in enumerate(qs, start=1):
                Orden.objects.filter(id=orden.id).update(idx=i)
        return Response({"detail": "IDX reindexado", "total": qs.count()})

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

        firma_tecnico = _img_url_to_data_uri(getattr(orden, 'firma_encargado_url', None) or '')
        firma_cliente = _img_url_to_data_uri(getattr(orden, 'firma_cliente_url', None) or '')

        status_text = "RESUELTO" if orden.status == "resuelto" else "PENDIENTE"
        status_bg = "#dcfce7" if orden.status == "resuelto" else "#fef3c7"
        status_border = "#86efac" if orden.status == "resuelto" else "#fcd34d"
        status_fg = "#166534" if orden.status == "resuelto" else "#92400e"

        servicios_pills_html = "".join(
            f"<span class='service-pill'>{esc(s)}</span>" for s in servicios if s
        ) or "<span class='muted'>-</span>"

        fotos_grid_html = "".join(
            f"<div class='photo-box'><img src='{esc(_img_url_to_data_uri(url))}' /></div>" for url in fotos if url
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
      body {{ font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color: var(--text); background: var(--bg); margin: 0; }}
      .page {{ width: 210mm; min-height: 297mm; padding: 0; margin: 0 auto; }}
      .content {{ padding: 0; }}
      .topbar {{ display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 14px; }}
      .brandwrap {{ display: flex; align-items: flex-start; gap: 12px; min-width: 0; }}
      .logo {{ width: 96px; height: 96px; border-radius: 0; background: transparent; border: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; flex: 0 0 auto; }}
      .logo img {{ width: 100%; height: 100%; object-fit: contain; }}
      .brand {{ min-width: 0; }}
      .brand .name {{ font-size: 14px; font-weight: 900; color: var(--blue-900); letter-spacing: -0.2px; }}
      .brand .meta {{ margin-top: 6px; font-size: 9px; line-height: 1.25; color: var(--muted); max-width: 330px; }}
      .brand .meta b {{ color: var(--text); font-weight: 800; }}
      .status {{ text-align: right; max-width: 45%; margin-left: auto; }}
      .status .pill {{ display: inline-block; font-size: 10px; font-weight: 900; letter-spacing: .7px; padding: 6px 12px; border-radius: 999px; border: 1px solid var(--border); }}
      .status .dates {{ margin-top: 8px; font-size: 10px; color: var(--muted); line-height: 1.35; }}
      .status .folio {{ font-size: 15px; color: var(--muted); margin-bottom: 6px; font-weight: 800; }}
      .status .folio .num {{ color: #dc2626; font-weight: 900; }}
      .hero {{ border: 1px solid var(--border); border-left: 6px solid var(--blue-700); border-radius: 14px; padding: 14px 14px 12px 14px; background: #eff6ff; margin-bottom: 14px; }}
      .hero .title {{ font-size: 18px; font-weight: 950; color: var(--blue-900); letter-spacing: -0.3px; }}
      .hero .sub {{ margin-top: 5px; font-size: 10px; color: var(--muted); }}
      .grid2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }}
      .card {{ border: 1px solid var(--border); border-radius: 14px; padding: 12px; background: #fff; }}
      .card h3 {{ margin: 0 0 10px 0; font-size: 11px; font-weight: 950; color: var(--blue-900); letter-spacing: .3px; text-transform: uppercase; }}
      .row {{ display: flex; gap: 12px; }}
      .col {{ flex: 1; min-width: 0; }}
      .label {{ font-size: 9px; font-weight: 900; color: var(--muted); letter-spacing: .5px; text-transform: uppercase; }}
      .value {{ margin-top: 4px; font-size: 11px; color: var(--text); }}
      .pre {{ white-space: pre-wrap; overflow-wrap: anywhere; }}
      .muted {{ color: var(--muted); font-size: 11px; }}
      .services {{ margin-top: 6px; }}
      .service-pill {{ display: inline-block; font-size: 9px; font-weight: 800; color: #fff; padding: 4px 10px; border-radius: 999px; background: #2563eb; margin: 4px 6px 0 0; }}
      .section {{ margin-top: 12px; }}
      .section-title {{ margin: 0 0 10px 0; font-size: 11px; font-weight: 950; color: var(--blue-900); letter-spacing: .3px; text-transform: uppercase; }}
      .box {{ border: 1px solid var(--border); border-radius: 14px; padding: 12px; background: #fff; }}
      .photos {{ display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }}
      .photo-box {{ border: 1px solid var(--border); border-radius: 14px; overflow: hidden; background: var(--blue-50); height: 260px; display: flex; align-items: center; justify-content: center; }}
      .photo-box img {{ width: 100%; height: 100%; object-fit: cover; }}
      .pagebreak {{ page-break-before: always; }}
      .sigs {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }}
      .sigbox {{ border: 1px solid var(--border); border-radius: 14px; padding: 12px; background: #fff; }}
      .sigimgwrap {{ height: 105px; border-radius: 12px; border: 1px dashed var(--border); display: flex; align-items: center; justify-content: center; overflow: hidden; background: var(--blue-50); margin-top: 8px; }}
      .sigimgwrap img {{ width: 100%; height: 100%; object-fit: contain; }}
      .sigline {{ margin-top: 10px; border-top: 1px solid var(--border); padding-top: 8px; font-size: 10px; color: var(--muted); }}
      .sigline b {{ font-weight: 950; color: var(--text); }}
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
          <div class='folio'><b>FOLIO:</b> <span class='num'>{esc(orden.idx or '-')}</span></div>
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
        if isinstance(firma_cliente, str) and _is_data_url(firma_cliente):
            data['firma_cliente_url'] = _upload_data_url(firma_cliente, folder='ordenes/firmas')
        # Upload photos if base64 list
        fotos = data.get('fotos_urls')
        if isinstance(fotos, list):
            new_fotos = []
            for f in fotos[:5]:
                if isinstance(f, str) and _is_data_url(f):
                    new_fotos.append(_upload_data_url(f, folder='ordenes/fotos'))
                else:
                    new_fotos.append(f)
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
            # Delete old signature from Cloudinary if exists
            if old_firma_cliente and old_firma_cliente.startswith('http'):
                _delete_cloudinary_resource(old_firma_cliente)
            # Upload new optimized signature (50KB max)
            data['firma_cliente_url'] = _upload_data_url(firma_cliente, folder='ordenes/firmas', max_size_kb=50)
        elif firma_cliente == '' or firma_cliente is None:
            # Signature was cleared - delete from Cloudinary
            if old_firma_cliente and old_firma_cliente.startswith('http'):
                _delete_cloudinary_resource(old_firma_cliente)
        
        # Handle photo updates - delete removed photos
        fotos = data.get('fotos_urls')
        if isinstance(fotos, list):
            new_fotos = []
            # Find photos that were removed
            for old_foto in old_fotos:
                if old_foto not in fotos and old_foto.startswith('http'):
                    _delete_cloudinary_resource(old_foto)
            
            # Process new photos
            for f in fotos[:5]:
                if isinstance(f, str) and _is_data_url(f):
                    # Upload new optimized photo (50KB max)
                    new_fotos.append(_upload_data_url(f, folder='ordenes/fotos', max_size_kb=50))
                else:
                    new_fotos.append(f)
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
        if not isinstance(data_url, str) or ';base64,' not in data_url:
            return Response({"detail": "data_url inválido"}, status=400)
        try:
            res = cloudinary.uploader.upload(
                data_url,
                folder=folder,
                resource_type="image",
                overwrite=True,
            )
            url = res.get("secure_url") or res.get("url")
            if not url:
                return Response({"detail": "No se obtuvo URL de Cloudinary"}, status=502)
            return Response({"url": url}, status=200)
        except Exception as e:
            return Response({"detail": "Error subiendo imagen a Cloudinary", "error": str(e)}, status=502)

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
        try:
            res = cloudinary.uploader.destroy(public_id, resource_type="image")
            return Response(res, status=200)
        except Exception as e:
            return Response({"detail": "Error eliminando imagen en Cloudinary", "error": str(e)}, status=502)

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
        
        orden.fotos_urls = fotos_urls
        orden.save(update_fields=['fotos_urls'])
        
        serializer = self.get_serializer(orden)
        return Response(serializer.data, status=200)

    @action(detail=True, methods=['get'], url_path='pdf')
    def pdf(self, request, pk=None):
        orden = self.get_object()
        
        # Generate HTML using the shared method
        html = self._generate_pdf_html(orden)
        if not html:
            return Response({"detail": "No se pudo generar el HTML del PDF."}, status=500)
        
        api_key = os.environ.get('HTMLEDOCS_API_KEY')
        if not api_key:
            return HttpResponse(html, content_type="text/html; charset=utf-8")
        
        # Use the HTML generated by the shared method
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
        except URLError as e:
            return Response({"detail": "No se pudo conectar a htmldocs", "error": str(e)}, status=502)
        except Exception as e:
            return Response({"detail": "Error inesperado generando PDF", "error": str(e)}, status=500)

        filename = f"Ordenes_Servicio_{orden.id}.pdf"
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response
