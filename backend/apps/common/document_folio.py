"""Folios de negocio Intrax: SERIE-número (COT / ODT / PRJ / POL)."""

from __future__ import annotations

import re

FOLIO_SERIE_COT = "COT"
FOLIO_SERIE_ODT = "ODT"
FOLIO_SERIE_PRJ = "PRJ"
FOLIO_SERIE_INS = "INS"
FOLIO_SERIE_POL = "POL"

_PREFIXED_FOLIO_RE = re.compile(r"^([A-Za-z]{3})-(\d+)$")


def format_document_folio(serie: str, idx, empty: str = "—") -> str:
    """Devuelve '{SERIE}-{n}' a partir del idx numérico."""
    if idx is None or idx == "":
        return empty
    try:
        if isinstance(idx, str):
            digits = re.sub(r"\D", "", idx)
            num = int(digits) if digits else 0
        else:
            num = int(idx)
    except (TypeError, ValueError):
        raw = str(idx).strip()
        return raw or empty
    if num <= 0:
        raw = str(idx).strip()
        return raw or empty
    s = (serie or "DOC").strip().upper() or "DOC"
    return f"{s}-{num}"


def resolve_document_folio(serie: str, folio, idx, empty: str = "—") -> str:
    """
    Si folio ya es SERIE-n, se respeta.
    Si folio es solo dígitos o está vacío, formatea con serie + idx/folio.
    Folios libres no numéricos (legado) se muestran tal cual.
    """
    existing = (str(folio).strip() if folio is not None else "")
    if existing:
        m = _PREFIXED_FOLIO_RE.match(existing)
        if m:
            return f"{m.group(1).upper()}-{m.group(2)}"
        if not existing.isdigit():
            return existing
        return format_document_folio(serie, existing, empty)
    return format_document_folio(serie, idx, empty)
