"""Asunto/cuerpo del correo al enviar PDF de proyecto."""

from __future__ import annotations

from apps.common.marca import get_marca_nombre


def build_proyecto_email_subject(proyecto) -> str:
    folio = (getattr(proyecto, "folio", None) or "").strip()
    if not folio:
        folio = str(getattr(proyecto, "idx", None) or getattr(proyecto, "id", "") or "")
    cliente = (getattr(proyecto, "cliente_nombre", None) or "").strip() or "cliente"
    return f"Proyecto #{folio} — {cliente}"


def build_proyecto_email_body(proyecto) -> str:
    folio = (getattr(proyecto, "folio", None) or "").strip()
    if not folio:
        folio = str(getattr(proyecto, "idx", None) or getattr(proyecto, "id", "") or "")
    cliente = (getattr(proyecto, "cliente_nombre", None) or "").strip() or "cliente"
    return (
        f"Estimado(a),\n\n"
        f"Adjuntamos el PDF del proyecto #{folio} "
        f"correspondiente a {cliente}.\n\n"
        f"Saludos cordiales,\n"
        f"{get_marca_nombre()}\n"
    )
