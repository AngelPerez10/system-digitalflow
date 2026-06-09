"""Normaliza categorías de productos en cotizaciones."""


def normalize_categorias_productos(value) -> list[dict]:
    if not isinstance(value, list):
        return []
    out: list[dict] = []
    seen: set[str] = set()
    for i, raw in enumerate(value):
        if not isinstance(raw, dict):
            continue
        cat_id = str(raw.get("id") or "").strip()
        nombre = str(raw.get("nombre") or "").strip()
        if not cat_id or not nombre or cat_id in seen:
            continue
        try:
            orden = int(raw.get("orden", i))
        except (TypeError, ValueError):
            orden = i
        seen.add(cat_id)
        out.append({"id": cat_id, "nombre": nombre, "orden": orden})
    out.sort(key=lambda c: (c["orden"], c["nombre"].lower()))
    for i, cat in enumerate(out):
        cat["orden"] = i
    return out


def categorias_nombres_por_id(categorias: list[dict]) -> dict[str, str]:
    return {
        str(c.get("id") or "").strip(): str(c.get("nombre") or "").strip()
        for c in categorias
        if str(c.get("id") or "").strip()
    }
