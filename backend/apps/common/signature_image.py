"""Normalización de firmas digitales: tinta sobre fondo transparente, recortada al trazo."""
from __future__ import annotations

import io
import logging

from PIL import Image

logger = logging.getLogger(__name__)

# Casi blanco / gris de guía del pad móvil (#D3D3D8 ≈ 211) → transparente.
_WHITE_MIN = 198
_PAD = 18
_MAX_EDGE = 1400


def normalize_signature_image(img: Image.Image) -> Image.Image:
    """Quita fondo claro y borde/guía, y recorta al bounding box de la tinta.

    Las firmas del pad móvil salían como PNG/JPEG opaco a pantalla completa
    (retrato + borde redondeado + línea guía). En el ERP y el PDF se veían
    como un «celular» blanco con la firma chiquita adentro.
    """
    rgba = img.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    if width <= 0 or height <= 0:
        return Image.new("RGBA", (1, 1), (0, 0, 0, 0))

    min_x, min_y = width, height
    max_x, max_y = -1, -1

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a < 10:
                pixels[x, y] = (0, 0, 0, 0)
                continue
            # Fondo blanco / gris de lienzo o guía → alpha 0
            if (
                r >= _WHITE_MIN
                and g >= _WHITE_MIN
                and b >= _WHITE_MIN
                and abs(r - g) <= 18
                and abs(g - b) <= 18
            ):
                pixels[x, y] = (0, 0, 0, 0)
                continue
            if x < min_x:
                min_x = x
            if y < min_y:
                min_y = y
            if x > max_x:
                max_x = x
            if y > max_y:
                max_y = y

    if max_x < 0:
        return Image.new("RGBA", (1, 1), (0, 0, 0, 0))

    left = max(0, min_x - _PAD)
    top = max(0, min_y - _PAD)
    right = min(width, max_x + _PAD + 1)
    bottom = min(height, max_y + _PAD + 1)
    cropped = rgba.crop((left, top, right, bottom))

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
