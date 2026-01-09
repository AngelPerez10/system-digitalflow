from __future__ import annotations

import ast
import csv
from datetime import datetime
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.clientes.models import Cliente
from apps.ordenes.models import Orden


class Command(BaseCommand):
    help = "Importa órdenes desde un archivo TSV (tab-separated) con encabezados."

    def add_arguments(self, parser):
        parser.add_argument(
            "path",
            type=str,
            help="Ruta al archivo TSV (ej: backend/ordenes)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="No escribe en la BD, solo valida y muestra conteo.",
        )
        parser.add_argument(
            "--update-existing",
            action="store_true",
            help="Si existe una Orden con el mismo idx, actualiza campos (por default solo crea).",
        )

    def _parse_date(self, s: str | None):
        s = (s or "").strip()
        if not s:
            return None
        try:
            return datetime.strptime(s[:10], "%Y-%m-%d").date()
        except Exception:
            return None

    def _parse_time(self, s: str | None):
        s = (s or "").strip()
        if not s:
            return None
        # Acepta HH:MM o HH:MM:SS
        for fmt in ("%H:%M:%S", "%H:%M"):
            try:
                return datetime.strptime(s, fmt).time()
            except Exception:
                pass
        return None

    def _parse_status(self, s: str | None):
        v = (s or "").strip().lower()
        if v in ("resuelto", "resolved"):
            return "resuelto"
        if v in ("pendiente", "pending"):
            return "pendiente"
        # En el export viene como 'Pendiente'/'Resuelto'
        if v.startswith("resuel"):
            return "resuelto"
        return "pendiente"

    def _parse_servicios(self, s: str | None):
        v = (s or "").strip()
        if not v:
            return []
        # En el TSV parece venir como string simple (ej: 'ALARMAS').
        # Si viene separado por comas/; también lo soportamos.
        if "," in v:
            parts = [p.strip() for p in v.split(",") if p.strip()]
            return parts
        if ";" in v:
            parts = [p.strip() for p in v.split(";") if p.strip()]
            return parts
        return [v]

    def _parse_list_literal(self, s: str | None):
        v = (s or "").strip()
        if not v:
            return []
        try:
            parsed = ast.literal_eval(v)
            if isinstance(parsed, list):
                return parsed
            return []
        except Exception:
            return []

    def handle(self, *args, **options):
        path = Path(options["path"]).expanduser().resolve()
        dry_run = bool(options["dry_run"])
        update_existing = bool(options["update_existing"])

        if not path.exists():
            raise SystemExit(f"No existe el archivo: {path}")

        created = 0
        updated = 0
        skipped = 0
        errors = 0

        with path.open("r", encoding="utf-8", errors="ignore", newline="") as f:
            reader = csv.DictReader(f, delimiter="\t")
            if not reader.fieldnames:
                raise SystemExit("El TSV no tiene encabezados")

            # Validar encabezados mínimos
            required = {
                "Idx",
                "cliente",
                "direccion",
                "telefono_cliente",
                "problematica",
                "servicios_realizados",
                "status",
                "comentario_tecnico",
                "fecha_inicio",
                "hora_inicio",
                "fecha_finalizacion",
                "hora_termino",
                "nombre_encargado",
                "nombre_cliente",
                "fotos_urls",
                "firma_encargado_url",
                "firma_cliente_url",
            }
            missing = sorted(list(required - set(reader.fieldnames)))
            if missing:
                raise SystemExit(f"Faltan columnas en el TSV: {missing}")

            with transaction.atomic():
                for i, row in enumerate(reader, start=2):
                    try:
                        idx_raw = (row.get("Idx") or "").strip()
                        if not idx_raw:
                            skipped += 1
                            continue
                        try:
                            idx = int(idx_raw)
                        except Exception:
                            skipped += 1
                            continue

                        cliente_name = (row.get("cliente") or "").strip() or None
                        direccion = (row.get("direccion") or "").strip() or None
                        telefono_cliente = (row.get("telefono_cliente") or "").strip() or None
                        problematica = (row.get("problematica") or "").strip() or None
                        comentario_tecnico = (row.get("comentario_tecnico") or "").strip() or None
                        nombre_encargado = (row.get("nombre_encargado") or "").strip() or None
                        nombre_cliente = (row.get("nombre_cliente") or "").strip() or None

                        servicios = self._parse_servicios(row.get("servicios_realizados"))
                        status = self._parse_status(row.get("status"))

                        fecha_inicio = self._parse_date(row.get("fecha_inicio"))
                        hora_inicio = self._parse_time(row.get("hora_inicio"))
                        fecha_finalizacion = self._parse_date(row.get("fecha_finalizacion"))
                        hora_termino = self._parse_time(row.get("hora_termino"))

                        fotos_urls = self._parse_list_literal(row.get("fotos_urls"))
                        firma_encargado_url = (row.get("firma_encargado_url") or "").strip() or None
                        firma_cliente_url = (row.get("firma_cliente_url") or "").strip() or None

                        cliente_fk = None
                        if cliente_name:
                            cliente_fk = Cliente.objects.filter(nombre__iexact=cliente_name).first()

                        defaults = {
                            "cliente_id": cliente_fk,
                            "cliente": cliente_name,
                            "direccion": direccion,
                            "telefono_cliente": telefono_cliente,
                            "problematica": problematica,
                            "servicios_realizados": servicios,
                            "status": status,
                            "comentario_tecnico": comentario_tecnico,
                            "fecha_inicio": fecha_inicio,
                            "hora_inicio": hora_inicio,
                            "fecha_finalizacion": fecha_finalizacion,
                            "hora_termino": hora_termino,
                            "nombre_encargado": nombre_encargado,
                            "nombre_cliente": nombre_cliente,
                            "fotos_urls": fotos_urls,
                            "firma_encargado_url": firma_encargado_url,
                            "firma_cliente_url": firma_cliente_url,
                        }

                        existing = Orden.objects.filter(idx=idx).first()
                        if existing:
                            if not update_existing:
                                skipped += 1
                                continue
                            for k, v in defaults.items():
                                setattr(existing, k, v)
                            if not dry_run:
                                existing.save()
                            updated += 1
                            continue

                        if not dry_run:
                            Orden.objects.create(idx=idx, **defaults)
                        created += 1

                    except Exception as e:
                        errors += 1
                        self.stderr.write(f"Línea {i}: error importando orden idx={row.get('Idx')}: {e}")

                if dry_run:
                    transaction.set_rollback(True)

        self.stdout.write(
            f"Import terminado. created={created}, updated={updated}, skipped={skipped}, errors={errors}"
        )

        if dry_run:
            self.stdout.write("DRY RUN: no se escribieron cambios en la base de datos.")
            return

