#!/usr/bin/env bash
# Exit on error
set -o errexit

# Ensure we run from the backend directory
cd "$(dirname "$0")"

# Install dependencies
python -m pip install --upgrade pip
pip install -r requirements.txt

# Chromium. Dependencias de sistema (apt): opcional. En algunos builders (p. ej. Render)
# apt puede fallar con "Read-only file system" — no debe tumbar el build; Chromium
# suele funcionar igual con los libs base de la imagen + flags --no-sandbox en runtime.
if command -v apt-get >/dev/null 2>&1; then
  if apt-get update -qq; then
    python -m playwright install-deps chromium || true
  fi
fi
python -m playwright install chromium

# Collect static files
python manage.py collectstatic --noinput

# Apply database migrations
python manage.py migrate --noinput
