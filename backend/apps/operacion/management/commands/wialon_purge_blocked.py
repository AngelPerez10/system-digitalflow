"""Limpia cuentas Wialon bloqueadas hace más de N días.

Desactiva unidades asignadas y elimina el usuario (no borra el bact compartido).

Uso:
  python manage.py wialon_purge_blocked
  python manage.py wialon_purge_blocked --days=35
  python manage.py wialon_purge_blocked --dry-run
"""
from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from apps.operacion.wialon_client import (
    WIALON_BLOCKED_PURGE_DAYS_DEFAULT,
    WialonError,
    purge_blocked_accounts,
)


class Command(BaseCommand):
    help = (
        "Desactiva unidades y elimina usuarios Wialon bloqueados hace más de N días "
        f"(default {WIALON_BLOCKED_PURGE_DAYS_DEFAULT})."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=WIALON_BLOCKED_PURGE_DAYS_DEFAULT,
            help=f"Días desde el bloqueo (default {WIALON_BLOCKED_PURGE_DAYS_DEFAULT}).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Solo lista candidatos; no desactiva ni elimina.",
        )

    def handle(self, *args, **options):
        days = int(options["days"])
        dry_run = bool(options["dry_run"])
        if days < 1:
            raise CommandError("--days debe ser al menos 1.")

        try:
            result = purge_blocked_accounts(days=days, dry_run=dry_run)
        except WialonError as exc:
            raise CommandError(str(exc)) from exc

        purged = result.get("purged_count", 0)
        skipped = result.get("skipped_count", 0)
        errors = result.get("error_count", 0)
        mode = "dry-run" if dry_run else "aplicado"
        self.stdout.write(
            self.style.SUCCESS(
                f"Purga Wialon ({mode}): {purged} usuario(s), "
                f"{skipped} omitido(s), {errors} error(es)."
            )
        )
        for row in result.get("purged") or []:
            self.stdout.write(
                f"  - {row.get('user_id')} ({row.get('name')}) "
                f"unidades={len(row.get('units_deactivated') or [])}"
            )
        for err in result.get("errors") or []:
            self.stderr.write(
                self.style.ERROR(
                    f"  ! user={err.get('wialon_id')} step={err.get('step')}: {err.get('detail')}"
                )
            )
