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
            # Even if it exists, let's try to alter the type to fit larger values
            if 'varchar' in definition or 'text' in definition:
                try:
                    cursor.execute(f"ALTER TABLE {table} ALTER COLUMN {column} TYPE {definition.split('NOT NULL')[0]}")
                    print(f"  Column {column} type updated.")
                except Exception as e:
                    pass

def drop_unique_constraint(table, column):
    with connection.cursor() as cursor:
        try:
            # PostgreSQL specific way to find the constraint name
            cursor.execute(f"""
                SELECT conname
                FROM pg_constraint
                WHERE conrelid = '{table}'::regclass
                AND '{column}' = ANY(
                    SELECT attname
                    FROM pg_attribute
                    WHERE attrelid = conrelid
                    AND attnum = ANY(conkey)
                )
                AND contype = 'u'
            """)
            constraints = cursor.fetchall()
            for con in constraints:
                con_name = con[0]
                print(f"Dropping unique constraint {con_name} on {table}.{column}...")
                cursor.execute(f"ALTER TABLE {table} DROP CONSTRAINT IF EXISTS {con_name}")
        except Exception as e:
            print(f"Error dropping unique constraint on {table}.{column}: {e}")

def sync_clientes():
    print("Syncing 'clientes_cliente' table...")
    
    # Drop unique constraint on nombre to allow duplicates during import
    drop_unique_constraint('clientes_cliente', 'nombre')
    
    # These are the columns expected in the new Cliente model
    cols = [
        ('giro', "varchar(255) NOT NULL DEFAULT ''"),
        ('rfc', "varchar(50) NOT NULL DEFAULT ''"),
        ('curp', "varchar(100) NOT NULL DEFAULT ''"),
        ('correo', "varchar(254) NOT NULL DEFAULT ''"),
        ('calle', "varchar(255) NOT NULL DEFAULT ''"),
        ('numero_exterior', "varchar(100) NOT NULL DEFAULT ''"),
        ('interior', "varchar(100) NOT NULL DEFAULT ''"),
        ('colonia', "varchar(255) NOT NULL DEFAULT ''"),
        ('localidad', "varchar(255) NOT NULL DEFAULT ''"),
        ('municipio', "varchar(255) NOT NULL DEFAULT ''"),
        ('codigo_postal', "varchar(50) NOT NULL DEFAULT ''"),
        ('ciudad', "varchar(255) NOT NULL DEFAULT ''"),
        ('pais', "varchar(255) NOT NULL DEFAULT ''"),
        ('estado', "varchar(255) NOT NULL DEFAULT ''"),
        ('telefono', "varchar(100) NOT NULL DEFAULT ''"),
        ('aplica_retenciones', "boolean NOT NULL DEFAULT FALSE"),
        ('desglosar_ieps', "boolean NOT NULL DEFAULT FALSE"),
        ('numero_precio', "varchar(50) NOT NULL DEFAULT '1'"),
        ('limite_credito', "numeric(12,2) NOT NULL DEFAULT 0.00"),
        ('dias_credito', "integer NOT NULL DEFAULT 0"),
        ('tipo', "varchar(50) NOT NULL DEFAULT 'EMPRESA'"),
        ('notas', "text NOT NULL DEFAULT ''"),
        ('descuento_pct', "numeric(5,2)"),
        ('portal_web', "varchar(255) NOT NULL DEFAULT ''"),
        ('nombre_facturacion', "varchar(255) NOT NULL DEFAULT ''"),
        ('numero_facturacion', "varchar(100) NOT NULL DEFAULT ''"),
        ('domicilio_facturacion', "text NOT NULL DEFAULT ''"),
        ('calle_envio', "varchar(255) NOT NULL DEFAULT ''"),
        ('numero_envio', "varchar(100) NOT NULL DEFAULT ''"),
        ('colonia_envio', "varchar(255) NOT NULL DEFAULT ''"),
        ('codigo_postal_envio', "varchar(50) NOT NULL DEFAULT ''"),
        ('pais_envio', "varchar(255) NOT NULL DEFAULT ''"),
        ('estado_envio', "varchar(255) NOT NULL DEFAULT ''"),
        ('ciudad_envio', "varchar(255) NOT NULL DEFAULT ''"),
        ('fecha_actualizacion', "timestamp with time zone"),
    ]
    for col, definition in cols:
        add_column_if_not_exists('clientes_cliente', col, definition)

def sync_ordenes():
    print("Syncing 'ordenes_orden' table...")
    cols = [
        ('idx', "integer UNIQUE"),
        ('nombre_encargado', "varchar(255)"),
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
