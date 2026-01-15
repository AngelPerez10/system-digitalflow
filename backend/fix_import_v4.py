import os
import sys
import pandas as pd
import django
from django.db.models import Q
from django.db import IntegrityError

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.clientes.models import Cliente, ClienteContacto

FILE_PATH = 'clientes'

def parse_bool(val):
    if pd.isna(val):
        return False
    s = str(val).strip().upper()
    if s == 'N': return False
    return s in ['S', 'SI', 'Y', 'YES', 'TRUE', '1']

def clean_str(val):
    if pd.isna(val) or str(val).strip().lower() == 'nan':
        return ''
    return str(val).strip()

def clean_decimal(val):
    if pd.isna(val): return 0.0
    try:
        s = str(val).replace(',', '').replace('$', '').replace(' ', '')
        if not s: return 0.0
        return float(s)
    except: return 0.0

def clean_int(val):
    if pd.isna(val): return 0
    try: return int(float(val))
    except: return 0

def find_col(df, candidates):
    cols_lower = [c.lower() for c in df.columns]
    for cand in candidates:
        if cand.lower() in cols_lower:
            return df.columns[cols_lower.index(cand.lower())]
    return None

def run():
    print("Iniciando IMPORTACIÓN FINAL v4...")
    
    try:
        df = pd.read_csv(FILE_PATH, sep='\t', encoding='latin1')
    except:
        try:
            df = pd.read_csv(FILE_PATH, sep='\t')
        except:
            print("Error leyendo archivo")
            return

    df.columns = [c.strip() for c in df.columns]
    
    col_emails = find_col(df, ['EMAILS', 'EMAIL', 'CORREO'])
    col_telefono = find_col(df, ['TELEFONO', 'TEL'])
    col_celular = find_col(df, ['CELULAR', 'MOVIL'])
    col_nombre_contacto = find_col(df, ['NOMBRE', 'CONTACTO'])
    col_ret = find_col(df, ['APLICA RETENCIONES (S/N)'])
    col_ieps = find_col(df, ['DESGLOSAR IEPS (S/N)'])

    count = 0
    errors = 0
    
    for index, row in df.iterrows():
        try:
            idx_raw = row.get('IDX')
            if pd.isna(idx_raw): continue
            idx = int(idx_raw)
            
            # Basic fields
            empresa = clean_str(row.get('Empresa')) or clean_str(row.get('NOMBRE')) or f"Cliente {idx}"
            rfc = clean_str(row.get('RFC'))
            curp = clean_str(row.get('CURP'))
            
            # Contact info
            email_val = clean_str(row.get(col_emails)) if col_emails else ''
            tel_val = clean_str(row.get(col_telefono)) if col_telefono else ''
            cel_val = clean_str(row.get(col_celular)) if col_celular else ''
            
            # Address construction
            calle = clean_str(row.get('Calle'))
            num_ext = clean_str(row.get('Número exterior'))
            interior = clean_str(row.get('Interior'))
            colonia = clean_str(row.get('COLONIA'))
            municipio = clean_str(row.get('MUNICIPIO'))
            localidad = clean_str(row.get('LOCALIDAD'))
            estado = clean_str(row.get('ESTADO'))
            pais = clean_str(row.get('PAIS')) or 'MÉXICO'
            
            addr_parts = [calle, num_ext]
            if interior: addr_parts.append(f"Int. {interior}")
            addr1 = " ".join([p for p in addr_parts if p])
            loc_parts = [colonia, municipio, localidad, estado, pais]
            addr2 = ", ".join([p for p in loc_parts if p])
            full_direccion = f"{addr1}, {addr2}".strip(", ")
            
            # Flags
            aplica_ret = parse_bool(row.get(col_ret)) if col_ret else False
            desg_ieps = parse_bool(row.get(col_ieps)) if col_ieps else False
            
            defaults = {
                'nombre': empresa,
                'rfc': rfc,
                'curp': curp,
                'correo': email_val,
                'telefono': tel_val,
                'direccion': full_direccion,
                'calle': calle, 'numero_exterior': num_ext,
                'interior': interior, 'colonia': colonia,
                'municipio': municipio, 'localidad': localidad,
                'estado': estado, 'pais': pais,
                'aplica_retenciones': aplica_ret,
                'desglosar_ieps': desg_ieps,
                'numero_precio': clean_str(row.get('NÚMERO DE PRECIO')) or '1',
                'limite_credito': clean_decimal(row.get('LIMITE DE CRÉDITO')),
                'dias_credito': clean_int(row.get('DIAS DE CRÉDITO')),
            }
            
            # SAVE CLIENTE - Handle unique constraint on Name
            try:
                cliente, _ = Cliente.objects.update_or_create(idx=idx, defaults=defaults)
            except IntegrityError as e:
                # Likely duplicate name. Append IDX to make unique
                if 'nombre' in str(e) or 'unique' in str(e).lower():
                    defaults['nombre'] = f"{empresa} ({idx})"
                    cliente, _ = Cliente.objects.update_or_create(idx=idx, defaults=defaults)
                else:
                    raise e

            # SAVE CONTACTO
            nombre_cont = clean_str(row.get(col_nombre_contacto)) if col_nombre_contacto else ''
            # Fallback contact name if only celular provided
            if not nombre_cont and cel_val:
                nombre_cont = "Contacto Principal"
            
            if nombre_cont:
                ClienteContacto.objects.update_or_create(
                    cliente=cliente,
                    is_principal=True,
                    defaults={
                        'nombre_apellido': nombre_cont,
                        'celular': cel_val,
                        'correo': email_val, 
                    }
                )

            count += 1
            if count % 100 == 0:
                 print(f"Procesados {count}...")

        except Exception as e:
            print(f"Err idx={idx}: {e}")
            errors += 1
            
    print(f"Fin. OK: {count}, Err: {errors}")

if __name__ == '__main__':
    run()
