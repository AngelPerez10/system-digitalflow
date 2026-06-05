"""One-off helper to extract PDF HTML generators from views into pdf_templates/."""
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]


def extract_cotizacion():
    views_path = REPO / "apps/cotizaciones/views.py"
    lines = views_path.read_text(encoding="utf-8").splitlines()
    start = next(i for i, line in enumerate(lines) if "def _generate_pdf_html(self, cotizacion" in line)
    end = next(
        i
        for i, line in enumerate(lines[start + 1 :], start + 1)
        if line.strip() == "return html"
    ) + 1
    body = lines[start + 1 : end]
    # Drop method docstring
    if body and '"""' in body[0]:
        idx = 0
        if body[0].count('"""') < 2:
            idx = 1
            while idx < len(body) and '"""' not in body[idx]:
                idx += 1
        body = body[idx + 1 :]

    header = '''"""HTML template for cotizacion PDF."""
import base64
import logging
from pathlib import Path

from apps.common.pdf_html import (
    esc,
    load_public_image_data_uri,
    normalize_text,
    render_terms_html,
    subtotal_iva_display_split,
)
from apps.common.pdf_images import safe_pdf_thumbnail_src

logger = logging.getLogger(__name__)

IVA_MX_DISPLAY = 1.16
ANTICIPO_PCT = 60


def generate_cotizacion_pdf_html(cotizacion) -> str:
    """Genera el HTML para el PDF de la cotización."""
'''
    fixed = []
    for line in body:
        line = line.replace("_subtotal_iva_display_split", "subtotal_iva_display_split")
        line = line.replace("_safe_pdf_thumbnail_src", "safe_pdf_thumbnail_src")
        line = line.replace("logo_path = repo_root", "logo_path = repo_root  # noqa: kept for compat")
        fixed.append(line)

    out_dir = REPO / "apps/cotizaciones/pdf_templates"
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "__init__.py").write_text(
        'from .cotizacion import generate_cotizacion_pdf_html\n\n__all__ = ["generate_cotizacion_pdf_html"]\n',
        encoding="utf-8",
    )
    (out_dir / "cotizacion.py").write_text(header + "\n".join(fixed) + "\n", encoding="utf-8")
    print(f"cotizacion: {len(fixed)} lines ({start}-{end})")


def extract_orden():
    views_path = REPO / "apps/ordenes/views.py"
    lines = views_path.read_text(encoding="utf-8").splitlines()
    start = next(i for i, line in enumerate(lines) if "def _generate_pdf_html(self, orden):" in line)
    end = next(i for i, line in enumerate(lines[start + 1 :], start + 1) if line.strip() == "return html" and "html" in lines[i - 2])
    # find the return html inside _generate_pdf_html - line 1656
    for i in range(start, len(lines)):
        if lines[i].strip() == "return html" and i > start + 50:
            end = i + 1
            break
    body = lines[start + 1 : end]
    if body and '"""' in body[0]:
        idx = 0
        if body[0].count('"""') < 2:
            idx = 1
            while idx < len(body) and '"""' not in body[idx]:
                idx += 1
        body = body[idx + 1 :]

    header = '''"""HTML template for orden de servicio PDF."""
import base64
import logging
from pathlib import Path

from apps.common.pdf_html import esc, load_public_image_data_uri
from apps.common.pdf_images import img_url_to_data_uri
from apps.ordenes.pdf_limits import orden_max_fotos

logger = logging.getLogger(__name__)


def generate_orden_pdf_html(orden) -> str:
    """Genera el HTML para el PDF de la orden."""
'''
    out_dir = REPO / "apps/ordenes/pdf_templates"
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "__init__.py").write_text(
        'from .orden import generate_orden_pdf_html\n\n__all__ = ["generate_orden_pdf_html"]\n',
        encoding="utf-8",
    )
    fixed = []
    for line in body:
        line = line.replace("_img_url_to_data_uri", "img_url_to_data_uri")
        line = line.replace("_orden_max_fotos", "orden_max_fotos")
        fixed.append(line)
    (out_dir / "orden.py").write_text(header + "\n".join(fixed) + "\n", encoding="utf-8")
    print(f"orden: {len(body)} lines ({start}-{end})")


if __name__ == "__main__":
    extract_cotizacion()
    extract_orden()
