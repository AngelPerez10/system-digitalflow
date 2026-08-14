from __future__ import annotations

import logging

from apps.common.models import DEFAULT_NOMBRE, MarcaSistema
from apps.common.pdf_html import load_public_image_data_uri
from apps.common.pdf_images import img_url_to_data_uri

logger = logging.getLogger(__name__)

FALLBACK_LOGO_PUBLIC_PATH = "images/logo/intrax-logo.png"


def public_logo_url(url: str) -> str:
    """Solo HTTPS/HTTP; nunca data: (el GET público no debe inflar el payload)."""
    value = (url or "").strip()
    if not value or value.startswith("data:"):
        return ""
    if not value.startswith(("http://", "https://")):
        return ""
    return value


def get_marca_nombre() -> str:
    try:
        nombre = (MarcaSistema.get_solo().nombre or "").strip()
    except Exception:
        logger.exception("No se pudo leer MarcaSistema.nombre")
        return DEFAULT_NOMBRE
    return nombre or DEFAULT_NOMBRE


def logo_data_uri_for_pdf() -> str:
    """Logo subido (URL remota embebida) o el PNG local de Intrax."""
    try:
        url = (MarcaSistema.get_solo().logo_url or "").strip()
    except Exception:
        logger.exception("No se pudo leer MarcaSistema.logo_url")
        url = ""
    if url:
        if url.startswith("data:"):
            return url
        uri = img_url_to_data_uri(url)
        if uri:
            return uri
    return load_public_image_data_uri(FALLBACK_LOGO_PUBLIC_PATH)
