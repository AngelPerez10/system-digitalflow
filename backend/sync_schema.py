import os
import django
from django.db import connection

# Configure Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def add_column_if_not_exists(table, column, definition):
    with connection.cursor() as cursor:
        # Check if column exists
        cursor.execute(f"""
            SELECT count(*) 
            FROM information_schema.columns 
            WHERE table_name='{table}' AND column_name='{column}'
        """)
        exists = cursor.fetchone()[0] > 0
        
        if not exists:
            print(f"Adding column {column} to {table}...")
            try:
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
                print(f"  Column {column} added successfully.")
            except Exception as e:
                print(f"  Error adding column {column}: {e}")
        else:
            print(f"Column {column} already exists in {table}.")

def sync_clientes():
    print("Syncing 'clientes_cliente' table...")
    # These are the columns expected in the new Cliente model
    cols = [
        ('giro', "varchar(150) NOT NULL DEFAULT ''"),
        ('rfc', "varchar(13) NOT NULL DEFAULT ''"),
        ('curp', "varchar(18) NOT NULL DEFAULT ''"),
        ('correo', "varchar(254) NOT NULL DEFAULT ''"),
        ('calle', "varchar(200) NOT NULL DEFAULT ''"),
        ('numero_exterior', "varchar(50) NOT NULL DEFAULT ''"),
        ('interior', "varchar(50) NOT NULL DEFAULT ''"),
        ('colonia', "varchar(150) NOT NULL DEFAULT ''"),
        ('localidad', "varchar(150) NOT NULL DEFAULT ''"),
        ('municipio', "varchar(150) NOT NULL DEFAULT ''"),
        ('codigo_postal', "varchar(20) NOT NULL DEFAULT ''"),
        ('ciudad', "varchar(120) NOT NULL DEFAULT ''"),
        ('pais', "varchar(120) NOT NULL DEFAULT ''"),
        ('estado', "varchar(120) NOT NULL DEFAULT ''"),
        ('aplica_retenciones', "boolean NOT NULL DEFAULT FALSE"),
        ('desglosar_ieps', "boolean NOT NULL DEFAULT FALSE"),
        ('numero_precio', "varchar(20) NOT NULL DEFAULT '1'"),
        ('limite_credito', "numeric(12,2) NOT NULL DEFAULT 0.00"),
        ('dias_credito', "integer NOT NULL DEFAULT 0"),
        ('tipo', "varchar(20) NOT NULL DEFAULT 'EMPRESA'"),
        ('notas', "text NOT NULL DEFAULT ''"),
        ('descuento_pct', "numeric(5,2)"),
        ('portal_web', "varchar(255) NOT NULL DEFAULT ''"),
        ('nombre_facturacion', "varchar(200) NOT NULL DEFAULT ''"),
        ('numero_facturacion', "varchar(50) NOT NULL DEFAULT ''"),
        ('domicilio_facturacion', "text NOT NULL DEFAULT ''"),
        ('calle_envio', "varchar(200) NOT NULL DEFAULT ''"),
        ('numero_envio', "varchar(50) NOT NULL DEFAULT ''"),
        ('colonia_envio', "varchar(150) NOT NULL DEFAULT ''"),
        ('codigo_postal_envio', "varchar(20) NOT NULL DEFAULT ''"),
        ('pais_envio', "varchar(120) NOT NULL DEFAULT ''"),
        ('estado_envio', "varchar(120) NOT NULL DEFAULT ''"),
        ('ciudad_envio', "varchar(120) NOT NULL DEFAULT ''"),
        ('fecha_actualizacion', "timestamp with time zone"),
    ]
    for col, definition in cols:
        add_column_if_not_exists('clientes_cliente', col, definition)

def sync_ordenes():
    print("Syncing 'ordenes_orden' table...")
    # These are some columns that might be missing if the app was older
    cols = [
        ('idx', "integer UNIQUE"),
        ('nombre_encargado', "varchar(100)"),
        ('fotos_urls', "jsonb DEFAULT '[]'::jsonb"),
        ('firma_encargado_url', "text"),
        ('firma_cliente_url', "text"),
    ]
    for col, definition in cols:
        add_column_if_not_exists('ordenes_orden', col, definition)

def reset_migration_history():
    apps = ['clientes', 'ordenes']
    with connection.cursor() as cursor:
        for app in apps:
            print(f"Resetting migration history for '{app}'...")
            cursor.execute(f"DELETE FROM django_migrations WHERE app = '{app}'")
            cursor.execute(f"INSERT INTO django_migrations (app, name, applied) VALUES ('{app}', '0001_initial', now())")

if __name__ == '__main__':
    sync_clientes()
    sync_ordenes()
    reset_migration_history()
    print("Optimization: Running migrations normally just in case...")
    os.system("python manage.py migrate --noinput")
    print("Schema sync complete.")
