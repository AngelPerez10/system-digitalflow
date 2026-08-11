"""Safe remote image fetching for PDF HTML embedding."""
from __future__ import annotations

import base64
import logging
from urllib.request import Request, urlopen

from apps.common.ssrf import is_embed_url_allowed

logger = logging.getLogger(__name__)

MAX_EMBED_REMOTE_BYTES = 2_500_000


def safe_http_image_bytes(url: str, max_bytes: int = MAX_EMBED_REMOTE_BYTES) -> bytes | None:
    if not isinstance(url, str):
        return None
    u = url.strip()
    if not u or not is_embed_url_allowed(u):
        return None

    req = Request(
        url=u,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; system-digitalflow/1.0)",
            "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
        method="GET",
    )
    try:
        with urlopen(req, timeout=20) as resp:
            data = resp.read(max_bytes + 1)
    except Exception:
        logger.exception("Failed to fetch remote image bytes for PDF")
        return None
    if not data or len(data) > max_bytes:
        return None
    return data


def safe_pdf_thumbnail_src(url: str) -> str:
    """Return a safe image src for PDF HTML (data URI or allowed data: URL)."""
    if not isinstance(url, str):
        return ""
    u = url.strip()
    if not u:
        return ""
    if u.startswith("data:"):
        return u if is_embed_url_allowed(u) else ""
    raw = safe_http_image_bytes(u)
    if not raw:
        return ""
    mime = "image/jpeg"
    if raw[:8] == b"\x89PNG\r\n\x1a\n":
        mime = "image/png"
    elif raw[:3] == b"GIF":
        mime = "image/gif"
    elif len(raw) >= 12 and raw[:4] == b"RIFF" and raw[8:12] == b"WEBP":
        mime = "image/webp"
    b64 = base64.b64encode(raw).decode("ascii")
    return f"data:{mime};base64,{b64}"


def cloudinary_pdf_thumb(url: str, *, width: int = 720) -> str:
    """Pide a Cloudinary un JPEG acotado para no bajar la foto original."""
    if not isinstance(url, str):
        return ""
    u = url.strip()
    marker = "/image/upload/"
    idx = u.find(marker)
    if idx < 0:
        return u
    rest = u[idx + len(marker) :]
    if rest.startswith("c_limit,w_"):
        return u
    return f"{u[: idx + len(marker)]}c_limit,w_{int(width)},q_auto:eco,f_jpg/{rest}"


def embed_remote_images(
    urls: list[str],
    *,
    timeout: int = 8,
    max_bytes: int = 400_000,
    width: int = 720,
) -> dict[str, str]:
    """Descarga en paralelo y devuelve mapa url original → data URI."""
    from concurrent.futures import ThreadPoolExecutor, as_completed

    unique: list[str] = []
    seen: set[str] = set()
    for raw in urls:
        if not isinstance(raw, str):
            continue
        u = raw.strip()
        if not u or u in seen:
            continue
        seen.add(u)
        unique.append(u)
    if not unique:
        return {}

    def _one(orig: str) -> tuple[str, str]:
        if orig.startswith("data:"):
            return orig, orig if is_embed_url_allowed(orig) else ""
        return orig, img_url_to_data_uri(
            cloudinary_pdf_thumb(orig, width=width),
            timeout=timeout,
            max_bytes=max_bytes,
        )

    out: dict[str, str] = {}
    workers = min(6, len(unique))
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futs = [pool.submit(_one, u) for u in unique]
        for fut in as_completed(futs):
            try:
                orig, uri = fut.result()
            except Exception:
                logger.exception("Failed embedding image for PDF")
                continue
            if uri:
                out[orig] = uri
    return out


def img_url_to_data_uri(url: str, *, timeout: int = 30, max_bytes: int = MAX_EMBED_REMOTE_BYTES) -> str:
    """Download an image URL and embed as data URI for reliable PDF rendering."""
    if not isinstance(url, str) or not url:
        return ""
    if not is_embed_url_allowed(url):
        return ""
    try:
        req = Request(
            url=url,
            headers={
                "User-Agent": "Mozilla/5.0",
                "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            },
            method="GET",
        )
        with urlopen(req, timeout=timeout) as resp:
            content_type = (resp.headers.get("Content-Type") or "").split(";")[0].strip().lower()
            raw = resp.read()

        if raw and len(raw) > max_bytes:
            return ""
        if not content_type.startswith("image/"):
            return ""
        b64 = base64.b64encode(raw).decode("ascii")
        return f"data:{content_type};base64,{b64}"
    except Exception:
        logger.exception("Failed to download and embed remote image for PDF")
        return ""
