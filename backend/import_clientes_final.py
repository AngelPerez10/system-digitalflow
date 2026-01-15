import os
import sys
import pandas as pd
import django

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.clientes.models import Cliente

FILE_PATH = 'clientes'

def parse_bool(val):
    if pd.isna(val):
        return False
    s = str(val).strip().upper()
    return s in ['S', 'SI', 'Y', 'YES', 'TRUE', '1']

def clean_str(val):
    if pd.isna(val):
        return ''
    return str(val).strip()

def clean_decimal(val):
    if pd.isna(val):
        return 0.0
    try:
        if isinstance(val, str):
            val = val.replace(',', '').replace('$', '')
        return float(val)
    except:
        return 0.0

def clean_int(val):
    if pd.isna(val):
        return 0
    try:
        return int(float(val))
    except:
        return 0

def run():
    print("Iniciando importación de Clientes...")
    
    # Intentar leer TSV
    try:
        df = pd.read_csv(FILE_PATH, sep='\t')
    except:
        try:
            df = pd.read_csv(FILE_PATH, sep='\t', encoding='latin1')
        except Exception as e:
            print(f"Error leyendo archivo: {e}")
            return

    # Normalizar columnas (strip whitespace, upper)
    df.columns = [c.strip() for c in df.columns]
    
    count = 0
    errors = 0
    
    for index, row in df.iterrows():
        try:
            # Mapping
            idx = row.get('IDX')
            if pd.isna(idx):
                print(f"Skipping row {index}: No IDX")
                continue
                
            idx = int(idx)
            
            nombre = clean_str(row.get('Empresa'))
            if not nombre:
                nombre = f"Cliente sin nombre {idx}"
                
            rfc = clean_str(row.get('RFC'))
            curp = clean_str(row.get('CURP'))
            
            # Dirección fields
            calle = clean_str(row.get('Calle'))
            num_ext = clean_str(row.get('Número exterior'))
            interior = clean_str(row.get('Interior'))
            colonia = clean_str(row.get('COLONIA'))
            # Try to find other fields by partial match or specific potential names
            municipio = clean_str(row.get('MUNICIPIO')) or clean_str(row.get('Municipio'))
            localidad = clean_str(row.get('LOCALIDAD')) or clean_str(row.get('Localidad'))
            pais = clean_str(row.get('PAIS')) or clean_str(row.get('Pais'))
            
            # Booleans
            aplica_ret = parse_bool(row.get('APLICA RETENCIONES (S/N)'))
            desglosar_ieps = parse_bool(row.get('DESGLOSAR IEPS (S/N)'))
            
            # Configs
            num_precio = clean_str(row.get('NÚMERO DE PRECIO')) or '1'
            limite = clean_decimal(row.get('LIMITE DE CRÉDITO'))
            dias = clean_int(row.get('DIAS DE CRÉDITO'))
            
            # Construct Address if needed or just store fields
            # The model has 'calle', 'numero_exterior', 'colonia', etc.
            # Also a 'direccion' text field. Maybe populate 'direccion' with full string
            
            full_direccion = f"{calle} {num_ext} {interior}, {colonia}, {municipio}, {localidad}, {pais}".strip().replace('  ', ' ')
            
            defaults = {
                'nombre': nombre,
                'rfc': rfc,
                'curp': curp,
                'calle': calle,
                'numero_exterior': num_ext,
                'interior': interior,
                'colonia': colonia,
                'municipio': municipio,
                'localidad': localidad,
                'pais': pais,
                'direccion': full_direccion,
                'aplica_retenciones': aplica_ret,
                'desglosar_ieps': desglosar_ieps,
                'numero_precio': num_precio,
                'limite_credito': limite,
                'dias_credito': dias,
            }
            
            # Update or Create
            cliente, created = Cliente.objects.update_or_create(
                idx=idx,
                defaults=defaults
            )
            
            count += 1
            if count % 50 == 0:
                print(f"Procesados {count}...")
                
        except Exception as e:
            print(f"Error en fila {index}: {e}")
            errors += 1

    print(f"Importación completada. Insertados/Actualizados: {count}. Errores: {errors}")

if __name__ == '__main__':
    run()
