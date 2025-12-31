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

# Crear un superusuario automáticamente
python manage.py shell <<EOF
from django.contrib.auth.models import User
# Verificar si ya existe el superusuario, si no, crear uno
if not User.objects.filter(username='AngelPerez10').exists():
    User.objects.create_superuser('AngelPerez10', 'angeelp7457@gmail.com', 'PEREZA01FL0')
else:
    print("El superusuario 'AngelPerez10' ya existe.")
EOF
# Importar clientes desde el archivo
python manage.py shell <<EOF
from import_clientes import import_clientes
import_clientes()
EOF
