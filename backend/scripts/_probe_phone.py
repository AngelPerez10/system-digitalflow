import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django

django.setup()

from apps.cotizaciones.sicar_db import _connect_sicar, _sicar_db_config

cfg = _sicar_db_config()
conn = _connect_sicar(cfg, read_timeout=15)
cur = conn.cursor()
cur.execute("SHOW COLUMNS FROM cliente")
cols = [r["Field"] for r in cur.fetchall()]
print("cliente phone cols:", [c for c in cols if "tel" in c.lower() or "cel" in c.lower() or "phone" in c.lower()])
cur.execute(
    "SELECT cli_id, nombre, telefono, celular FROM cliente WHERE status=1 AND (telefono != '' OR celular != '') LIMIT 5"
)
for r in cur.fetchall():
    print("sample:", r)
conn.close()
