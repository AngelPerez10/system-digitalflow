"""Enlaces públicos y temporales a PDFs (compartir por WhatsApp, abrir en el navegador).

El token firmado lleva solo el pk del documento; cada tipo de documento usa su
propio `salt`, así un token de orden no abre un proyecto y viceversa.
"""

from __future__ import annotations

from django.core import signing

PDF_ENLACE_MAX_AGE = 7 * 24 * 60 * 60

# Caracteres de `signing.dumps` sin compresión (base64 urlsafe + separador).
PDF_TOKEN_REGEX = r"[A-Za-z0-9_\-:]+"


def crear_token_pdf(salt: str, pk: int) -> str:
    return signing.dumps({"o": int(pk)}, salt=salt)


def leer_token_pdf(salt: str, token: str, max_age: int = PDF_ENLACE_MAX_AGE) -> int:
    """pk del token. Lanza `signing.SignatureExpired` / `signing.BadSignature`."""
    data = signing.loads(token, salt=salt, max_age=max_age)
    if not isinstance(data, dict) or not isinstance(data.get("o"), int):
        raise signing.BadSignature("token sin documento")
    return data["o"]


def como_descarga(response, filename: str, request):
    """Con `?descargar=1`, el navegador baja el PDF como archivo en vez de mostrarlo."""
    quiere = str(request.GET.get("descargar", "")).strip().lower() in ("1", "true", "si", "sí")
    if quiere and str(response.get("Content-Type", "")).startswith("application/pdf"):
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response
