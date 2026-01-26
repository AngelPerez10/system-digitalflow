from __future__ import annotations

import re
from decimal import Decimal
from pathlib import Path

from django.core.management.base import BaseCommand

from apps.productos.models import Producto


class Command(BaseCommand):
    help = "Importa productos desde backend/Productos.txt (tabla Markdown) de forma idempotente."

    def add_arguments(self, parser):
        parser.add_argument(
            "--file",
            default=str(Path(__file__).resolve().parents[4] / "Productos.txt"),
            help="Ruta al archivo Productos.txt",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="No escribe en BD; solo muestra conteos.",
        )

    def handle(self, *args, **options):
        file_path = Path(options["file"]).resolve()
        dry_run = bool(options["dry_run"])

        if not file_path.exists():
            self.stderr.write(self.style.ERROR(f"No existe el archivo: {file_path}"))
            return

        created = 0
        updated = 0
        skipped = 0
        errors = 0

        lines = file_path.read_text(encoding="utf-8", errors="ignore").splitlines()

        # Espera líneas con formato:
        # | Nombre | Modelo | DESCRIPCION | PRECIO |
        # | ... |
        row_re = re.compile(r"^\|(?P<cols>.+)\|\s*$")

        def parse_decimal(val: str) -> Decimal | None:
            s = (val or "").strip()
            if not s:
                return None
            # quitar comas y símbolos
            s = s.replace(",", "")
            s = s.replace("$", "")
            try:
                return Decimal(s)
            except Exception:
                return None

        for raw in lines:
            line = raw.strip()
            if not line.startswith("|"):
                continue

            m = row_re.match(line)
            if not m:
                continue

            cols = [c.strip() for c in m.group("cols").split("|")]

            # saltar header y separador
            if len(cols) >= 4 and cols[0].lower() == "nombre" and cols[1].lower() == "modelo":
                continue
            if all(set(c) <= {"-", ":"} for c in cols if c):
                continue

            if len(cols) < 4:
                skipped += 1
                continue

            nombre, modelo, descripcion, precio = cols[0], cols[1], cols[2], cols[3]

            nombre = (nombre or "").strip()
            if not nombre:
                skipped += 1
                continue

            modelo = (modelo or "").strip()
            descripcion = (descripcion or "").strip()
            precio_dec = parse_decimal(precio)

            try:
                # Clave idempotente: nombre + modelo
                qs = Producto.objects.filter(nombre=nombre, modelo=modelo)
                obj = qs.first()

                if obj is None:
                    if dry_run:
                        created += 1
                        continue

                    obj = Producto(
                        nombre=nombre,
                        modelo=modelo,
                        descripcion=descripcion,
                        precio_venta=precio_dec,
                        categoria="Producto",
                        unidad="Pieza",
                        proveedor="Por definir",
                        punto_pedido=1,
                        stock_inicial=1,
                        stock_minimo=1,
                        stock=0,
                    )
                    obj.save()
                    created += 1
                else:
                    changed = False

                    if (obj.descripcion or "").strip() != descripcion:
                        obj.descripcion = descripcion
                        changed = True

                    if (obj.precio_venta is None and precio_dec is not None) or (
                        obj.precio_venta is not None and precio_dec is not None and obj.precio_venta != precio_dec
                    ):
                        obj.precio_venta = precio_dec
                        changed = True

                    # si no tiene categoria/unidad, fijamos defaults
                    if not (obj.categoria or "").strip():
                        obj.categoria = "Producto"
                        changed = True
                    if not (obj.unidad or "").strip():
                        obj.unidad = "Pieza"
                        changed = True
                    if not (obj.proveedor or "").strip():
                        obj.proveedor = "Por definir"
                        changed = True

                    if changed:
                        if not dry_run:
                            obj.save()
                        updated += 1
                    else:
                        skipped += 1

            except Exception as e:
                errors += 1
                self.stderr.write(self.style.WARNING(f"Error procesando fila: {line[:160]} | {e}"))

        self.stdout.write(
            self.style.SUCCESS(
                f"Import terminado. created={created} updated={updated} skipped={skipped} errors={errors} dry_run={dry_run} file={file_path}"
            )
        )
