import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.cotizaciones.sicar_db import _connect_sicar, _sicar_db_config, fetch_all

c = _connect_sicar(_sicar_db_config(), 10)
cur = c.cursor()
rows = fetch_all(cur, "SHOW TABLES")
names = [list(r.values())[0] for r in rows]
hits = [n for n in names if "cotiz" in n.lower() or "presup" in n.lower() or "proforma" in n.lower() or "detalle" in n.lower() and "cot" in n.lower()]
print("hits:", hits)
for t in hits[:12]:
    cols = fetch_all(cur, f"SHOW COLUMNS FROM `{t}`")
    print(t, [x["Field"] for x in cols])
c.close()
