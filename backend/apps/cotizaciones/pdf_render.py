"""HTML → PDF: htmldocs (opcional) + motor local Playwright.

1) Si existe ``HTMLDOCS_API_KEY`` (o el nombre legacy ``HTMLEDOCS_API_KEY``),
   se intenta primero la API de htmldocs.com.
2) Si no hay clave, htmldocs falla o devuelve error, se genera el PDF en el
   propio servidor con Chromium vía Playwright (``page.set_content`` +
   ``page.pdf``), según la API documentada en Playwright for Python.

Desactivar solo el motor local: ``DISABLE_LOCAL_PDF=1``.
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

logger = logging.getLogger(__name__)

HTMLDOCS_URL = "https://htmldocs.com/api/generate"


class PdfRenderError(Exception):
    """No se pudo obtener bytes de PDF."""

    def __init__(self, message: str, *, detail: str | None = None) -> None:
        super().__init__(message)
        self.detail = detail


def _htmldocs_api_key() -> str | None:
    return os.environ.get("HTMLDOCS_API_KEY") or os.environ.get("HTMLEDOCS_API_KEY")


def htmldocs_configured() -> bool:
    return bool(_htmldocs_api_key())


def _local_pdf_disabled() -> bool:
    return os.environ.get("DISABLE_LOCAL_PDF", "").strip().lower() in ("1", "true", "yes", "on")


def local_pdf_engine_available() -> bool:
    if _local_pdf_disabled():
        return False
    try:
        import playwright  # noqa: F401

        return True
    except ImportError:
        return False


def any_provider_configured() -> bool:
    """htmldocs y/o Playwright (paquete instalado)."""
    return htmldocs_configured() or local_pdf_engine_available()


def _htmldocs_request_timeout_s(total_budget_s: int) -> int:
    """Evita bloquear 45s en htmldocs si vamos a usar Playwright después (p. ej. Gunicorn 30s)."""
    env = os.environ.get("HTMLDOCS_TIMEOUT", "").strip()
    if env.isdigit():
        return max(5, min(int(env), 60))
    # Por defecto: corto si hay motor local; si no, usar todo el presupuesto.
    if local_pdf_engine_available() and not _local_pdf_disabled():
        return max(5, min(12, total_budget_s // 3))
    return max(10, min(total_budget_s, 120))


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


def _playwright_budget_s(total_budget_s: int, htmldocs_cap_s: int) -> int:
    """Tiempo para Chromium; si hubo intento a htmldocs, restar ese techo + margen."""
    if htmldocs_cap_s <= 0:
        return max(20, min(90, total_budget_s))
    return max(15, min(90, total_budget_s - htmldocs_cap_s - 5))


def _playwright_browsers_path_if_bundled() -> str | None:
    """Ruta donde build.sh instaló los navegadores (``backend/.playwright-browsers``)."""
    backend_root = Path(__file__).resolve().parents[2]
    bundled = backend_root / ".playwright-browsers"
    if bundled.is_dir():
        return str(bundled)
    return None


def _try_playwright(html: str, size: str, landscape: bool, timeout: int) -> bytes:
    """Genera PDF con print media (comportamiento por defecto de ``page.pdf``)."""
    from playwright.sync_api import sync_playwright

    # Misma caché que en build.sh (Render u otros hosts donde ~/.cache no coincide).
    if not os.environ.get("PLAYWRIGHT_BROWSERS_PATH"):
        bundled = _playwright_browsers_path_if_bundled()
        if bundled:
            os.environ["PLAYWRIGHT_BROWSERS_PATH"] = bundled

    fmt = (size or "A4").upper()
    allowed = (
        "A0",
        "A1",
        "A2",
        "A3",
        "A4",
        "A5",
        "A6",
        "LETTER",
        "LEGAL",
        "TABLOID",
        "LEDGER",
    )
    if fmt not in allowed:
        fmt = "A4"

    timeout_ms = max(5_000, min(int(timeout * 1000), 120_000))

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-setuid-sandbox",
                "--disable-gpu",
            ],
        )
        try:
            page = browser.new_page()
            page.set_content(html, wait_until="load", timeout=timeout_ms)
            # ``page.pdf`` usa media print; colores de fondo con print_background.
            return page.pdf(
                format=fmt,
                landscape=landscape,
                print_background=True,
                prefer_css_page_size=True,
                margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
            )
        finally:
            browser.close()


def render_html_to_pdf(
    html: str,
    *,
    size: str = "A4",
    landscape: bool = False,
    timeout: int = 30,
) -> bytes:
    if not html:
        raise PdfRenderError("HTML vacío", detail="empty html")

    last_detail: str | None = None
    hdoc_cap = 0

    if htmldocs_configured():
        hdoc_t = _htmldocs_request_timeout_s(timeout)
        hdoc_cap = hdoc_t
        try:
            data = _try_htmldocs(html, size, landscape, hdoc_t)
            if data:
                return data
        except HTTPError as e:
            body = ""
            try:
                body = (e.read() or b"").decode("utf-8", errors="ignore") if e.fp else ""
            except Exception:
                logger.debug('Could not read htmldocs error response body')
                body = ""
            logger.warning("htmldocs HTTPError %s: %s", e.code, body[:300])
            last_detail = f"htmldocs HTTP {e.code}"
        except URLError as e:
            logger.warning("htmldocs URLError: %s", e)
            last_detail = f"htmldocs URLError: {e.reason if getattr(e, 'reason', None) else e}"
        except Exception as e:
            logger.exception("htmldocs error")
            last_detail = f"htmldocs: {type(e).__name__}"

    if local_pdf_engine_available():
        try:
            pw_t = _playwright_budget_s(timeout, hdoc_cap)
            out = _try_playwright(html, size, landscape, pw_t)
            if out:
                logger.info("PDF generado localmente (Playwright)")
                return out
        except Exception as e:
            logger.exception("Playwright PDF failed")
            raise PdfRenderError(
                "No se pudo generar el PDF en el servidor",
                detail=f"{type(e).__name__}: {str(e)[:400]}",
            ) from e

    if not htmldocs_configured() and not local_pdf_engine_available():
        raise PdfRenderError(
            "No hay motor de PDF disponible",
            detail="Instale playwright y ejecute: playwright install chromium. "
            "Opcional: HTMLDOCS_API_KEY.",
        )

    raise PdfRenderError(
        "No se pudo generar el PDF",
        detail=last_detail or "htmldocs no disponible y motor local desactivado o falló",
    )
