import json

from django.core.management.base import BaseCommand

from apps.cotizaciones.sicar_cfdi_sign import csd_row_label, verify_csd_key_pair
from apps.cotizaciones.sicar_db import _connect_sicar, _sicar_db_config, close_sicar_connection, fetch_all, fetch_one


class Command(BaseCommand):
    help = "Lista sellodigital y verifica cuál puede usar DigitalFlow para firmar."

    def handle(self, *args, **options):
        cfg = _sicar_db_config()
        missing = [k for k in ("host", "user", "password", "database") if not cfg.get(k)]
        if missing:
            self.stderr.write(self.style.ERROR(f"Faltan variables SICAR: {', '.join(missing)}"))
            return

        conn = None
        try:
            conn = _connect_sicar(cfg, read_timeout=15)
            cursor = conn.cursor()
            rows = fetch_all(
                cursor,
                """
                SELECT *
                FROM sellodigital
                ORDER BY seleccionado DESC, sdi_id DESC
                """,
            )
            if not rows:
                self.stderr.write(self.style.ERROR("La tabla sellodigital está vacía."))
                return

            active = fetch_one(
                cursor,
                """
                SELECT *
                FROM sellodigital
                WHERE seleccionado = 1
                ORDER BY sdi_id DESC
                LIMIT 1
                """,
            )

            catalog = []
            for row in rows:
                report = verify_csd_key_pair(row.get("fCer"), row.get("fKey"), str(row.get("pwd") or ""))
                catalog.append(
                    {
                        "label": csd_row_label(row),
                        "seleccionado": int(row.get("seleccionado") or 0),
                        **report,
                    }
                )

            payload = {
                "active_for_digitalflow": csd_row_label(active) if active else None,
                "rows": catalog,
            }
            self.stdout.write(json.dumps(payload, ensure_ascii=False, indent=2))

            active_report = next((r for r in catalog if r.get("seleccionado") == 1), None)
            if not active_report:
                self.stdout.write(
                    self.style.WARNING(
                        "Ningún CSD tiene seleccionado = 1. En SICAR abre Configuración → Sellos y pulsa Elegir (F7)."
                    )
                )
            elif active_report.get("can_decrypt"):
                self.stdout.write(self.style.SUCCESS("El CSD activo en MySQL sí puede firmar en DigitalFlow."))
            else:
                self.stdout.write(
                    self.style.WARNING(
                        "SICAR puede timbrar en pantalla pero DigitalFlow lee otro CSD o una llave distinta en MySQL. "
                        "Pulsa Elegir (F7) en el CSD INTERPRO 2024 y vuelve a ejecutar este comando."
                    )
                )
        except Exception as exc:
            self.stderr.write(self.style.ERROR(f"Error consultando SICAR: {exc}"))
        finally:
            if conn is not None:
                close_sicar_connection(conn)
