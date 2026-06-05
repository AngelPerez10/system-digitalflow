"""Shared HTML helpers for PDF document generation."""
from __future__ import annotations

import base64
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

IVA_MX_DISPLAY = 1.16


def esc(value) -> str:
    return (
        str(value if value is not None else "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;")
    )


def normalize_text(value) -> str:
    s = str(value or "")
    if not s:
        return s
    s = s.replace("M®xico", "México")
    s = s.replace("MÃ©xico", "México")
    return s


def render_terms_html(raw_terms: str) -> str:
    text = str(raw_terms or "").strip()
    if not text:
        return ""

    lines = [ln.strip() for ln in text.splitlines()]
    lines = [ln for ln in lines if ln]
    if not lines:
        return ""

    title = lines[0]
    rest = lines[1:]

    items = []
    for ln in rest:
        if ln.startswith("- "):
            items.append(ln[2:].strip())
        else:
            items.append(ln)

    items_html = "".join([f"<li>{esc(x)}</li>" for x in items if str(x).strip()])
    if items_html:
        body_html = f"<ul>{items_html}</ul>"
    else:
        body_html = f"<div class='terms-text'>{esc(text)}</div>"

    return f"<div class='terms-title'>{esc(title)}</div>{body_html}"


def load_public_image_data_uri(relative_public_path: str) -> str:
    """Load a file from frontend/public as a data URI for PDF embedding."""
    try:
        repo_root = Path(__file__).resolve().parents[3]
        image_path = repo_root / "frontend" / "public" / relative_public_path
        if not image_path.exists():
            return ""
        raw = image_path.read_bytes()
        b64 = base64.b64encode(raw).decode("ascii")
        suffix = image_path.suffix.lower()
        mime = "image/png"
        if suffix in (".jpg", ".jpeg"):
            mime = "image/jpeg"
        elif suffix == ".gif":
            mime = "image/gif"
        elif suffix == ".webp":
            mime = "image/webp"
        return f"data:{mime};base64,{b64}"
    except Exception:
        logger.exception("Failed to load public image for PDF: %s", relative_public_path)
        return ""


def subtotal_iva_display_split(total_con_iva: float, *, iva_rate: float = IVA_MX_DISPLAY) -> tuple[float, float]:
    """Presentation split: total includes IVA; show base + IVA portion."""
    total = max(0.0, float(total_con_iva or 0))
    base = round(total / iva_rate, 2)
    iva = round(total - base, 2)
    return base, iva
