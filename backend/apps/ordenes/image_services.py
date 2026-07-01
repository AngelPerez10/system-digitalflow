import base64
import io
import logging
import os
from urllib.parse import urlparse

from PIL import Image
from rest_framework.exceptions import ValidationError

from apps.common.ssrf import is_cloudinary_host

logger = logging.getLogger(__name__)

# Image safety limits (protect against decompression bombs / huge base64 payloads)
MAX_IMAGE_PIXELS = int(os.environ.get("MAX_IMAGE_PIXELS", "10000000"))
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
    "productos/conceptos/",
)

try:
    import cloudinary
    import cloudinary.uploader

    CLOUDINARY_URL = os.environ.get("CLOUDINARY_URL")
    if CLOUDINARY_URL:
        cloudinary.config(cloudinary_url=CLOUDINARY_URL)
    else:
        cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME")
        api_key = os.environ.get("CLOUDINARY_API_KEY")
        api_secret = os.environ.get("CLOUDINARY_API_SECRET")
        if cloud_name and api_key and api_secret:
            cloudinary.config(cloud_name=cloud_name, api_key=api_key, api_secret=api_secret)
except Exception:
    logger.exception("Failed to configure Cloudinary, uploads will use data URLs")
    cloudinary = None  # type: ignore


def is_cloudinary_configured() -> bool:
    return bool(cloudinary)


def is_data_url(value: str) -> bool:
    return isinstance(value, str) and value.startswith("data:") and ";base64," in value


def _parse_data_url_image(data_url: str) -> tuple[str, str]:
    if not isinstance(data_url, str):
        raise ValueError("data_url invalido")
    if not data_url.startswith("data:") or ";base64," not in data_url:
        raise ValueError("data_url invalido")

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
        logger.exception("Failed to decode base64 image payload")
        raise ValueError("data_url base64 invalido")

    if len(raw) > max_input_bytes:
        raise ValueError("Imagen demasiado grande")
    return mime, raw


def _open_and_verify_image(raw: bytes) -> Image.Image:
    try:
        Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS
        img = Image.open(io.BytesIO(raw))
        img.verify()
        img2 = Image.open(io.BytesIO(raw))
        img2.load()
        return img2
    except Exception:
        raise ValueError("Imagen invalida o peligrosa")


def optimize_image(data_url: str, max_size_kb: int = 80) -> str:
    try:
        max_input_bytes = max_size_kb * 1024 * MAX_BASE64_INPUT_MULTIPLIER
        _, img_data = _decode_base64_image_bytes(data_url, max_input_bytes)
        img = _open_and_verify_image(img_data)

        has_transparency = img.mode in ("RGBA", "LA", "P")
        if img.mode == "P":
            img = img.convert("RGBA")
            has_transparency = True

        max_size_bytes = max_size_kb * 1024

        if has_transparency:
            for level in range(6, 10):
                output = io.BytesIO()
                img.save(output, format="PNG", optimize=True, compress_level=level)
                size = output.tell()
                if size <= max_size_bytes:
                    break

            if size > max_size_bytes:
                scale = (max_size_bytes / size) ** 0.5
                new_width = int(img.width * scale)
                new_height = int(img.height * scale)
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

                output = io.BytesIO()
                img.save(output, format="PNG", optimize=True, compress_level=9)

            output.seek(0)
            optimized_b64 = base64.b64encode(output.read()).decode("utf-8")
            return f"data:image/png;base64,{optimized_b64}"

        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")

        quality = 85
        while quality > 20:
            output = io.BytesIO()
            img.save(output, format="JPEG", quality=quality, optimize=True)
            size = output.tell()
            if size <= max_size_bytes:
                break
            quality -= 5

        if size > max_size_bytes:
            scale = (max_size_bytes / size) ** 0.5
            new_width = int(img.width * scale)
            new_height = int(img.height * scale)
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

            output = io.BytesIO()
            img.save(output, format="JPEG", quality=quality, optimize=True)

        output.seek(0)
        optimized_b64 = base64.b64encode(output.read()).decode("utf-8")
        return f"data:image/jpeg;base64,{optimized_b64}"
    except ValueError:
        raise
    except Exception:
        logger.exception("Image optimization failed, returning original data URL")
        return data_url


def extract_public_id_from_url(url: str) -> str:
    try:
        if not url or not isinstance(url, str):
            return ""

        parsed = urlparse(url)
        if not parsed.hostname or not is_cloudinary_host(parsed.hostname):
            return ""

        parts = url.split("/upload/")
        if len(parts) < 2:
            return ""

        path = parts[1]
        if path.startswith("v") and "/" in path:
            path = path.split("/", 1)[1]

        if "." in path:
            path = path.rsplit(".", 1)[0]

        public_id = path.lstrip("/")
        if public_id and not public_id.startswith(ALLOWED_CLOUDINARY_PUBLIC_ID_PREFIXES):
            return ""
        return public_id
    except Exception:
        logger.exception("Failed to extract Cloudinary public_id from URL: %s", url)
        return ""


def delete_cloudinary_resource(url: str, resource_type: str = "image"):
    if not cloudinary or not url:
        return

    public_id = ""
    try:
        public_id = extract_public_id_from_url(url)
        if public_id:
            cloudinary.uploader.destroy(public_id, resource_type=resource_type)
    except Exception:
        logger.exception("Failed to delete Cloudinary resource: %s", public_id)


def delete_cloudinary_public_id(public_id: str, resource_type: str = "image"):
    if not cloudinary:
        return None
    return cloudinary.uploader.destroy(public_id, resource_type=resource_type)


def upload_data_url(data_url: str, folder: str, max_size_kb: int = 80) -> str:
    try:
        optimized_url = optimize_image(data_url, max_size_kb)
    except ValueError:
        raise ValidationError("Imagen invalida o demasiado grande")

    if not cloudinary:
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
        logger.exception("Cloudinary upload failed, returning optimized data URL")
        return optimized_url
