"""Conexión y utilidades compartidas para MySQL SICAR."""
from __future__ import annotations

import logging
import os
import threading
import time
from typing import Any

import pymysql

logger = logging.getLogger(__name__)

_tls = threading.local()


def _sicar_db_config() -> dict:
    return {
        "host": os.environ.get("SICAR_DB_HOST", "").strip(),
        "port": int(os.environ.get("SICAR_DB_PORT", "3306") or 3306),
        "user": os.environ.get("SICAR_DB_USER", "").strip(),
        "password": os.environ.get("SICAR_DB_PASSWORD", ""),
        "database": os.environ.get("SICAR_DB_NAME", "sicar").strip(),
    }


def _is_retryable_connect_error(exc: Exception) -> bool:
    if not isinstance(exc, pymysql.err.OperationalError) or not exc.args:
        return False
    if exc.args[0] != 2003:
        return False
    msg = str(exc.args[1] if len(exc.args) > 1 else exc).lower()
    return "timed out" in msg or "can't connect" in msg or "connection refused" in msg


def _connection_key(cfg: dict, read_timeout: int) -> tuple:
    return (cfg["host"], cfg["port"], cfg["user"], cfg["database"], read_timeout)


def _clear_thread_sicar_connection() -> None:
    conn = getattr(_tls, "sicar_conn", None)
    _tls.sicar_conn = None
    _tls.sicar_conn_key = None
    if conn is not None:
        try:
            conn.close()
        except Exception:
            pass


def _is_production_runtime() -> bool:
    raw = os.environ.get("DEBUG", "").strip().lower()
    return raw not in ("true", "1", "yes", "on")


def _is_private_db_host(host: str) -> bool:
    h = (host or "").strip().lower()
    if h in ("localhost", "127.0.0.1"):
        return True
    if h.startswith("192.168.") or h.startswith("10."):
        return True
    if h.startswith("172."):
        try:
            second = int(h.split(".")[1])
            return 16 <= second <= 31
        except (IndexError, ValueError):
            return False
    return False


def _sicar_connect_policy() -> tuple[int, int, int]:
    """(connect_timeout_s, max_attempts, retry_delay_ms). En producción falla rápido (< timeout Gunicorn)."""
    if _is_production_runtime():
        return (
            sicar_setting_int("SICAR_DB_CONNECT_TIMEOUT", 5),
            max(1, sicar_setting_int("SICAR_DB_CONNECT_RETRIES", 1)),
            max(0, sicar_setting_int("SICAR_DB_CONNECT_RETRY_DELAY_MS", 0)),
        )
    return (
        sicar_setting_int("SICAR_DB_CONNECT_TIMEOUT", 12),
        max(1, sicar_setting_int("SICAR_DB_CONNECT_RETRIES", 3)),
        max(0, sicar_setting_int("SICAR_DB_CONNECT_RETRY_DELAY_MS", 500)),
    )


def _open_sicar_connection(cfg: dict, read_timeout: int = 10):
    connect_timeout, max_attempts, retry_delay_ms = _sicar_connect_policy()

    last_exc: Exception | None = None
    for attempt in range(1, max_attempts + 1):
        try:
            return pymysql.connect(
                host=cfg["host"],
                port=cfg["port"],
                user=cfg["user"],
                password=cfg["password"],
                database=cfg["database"],
                charset="utf8mb4",
                cursorclass=pymysql.cursors.DictCursor,
                connect_timeout=connect_timeout,
                read_timeout=read_timeout,
                write_timeout=read_timeout,
            )
        except pymysql.err.OperationalError as exc:
            last_exc = exc
            if attempt >= max_attempts or not _is_retryable_connect_error(exc):
                raise
            delay_s = (retry_delay_ms * attempt) / 1000.0
            logger.warning(
                "Reintento %s/%s conexión SICAR (%s:%s) tras error transitorio: %s",
                attempt,
                max_attempts,
                cfg.get("host"),
                cfg.get("port"),
                exc,
            )
            if delay_s > 0:
                time.sleep(delay_s)

    if last_exc is not None:
        raise last_exc
    raise pymysql.err.OperationalError(2003, "No se pudo conectar a SICAR.")


def _connect_sicar(cfg: dict, read_timeout: int = 10):
    """Conexión reutilizable por hilo (evita TCP/VPN en cada petición GET)."""
    key = _connection_key(cfg, read_timeout)
    conn = getattr(_tls, "sicar_conn", None)
    stored_key = getattr(_tls, "sicar_conn_key", None)
    if conn is not None and stored_key == key:
        try:
            conn.ping(reconnect=True)
            return conn
        except Exception:
            _clear_thread_sicar_connection()

    conn = _open_sicar_connection(cfg, read_timeout)
    _tls.sicar_conn = conn
    _tls.sicar_conn_key = key
    return conn


def connect_sicar_exclusive(cfg: dict, read_timeout: int = 10):
    """Conexión nueva para transacciones de escritura."""
    _clear_thread_sicar_connection()
    return _open_sicar_connection(cfg, read_timeout)


def release_sicar_connection(conn) -> None:
    """Devuelve la conexión al pool del hilo (no cerrar tras lecturas)."""
    if conn is not getattr(_tls, "sicar_conn", None):
        try:
            conn.close()
        except Exception:
            pass
        return
    try:
        conn.ping(reconnect=True)
    except Exception:
        _clear_thread_sicar_connection()


def close_sicar_connection(conn) -> None:
    """Cierra conexión exclusiva y limpia el pool del hilo."""
    if conn is getattr(_tls, "sicar_conn", None):
        _clear_thread_sicar_connection()
        return
    try:
        conn.close()
    except Exception:
        pass


def _render_private_host_hint(host: str) -> str:
    if not os.environ.get("RENDER") or not _is_private_db_host(host):
        return ""
    return (
        " En Render el backend no alcanza IPs privadas (192.168.x / 10.x): "
        "necesitas túnel (Tailscale, Cloudflare Tunnel) o MySQL con IP pública y firewall."
    )


def _sicar_error_detail(exc: Exception, cfg: dict | None = None) -> str:
    host = str((cfg or {}).get("host") or "SICAR")
    port = int((cfg or {}).get("port") or 3306)
    render_hint = _render_private_host_hint(host)

    if isinstance(exc, pymysql.err.OperationalError) and exc.args:
        code = exc.args[0]
        msg = str(exc.args[1] if len(exc.args) > 1 else exc).lower()
        if code == 2003:
            if "timed out" in msg:
                return (
                    f"No se alcanza el servidor MySQL de SICAR ({host}:{port}): tiempo de espera agotado. "
                    "Comprueba VPN o red corporativa, que MySQL esté activo, reglas de firewall "
                    f"y las variables SICAR_DB_* en el entorno del backend.{render_hint}"
                )
            return (
                f"No se puede conectar a SICAR en {host}:{port}. "
                f"Verifica host, puerto, firewall y SICAR_DB_* en el entorno del backend.{render_hint}"
            )
        if code == 1045:
            return "Credenciales SICAR incorrectas (SICAR_DB_USER / SICAR_DB_PASSWORD)."
        if code == 1049:
            db = (cfg or {}).get("database") or "sicar"
            return f"Base de datos '{db}' no existe en el servidor SICAR (SICAR_DB_NAME)."

    return "No se pudo consultar SICAR. Verifica host, puerto, credenciales y conectividad de red."


def sicar_setting_str(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def sicar_setting_int(name: str, default: int) -> int:
    raw = os.environ.get(name, "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def fetch_one(cursor, sql: str, params: tuple | list = ()) -> dict[str, Any] | None:
    cursor.execute(sql, params)
    return cursor.fetchone()


def fetch_all(cursor, sql: str, params: tuple | list = ()) -> list[dict[str, Any]]:
    cursor.execute(sql, params)
    return list(cursor.fetchall() or [])


def execute(cursor, sql: str, params: tuple | list = ()) -> int:
    return cursor.execute(sql, params)


def last_insert_id(cursor) -> int:
    row = fetch_one(cursor, "SELECT LAST_INSERT_ID() AS id")
    return int((row or {}).get("id") or 0)
