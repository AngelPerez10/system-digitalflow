"""Photo limits for orden PDFs and uploads."""
from __future__ import annotations

DEFAULT_MAX_FOTOS = 5
ALLOWED_FOTOS_EXTRA = frozenset({0, 2, 3, 4, 5})


def normalize_fotos_extra_max(raw) -> int:
    try:
        value = int(raw)
    except (TypeError, ValueError):
        return 0
    return value if value in ALLOWED_FOTOS_EXTRA else 0


def orden_max_fotos(*, fotos_extra_max: int) -> int:
    return DEFAULT_MAX_FOTOS + normalize_fotos_extra_max(fotos_extra_max)
