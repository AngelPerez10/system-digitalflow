#!/usr/bin/env bash
# Exit on error
set -o errexit

# Ensure we run from the backend directory
cd "$(dirname "$0")"

# Install dependencies
# Reintentos / timeout: en Render a veces PyPI corta la descarga
# (OSError IncompleteRead) y tumba el build.
export PIP_DEFAULT_TIMEOUT="${PIP_DEFAULT_TIMEOUT:-100}"
export PIP_RETRIES="${PIP_RETRIES:-10}"
python -m pip install --upgrade pip
python -m pip install \
  --retries "$PIP_RETRIES" \
  --timeout "$PIP_DEFAULT_TIMEOUT" \
  --prefer-binary \
  -r requirements.txt

# Chromium. Dependencias de sistema (apt): opcional. En algunos builders (p. ej. Render)
# apt puede fallar con "Read-only file system" — no debe tumbar el build; Chromium
# suele funcionar igual con los libs base de la imagen + flags --no-sandbox en runtime.
if command -v apt-get >/dev/null 2>&1; then
  if apt-get update -qq; then
    python -m playwright install-deps chromium || true
  fi
fi
# Playwright 1.49+ usa chromium_headless_shell para launch(headless=True); hay que
# instalarlo explícitamente. Caché dentro del proyecto para que coincida con runtime
# (ver pdf_render._try_playwright).
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-$(pwd)/.playwright-browsers}"
mkdir -p "$PLAYWRIGHT_BROWSERS_PATH"
python -m playwright install chromium chromium-headless-shell

# Collect static files
python manage.py collectstatic --noinput

# Apply database migrations
python manage.py migrate --noinput
