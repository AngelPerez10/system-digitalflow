"""Normalización de firmas digitales: tinta sobre fondo transparente, recortada al trazo."""
from __future__ import annotations

import io
import logging

from PIL import Image

logger = logging.getLogger(__name__)

# Blanco casi puro — umbral alto para no comer anti-alias de la tinta.
_WHITE_MIN = 242
# Guía / lienzo gris claro del pad móvil (#D3D3D8 ≈ 211): luminancia alta + poca croma.
_GUIDE_LUMA_MIN = 185
_GUIDE_CHROMA_MAX = 24
_PAD = 24
_MAX_EDGE = 1400
_MIN_INK_PIXELS = 40


def _is_signature_background(r: int, g: int, b: int, a: int) -> bool:
    if a < 12:
        return True
    if r >= _WHITE_MIN and g >= _WHITE_MIN and b >= _WHITE_MIN:
        return True
    lo = min(r, g, b)
    hi = max(r, g, b)
    return lo >= _GUIDE_LUMA_MIN and (hi - lo) <= _GUIDE_CHROMA_MAX


def normalize_signature_image(img: Image.Image) -> Image.Image:
    """Quita fondo claro y borde/guía, y recorta al bounding box de la tinta.

    Las firmas del pad móvil salían como PNG/JPEG opaco a pantalla completa
    (retrato + borde redondeado + línea guía). En el ERP y el PDF se veían
    como un «celular» blanco con la firma chiquita adentro.

    Si no hay tinta detectable, devuelve el original en RGBA (nunca un PNG vacío).
    """
    original = img.convert("RGBA")
    rgba = original.copy()
    pixels = rgba.load()
    width, height = rgba.size
    if width <= 0 or height <= 0:
        return Image.new("RGBA", (1, 1), (0, 0, 0, 0))

    min_x, min_y = width, height
    max_x, max_y = -1, -1
    ink_pixels = 0

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if _is_signature_background(r, g, b, a):
                pixels[x, y] = (0, 0, 0, 0)
                continue
            ink_pixels += 1
            if x < min_x:
                min_x = x
            if y < min_y:
                min_y = y
            if x > max_x:
                max_x = x
            if y > max_y:
                max_y = y

    if max_x < 0 or ink_pixels < _MIN_INK_PIXELS:
        return original

    left = max(0, min_x - _PAD)
    top = max(0, min_y - _PAD)
    right = min(width, max_x + _PAD + 1)
    bottom = min(height, max_y + _PAD + 1)
    cropped = rgba.crop((left, top, right, bottom))

    # Si el recorte casi no cambia el tamaño, no hace falta (firma ya limpia).
    if cropped.width >= width * 0.85 and cropped.height >= height * 0.85:
        return rgba

    cw, ch = cropped.size
    longest = max(cw, ch)
    if longest > _MAX_EDGE:
        scale = _MAX_EDGE / float(longest)
        cropped = cropped.resize(
            (max(1, int(cw * scale)), max(1, int(ch * scale))),
            Image.Resampling.LANCZOS,
        )
    return cropped


def signature_image_to_png_data_uri(img: Image.Image) -> str:
    import base64

    out = io.BytesIO()
    img.save(out, format="PNG", optimize=True, compress_level=9)
    b64 = base64.b64encode(out.getvalue()).decode("ascii")
    return f"data:image/png;base64,{b64}"


def normalize_signature_bytes(raw: bytes) -> bytes | None:
    """Devuelve PNG bytes normalizados, o None si la imagen no se puede abrir."""
    try:
        img = Image.open(io.BytesIO(raw))
        img.load()
        normalized = normalize_signature_image(img)
        out = io.BytesIO()
        normalized.save(out, format="PNG", optimize=True, compress_level=9)
        return out.getvalue()
    except Exception:
        logger.exception("Failed to normalize signature image bytes")
        return None
