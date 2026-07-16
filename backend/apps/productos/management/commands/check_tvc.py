"""Diagnóstico TVC sin imprimir el token completo.

Uso:
  python manage.py check_tvc
"""
from __future__ import annotations

from django.conf import settings
from django.core.management.base import BaseCommand
import requests


class Command(BaseCommand):
    help = 'Verifica configuración y conectividad de TVC (sin mostrar el token completo).'

    def handle(self, *args, **options):
        token = (getattr(settings, 'TVC_API_TOKEN', '') or '').strip()
        api_base = (getattr(settings, 'TVC_API_BASE', '') or 'https://api.tvc.mx').rstrip('/')

        self.stdout.write(f'API base: {api_base}')
        self.stdout.write(f'TVC_API_TOKEN set: {bool(token)} (len={len(token)})')
        if token:
            self.stdout.write(f'Token preview: {token[:8]}…{token[-4:]}')

        if not token:
            self.stderr.write(
                self.style.ERROR(
                    'Falta TVC_API_TOKEN. Genera el token en Mi Perfil → API Clientes (tvc.mx) '
                    'y agrégalo al .env / Render Environment.'
                )
            )
            return

        headers = {'Authorization': f'Bearer {token}', 'Accept': 'application/json'}
        try:
            r = requests.get(f'{api_base}/exchange-rates', headers=headers, timeout=20)
        except requests.RequestException as e:
            self.stderr.write(self.style.ERROR(f'exchange-rates conexión falló: {type(e).__name__}: {e}'))
            return

        self.stdout.write(f'exchange-rates HTTP: {r.status_code}')
        if not r.ok:
            self.stderr.write(self.style.ERROR(f'exchange-rates falló: {r.text[:200]}'))
            return

        self.stdout.write(self.style.SUCCESS('TVC API OK (tipo de cambio accesible)'))

        try:
            p = requests.get(
                f'{api_base}/products',
                headers=headers,
                params={'perPage': 1, 'page': 1, 'withPrice': 'true'},
                timeout=25,
            )
            self.stdout.write(f'products HTTP: {p.status_code}')
            if p.ok:
                body = p.json()
                total = body.get('meta', {}).get('total') if isinstance(body, dict) else None
                self.stdout.write(self.style.SUCCESS(f'Catalogo TVC accesible (total={total})'))
            else:
                self.stderr.write(self.style.ERROR(f'products falló: {p.text[:200]}'))
        except requests.RequestException as e:
            self.stderr.write(self.style.ERROR(f'products conexión falló: {type(e).__name__}: {e}'))
