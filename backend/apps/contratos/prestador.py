"""Datos por defecto de EL PRESTADOR (los del contrato modelo de INTERPRO).

Cada contrato guarda su propia copia en ``Contrato.prestador_datos``: cambiar
estos valores no altera contratos ya creados (ni el hash de los ya enviados).
"""

from __future__ import annotations

PRESTADOR_DEFAULTS: dict[str, str] = {
    "razon_social": "INTERPRO DE MANZANILLO S. DE R.L. DE C.V.",
    "rfc": "IMA200110CI4",
    "representante": "EDGAR IVÁN CRUZ SANDOVAL",
    "representante_cargo": "Representante legal",
    "correo": "soporte@sertel.mx",
    "cuenta_bancaria": "65508072048",
    "clabe": "014095655080720484",
    "telefono_soporte": "3141420811",
    "telefono_emergencias": "3141215830",
    "jurisdiccion": "Manzanillo, Colima",
}

PRESTADOR_KEYS = tuple(PRESTADOR_DEFAULTS.keys())
PRESTADOR_MAX_LEN = 255


def normalizar_prestador(raw) -> dict[str, str]:
    """Solo las claves conocidas, como texto recortado; las faltantes toman el default."""
    data = raw if isinstance(raw, dict) else {}
    out: dict[str, str] = {}
    for key in PRESTADOR_KEYS:
        value = data.get(key, PRESTADOR_DEFAULTS[key])
        out[key] = str(value if value is not None else "").strip()[:PRESTADOR_MAX_LEN]
    return out
