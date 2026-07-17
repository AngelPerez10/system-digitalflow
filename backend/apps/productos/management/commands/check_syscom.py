"""Diagnóstico SYSCOM sin imprimir secretos.

Uso:
  python manage.py check_syscom
"""
from __future__ import annotations

import requests
from django.conf import settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Verifica configuración y OAuth de SYSCOM (sin mostrar secretos)."

    def handle(self, *args, **options):
        client_id = (getattr(settings, "SYSCOM_CLIENT_ID", "") or "").strip()
        client_secret = (getattr(settings, "SYSCOM_CLIENT_SECRET", "") or "").strip()
        oauth_url = getattr(settings, "SYSCOM_OAUTH_URL", "") or "https://developers.syscom.mx/oauth/token"
        api_base = (getattr(settings, "SYSCOM_API_BASE", "") or "https://developers.syscom.mx/api/v1").rstrip("/")

        self.stdout.write(f"OAuth URL: {oauth_url}")
        self.stdout.write(f"API base:  {api_base}")
        self.stdout.write(f"CLIENT_ID set: {bool(client_id)} (len={len(client_id)})")
        self.stdout.write(f"CLIENT_SECRET set: {bool(client_secret)} (len={len(client_secret)})")

        if not client_id or not client_secret:
            self.stderr.write(
                self.style.ERROR(
                    "Faltan SYSCOM_CLIENT_ID / SYSCOM_CLIENT_SECRET. "
                    "En Render: Environment → agregarlas → redeploy."
                )
            )
            return

        try:
            r = requests.post(
                oauth_url,
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "grant_type": "client_credentials",
                },
                timeout=(10, 35),
            )
        except requests.RequestException as e:
            self.stderr.write(self.style.ERROR(f"OAuth conexión falló: {type(e).__name__}: {e}"))
            return

        self.stdout.write(f"OAuth HTTP: {r.status_code}")
        try:
            body = r.json()
        except Exception:
            body = {}

        token = body.get("access_token") if isinstance(body, dict) else None
        if not r.ok or not token:
            err = ""
            if isinstance(body, dict):
                err = str(body.get("error_description") or body.get("error") or body.get("detail") or "")
            self.stderr.write(self.style.ERROR(f"OAuth rechazado: {err or r.text[:200]}"))
            return

        self.stdout.write(self.style.SUCCESS("OAuth OK (token recibido)"))

        try:
            t = requests.get(
                f"{api_base}/tipocambio",
                headers={"Authorization": f"Bearer {token}"},
                timeout=20,
            )
            self.stdout.write(f"tipocambio HTTP: {t.status_code}")
            if t.ok:
                self.stdout.write(self.style.SUCCESS("SYSCOM API OK"))
            else:
                self.stderr.write(self.style.ERROR(f"tipocambio falló: {t.text[:200]}"))
        except requests.RequestException as e:
            self.stderr.write(self.style.ERROR(f"tipocambio conexión falló: {type(e).__name__}: {e}"))
