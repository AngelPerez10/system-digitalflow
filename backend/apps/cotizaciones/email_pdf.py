"""Asunto/cuerpo del correo al enviar PDF de cotización."""

from __future__ import annotations


def build_cotizacion_email_subject(cotizacion) -> str:
    idx = getattr(cotizacion, "idx", None) or getattr(cotizacion, "id", "") or ""
    cliente = (getattr(cotizacion, "cliente", None) or "").strip() or "cliente"
    return f"Cotización #{idx} — {cliente}"


def build_cotizacion_email_body(cotizacion) -> str:
    idx = getattr(cotizacion, "idx", None) or getattr(cotizacion, "id", "") or ""
    cliente = (getattr(cotizacion, "cliente", None) or "").strip() or "cliente"
    return (
        f"Estimado(a),\n\n"
        f"Adjuntamos el PDF de la cotización #{idx} "
        f"correspondiente a {cliente}.\n\n"
        f"Quedamos atentos a sus comentarios.\n\n"
        f"Saludos cordiales,\n"
        f"Grupo Intrax\n"
    )
