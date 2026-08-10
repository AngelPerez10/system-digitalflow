"""Secciones fijas de inventario + mapeo desde categoría SYSCOM/TVC."""
from __future__ import annotations

import re
import unicodedata

# slug → etiqueta (orden de UI)
SECCIONES: tuple[tuple[str, str], ...] = (
    ('audio_video_profesional', 'Audio y video profesional'),
    ('automatizacion_intrusion', 'Automatización e Intrusión'),
    ('cableado_estructurado', 'Cableado Estructurado'),
    ('control_acceso', 'Control de Acceso'),
    ('deteccion_fuego', 'Detección de Fuego'),
    ('energia_climatizacion', 'Energía y Climatización'),
    ('gps_telematica', 'GPS, Telemática y Equipamiento Vehicular'),
    ('herramientas_ferreteria', 'Herramientas, Ferretería y Material Eléctrico'),
    ('industria_bms_robots', 'Industria / BMS/ Robots'),
    ('radiocomunicacion', 'Radiocomunicación'),
    ('redes_it', 'Redes e IT'),
    ('videovigilancia', 'Videovigilancia'),
)

SECCION_SLUGS = frozenset(slug for slug, _ in SECCIONES)
SECCION_MAX_LENGTH = 40

# IDs de categoría nivel 1 de SYSCOM (`GET /categorias`) → sección inventario.
# Verificado contra la API real (2026-08-10). Marketing (65747) no mapea.
SYSCOM_CATEGORIA_ID_A_SECCION: dict[str, str] = {
    '22': 'videovigilancia',
    '25': 'radiocomunicacion',
    '26': 'redes_it',
    '27': 'gps_telematica',
    '30': 'energia_climatizacion',
    '32': 'automatizacion_intrusion',
    '37': 'control_acceso',
    '38': 'deteccion_fuego',
    '42': 'herramientas_ferreteria',
    '65811': 'cableado_estructurado',
    '66523': 'audio_video_profesional',
    '66630': 'industria_bms_robots',
}

# Alias normalizados (sin acentos) → slug. Nombres SYSCOM + variantes.
_ALIAS_A_SECCION: dict[str, str] = {
    'audio y video profesional': 'audio_video_profesional',
    'audio y video': 'audio_video_profesional',
    'audio video profesional': 'audio_video_profesional',
    'automatizacion e intrusion': 'automatizacion_intrusion',
    'automatizacion': 'automatizacion_intrusion',
    'intrusion': 'automatizacion_intrusion',
    'alarmas': 'automatizacion_intrusion',
    'cableado estructurado': 'cableado_estructurado',
    'cableado': 'cableado_estructurado',
    'control de acceso': 'control_acceso',
    'control acceso': 'control_acceso',
    'accesos': 'control_acceso',
    'deteccion de fuego': 'deteccion_fuego',
    'deteccion fuego': 'deteccion_fuego',
    'incendio': 'deteccion_fuego',
    'energia y climatizacion': 'energia_climatizacion',
    'energia': 'energia_climatizacion',
    'climatizacion': 'energia_climatizacion',
    'ups': 'energia_climatizacion',
    'gps, telematica y equipamiento vehicular': 'gps_telematica',
    'gps telematica y equipamiento vehicular': 'gps_telematica',
    'gps': 'gps_telematica',
    'telematica': 'gps_telematica',
    'equipamiento vehicular': 'gps_telematica',
    'herramientas, ferreteria y material electrico': 'herramientas_ferreteria',
    'herramientas ferreteria y material electrico': 'herramientas_ferreteria',
    'herramientas': 'herramientas_ferreteria',
    'ferreteria': 'herramientas_ferreteria',
    'material electrico': 'herramientas_ferreteria',
    'industria / bms/ robots': 'industria_bms_robots',
    'industria / bms / robots': 'industria_bms_robots',
    'industria bms robots': 'industria_bms_robots',
    'industria': 'industria_bms_robots',
    'bms': 'industria_bms_robots',
    'robots': 'industria_bms_robots',
    'radiocomunicacion': 'radiocomunicacion',
    'radio comunicacion': 'radiocomunicacion',
    'redes e it': 'redes_it',
    'redes': 'redes_it',
    'networking': 'redes_it',
    'videovigilancia': 'videovigilancia',
    'cctv': 'videovigilancia',
    'camaras': 'videovigilancia',
    'video vigilancia': 'videovigilancia',
}

_BLANK_RE = re.compile(r'\s+')


def _sin_acentos(texto: str) -> str:
    nfd = unicodedata.normalize('NFD', texto)
    return ''.join(ch for ch in nfd if unicodedata.category(ch) != 'Mn')


def normalizar_categoria(texto: object) -> str:
    plano = _sin_acentos(str(texto or '')).strip().lower()
    return _BLANK_RE.sub(' ', plano)


def seccion_label(slug: str) -> str:
    for key, label in SECCIONES:
        if key == slug:
            return label
    return ''


def map_categoria_id_to_seccion(categoria_id: object) -> str:
    """Mapea id SYSCOM (str/int) → slug; '' si no es de nuestras 12."""
    cid = str(categoria_id or '').strip()
    if not cid:
        return ''
    return SYSCOM_CATEGORIA_ID_A_SECCION.get(cid, '')


def map_categoria_to_seccion(texto: object) -> str:
    """Devuelve slug de sección o '' si no hay match por nombre."""
    norm = normalizar_categoria(texto)
    if not norm:
        return ''
    if norm in _ALIAS_A_SECCION:
        return _ALIAS_A_SECCION[norm]
    mejores = [
        (alias, slug)
        for alias, slug in _ALIAS_A_SECCION.items()
        if len(alias) >= 4 and alias in norm
    ]
    if not mejores:
        return ''
    mejores.sort(key=lambda pair: len(pair[0]), reverse=True)
    return mejores[0][1]


def _iter_categoria_dicts(raw: dict) -> list[dict]:
    """Aplana `categorias` / `categorias_producto_todas` de SYSCOM."""
    out: list[dict] = []
    if not isinstance(raw, dict):
        return out

    for clave in (
        'categorias',
        'categorías',  # typo posible en clientes
        'categorias_producto_todas',
    ):
        valor = raw.get(clave)
        if valor is None:
            continue
        if isinstance(valor, dict):
            out.append(valor)
            continue
        if not isinstance(valor, (list, tuple)):
            continue
        for item in valor:
            if isinstance(item, dict):
                out.append(item)
            elif isinstance(item, (list, tuple)):
                # Breadcrumb: [[nivel1], [nivel1, nivel2], ...]
                for nodo in item:
                    if isinstance(nodo, dict):
                        out.append(nodo)
    return out


def extract_categoria_ids_y_nombres(raw: dict) -> tuple[list[str], list[str]]:
    """IDs (nivel 1 primero) y nombres de categoría del payload."""
    ids: list[str] = []
    nombres: list[str] = []
    vistos_id: set[str] = set()
    vistos_nom: set[str] = set()

    dicts = _iter_categoria_dicts(raw)
    # Preferir nivel 1
    ordenados = sorted(
        dicts,
        key=lambda d: (
            0 if str(d.get('nivel') or '') in ('1', '1.0') else 1,
            0,
        ),
    )
    for d in ordenados:
        cid = str(d.get('id') or '').strip()
        if cid and cid not in vistos_id:
            vistos_id.add(cid)
            ids.append(cid)
        nombre = str(d.get('nombre') or d.get('name') or '').strip()
        if nombre and nombre not in vistos_nom:
            vistos_nom.add(nombre)
            nombres.append(nombre)

    # Fallbacks de campos sueltos
    for clave in (
        'categoria_nombre',
        'nombre_categoria',
        'category_name',
        'categoria',
        'category',
    ):
        valor = raw.get(clave)
        if isinstance(valor, dict):
            cid = str(valor.get('id') or '').strip()
            if cid and cid not in vistos_id:
                vistos_id.add(cid)
                ids.append(cid)
            nombre = str(valor.get('nombre') or valor.get('name') or '').strip()
            if nombre and nombre not in vistos_nom:
                vistos_nom.add(nombre)
                nombres.append(nombre)
            continue
        if valor is None or isinstance(valor, (list, tuple)):
            continue
        texto = str(valor).strip()
        if not texto:
            continue
        if texto.isdigit():
            if texto not in vistos_id:
                vistos_id.add(texto)
                ids.append(texto)
        elif texto not in vistos_nom:
            vistos_nom.add(texto)
            nombres.append(texto)

    return ids, nombres


def extract_categoria_texto(raw: dict) -> str:
    """Nombre de categoría principal (compat)."""
    _ids, nombres = extract_categoria_ids_y_nombres(raw)
    return nombres[0] if nombres else ''


def map_producto_to_seccion(raw: dict) -> str:
    """Resuelve sección desde un producto SYSCOM/TVC.

    Prioridad: id de categoría SYSCOM → nombre de categoría.
    """
    ids, nombres = extract_categoria_ids_y_nombres(raw)
    for cid in ids:
        slug = map_categoria_id_to_seccion(cid)
        if slug:
            return slug
    for nombre in nombres:
        slug = map_categoria_to_seccion(nombre)
        if slug:
            return slug
    return ''
