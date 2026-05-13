#!/usr/bin/env bash
# Exit on error
set -o errexit

# Ensure we run from the backend directory
cd "$(dirname "$0")"

# Install dependencies
python -m pip install --upgrade pip
pip install -r requirements.txt

# Chromium + dependencias del sistema (Render/Linux usa apt; en Windows no aplica).
if command -v apt-get >/dev/null 2>&1; then
  apt-get update -qq
  python -m playwright install-deps chromium || true
fi
python -m playwright install chromium

# Collect static files
python manage.py collectstatic --noinput

# Apply database migrations
python manage.py migrate --noinput
