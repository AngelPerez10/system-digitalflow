"""Regla de cierre de proyectos (espejo de proyectoCloseValidation.ts)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

CLOSE_BLOCKED_MESSAGE = (
    "No se puede cerrar el proyecto: hay presupuesto o requerimientos "
    "adicionales sin cotización vinculada."
)


@dataclass(frozen=True)
class CloseValidationResult:
    ok: bool
    message: str = ""


def proyecto_requiere_cotizacion_adicional(
    *,
    requiere_presupuesto_adicional: bool,
    requerimientos_adicionales: str | None,
) -> bool:
    return bool(requiere_presupuesto_adicional) or bool(
        str(requerimientos_adicionales or "").strip()
    )


def proyecto_tiene_cotizacion_adicional_vinculada(
    cotizacion_adicional: Any,
) -> bool:
    if not isinstance(cotizacion_adicional, dict):
        return False
    return bool(cotizacion_adicional.get("id"))


def validate_proyecto_cierre(
    *,
    status: str | None,
    requiere_presupuesto_adicional: bool = False,
    requerimientos_adicionales: str | None = "",
    cotizacion_adicional: Any = None,
) -> CloseValidationResult:
    if (status or "").strip() != "cerrado":
        return CloseValidationResult(ok=True)
    if not proyecto_requiere_cotizacion_adicional(
        requiere_presupuesto_adicional=requiere_presupuesto_adicional,
        requerimientos_adicionales=requerimientos_adicionales,
    ):
        return CloseValidationResult(ok=True)
    if proyecto_tiene_cotizacion_adicional_vinculada(cotizacion_adicional):
        return CloseValidationResult(ok=True)
    return CloseValidationResult(ok=False, message=CLOSE_BLOCKED_MESSAGE)
