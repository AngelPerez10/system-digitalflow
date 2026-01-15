import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

with connection.cursor() as cursor:
    print("Eliminando historial de migraciones de la app 'clientes'...")
    cursor.execute("DELETE FROM django_migrations WHERE app = 'clientes'")
    print("Historial eliminado.")
