import os
import django
from django.db import connection, utils
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

with connection.cursor() as cursor:
    print("Insertando registro de 0001_initial para 'clientes'...")
    try:
        cursor.execute(
            "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, %s)",
            ['clientes', '0001_initial', timezone.now()]
        )
        print("Registro insertado.")
    except utils.IntegrityError:
        print("El registro ya existe. Actualizando timestamp...")
        cursor.execute(
            "UPDATE django_migrations SET applied = %s WHERE app = %s AND name = %s",
            [timezone.now(), 'clientes', '0001_initial']
        )
        print("Registro actualizado.")
