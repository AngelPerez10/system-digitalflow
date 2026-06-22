"""Conexión y utilidades compartidas para MySQL SICAR."""
from __future__ import annotations

import os
from typing import Any

import pymysql


def _sicar_db_config() -> dict:
    return {
        "host": os.environ.get("SICAR_DB_HOST", "").strip(),
        "port": int(os.environ.get("SICAR_DB_PORT", "3306") or 3306),
        "user": os.environ.get("SICAR_DB_USER", "").strip(),
        "password": os.environ.get("SICAR_DB_PASSWORD", ""),
        "database": os.environ.get("SICAR_DB_NAME", "sicar").strip(),
    }


def _connect_sicar(cfg: dict, read_timeout: int = 10):
    return pymysql.connect(
        host=cfg["host"],
        port=cfg["port"],
        user=cfg["user"],
        password=cfg["password"],
        database=cfg["database"],
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=6,
        read_timeout=read_timeout,
        write_timeout=read_timeout,
    )


def _sicar_error_detail(exc: Exception, cfg: dict | None = None) -> str:
    host = str((cfg or {}).get("host") or "SICAR")
    port = int((cfg or {}).get("port") or 3306)

    if isinstance(exc, pymysql.err.OperationalError) and exc.args:
        code = exc.args[0]
        msg = str(exc.args[1] if len(exc.args) > 1 else exc).lower()
        if code == 2003:
            if "timed out" in msg:
                return (
                    f"No se alcanza el servidor MySQL de SICAR ({host}:{port}): tiempo de espera agotado. "
                    "Comprueba VPN o red corporativa, que MySQL esté activo, reglas de firewall "
                    "y las variables SICAR_DB_* en backend/.env."
                )
            return (
                f"No se puede conectar a SICAR en {host}:{port}. "
                "Verifica host, puerto, firewall y SICAR_DB_* en backend/.env."
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
