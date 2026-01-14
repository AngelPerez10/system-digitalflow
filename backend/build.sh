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

# Importar órdenes desde el archivo TSV (si existe)
if [ -f "ordenes" ]; then
    echo "Importando órdenes desde archivo TSV..."
    python manage.py import_ordenes ordenes --update-existing
    echo "✓ Importación de órdenes completada"
fi

# Renumerar órdenes para que comiencen desde 5000
echo "Renumerando órdenes..."
python manage.py renumerar_ordenes
echo "✓ Renumeración de órdenes completada"

