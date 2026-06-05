"""Cliente mínimo para Remote API de Wialon Hosting."""
import json
import logging
import os
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from typing import Any, Callable, TypeVar
from zoneinfo import ZoneInfo

T = TypeVar("T")

try:
    WIALON_TZ = ZoneInfo("America/Mexico_City")
except Exception:
    WIALON_TZ = ZoneInfo("UTC")

logger = logging.getLogger(__name__)

WIALON_API_BASE = os.environ.get(
    "WIALON_API_BASE",
    "https://hst-api.wialon.com/wialon/ajax.html",
).strip()
WIALON_ACCESS_TOKEN = os.environ.get("WIALON_ACCESS_TOKEN", "").strip()

# base + custom props (monu) + billing (crt, bact) + other (fl, ld)
USER_FLAGS = 0x00000001 | 0x00000002 | 0x00000004 | 0x00000100
# base + billing (bpact)
ACCOUNT_FLAGS = 0x00000001 | 0x00000004
# base + custom + billing + custom fields + advanced (hw, uid, ph, psw) + lmsg + profile
UNIT_FLAGS = 0x00000001 | 0x00000002 | 0x00000004 | 0x00000008 | 0x00000100 | 0x00000200 | 0x00000400
UNIT_DETAIL_FLAGS = UNIT_FLAGS | 0x00800000

# Máscara de acceso por defecto al compartir unidad (ver + detalle + conectividad).
WIALON_UNIT_ACCESS_DEFAULT = 0x1 | 0x2 | 0x1000000

WIALON_VEHICLE_TYPES: list[dict[str, str]] = [
    {"value": "passenger car", "label": "Automóvil"},
    {"value": "truck", "label": "Camión"},
    {"value": "bus", "label": "Autobús"},
    {"value": "special equipment", "label": "Equipo especial"},
    {"value": "agricultural", "label": "Agrícola"},
    {"value": "motorcycle", "label": "Motocicleta"},
    {"value": "bicycle", "label": "Bicicleta"},
    {"value": "pedestrian", "label": "Peatón"},
    {"value": "animal", "label": "Animal"},
    {"value": "ship", "label": "Embarcación"},
    {"value": "plane", "label": "Avión"},
    {"value": "other", "label": "Otro"},
]

# Cuentas administrador / distribuidor: no marcan la unidad como "compartida" en la UI.
_SHARING_IGNORE_LOGINS = frozenset({"intraxadmin"})
_SHARING_IGNORE_ACCOUNT_NAMES = frozenset({"antarixgps", "gpsintrax"})

_SESSION_TTL_SEC = int(os.environ.get("WIALON_SESSION_TTL_SEC", "300"))
_USERS_CACHE_TTL_SEC = int(os.environ.get("WIALON_USERS_CACHE_TTL_SEC", "90"))
_UNITS_INDEX_TTL_SEC = int(os.environ.get("WIALON_UNITS_INDEX_TTL_SEC", "300"))
_PARALLEL_WORKERS = int(os.environ.get("WIALON_PARALLEL_WORKERS", "8"))

_cache_lock = threading.Lock()
_session: tuple[str, float] | None = None
_users_list_cache: tuple[list[dict[str, Any]], float] | None = None
_users_raw_cache: tuple[list[dict[str, Any]], float] | None = None
_users_prp_cache: tuple[dict[int, dict[str, Any]], float] | None = None
_accounts_context_cache: tuple[dict[str, Any], float] | None = None
_units_index_cache: tuple[dict[int, dict[str, Any]], float] | None = None
_hw_names_cache: tuple[dict[int, str], float] | None = None
_hw_catalog_cache: tuple[list[dict[str, Any]], float] | None = None
_vehicle_types_cache: tuple[list[dict[str, str]], float] | None = None
_unit_sharing_cache: tuple[dict[int, list[dict[str, Any]]], float] | None = None
_units_search_index_cache: tuple[list[dict[str, Any]], float] | None = None


class WialonError(Exception):
    """Error de comunicación o lógica con Wialon."""

    def __init__(self, message: str, *, code: int | None = None):
        super().__init__(message)
        self.code = code


def _call(svc: str, params: dict[str, Any], sid: str | None = None) -> dict[str, Any] | list[Any]:
    query: dict[str, str] = {
        "svc": svc,
        "params": json.dumps(params, separators=(",", ":")),
    }
    if sid:
        query["sid"] = sid
    url = f"{WIALON_API_BASE}?{urllib.parse.urlencode(query)}"
    try:
        with urllib.request.urlopen(url, timeout=45) as response:
            payload = json.loads(response.read().decode("utf-8", errors="replace"))
    except urllib.error.URLError as exc:
        logger.exception("Wialon request failed svc=%s", svc)
        raise WialonError("No se pudo conectar con Wialon.") from exc
    except json.JSONDecodeError as exc:
        raise WialonError("Respuesta inválida de Wialon.") from exc

    if isinstance(payload, dict) and payload.get("error"):
        code = payload.get("error")
        reason = payload.get("reason") or payload.get("message") or "Error de Wialon"
        raise WialonError(str(reason), code=int(code) if code is not None else None)
    if isinstance(payload, (dict, list)):
        return payload
    return {}


def _login_fresh() -> str:
    token = WIALON_ACCESS_TOKEN
    if not token:
        raise WialonError("WIALON_ACCESS_TOKEN no está configurado en el servidor.")
    data = _call("token/login", {"token": token})
    if not isinstance(data, dict):
        raise WialonError("Respuesta de login inválida.")
    sid = data.get("eid")
    if not sid:
        raise WialonError("Wialon no devolvió identificador de sesión (eid).")
    return str(sid)


def get_session() -> str:
    """Sesión Wialon reutilizable (evita token/login en cada petición)."""
    global _session
    now = time.monotonic()
    with _cache_lock:
        if _session and _session[1] > now:
            return _session[0]
    sid = _login_fresh()
    with _cache_lock:
        _session = (sid, time.monotonic() + _SESSION_TTL_SEC)
    return sid


def login_session() -> str:
    return get_session()


def invalidate_wialon_cache() -> None:
    """Limpia cachés en memoria (p. ej. tras cambiar token o refresh forzado)."""
    global _session, _users_list_cache, _users_raw_cache, _users_prp_cache, _accounts_context_cache
    global _units_index_cache, _hw_names_cache, _hw_catalog_cache, _unit_sharing_cache
    global _vehicle_types_cache, _units_search_index_cache
    with _cache_lock:
        _session = None
        _users_list_cache = None
        _users_raw_cache = None
        _users_prp_cache = None
        _accounts_context_cache = None
        _units_index_cache = None
        _hw_names_cache = None
        _hw_catalog_cache = None
        _unit_sharing_cache = None
        _vehicle_types_cache = None
        _units_search_index_cache = None


def _coerce_wialon_id(value: Any) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _cached_user_row(wialon_user_id: int) -> dict[str, Any] | None:
    target = int(wialon_user_id)
    with _cache_lock:
        if _users_list_cache and _users_list_cache[1] > time.monotonic():
            for row in _users_list_cache[0]:
                if _coerce_wialon_id(row.get("wialon_id")) == target:
                    return dict(row)
    return None


def _raw_user_from_cache(wialon_user_id: int) -> dict[str, Any] | None:
    target = int(wialon_user_id)
    for row in _users_raw_from_cache() or []:
        if _coerce_wialon_id(row.get("id")) == target:
            return row
    return None


def _upsert_user_list_cache(row: dict[str, Any]) -> None:
    """Actualiza una fila en la lista cacheada sin reconstruir todo Wialon."""
    global _users_list_cache
    user_id = _coerce_wialon_id(row.get("wialon_id"))
    if user_id is None:
        return
    with _cache_lock:
        if not _users_list_cache or _users_list_cache[1] <= time.monotonic():
            return
        rows, expires = _users_list_cache
        updated_rows = [row if _coerce_wialon_id(r.get("wialon_id")) == user_id else r for r in rows]
        if not any(_coerce_wialon_id(r.get("wialon_id")) == user_id for r in updated_rows):
            updated_rows.append(row)
        updated_rows.sort(key=lambda u: (u.get("name") or u.get("user_id") or "").lower())
        _users_list_cache = (updated_rows, expires)


def _parallel_map(
    fn: Callable[[Any], T],
    items: list[Any],
    *,
    max_workers: int | None = None,
) -> list[T]:
    if not items:
        return []
    workers = min(max_workers or _PARALLEL_WORKERS, len(items), 12)
    if workers <= 1:
        return [fn(item) for item in items]
    results: list[T] = []
    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = [executor.submit(fn, item) for item in items]
        for future in as_completed(futures):
            results.append(future.result())
    return results


def _search_items(
    sid: str,
    *,
    items_type: str,
    prop_name: str,
    prop_value_mask: str = "*",
    prop_type: str | None = None,
    flags: int,
    force: int = 1,
) -> list[dict[str, Any]]:
    spec: dict[str, Any] = {
        "itemsType": items_type,
        "propName": prop_name,
        "propValueMask": prop_value_mask,
        "sortType": "sys_name",
    }
    if prop_type:
        spec["propType"] = prop_type
    data = _call(
        "core/search_items",
        {
            "spec": spec,
            "force": force,
            "flags": flags,
            "from": 0,
            "to": 0,
        },
        sid=sid,
    )
    if not isinstance(data, dict):
        return []
    items = data.get("items") or []
    return [item for item in items if isinstance(item, dict)]


def _parse_json_ids(raw: Any) -> list[int]:
    if raw is None:
        return []
    if isinstance(raw, list):
        return [int(x) for x in raw if str(x).isdigit()]
    if not isinstance(raw, str) or not raw.strip():
        return []
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, list):
        return []
    ids: list[int] = []
    for entry in parsed:
        if isinstance(entry, int):
            ids.append(entry)
        elif isinstance(entry, str) and entry.isdigit():
            ids.append(int(entry))
    return ids


def _user_unit_ids_from_prp(prp: dict[str, Any]) -> list[int]:
    for key in ("monu", "monuv", "m_monu"):
        ids = _parse_json_ids(prp.get(key))
        if ids:
            return ids
    return []


def _unit_status_from_item(item: dict[str, Any]) -> tuple[str, bool | None]:
    """
    Estado de facturación Wialon (props avanzadas):
    - act: 1 = activa, 0 = inactiva
    - dactt: 0 = activa; >0 = timestamp de desactivación
    """
    act = item.get("act")
    if act is not None:
        if isinstance(act, bool):
            return ("Activo" if act else "Inactivo", act)
        try:
            active = bool(int(act))
            return ("Activo" if active else "Inactivo", active)
        except (TypeError, ValueError):
            pass
    dactt = item.get("dactt")
    if dactt is not None:
        try:
            if int(dactt) == 0:
                return ("Activo", True)
            return ("Inactivo", False)
        except (TypeError, ValueError):
            pass
    return ("—", None)


def _assigned_units_count(
    prp: dict[str, Any],
    units_index: dict[int, dict[str, Any]] | None = None,
) -> int:
    unit_ids = _user_unit_ids_from_prp(prp)
    if units_index is None:
        return len(unit_ids)
    active = 0
    for unit_id in unit_ids:
        item = units_index.get(int(unit_id))
        if not item:
            continue
        _, is_active = _unit_status_from_item(item)
        if is_active is not False:
            active += 1
    return active


def _resolve_item_name(sid: str, item_id: int) -> tuple[int, str]:
    try:
        data = _call("core/search_item", {"id": item_id, "flags": 1}, sid=sid)
        if not isinstance(data, dict):
            return item_id, ""
        item = data.get("item") if isinstance(data.get("item"), dict) else {}
        return item_id, str(item.get("nm") or "").strip()
    except WialonError:
        return item_id, ""


def _resolve_item_names(sid: str, item_ids: set[int], names_by_id: dict[int, str]) -> None:
    missing = [i for i in item_ids if i not in names_by_id or not names_by_id[i]]
    if not missing:
        return
    for item_id, name in _parallel_map(lambda i: _resolve_item_name(sid, i), missing):
        if name:
            names_by_id[item_id] = name


def _format_unix_datetime(ts: int) -> str:
    return datetime.fromtimestamp(ts, tz=WIALON_TZ).strftime("%d/%m/%Y %H:%M")


def _blocked_date_for_account(sid: str, account_id: int) -> tuple[int, str | None]:
    try:
        data = _call("account/get_account_data", {"itemId": account_id}, sid=sid)
    except WialonError:
        return account_id, None
    if not isinstance(data, dict) or data.get("enabled") != 0:
        return account_id, None
    switch_time = data.get("switchTime")
    if switch_time is None:
        return account_id, None
    try:
        return account_id, _format_unix_datetime(int(switch_time))
    except (TypeError, ValueError, OSError):
        return account_id, None


def _fetch_blocked_dates(sid: str, account_ids: set[int]) -> dict[int, str]:
    if not account_ids:
        return {}
    pairs = _parallel_map(
        lambda aid: _blocked_date_for_account(sid, aid),
        list(account_ids),
        max_workers=6,
    )
    return {aid: label for aid, label in pairs if label}


def _account_ids_by_property(sid: str, prop_name: str, prop_value: str) -> set[int]:
    items = _search_items(
        sid,
        items_type="avl_resource",
        prop_name=prop_name,
        prop_value_mask=prop_value,
        prop_type="property",
        flags=ACCOUNT_FLAGS,
        force=0,
    )
    return {int(item["id"]) for item in items if item.get("id") is not None}


def _normalize_user(
    item: dict[str, Any],
    *,
    names_by_id: dict[int, str],
    accounts_by_id: dict[int, dict[str, Any]],
    blocked_account_ids: set[int],
    dealer_account_ids: set[int],
    blocked_dates_by_account: dict[int, str],
    units_index: dict[int, dict[str, Any]] | None = None,
) -> dict[str, Any]:
    prp = item.get("prp") if isinstance(item.get("prp"), dict) else {}
    creator_id = item.get("crt")
    account_id = item.get("bact")
    account = accounts_by_id.get(int(account_id)) if account_id is not None else None
    parent_id = account.get("bpact") if account else None

    creator_name = names_by_id.get(int(creator_id), "") if creator_id is not None else ""
    parent_name = ""
    if parent_id is not None:
        pid = int(parent_id)
        parent_name = names_by_id.get(pid) or str(accounts_by_id.get(pid, {}).get("nm") or "")

    acct_int = int(account_id) if account_id is not None else None
    is_blocked = acct_int in blocked_account_ids if acct_int is not None else False
    dealer_on = acct_int in dealer_account_ids if acct_int is not None else False
    units_count = _assigned_units_count(prp, units_index)
    user_login = str(item.get("nm") or "").strip()
    account_name = ""
    if account:
        account_name = str(account.get("nm") or "").strip()
    if not account_name and acct_int is not None:
        account_name = names_by_id.get(acct_int, "")

    blocked_label = "No"
    if is_blocked and acct_int is not None:
        blocked_label = blocked_dates_by_account.get(acct_int) or "—"

    return {
        "wialon_id": item.get("id"),
        "account_id": acct_int,
        "user_id": user_login or "—",
        "name": account_name or user_login or "—",
        "creator": creator_name or (str(creator_id) if creator_id is not None else "—"),
        "parent_account": parent_name or "—",
        "dealer_rights": "Sí" if dealer_on else "No",
        "assigned_units": units_count,
        "status": "Bloqueado" if is_blocked else "Activo",
        "blocked": blocked_label,
    }


def _load_accounts_context(sid: str) -> dict[str, Any]:
    """Metadatos de cuentas Wialon (bloqueo, distribuidor, nombres) con caché compartida."""
    global _accounts_context_cache
    now = time.monotonic()
    with _cache_lock:
        if _accounts_context_cache and _accounts_context_cache[1] > now:
            return _accounts_context_cache[0]

    with ThreadPoolExecutor(max_workers=3) as executor:
        fut_accounts = executor.submit(
            _search_items,
            sid,
            items_type="avl_resource",
            prop_name="rel_is_account",
            prop_value_mask="1",
            flags=ACCOUNT_FLAGS,
            force=0,
        )
        fut_blocked = executor.submit(_account_ids_by_property, sid, "sys_account_disabled", "1")
        fut_dealer = executor.submit(_account_ids_by_property, sid, "sys_account_enable_parent", "1")
        accounts = fut_accounts.result()
        blocked_account_ids = fut_blocked.result()
        dealer_account_ids = fut_dealer.result()

    accounts_by_id: dict[int, dict[str, Any]] = {}
    names_by_id: dict[int, str] = {}
    for row in accounts:
        row_id = row.get("id")
        if row_id is not None:
            name = str(row.get("nm") or "").strip()
            names_by_id[int(row_id)] = name
            accounts_by_id[int(row_id)] = row

    ctx = {
        "accounts_by_id": accounts_by_id,
        "names_by_id": names_by_id,
        "blocked_account_ids": blocked_account_ids,
        "dealer_account_ids": dealer_account_ids,
        "blocked_dates_by_account": {},
    }
    expires = time.monotonic() + _USERS_CACHE_TTL_SEC
    with _cache_lock:
        _accounts_context_cache = (ctx, expires)
    return ctx


def _blocked_dates_for_users(
    sid: str,
    users: list[dict[str, Any]],
    blocked_account_ids: set[int],
    cached_dates: dict[int, str],
) -> dict[int, str]:
    """Solo consulta fechas de bloqueo de cuentas que aparecen en el listado de usuarios."""
    relevant: set[int] = set()
    for item in users:
        account_id = item.get("bact")
        if account_id is None:
            continue
        acct_int = int(account_id)
        if acct_int in blocked_account_ids:
            relevant.add(acct_int)
    if not relevant:
        return {}
    missing = [aid for aid in relevant if aid not in cached_dates]
    fetched = _fetch_blocked_dates(sid, set(missing)) if missing else {}
    return {**{k: cached_dates[k] for k in relevant if k in cached_dates}, **fetched}


def _build_users_payload(sid: str, users: list[dict[str, Any]]) -> list[dict[str, Any]]:
    ctx = _load_accounts_context(sid)
    accounts_by_id = ctx["accounts_by_id"]
    blocked_account_ids = ctx["blocked_account_ids"]
    dealer_account_ids = ctx["dealer_account_ids"]
    names_by_id = dict(ctx["names_by_id"])

    for row in users:
        row_id = row.get("id")
        if row_id is not None:
            names_by_id[int(row_id)] = str(row.get("nm") or "").strip()

    blocked_dates_by_account = _blocked_dates_for_users(
        sid,
        users,
        blocked_account_ids,
        ctx.get("blocked_dates_by_account") or {},
    )
    if blocked_dates_by_account:
        global _accounts_context_cache
        with _cache_lock:
            if _accounts_context_cache and _accounts_context_cache[1] > time.monotonic():
                merged_ctx = dict(_accounts_context_cache[0])
                merged_dates = dict(merged_ctx.get("blocked_dates_by_account") or {})
                merged_dates.update(blocked_dates_by_account)
                merged_ctx["blocked_dates_by_account"] = merged_dates
                _accounts_context_cache = (merged_ctx, _accounts_context_cache[1])

    missing_ids: set[int] = set()
    for item in users:
        creator_id = item.get("crt")
        if creator_id is not None and int(creator_id) not in names_by_id:
            missing_ids.add(int(creator_id))
        account_id = item.get("bact")
        account = accounts_by_id.get(int(account_id)) if account_id is not None else None
        parent_id = account.get("bpact") if account else None
        if parent_id is not None and int(parent_id) not in names_by_id:
            missing_ids.add(int(parent_id))
    if missing_ids:
        _resolve_item_names(sid, missing_ids, names_by_id)

    units_index = _get_units_index(sid)

    result = [
        _normalize_user(
            item,
            names_by_id=names_by_id,
            accounts_by_id=accounts_by_id,
            blocked_account_ids=blocked_account_ids,
            dealer_account_ids=dealer_account_ids,
            blocked_dates_by_account=blocked_dates_by_account,
            units_index=units_index,
        )
        for item in users
    ]
    result.sort(key=lambda u: (u.get("name") or u.get("user_id") or "").lower())
    return result


def fetch_users(*, use_cache: bool = True) -> list[dict[str, Any]]:
    """Lista usuarios Wialon con campos enriquecidos para la tabla de cuentas."""
    global _users_list_cache, _users_raw_cache, _users_prp_cache

    now = time.monotonic()
    if use_cache:
        with _cache_lock:
            if _users_list_cache and _users_list_cache[1] > now:
                return list(_users_list_cache[0])

    sid = get_session()
    users = _search_items(
        sid,
        items_type="user",
        prop_name="sys_name",
        flags=USER_FLAGS,
        force=0,
    )

    result = _build_users_payload(sid, users)

    prp_by_user: dict[int, dict[str, Any]] = {}
    for item in users:
        uid = item.get("id")
        if uid is not None:
            prp = item.get("prp") if isinstance(item.get("prp"), dict) else {}
            prp_by_user[int(uid)] = prp

    expires = time.monotonic() + _USERS_CACHE_TTL_SEC
    sharing_index = _build_unit_sharing_index(users, result)
    with _cache_lock:
        _users_list_cache = (result, expires)
        _users_raw_cache = (users, expires)
        _users_prp_cache = (prp_by_user, expires)
        _unit_sharing_cache = (sharing_index, expires)

    return result


def _get_units_index(sid: str) -> dict[int, dict[str, Any]]:
    global _units_index_cache
    now = time.monotonic()
    with _cache_lock:
        if _units_index_cache and _units_index_cache[1] > now:
            return _units_index_cache[0]

    items = _search_items(
        sid,
        items_type="avl_unit",
        prop_name="sys_name",
        flags=UNIT_FLAGS,
        force=0,
    )
    index: dict[int, dict[str, Any]] = {}
    for item in items:
        unit_id = item.get("id")
        if unit_id is not None:
            index[int(unit_id)] = item

    with _cache_lock:
        _units_index_cache = (index, time.monotonic() + _UNITS_INDEX_TTL_SEC)
    return index


def _get_hw_type_names(sid: str, hw_ids: set[int]) -> dict[int, str]:
    global _hw_names_cache
    if not hw_ids:
        return {}

    now = time.monotonic()
    with _cache_lock:
        if _hw_names_cache and _hw_names_cache[1] > now:
            cached = _hw_names_cache[0]
            if hw_ids.issubset(cached.keys()):
                return {hid: cached[hid] for hid in hw_ids}

    payload = _call(
        "core/get_hw_types",
        {
            "filterType": "id",
            "filterValue": sorted(hw_ids),
            "includeType": True,
        },
        sid=sid,
    )
    names: dict[int, str] = {}
    if isinstance(payload, list):
        for entry in payload:
            if not isinstance(entry, dict) or entry.get("id") is None:
                continue
            names[int(entry["id"])] = str(entry.get("name") or entry.get("hw_category") or "").strip()

    with _cache_lock:
        if _hw_names_cache and _hw_names_cache[1] > now:
            merged = {**_hw_names_cache[0], **names}
        else:
            merged = names
        _hw_names_cache = (merged, time.monotonic() + _UNITS_INDEX_TTL_SEC)

    return {hid: names.get(hid) or merged.get(hid, "") for hid in hw_ids}


def _format_custom_fields(flds: Any) -> str:
    if not isinstance(flds, dict) or not flds:
        return "—"
    parts: list[str] = []
    for entry in flds.values():
        if not isinstance(entry, dict):
            continue
        label = str(entry.get("n") or "").strip()
        value = str(entry.get("v") or "").strip()
        if label and value:
            parts.append(f"{label}: {value}")
        elif value:
            parts.append(value)
        elif label:
            parts.append(label)
    return "; ".join(parts) if parts else "—"


def _is_ignored_sharing_owner(owner: dict[str, Any]) -> bool:
    login = str(owner.get("user_id") or "").strip().lower()
    name = str(owner.get("name") or "").strip().lower()
    if login in _SHARING_IGNORE_LOGINS:
        return True
    return name in _SHARING_IGNORE_ACCOUNT_NAMES


def _other_sharing_owners(
    owners: list[dict[str, Any]],
    *,
    current_user_id: int,
) -> list[dict[str, Any]]:
    return [
        o
        for o in owners
        if int(o.get("wialon_id", -1)) != current_user_id and not _is_ignored_sharing_owner(o)
    ]


def _owner_label(owner: dict[str, Any]) -> str:
    user_id = str(owner.get("user_id") or "").strip()
    name = str(owner.get("name") or "").strip()
    if user_id and name and name != user_id:
        return f"{user_id} ({name})"
    return user_id or name or "—"


def _build_unit_sharing_index(
    users_raw: list[dict[str, Any]],
    users_normalized: list[dict[str, Any]],
) -> dict[int, list[dict[str, Any]]]:
    """unit_id → usuarios Wialon que tienen la unidad en su monu."""
    norm_by_id = {int(u["wialon_id"]): u for u in users_normalized if u.get("wialon_id") is not None}
    sharing: dict[int, list[dict[str, Any]]] = {}
    for item in users_raw:
        wialon_id = item.get("id")
        if wialon_id is None:
            continue
        wid = int(wialon_id)
        norm = norm_by_id.get(wid, {})
        owner = {
            "wialon_id": wid,
            "user_id": str(item.get("nm") or norm.get("user_id") or "").strip(),
            "name": str(norm.get("name") or "").strip(),
        }
        prp = item.get("prp") if isinstance(item.get("prp"), dict) else {}
        for unit_id in _user_unit_ids_from_prp(prp):
            sharing.setdefault(int(unit_id), []).append(owner)
    return sharing


def _normalize_unit(
    item: dict[str, Any],
    hw_names: dict[int, str],
    *,
    unit_id: int,
    current_user_id: int,
    sharing_index: dict[int, list[dict[str, Any]]],
) -> dict[str, Any]:
    lmsg = item.get("lmsg") if isinstance(item.get("lmsg"), dict) else {}
    last_msg_ts = lmsg.get("t")
    hw_id = item.get("hw")
    device_type = ""
    if hw_id is not None:
        device_type = hw_names.get(int(hw_id), "") or str(hw_id)
    created_ts = item.get("ct")
    uid = str(item.get("uid") or "").strip()
    if not uid:
        uid = str(item.get("uid2") or "").strip()

    owners = sharing_index.get(unit_id, [])
    other_owners = _other_sharing_owners(owners, current_user_id=current_user_id)
    is_shared = len(other_owners) > 0
    shared_with = ", ".join(_owner_label(o) for o in other_owners) if other_owners else "—"
    status_label, is_active = _unit_status_from_item(item)

    return {
        "wialon_id": item.get("id"),
        "name": str(item.get("nm") or "").strip(),
        "device_type": device_type or "—",
        "uid": uid or "—",
        "phone": str(item.get("ph") or "").strip() or "—",
        "status": status_label,
        "is_active": is_active,
        "last_message_at": _format_unix_datetime(int(last_msg_ts)) if last_msg_ts else "—",
        "created_at": _format_unix_datetime(int(created_ts)) if created_ts else "—",
        "custom_fields": _format_custom_fields(item.get("flds")),
        "is_shared": is_shared,
        "shared_with": shared_with,
        "shared_users_count": len(other_owners),
    }


def _collect_hw_ids_from_units(units_index: dict[int, dict[str, Any]]) -> set[int]:
    hw_ids: set[int] = set()
    for item in units_index.values():
        hw_val = item.get("hw")
        if hw_val is None:
            continue
        try:
            hw_ids.add(int(hw_val))
        except (TypeError, ValueError):
            pass
    return hw_ids


def _units_for_user(
    *,
    wialon_user_id: int,
    users_raw: list[dict[str, Any]],
    units_index: dict[int, dict[str, Any]],
    sharing_index: dict[int, list[dict[str, Any]]],
    hw_names: dict[int, str],
) -> list[dict[str, Any]]:
    user_item = next((u for u in users_raw if u.get("id") == wialon_user_id), None)
    if user_item is None:
        prp = _user_prp_from_cache(wialon_user_id) or {}
        unit_ids = _user_unit_ids_from_prp(prp)
    else:
        prp = user_item.get("prp") if isinstance(user_item.get("prp"), dict) else {}
        unit_ids = _user_unit_ids_from_prp(prp)

    units: list[dict[str, Any]] = []
    for unit_id in unit_ids:
        item = units_index.get(int(unit_id))
        if not item:
            continue
        units.append(
            _normalize_unit(
                item,
                hw_names,
                unit_id=int(unit_id),
                current_user_id=wialon_user_id,
                sharing_index=sharing_index,
            )
        )
    units.sort(key=lambda u: (u.get("name") or "").lower())
    return units


def _user_prp_from_cache(wialon_user_id: int) -> dict[str, Any] | None:
    with _cache_lock:
        if _users_prp_cache and _users_prp_cache[1] > time.monotonic():
            return _users_prp_cache[0].get(int(wialon_user_id))
    return None


def _users_raw_from_cache() -> list[dict[str, Any]] | None:
    with _cache_lock:
        if _users_raw_cache and _users_raw_cache[1] > time.monotonic():
            return _users_raw_cache[0]
    return None


def _users_normalized_from_cache() -> list[dict[str, Any]] | None:
    with _cache_lock:
        if _users_list_cache and _users_list_cache[1] > time.monotonic():
            return _users_list_cache[0]
    return None


def _sharing_index_from_cache() -> dict[int, list[dict[str, Any]]] | None:
    with _cache_lock:
        if _unit_sharing_cache and _unit_sharing_cache[1] > time.monotonic():
            return _unit_sharing_cache[0]
    return None


def _build_units_fast(sid: str, user_id: int) -> list[dict[str, Any]]:
    users_raw = _users_raw_from_cache() or []
    users_normalized = _users_normalized_from_cache() or []
    sharing_index = _sharing_index_from_cache()
    if sharing_index is None and users_raw:
        sharing_index = _build_unit_sharing_index(users_raw, users_normalized)
    if sharing_index is None:
        sharing_index = {}

    units_index = _get_units_index(sid)
    hw_names = _get_hw_type_names(sid, _collect_hw_ids_from_units(units_index))
    return _units_for_user(
        wialon_user_id=user_id,
        users_raw=users_raw,
        units_index=units_index,
        sharing_index=sharing_index,
        hw_names=hw_names,
    )


def _user_login_from_cache(user_id: int) -> str:
    with _cache_lock:
        if _users_list_cache and _users_list_cache[1] > time.monotonic():
            for row in _users_list_cache[0]:
                if row.get("wialon_id") == user_id:
                    return str(row.get("user_id") or "")
    return ""


def _raw_user_by_id(wialon_user_id: int) -> dict[str, Any]:
    """Obtiene el ítem crudo de usuario desde caché o Wialon."""
    user_id = int(wialon_user_id)
    for row in _users_raw_from_cache() or []:
        if int(row.get("id") or 0) == user_id:
            return row
    sid = get_session()
    user_resp = _call("core/search_item", {"id": user_id, "flags": USER_FLAGS}, sid=sid)
    if not isinstance(user_resp, dict):
        raise WialonError("Usuario no encontrado en Wialon.")
    user = user_resp.get("item")
    if not isinstance(user, dict):
        raise WialonError("Usuario no encontrado en Wialon.")
    return user


def _patch_row_after_update(
    base: dict[str, Any],
    *,
    account_id: int,
    name: str | None,
    dealer_rights: bool | None,
    enabled: bool | None,
    blocked_label: str | None = None,
) -> dict[str, Any]:
    row = dict(base)
    if name is not None:
        row["name"] = name
    if dealer_rights is not None:
        row["dealer_rights"] = "Sí" if dealer_rights else "No"
    if enabled is not None:
        row["status"] = "Activo" if enabled else "Bloqueado"
        if enabled:
            row["blocked"] = "No"
        elif blocked_label is not None:
            row["blocked"] = blocked_label
        elif row.get("blocked") == "No":
            row["blocked"] = "—"
    row["account_id"] = account_id
    return row


def _sync_accounts_context_after_update(
    account_id: int,
    *,
    dealer_rights: bool | None,
    enabled: bool | None,
    blocked_label: str | None,
) -> None:
    global _accounts_context_cache
    with _cache_lock:
        if not _accounts_context_cache or _accounts_context_cache[1] <= time.monotonic():
            return
        ctx = dict(_accounts_context_cache[0])
        blocked = set(ctx.get("blocked_account_ids") or set())
        dealer = set(ctx.get("dealer_account_ids") or set())
        dates = dict(ctx.get("blocked_dates_by_account") or {})
        if dealer_rights is not None:
            if dealer_rights:
                dealer.add(account_id)
            else:
                dealer.discard(account_id)
        if enabled is not None:
            if enabled:
                blocked.discard(account_id)
                dates.pop(account_id, None)
            else:
                blocked.add(account_id)
                if blocked_label:
                    dates[account_id] = blocked_label
        ctx["blocked_account_ids"] = blocked
        ctx["dealer_account_ids"] = dealer
        ctx["blocked_dates_by_account"] = dates
        _accounts_context_cache = (ctx, _accounts_context_cache[1])


def _sync_account_name_in_context(account_id: int, name: str) -> None:
    global _accounts_context_cache
    with _cache_lock:
        if not _accounts_context_cache or _accounts_context_cache[1] <= time.monotonic():
            return
        ctx = dict(_accounts_context_cache[0])
        names = dict(ctx.get("names_by_id") or {})
        accounts = dict(ctx.get("accounts_by_id") or {})
        names[int(account_id)] = name
        acct = accounts.get(int(account_id))
        if isinstance(acct, dict):
            acct = dict(acct)
            acct["nm"] = name
            accounts[int(account_id)] = acct
        ctx["names_by_id"] = names
        ctx["accounts_by_id"] = accounts
        _accounts_context_cache = (ctx, _accounts_context_cache[1])


def update_wialon_user(
    wialon_user_id: int,
    *,
    name: str | None = None,
    dealer_rights: bool | None = None,
    enabled: bool | None = None,
) -> dict[str, Any]:
    """
    Aplica cambios en Wialon Hosting (CMS) para la cuenta de facturación del usuario.

    - name → item/update_name (cuenta bact)
    - dealer_rights → account/update_dealer_rights
    - enabled → account/enable_account (False = bloqueado)
    """
    user_id = int(wialon_user_id)
    cached_row = _cached_user_row(user_id)
    user_item = _raw_user_from_cache(user_id) or _raw_user_by_id(user_id)

    account_id = _coerce_wialon_id(cached_row.get("account_id")) if cached_row else None
    if account_id is None:
        bact = user_item.get("bact")
        if bact is None:
            raise WialonError("El usuario no tiene cuenta de facturación asociada (bact).")
        account_id = int(bact)

    sid = get_session()

    base_row = cached_row or {
        "wialon_id": user_id,
        "account_id": account_id,
        "user_id": str(user_item.get("nm") or "—"),
        "name": str(user_item.get("nm") or "—"),
        "creator": "—",
        "parent_account": "—",
        "dealer_rights": "No",
        "assigned_units": _assigned_units_count(
            user_item.get("prp") if isinstance(user_item.get("prp"), dict) else {},
            _get_units_index(sid),
        ),
        "status": "Activo",
        "blocked": "No",
    }
    base_row["wialon_id"] = user_id
    base_row["account_id"] = account_id

    clean_name: str | None = None
    if name is not None:
        clean_name = str(name).strip()
        if not clean_name:
            raise WialonError("El nombre de la cuenta no puede estar vacío.")

    apply_name = clean_name is not None
    apply_dealer = dealer_rights is not None
    apply_enabled = enabled is not None

    def _apply_name() -> None:
        _call("item/update_name", {"itemId": account_id, "name": clean_name}, sid=sid)

    def _apply_dealer() -> None:
        _call(
            "account/update_dealer_rights",
            {"itemId": account_id, "enable": bool(dealer_rights)},
            sid=sid,
        )

    def _apply_enabled() -> None:
        _call(
            "account/enable_account",
            {"itemId": account_id, "enable": 1 if enabled else 0},
            sid=sid,
        )

    tasks: list[Callable[[], None]] = []
    if apply_name:
        tasks.append(_apply_name)
    if apply_dealer:
        tasks.append(_apply_dealer)
    if apply_enabled:
        tasks.append(_apply_enabled)

    if not tasks:
        return base_row

    if len(tasks) == 1:
        tasks[0]()
    else:
        with ThreadPoolExecutor(max_workers=min(3, len(tasks))) as executor:
            futs = [executor.submit(fn) for fn in tasks]
            for fut in futs:
                fut.result()

    blocked_label: str | None = None
    if apply_enabled and enabled is False:
        blocked_label = "—"

    row = _patch_row_after_update(
        base_row,
        account_id=account_id,
        name=clean_name if apply_name else None,
        dealer_rights=dealer_rights if apply_dealer else None,
        enabled=enabled if apply_enabled else None,
        blocked_label=blocked_label,
    )
    row["wialon_id"] = user_id
    row["account_id"] = account_id

    if apply_name and clean_name:
        _sync_account_name_in_context(account_id, clean_name)
    _sync_accounts_context_after_update(
        account_id,
        dealer_rights=dealer_rights if apply_dealer else None,
        enabled=enabled if apply_enabled else None,
        blocked_label=blocked_label,
    )
    _upsert_user_list_cache(row)

    prp = user_item.get("prp") if isinstance(user_item.get("prp"), dict) else {}
    global _users_prp_cache
    with _cache_lock:
        if _users_prp_cache and _users_prp_cache[1] > time.monotonic():
            prp_map = dict(_users_prp_cache[0])
            prp_map[user_id] = prp
            _users_prp_cache = (prp_map, _users_prp_cache[1])

    return row


def _unit_custom_fields_search_text(flds: Any) -> str:
    if not isinstance(flds, dict) or not flds:
        return ""
    parts: list[str] = []
    for entry in flds.values():
        if not isinstance(entry, dict):
            continue
        label = str(entry.get("n") or "").strip()
        value = str(entry.get("v") or "").strip()
        if label:
            parts.append(label)
        if value:
            parts.append(value)
    return " ".join(parts)


def _unit_search_haystack(
    *,
    unit_id: int,
    name: str,
    uid: str,
    phone: str,
    custom_fields: str,
) -> str:
    return " ".join(
        part
        for part in (
            name,
            uid,
            phone,
            custom_fields,
            str(unit_id),
        )
        if part
    ).strip()


def _resolve_unit_owners_for_search(
    unit_id: int,
    item: dict[str, Any],
    *,
    sharing_index: dict[int, list[dict[str, Any]]] | None,
    users_normalized: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Cuentas vinculadas a la unidad: monu compartido, cuenta de facturación (bact) o creador (crt)."""
    seen_owners: set[int] = set()
    owners: list[dict[str, Any]] = []

    def add_owner(wialon_id: int, user_id: str, name: str) -> None:
        if wialon_id in seen_owners:
            return
        seen_owners.add(wialon_id)
        owners.append(
            {
                "wialon_id": wialon_id,
                "user_id": user_id or "—",
                "name": name or user_id or "—",
            }
        )

    for owner in (sharing_index or {}).get(int(unit_id), []):
        wid = owner.get("wialon_id")
        if wid is None:
            continue
        add_owner(
            int(wid),
            str(owner.get("user_id") or "—"),
            str(owner.get("name") or owner.get("user_id") or "—"),
        )

    norm_by_id = {
        int(u["wialon_id"]): u for u in users_normalized if u.get("wialon_id") is not None
    }
    norm_by_account: dict[int, list[dict[str, Any]]] = {}
    for user in users_normalized:
        account_id = user.get("account_id")
        if account_id is None:
            continue
        norm_by_account.setdefault(int(account_id), []).append(user)

    bact = item.get("bact")
    if bact is not None:
        for user in norm_by_account.get(int(bact), []):
            wid = user.get("wialon_id")
            if wid is None:
                continue
            add_owner(
                int(wid),
                str(user.get("user_id") or "—"),
                str(user.get("name") or user.get("user_id") or "—"),
            )

    crt = item.get("crt")
    if crt is not None:
        user = norm_by_id.get(int(crt))
        if user and user.get("wialon_id") is not None:
            add_owner(
                int(user["wialon_id"]),
                str(user.get("user_id") or "—"),
                str(user.get("name") or user.get("user_id") or "—"),
            )

    return owners


def fetch_units_search_index(*, use_cache: bool = True) -> list[dict[str, Any]]:
    """Índice unidad → cuentas asignadas para búsqueda en la vista de usuarios."""
    global _units_search_index_cache
    now = time.monotonic()
    if use_cache:
        with _cache_lock:
            if _units_search_index_cache and _units_search_index_cache[1] > now:
                return list(_units_search_index_cache[0])

    sid = get_session()
    users_raw = _users_raw_from_cache()
    users_normalized = _users_normalized_from_cache()
    if not users_raw or not users_normalized:
        fetch_users(use_cache=True)
        users_raw = _users_raw_from_cache() or []
        users_normalized = _users_normalized_from_cache() or []

    sharing_index = _sharing_index_from_cache()
    if sharing_index is None and users_raw and users_normalized:
        sharing_index = _build_unit_sharing_index(users_raw, users_normalized)

    units_index = _get_units_index(sid)
    entries: list[dict[str, Any]] = []
    for unit_id, item in units_index.items():
        name = str(item.get("nm") or "").strip()
        uid = str(item.get("uid") or item.get("uid2") or "").strip()
        phone = str(item.get("ph") or "").strip()
        custom_fields = _unit_custom_fields_search_text(item.get("flds"))
        owners = _resolve_unit_owners_for_search(
            int(unit_id),
            item,
            sharing_index=sharing_index,
            users_normalized=users_normalized,
        )
        entries.append(
            {
                "unit_id": int(unit_id),
                "name": name,
                "uid": uid,
                "phone": phone,
                "custom_fields": custom_fields,
                "search_text": _unit_search_haystack(
                    unit_id=int(unit_id),
                    name=name,
                    uid=uid,
                    phone=phone,
                    custom_fields=custom_fields,
                ),
                "users": owners,
            }
        )

    entries.sort(key=lambda row: (row.get("name") or row.get("uid") or "").lower())
    with _cache_lock:
        _units_search_index_cache = (entries, now + _UNITS_INDEX_TTL_SEC)
    return entries


def fetch_user_units(wialon_user_id: int) -> dict[str, Any]:
    """Unidades asignadas a un usuario Wialon (monitoring units en prp.monu)."""
    user_id = int(wialon_user_id)
    sid = get_session()
    user_login = _user_login_from_cache(user_id)

    if _user_prp_from_cache(user_id) is not None or _users_raw_from_cache() is not None:
        units = _build_units_fast(sid, user_id)
    else:
        units = _build_units_on_demand(sid, user_id, user_login)

    return {
        "user": {
            "wialon_id": user_id,
            "user_id": user_login or "—",
        },
        "count": len(units),
        "units": units,
    }


def _build_units_on_demand(sid: str, user_id: int, user_login: str) -> list[dict[str, Any]]:
    user_resp = _call("core/search_item", {"id": user_id, "flags": USER_FLAGS}, sid=sid)
    if not isinstance(user_resp, dict):
        raise WialonError("Usuario no encontrado en Wialon.")
    user = user_resp.get("item")
    if not isinstance(user, dict):
        raise WialonError("Usuario no encontrado en Wialon.")
    if not user_login:
        user_login = str(user.get("nm") or "").strip()

    users_raw = [user]
    users_normalized = [
        {
            "wialon_id": user_id,
            "user_id": user_login,
            "name": user_login,
        }
    ]
    sharing_index = _build_unit_sharing_index(users_raw, users_normalized)
    units_index = _get_units_index(sid)
    prp = user.get("prp") if isinstance(user.get("prp"), dict) else {}
    unit_ids = _user_unit_ids_from_prp(prp)
    missing_ids = [int(uid) for uid in unit_ids if int(uid) not in units_index]

    if missing_ids:

        def _fetch_unit(uid: int) -> dict[str, Any] | None:
            try:
                resp = _call("core/search_item", {"id": uid, "flags": UNIT_FLAGS}, sid=sid)
            except WialonError:
                return None
            if not isinstance(resp, dict):
                return None
            item = resp.get("item")
            return item if isinstance(item, dict) else None

        for item in _parallel_map(_fetch_unit, missing_ids, max_workers=6):
            if item is None:
                continue
            uid = item.get("id")
            if uid is not None:
                units_index[int(uid)] = item

    hw_names = _get_hw_type_names(sid, _collect_hw_ids_from_units(units_index))
    return _units_for_user(
        wialon_user_id=user_id,
        users_raw=users_raw,
        units_index=units_index,
        sharing_index=sharing_index,
        hw_names=hw_names,
    )


def _parse_custom_fields_list(flds: Any) -> list[dict[str, Any]]:
    if not isinstance(flds, dict):
        return []
    rows: list[dict[str, Any]] = []
    for entry in flds.values():
        if not isinstance(entry, dict):
            continue
        field_id = entry.get("id")
        if field_id is None:
            continue
        rows.append(
            {
                "id": int(field_id),
                "name": str(entry.get("n") or "").strip(),
                "value": str(entry.get("v") or "").strip(),
            }
        )
    rows.sort(key=lambda r: (r.get("name") or "").lower())
    return rows


def _profile_field_value(item: dict[str, Any], field_name: str) -> str:
    pflds = item.get("pflds")
    if not isinstance(pflds, dict):
        return ""
    for entry in pflds.values():
        if not isinstance(entry, dict):
            continue
        if str(entry.get("n") or "").strip() == field_name:
            return str(entry.get("v") or "").strip()
    return ""


def _label_for_vehicle_type_key(key: str, name: str, category_path: list[str]) -> str:
    clean_name = str(name or "").strip()
    if clean_name:
        return clean_name
    if key == "empty_vehicle":
        return "Vehículo"
    if key.startswith("empty_") and category_path:
        return category_path[-1]
    return key.replace("_", " ").strip().title() or key


def _walk_type_library_nodes(
    nodes: Any,
    category_path: list[str],
    out: list[dict[str, str]],
    *,
    seen: set[str],
) -> None:
    if not isinstance(nodes, list):
        return
    for node in nodes:
        if not isinstance(node, dict):
            continue
        key = str(node.get("key") or "").strip()
        name = str(node.get("name") or "").strip()
        children = node.get("items")
        if isinstance(children, list) and children:
            next_path = category_path + [name] if key and name else category_path
            _walk_type_library_nodes(children, next_path, out, seen=seen)
            continue
        if not key or key in seen:
            continue
        seen.add(key)
        category = " › ".join(category_path) if category_path else ""
        out.append(
            {
                "value": key,
                "label": _label_for_vehicle_type_key(key, name, category_path),
                "category": category,
            }
        )


def _parse_type_library_payload(payload: Any) -> list[dict[str, str]]:
    roots: list[Any] = []
    if isinstance(payload, dict):
        items = payload.get("items")
        if isinstance(items, list):
            roots = items
    elif isinstance(payload, list):
        roots = payload
    catalog: list[dict[str, str]] = []
    _walk_type_library_nodes(roots, [], catalog, seen=set())
    catalog.sort(
        key=lambda row: (
            (row.get("category") or "").lower(),
            (row.get("label") or "").lower(),
        )
    )
    return catalog


def _fetch_vehicle_types(sid: str, *, lang: str = "es") -> list[dict[str, str]]:
    global _vehicle_types_cache
    now = time.monotonic()
    with _cache_lock:
        if _vehicle_types_cache and _vehicle_types_cache[1] > now:
            return list(_vehicle_types_cache[0])

    payload = _call("file/type_library", {"lang": lang}, sid=sid)
    catalog = _parse_type_library_payload(payload)
    if not catalog:
        catalog = list(WIALON_VEHICLE_TYPES)
    with _cache_lock:
        _vehicle_types_cache = (catalog, now + _UNITS_INDEX_TTL_SEC)
    return catalog


def _fetch_all_hw_types(sid: str) -> list[dict[str, Any]]:
    global _hw_catalog_cache
    now = time.monotonic()
    with _cache_lock:
        if _hw_catalog_cache and _hw_catalog_cache[1] > now:
            return list(_hw_catalog_cache[0])

    payload = _call(
        "core/get_hw_types",
        {"filterType": "name", "filterValue": "", "includeType": True},
        sid=sid,
    )
    catalog: list[dict[str, Any]] = []
    if isinstance(payload, list):
        for entry in payload:
            if not isinstance(entry, dict) or entry.get("id") is None:
                continue
            catalog.append(
                {
                    "id": int(entry["id"]),
                    "name": str(entry.get("name") or entry.get("hw_category") or "").strip(),
                    "category": str(entry.get("hw_category") or "").strip(),
                }
            )
    catalog.sort(key=lambda r: (r.get("name") or "").lower())
    with _cache_lock:
        _hw_catalog_cache = (catalog, now + _UNITS_INDEX_TTL_SEC)
    return catalog


def fetch_unit_catalogs() -> dict[str, Any]:
    sid = get_session()
    return {
        "hw_types": _fetch_all_hw_types(sid),
        "vehicle_types": _fetch_vehicle_types(sid, lang="es"),
    }


def fetch_users_for_access() -> list[dict[str, Any]]:
    users = fetch_users(use_cache=True)
    return [
        {
            "wialon_id": int(u["wialon_id"]),
            "user_id": u.get("user_id") or "—",
            "name": u.get("name") or u.get("user_id") or "—",
        }
        for u in users
        if u.get("wialon_id") is not None
    ]


def _raw_unit_by_id(unit_id: int) -> dict[str, Any]:
    target = int(unit_id)
    with _cache_lock:
        if _units_index_cache and _units_index_cache[1] > time.monotonic():
            cached = _units_index_cache[0].get(target)
            if cached:
                return cached
    sid = get_session()
    resp = _call("core/search_item", {"id": target, "flags": UNIT_DETAIL_FLAGS}, sid=sid)
    if not isinstance(resp, dict):
        raise WialonError("Unidad no encontrada en Wialon.")
    item = resp.get("item")
    if not isinstance(item, dict):
        raise WialonError("Unidad no encontrada en Wialon.")
    return item


def _unit_access_users(unit_id: int, *, context_user_id: int | None = None) -> list[dict[str, Any]]:
    sharing_index = _sharing_index_from_cache()
    if sharing_index is None:
        users_raw = _users_raw_from_cache() or []
        users_normalized = _users_normalized_from_cache() or []
        if users_raw and users_normalized:
            sharing_index = _build_unit_sharing_index(users_raw, users_normalized)
        else:
            sharing_index = {}
    owners = sharing_index.get(int(unit_id), [])
    if context_user_id is not None:
        owners = [o for o in owners if int(o.get("wialon_id", -1)) != int(context_user_id)]
    return [
        {
            "wialon_id": int(o.get("wialon_id")),
            "user_id": o.get("user_id") or "—",
            "name": o.get("name") or o.get("user_id") or "—",
        }
        for o in owners
        if o.get("wialon_id") is not None and not _is_ignored_sharing_owner(o)
    ]


def _normalize_unit_detail(
    item: dict[str, Any],
    hw_names: dict[int, str],
    *,
    unit_id: int,
    context_user_id: int | None = None,
) -> dict[str, Any]:
    hw_id = item.get("hw")
    hw_int: int | None = None
    if hw_id is not None:
        try:
            hw_int = int(hw_id)
        except (TypeError, ValueError):
            hw_int = None
    uid = str(item.get("uid") or "").strip() or str(item.get("uid2") or "").strip()
    phone = str(item.get("ph") or "").strip()
    unit_type = _profile_field_value(item, "vehicle_class") or _profile_field_value(item, "vehicle_type")
    access_users = _unit_access_users(unit_id, context_user_id=context_user_id)
    status_label, is_active = _unit_status_from_item(item)

    return {
        "wialon_id": int(unit_id),
        "name": str(item.get("nm") or "").strip(),
        "unit_type": unit_type or "",
        "hw_id": hw_int,
        "device_type": (hw_names.get(hw_int, "") if hw_int is not None else "") or "—",
        "uid": uid,
        "phone": phone,
        "status": status_label,
        "is_active": is_active,
        "has_password": bool(str(item.get("psw") or "").strip()),
        "custom_fields": _parse_custom_fields_list(item.get("flds")),
        "access_users": access_users,
        "last_message_at": _format_unix_datetime(int(item["lmsg"]["t"]))
        if isinstance(item.get("lmsg"), dict) and item["lmsg"].get("t")
        else "—",
        "created_at": _format_unix_datetime(int(item["ct"])) if item.get("ct") else "—",
    }


def fetch_unit_detail(unit_id: int, *, context_user_id: int | None = None) -> dict[str, Any]:
    target = int(unit_id)
    sid = get_session()
    item = _raw_unit_by_id(target)
    hw_ids: set[int] = set()
    if item.get("hw") is not None:
        try:
            hw_ids.add(int(item["hw"]))
        except (TypeError, ValueError):
            pass
    hw_names = _get_hw_type_names(sid, hw_ids)
    return _normalize_unit_detail(
        item,
        hw_names,
        unit_id=target,
        context_user_id=context_user_id,
    )


def _patch_units_index_entry(unit_id: int, item: dict[str, Any]) -> None:
    global _units_index_cache
    with _cache_lock:
        if not _units_index_cache or _units_index_cache[1] <= time.monotonic():
            return
        index = dict(_units_index_cache[0])
        index[int(unit_id)] = item
        _units_index_cache = (index, _units_index_cache[1])


def update_wialon_unit(
    unit_id: int,
    *,
    name: str | None = None,
    unit_type: str | None = None,
    hw_id: int | None = None,
    uid: str | None = None,
    phone: str | None = None,
    access_password: str | None = None,
    custom_fields: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    target = int(unit_id)
    sid = get_session()
    item = _raw_unit_by_id(target)

    tasks: list[Callable[[], None]] = []

    if name is not None:
        clean_name = str(name).strip()
        if not clean_name:
            raise WialonError("El nombre de la unidad no puede estar vacío.")

        def _apply_name() -> None:
            _call("item/update_name", {"itemId": target, "name": clean_name}, sid=sid)

        tasks.append(_apply_name)

    if unit_type is not None:
        clean_type = str(unit_type).strip()

        def _apply_unit_type() -> None:
            _call(
                "item/update_profile_field",
                {"itemId": target, "n": "vehicle_class", "v": clean_type},
                sid=sid,
            )

        tasks.append(_apply_unit_type)

    if hw_id is not None or uid is not None:
        current_hw = item.get("hw")
        try:
            current_hw_int = int(current_hw) if current_hw is not None else None
        except (TypeError, ValueError):
            current_hw_int = None
        current_uid = str(item.get("uid") or item.get("uid2") or "").strip()
        new_hw = int(hw_id) if hw_id is not None else current_hw_int
        new_uid = str(uid).strip() if uid is not None else current_uid
        if new_hw is None:
            raise WialonError("Selecciona un tipo de dispositivo.")
        if not new_uid:
            raise WialonError("El ID único no puede estar vacío.")

        def _apply_device() -> None:
            _call(
                "unit/update_device_type",
                {"itemId": target, "deviceTypeId": new_hw, "uniqueId": new_uid},
                sid=sid,
            )

        tasks.append(_apply_device)

    if phone is not None:
        clean_phone = str(phone).strip()

        def _apply_phone() -> None:
            _call(
                "unit/update_phone",
                {"itemId": target, "phoneNumber": clean_phone},
                sid=sid,
            )

        tasks.append(_apply_phone)

    if access_password is not None and str(access_password).strip():
        clean_password = str(access_password).strip()

        def _apply_password() -> None:
            _call(
                "unit/update_access_password",
                {"itemId": target, "accessPassword": clean_password},
                sid=sid,
            )

        tasks.append(_apply_password)

    if custom_fields is not None:
        for field in custom_fields:
            call_mode = str(field.get("callMode") or field.get("call_mode") or "update").strip().lower()
            if call_mode not in ("create", "update", "delete"):
                raise WialonError("callMode de campo personalizado inválido.")
            field_id = field.get("id")
            field_name = str(field.get("name") or field.get("n") or "").strip()
            field_value = str(field.get("value") or field.get("v") or "").strip()
            if call_mode == "delete":
                if field_id is None:
                    raise WialonError("Falta id para eliminar campo personalizado.")
                params = {"itemId": target, "id": int(field_id), "callMode": "delete"}
            else:
                if not field_name:
                    raise WialonError("El nombre del campo personalizado es obligatorio.")
                params = {
                    "itemId": target,
                    "id": int(field_id) if field_id is not None else 0,
                    "callMode": call_mode,
                    "n": field_name,
                    "v": field_value,
                }

            def _apply_field(p: dict[str, Any] = params) -> None:
                _call("item/update_custom_field", p, sid=sid)

            tasks.append(_apply_field)

    if not tasks:
        return fetch_unit_detail(target)

    if len(tasks) == 1:
        tasks[0]()
    else:
        with ThreadPoolExecutor(max_workers=min(4, len(tasks))) as executor:
            futs = [executor.submit(fn) for fn in tasks]
            for fut in futs:
                fut.result()

    refreshed = _call("core/search_item", {"id": target, "flags": UNIT_DETAIL_FLAGS}, sid=sid)
    if isinstance(refreshed, dict) and isinstance(refreshed.get("item"), dict):
        _patch_units_index_entry(target, refreshed["item"])

    global _unit_sharing_cache
    with _cache_lock:
        _unit_sharing_cache = None

    return fetch_unit_detail(target)


def grant_unit_access(unit_id: int, user_id: int, *, access_mask: int | None = None) -> None:
    sid = get_session()
    mask = int(access_mask if access_mask is not None else WIALON_UNIT_ACCESS_DEFAULT)
    _call(
        "user/update_item_access",
        {"userId": int(user_id), "itemId": int(unit_id), "accessMask": mask},
        sid=sid,
    )
    global _unit_sharing_cache, _users_list_cache, _users_raw_cache, _users_prp_cache
    with _cache_lock:
        _unit_sharing_cache = None
        _users_list_cache = None
        _users_raw_cache = None
        _users_prp_cache = None


def revoke_unit_access(unit_id: int, user_id: int) -> None:
    sid = get_session()
    _call(
        "user/update_item_access",
        {"userId": int(user_id), "itemId": int(unit_id), "accessMask": 0},
        sid=sid,
    )
    global _unit_sharing_cache, _users_list_cache, _users_raw_cache, _users_prp_cache
    with _cache_lock:
        _unit_sharing_cache = None
        _users_list_cache = None
        _users_raw_cache = None
        _users_prp_cache = None
