"""HTML to PDF rendering with primary + fallback cloud providers.

Why this exists: the legacy code called htmldocs.com directly, with no
fallback. When htmldocs is restricted (e.g. their backend storage quota
is exceeded) every PDF endpoint returned 502. This module:

1) Tries htmldocs first when HTMLDOCS_API_KEY is set.
2) Falls back to PDFShift (free tier with 50 conversions/month) when
   PDFSHIFT_API_KEY is set and htmldocs returns 5xx / network error.
3) Raises PdfRenderError if no provider could produce a PDF.

A 4xx from htmldocs is treated as a payload-side error and short-circuits
the fallback to avoid burning credits on a request that will fail again.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Callable, Iterable
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

logger = logging.getLogger(__name__)

HTMLDOCS_URL = "https://htmldocs.com/api/generate"
PDFSHIFT_URL = "https://api.pdfshift.io/v3/convert/pdf"


class PdfRenderError(Exception):
    """Raised when no provider could generate the PDF.

    `detail` is short, safe-to-display extra context (provider + status code,
    or the first ~500 chars of an upstream error body). Never a stack trace.
    """

    def __init__(self, message: str, *, detail: str | None = None) -> None:
        super().__init__(message)
        self.detail = detail


def _htmldocs_api_key() -> str | None:
    # Accept the legacy typo'd var name during the rename window.
    return os.environ.get("HTMLDOCS_API_KEY") or os.environ.get("HTMLEDOCS_API_KEY")


def htmldocs_configured() -> bool:
    return bool(_htmldocs_api_key())


def pdfshift_configured() -> bool:
    return bool(os.environ.get("PDFSHIFT_API_KEY"))


def any_provider_configured() -> bool:
    return htmldocs_configured() or pdfshift_configured()


def _try_htmldocs(html: str, size: str, landscape: bool, timeout: int) -> bytes | None:
    api_key = _htmldocs_api_key()
    if not api_key:
        return None
    payload = {
        "html": html,
        "format": "pdf",
        "size": size,
        "orientation": "landscape" if landscape else "portrait",
    }
    req = Request(
        url=HTMLDOCS_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urlopen(req, timeout=timeout) as resp:
        return resp.read()


def _try_pdfshift(html: str, size: str, landscape: bool, timeout: int) -> bytes | None:
    api_key = os.environ.get("PDFSHIFT_API_KEY")
    if not api_key:
        return None
    payload = {
        "source": html,
        "format": size,
        "landscape": landscape,
    }
    req = Request(
        url=PDFSHIFT_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "X-API-Key": api_key,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urlopen(req, timeout=timeout) as resp:
        return resp.read()


Provider = tuple[str, Callable[[str, str, bool, int], "bytes | None"]]


def _providers() -> Iterable[Provider]:
    return (("htmldocs", _try_htmldocs), ("pdfshift", _try_pdfshift))


def render_html_to_pdf(
    html: str,
    *,
    size: str = "A4",
    landscape: bool = False,
    timeout: int = 30,
) -> bytes:
    """Convert HTML to PDF using configured providers in order.

    Raises PdfRenderError if every configured provider fails or none is
    configured. The caller decides how to surface the error (HTML fallback,
    HTTP 502, etc.).
    """
    if not html:
        raise PdfRenderError("HTML vacío", detail="empty html")

    last_detail: str | None = None
    tried_any = False

    for name, fn in _providers():
        try:
            data = fn(html, size, landscape, timeout)
        except HTTPError as e:
            tried_any = True
            body = ""
            try:
                body = (e.read() or b"").decode("utf-8", errors="ignore") if e.fp else ""
            except Exception:
                body = ""
            logger.warning("PDF provider %s HTTPError %s: %s", name, e.code, body[:300])
            last_detail = f"{name} {e.code}"
            # 4xx on htmldocs = our payload is bad; don't waste fallback credits.
            if name == "htmldocs" and 400 <= e.code < 500:
                raise PdfRenderError(
                    "Error en HTML enviado a htmldocs",
                    detail=(body[:500] or last_detail),
                )
            continue
        except URLError as e:
            tried_any = True
            logger.warning("PDF provider %s URLError: %s", name, e)
            last_detail = f"{name} {e.reason if hasattr(e, 'reason') else e}"
            continue
        except Exception as e:
            tried_any = True
            logger.exception("PDF provider %s unexpected error", name)
            last_detail = f"{name} {type(e).__name__}"
            continue

        if data:
            if name != "htmldocs":
                logger.info("PDF generado vía proveedor de respaldo: %s", name)
            return data

    if not tried_any:
        raise PdfRenderError(
            "No hay proveedor de PDF configurado",
            detail="set HTMLDOCS_API_KEY and/or PDFSHIFT_API_KEY",
        )
    raise PdfRenderError(
        "No se pudo generar el PDF en ningún proveedor",
        detail=last_detail,
    )
