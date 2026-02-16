#!/usr/bin/env bash
# Exit on error
set -o errexit

# Ensure we run from the backend directory
cd "$(dirname "$0")"

# Install dependencies
python -m pip install --upgrade pip
pip install -r requirements.txt

# Collect static files
python manage.py collectstatic --noinput

# Apply database migrations
python manage.py migrate --noinput
