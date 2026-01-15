import os
import csv
import django
from decimal import Decimal

# Configure Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.clientes.models import Cliente, ClienteContacto

def clean_str(val, max_len=None):
    s = str(val).strip() if val else ""
    if max_len and len(s) > max_len:
        return s[:max_len]
    return s

def clean_decimal(val):
    if not val: return Decimal('0.00')
    try:
        # Remove commas and currency symbols
        clean = str(val).replace(',', '').replace('$', '').strip()
        return Decimal(clean)
    except:
        return Decimal('0.00')

def clean_int(val):
    if not val: return 0
    try:
        return int(float(str(val).strip()))
    except:
        return 0

def clean_bool(val):
    if not val: return False
    val = str(val).strip().upper()
    return val in ['S', 'SI', 'TRUE', '1', 'Y', 'YES']

def import_clientes():
    file_path = 'clientes'
    if not os.path.exists(file_path):
        print(f"File {file_path} not found.")
        return

    count = 0
    with open(file_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter='\t')
        for row in reader:
            try:
                idx_val = clean_int(row.get('IDX'))
                if not idx_val:
                    continue

                nombre = clean_str(row.get('Empresa'), 255) or clean_str(row.get('NOMBRE'), 255)
                if not nombre:
                    nombre = f"Cliente {idx_val}"

                # Create or update Cliente
                cliente, created = Cliente.objects.update_or_create(
                    idx=idx_val,
                    defaults={
                        'nombre': nombre,
                        'nombre_facturacion': clean_str(row.get('NOMBRE'), 255),
                        'rfc': clean_str(row.get('RFC'), 50),
                        'curp': clean_str(row.get('CURP'), 100),
                        'calle': clean_str(row.get('Calle'), 255),
                        'numero_exterior': clean_str(row.get('Número exterior'), 100),
                        'interior': clean_str(row.get('Interior'), 100),
                        'colonia': clean_str(row.get('COLONIA'), 255),
                        'codigo_postal': clean_str(row.get('Codigo Postal'), 50),
                        'localidad': clean_str(row.get('LOCALIDAD'), 255),
                        'municipio': clean_str(row.get('MUNICIPIO'), 255),
                        'estado': clean_str(row.get('ESTADO'), 255),
                        'pais': clean_str(row.get('PAIS', 'MEXICO'), 255),
                        'telefono': clean_str(row.get('TELÉFONO'), 100),
                        'correo': clean_str(row.get('EMAILS')),
                        'notas': clean_str(row.get('COMENTARIO')),
                        'aplica_retenciones': clean_bool(row.get('APLICA RETENCIONES (S/N)')),
                        'desglosar_ieps': clean_bool(row.get('DESGLOSAR IEPS (S/N)')),
                        'numero_precio': clean_str(row.get('NÚMERO DE PRECIO', '1'), 50),
                        'limite_credito': clean_decimal(row.get('LIMITE DE CRÉDITO')),
                        'dias_credito': clean_int(row.get('DIAS DE CRÉDITO')),
                    }
                )

                # Contacto principal
                celular = clean_str(row.get('CELULAR'), 25)
                email = clean_str(row.get('EMAILS'))
                if celular or email:
                    first_email = email.split('||')[0].strip() if email else ""
                    ClienteContacto.objects.update_or_create(
                        cliente=cliente,
                        is_principal=True,
                        defaults={
                            'nombre_apellido': nombre[:200],
                            'celular': celular,
                            'correo': first_email[:254],
                        }
                    )

                count += 1
                if count % 100 == 0:
                    print(f"Processed {count} clients...")
            except Exception as e:
                print(f"Error importing row {row.get('IDX')}: {e}")

    print(f"Successfully imported/updated {count} clients.")

if __name__ == '__main__':
    import_clientes()
