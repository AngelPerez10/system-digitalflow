import os
import django
import csv
from decimal import Decimal

# Configure Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.clientes.models import Cliente, ClienteContacto

def clean_bool(val):
    if not val: return False
    return str(val).strip().upper() in ['VERDADERO', 'TRUE', '1', 'S', 'SI', 'SÍ']

def clean_str(val):
    if val is None: return ""
    return str(val).strip()

def clean_decimal(val):
    if not val: return Decimal('0.00')
    try:
        # Remove currency symbols and commas
        clean_val = str(val).replace('$', '').replace(',', '').strip()
        return Decimal(clean_val)
    except:
        return Decimal('0.00')

def clean_int(val):
    if not val: return 0
    try:
        return int(float(str(val).replace(',', '').strip()))
    except:
        return 0

def import_clientes():
    file_path = 'clientes'
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
                # Use idx as the unique identifier if available
                idx_val = clean_int(row.get('idx'))
                nombre = clean_str(row.get('nombre'))
                
                if not nombre:
                    continue

                # Create or update Cliente
                cliente, created = Cliente.objects.update_or_create(
                    idx=idx_val,
                    defaults={
                        'nombre': nombre,
                        'direccion': clean_str(row.get('direccion')),
                        'telefono': clean_str(row.get('telefono')),
                        'telefono_pais': clean_str(row.get('telefono_pais', 'MX')),
                        'email': clean_str(row.get('email')),
                        'rfc': clean_str(row.get('rfc')),
                        'regimen_fiscal': clean_str(row.get('regimen_fiscal')),
                        'codigo_postal': clean_str(row.get('codigo_postal')),
                        'limite_credito': clean_decimal(row.get('limite_credito')),
                        'dias_credito': clean_int(row.get('dias_credito')),
                        'vendedor': clean_str(row.get('vendedor')),
                        'lista_precios': clean_int(row.get('lista_precios')),
                        'requiere_factura': row.get('requiere_factura', '').strip().upper() == 'S',
                        'credito_suspendido': row.get('credito_suspendido', '').strip().upper() == 'S',
                        'tipo_cliente': clean_str(row.get('tipo_cliente')),
                    }
                )
                
                # Handle contact if present
                contacto_nombre = clean_str(row.get('contacto_nombre'))
                if contacto_nombre:
                    ClienteContacto.objects.update_or_create(
                        cliente=cliente,
                        nombre=contacto_nombre,
                        defaults={
                            'telefono': clean_str(row.get('contacto_telefono')),
                            'email': clean_str(row.get('contacto_email')),
                            'puesto': clean_str(row.get('contacto_puesto')),
                        }
                    )

                count += 1
                if count % 10 == 0:
                    print(f"Imported {count} clients...")
            except Exception as e:
                print(f"Error importing row {row}: {e}")

    print(f"Successfully imported {count} clients.")

if __name__ == '__main__':
    import_clientes()
