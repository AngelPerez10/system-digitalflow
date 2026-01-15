import os
import django
import csv
import ast
from datetime import datetime, date, time

# Configure Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.ordenes.models import Orden
from apps.clientes.models import Cliente

def clean_str(val):
    if val is None: return ""
    return str(val).strip()

def clean_int(val):
    if not val: return None
    try:
        return int(float(str(val).replace(',', '').strip()))
    except:
        return None

def parse_date(val):
    if not val or val == 'None' or val == 'NULL': return None
    try:
        return date.fromisoformat(val)
    except:
        return None

def parse_time(val):
    if not val or val == 'None' or val == 'NULL': return None
    try:
        return time.fromisoformat(val)
    except:
        return None

def parse_list(val):
    if not val: return []
    try:
        return ast.literal_eval(val)
    except:
        # If it's just a string, return it as a single element list
        if val.strip():
            return [val.strip()]
        return []

def import_ordenes():
    file_path = 'ordenes'
    if not os.path.exists(file_path):
        print(f"Error: File '{file_path}' not found.")
        return

    print(f"Starting import from {file_path}...")
    
    with open(file_path, mode='r', encoding='utf-8') as f:
        # Read the first line to find headers
        header_line = f.readline()
        headers = [h.strip() for h in header_line.split('\t')]
        
        # Use a dict reader with the detected headers
        reader = csv.DictReader(f, fieldnames=headers, delimiter='\t')
        
        count = 0
        for row in reader:
            try:
                idx_val = clean_int(row.get('Idx'))
                if idx_val is None:
                    continue

                cliente_nombre = clean_str(row.get('cliente'))
                
                # Try to find client_id
                cliente_obj = None
                if cliente_nombre:
                    cliente_obj = Cliente.objects.filter(nombre__iexact=cliente_nombre).first()

                # Map status
                raw_status = clean_str(row.get('status')).lower()
                status_val = 'resuelto' if raw_status == 'resuelto' else 'pendiente'

                # Map servicios_realizados to list
                servicios = clean_str(row.get('servicios_realizados'))
                servicios_list = [servicios] if servicios else []

                # Create or update Orden
                orden, created = Orden.objects.update_or_create(
                    idx=idx_val,
                    defaults={
                        'cliente_id': cliente_obj,
                        'cliente': cliente_nombre,
                        'direccion': clean_str(row.get('direccion')),
                        'telefono_cliente': clean_str(row.get('telefono_cliente')),
                        'problematica': clean_str(row.get('problematica')),
                        'servicios_realizados': servicios_list,
                        'status': status_val,
                        'comentario_tecnico': clean_str(row.get('comentario_tecnico')),
                        'fecha_inicio': parse_date(row.get('fecha_inicio')),
                        'hora_inicio': parse_time(row.get('hora_inicio')),
                        'fecha_finalizacion': parse_date(row.get('fecha_finalizacion')),
                        'hora_termino': parse_time(row.get('hora_termino')),
                        'nombre_encargado': clean_str(row.get('nombre_encargado')),
                        'nombre_cliente': clean_str(row.get('nombre_cliente')),
                        'fotos_urls': parse_list(row.get('fotos_urls')),
                        'firma_encargado_url': clean_str(row.get('firma_encargado_url')),
                        'firma_cliente_url': clean_str(row.get('firma_cliente_url')),
                    }
                )

                count += 1
                if count % 50 == 0:
                    print(f"Imported {count} orders...")
            except Exception as e:
                print(f"Error importing row {row}: {e}")

    print(f"Successfully imported {count} orders.")

if __name__ == '__main__':
    import_ordenes()
