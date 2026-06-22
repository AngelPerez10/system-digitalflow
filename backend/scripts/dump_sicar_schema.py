"""One-off SICAR schema dump for factura CFDI integration."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django

django.setup()

from apps.cotizaciones.sicar_db import _connect_sicar, _sicar_db_config

SKIP_BLOB = {"cfdi", "cbb", "selloDigital", "selloSat", "cadenaOriginal"}


def main():
    cfg = _sicar_db_config()
    conn = _connect_sicar(cfg, read_timeout=30)
    cur = conn.cursor()
    fcf_id = int(sys.argv[1]) if len(sys.argv) > 1 else 3988

    out = {"fcf_id": fcf_id, "tables": {}, "samples": {}, "related_tables": {}}

    for table in ("facturacfdi", "facturacfdiimp", "facturacfdiven", "xmlcfdi", "cliente"):
        cur.execute(f"SHOW COLUMNS FROM `{table}`")
        out["tables"][table] = [
            {
                "field": r["Field"],
                "type": r["Type"],
                "null": r["Null"],
                "key": r["Key"],
                "default": r["Default"],
            }
            for r in cur.fetchall()
        ]

    cur.execute("SELECT * FROM facturacfdi WHERE fcf_id=%s", (fcf_id,))
    fcf = cur.fetchone()
    if not fcf:
        print(json.dumps({"error": "fcf not found"}, indent=2))
        return
    out["samples"]["facturacfdi"] = {
        k: (f"<blob {len(v)}>" if isinstance(v, (bytes, bytearray)) else v)
        for k, v in fcf.items()
        if k not in SKIP_BLOB
    }

    cur.execute("SELECT * FROM facturacfdiimp WHERE fcf_id=%s ORDER BY orden, imp_id", (fcf_id,))
    out["samples"]["facturacfdiimp"] = cur.fetchall()

    cur.execute("SELECT * FROM facturacfdiven WHERE fcf_id=%s", (fcf_id,))
    out["samples"]["facturacfdiven"] = cur.fetchall()

    xcf_id = fcf.get("xcf_id")
    if xcf_id:
        cur.execute(
            "SELECT xcf_id, LENGTH(cfdi) AS xml_len, LENGTH(cbb) AS qr_len FROM xmlcfdi WHERE xcf_id=%s",
            (xcf_id,),
        )
        out["samples"]["xmlcfdi_meta"] = cur.fetchone()

    for pattern in ("%pac%", "%cert%", "%folio%", "%serie%", "%empresa%", "%cfdi%", "%concepto%", "%detalle%"):
        cur.execute(f"SHOW TABLES LIKE '{pattern}'")
        out["related_tables"][pattern] = [list(r.values())[0] for r in cur.fetchall()]

    for extra in ("seriecfdi", "empresa", "detallesolcfdi"):
        if extra not in out["tables"]:
            cur.execute(f"SHOW COLUMNS FROM `{extra}`")
            out["tables"][extra] = [
                {
                    "field": r["Field"],
                    "type": r["Type"],
                    "null": r["Null"],
                    "key": r["Key"],
                    "default": r["Default"],
                }
                for r in cur.fetchall()
            ]
        cur.execute(f"SELECT * FROM `{extra}` LIMIT 5")
        rows = []
        for r in cur.fetchall():
            row = {}
            for k, v in r.items():
                if isinstance(v, (bytes, bytearray)):
                    row[k] = f"<blob {len(v)}>"
                else:
                    row[k] = v
            rows.append(row)
        out["samples"][extra] = rows

    conn.close()
    print(json.dumps(out, indent=2, default=str))


if __name__ == "__main__":
    main()
