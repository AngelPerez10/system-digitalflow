import os
import sys
import pandas as pd
import django
import re

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
    return s in ['S', 'SI', 'Y', 'YES', 'TRUE', '1']

def clean_str(val):
    if pd.isna(val) or str(val).strip() == 'nan':
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

def find_col(df, candidates):
    # Case insensitive search for column
    cols = [c.lower() for c in df.columns]
    for cand in candidates:
        if cand.lower() in cols:
            # return original name
            return df.columns[cols.index(cand.lower())]
    return None

def run():
    print("Iniciando REPARACIÓN de importación de Clientes...")
    
    # Intentar leer recomendando encoding 'latin1' que suele funcionar mejor para ñ/acentos
    try:
        df = pd.read_csv(FILE_PATH, sep='\t', encoding='latin1')
    except:
        try:
            df = pd.read_csv(FILE_PATH, sep='\t')
        except Exception as e:
            print(f"Error leyendo archivo: {e}")
            return

    # Normalizar columnas (strip whitespace)
    df.columns = [c.strip() for c in df.columns]
    
    # Identificar columnas opcionales dinámicamente
    col_nombre_contacto = find_col(df, ['NOMBRE', 'CONTACTO', 'NOMBRE CONTACTO'])
    col_telefono = find_col(df, ['TELEFONO', 'TEL', 'CELULAR', 'MOVIL', 'PHONE'])
    col_email = find_col(df, ['CORREO', 'EMAIL', 'CORREO ELECTRONICO'])
    
    print(f"Columna Contacto detectada: {col_nombre_contacto}")
    print(f"Columna Teléfono detectada: {col_telefono}")
    print(f"Columna Email detectada: {col_email}")

    count = 0
    errors = 0
    
    for index, row in df.iterrows():
        try:
            idx_raw = row.get('IDX')
            if pd.isna(idx_raw):
                continue
            idx = int(idx_raw)
            
            # --- 1. CLIENTE ---
            nombre_empresa = clean_str(row.get('Empresa'))
            if not nombre_empresa:
                nombre_empresa = clean_str(row.get('NOMBRE')) or f"Cliente {idx}"

            # Construir Dirección Limpia
            calle = clean_str(row.get('Calle'))
            num_ext = clean_str(row.get('Número exterior'))
            # Fix encoding issue if 'NÃºmero' etc
            if not num_ext:
                 # Check for 'Numero exterior' or similar
                 c = find_col(df, ['Numero exterior', 'No. Exterior', 'Num Ext'])
                 if c: num_ext = clean_str(row.get(c))

            interior = clean_str(row.get('Interior'))
            colonia = clean_str(row.get('COLONIA'))
            municipio = clean_str(row.get('MUNICIPIO')) or clean_str(row.get('Municipio'))
            localidad = clean_str(row.get('LOCALIDAD')) or clean_str(row.get('Localidad'))
            pais = clean_str(row.get('PAIS')) or clean_str(row.get('Pais')) or 'MÉXICO'
            estado = clean_str(row.get('ESTADO')) or clean_str(row.get('Estado'))

            # Smart Join: filter empty
            addr_parts = [calle, num_ext]
            if interior:
                addr_parts.append(f"Int. {interior}")
            
            addr_line1 = " ".join([p for p in addr_parts if p])
            
            location_parts = [colonia, municipio, localidad, estado, pais]
            location_line = ", ".join([p for p in location_parts if p])
            
            full_direccion = ""
            if addr_line1 and location_line:
                full_direccion = f"{addr_line1}, {location_line}"
            elif addr_line1:
                full_direccion = addr_line1
            else:
                full_direccion = location_line
                
            # Datos extra
            telefono = clean_str(row.get(col_telefono)) if col_telefono else ''
            correo = clean_str(row.get(col_email)) if col_email else ''
            
            rfc = clean_str(row.get('RFC'))
            curp = clean_str(row.get('CURP'))
            
            defaults = {
                'nombre': nombre_empresa,
                'rfc': rfc,
                'curp': curp,
                'direccion': full_direccion,
                'telefono': telefono,
                'correo': correo,
                # Desglosado
                'calle': calle,
                'numero_exterior': num_ext,
                'interior': interior,
                'colonia': colonia,
                'municipio': municipio,
                'localidad': localidad,
                'estado': estado,
                'pais': pais,
                # Config
                'aplica_retenciones': parse_bool(row.get('APLICA RETENCIONES (S/N)')),
                'desglosar_ieps': parse_bool(row.get('DESGLOSAR IEPS (S/N)')),
                'numero_precio': clean_str(row.get('NÚMERO DE PRECIO')) or '1',
                'limite_credito': clean_decimal(row.get('LIMITE DE CRÉDITO')),
                'dias_credito': clean_int(row.get('DIAS DE CRÉDITO')),
            }
            
            cliente, created = Cliente.objects.update_or_create(
                idx=idx,
                defaults=defaults
            )
            
            # --- 2. CONTACTO ---
            # Si existe columna de nombre de contacto (NOMBRE), crear/actualizar contacto principal
            nombre_contacto = clean_str(row.get(col_nombre_contacto)) if col_nombre_contacto else ''
            if nombre_contacto:
                # Buscar o crear contacto principal
                # Asumimos que si viene en el excel es el principal
                contacto, _ = ClienteContacto.objects.update_or_create(
                    cliente=cliente,
                    is_principal=True,
                    defaults={
                        'nombre_apellido': nombre_contacto,
                        'celular': telefono, # Usamos el mismo phone del cliente si no hay específico
                        'correo': correo,
                        'area_puesto': 'Contacto Principal'
                    }
                )
            elif telefono:
                 # Si no hay nombre pero hay telefono, creamos contacto genérico?
                 # Mejor no ensuciar contactos si no hay nombre.
                 pass

            count += 1
            if count % 100 == 0:
                print(f"Corregidos {count}...")

        except Exception as e:
            print(f"Error fila {index}: {e}")
            errors += 1
            
    print(f"Finalizado. Procesados: {count}. Errores: {errors}")

if __name__ == '__main__':
    run()
