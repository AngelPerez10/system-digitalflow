import os
import sys
import pandas as pd
import django

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
    # Check for 'N' explicitly
    if s == 'N': return False
    return s in ['S', 'SI', 'Y', 'YES', 'TRUE', '1']

def clean_str(val):
    if pd.isna(val) or str(val).strip().lower() == 'nan':
        return ''
    return str(val).strip()

def clean_decimal(val):
    if pd.isna(val):
        return 0.0
    try:
        s = str(val).replace(',', '').replace('$', '').replace(' ', '')
        if not s: return 0.0
        return float(s)
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
    cols_lower = [c.lower() for c in df.columns]
    for cand in candidates:
        if cand.lower() in cols_lower:
            return df.columns[cols_lower.index(cand.lower())]
    return None

def run():
    print("Iniciando REPARACIÓN FINAL de importación de Clientes...")
    
    try:
        df = pd.read_csv(FILE_PATH, sep='\t', encoding='latin1')
    except:
        try:
            df = pd.read_csv(FILE_PATH, sep='\t')
        except Exception as e:
            print(f"Error leyendo archivo: {e}")
            return

    # Strip whitespace from columns
    df.columns = [c.strip() for c in df.columns]
    
    # Identify key columns
    col_emails = find_col(df, ['EMAILS', 'EMAIL', 'CORREO', 'CORREO ELECTRONICO'])
    col_telefono = find_col(df, ['TELEFONO', 'TEL', 'PHONE'])
    col_celular = find_col(df, ['CELULAR', 'MOVIL', 'CEL'])
    col_nombre_contacto = find_col(df, ['NOMBRE', 'CONTACTO', 'NOMBRE CONTACTO'])
    
    # Flags
    col_ret = find_col(df, ['APLICA RETENCIONES (S/N)', 'APLICA RETENCIONES'])
    col_ieps = find_col(df, ['DESGLOSAR IEPS (S/N)', 'DESGLOSAR IEPS'])
    
    print(f"COLUMNAS DETECTADAS:")
    print(f" - Emails: {col_emails}")
    print(f" - Teléfono (Empresa): {col_telefono}")
    print(f" - Celular (Contacto): {col_celular}")
    print(f" - Contacto: {col_nombre_contacto}")
    print(f" - Retenciones: {col_ret}")
    print(f" - IEPS: {col_ieps}")

    count = 0
    errors = 0
    
    for index, row in df.iterrows():
        try:
            # IDX
            idx_raw = row.get('IDX')
            if pd.isna(idx_raw): continue
            idx = int(idx_raw)
            
            # NOMBRE EMPRESA
            empresa = clean_str(row.get('Empresa'))
            if not empresa:
                 # Fallback to 'NOMBRE' if 'Empresa' is empty? 
                 # But 'NOMBRE' might be Contact Name according to user if 'CELULAR' follows.
                 # Let's rely on 'Empresa'. If empty, check 'NOMBRE' logic?
                 # Actually user said "Nombre y apellido" is for contact.
                 # But usually 'Empresa' column holds the Client Name.
                 # If 'Empresa' is empty, maybe use 'NOMBRE' as client name?
                 empresa = clean_str(row.get('NOMBRE')) or f"Cliente {idx}"

            # REGLA: Si existe columna 'NOMBRE' y columna 'Empresa', 'Empresa' => Cliente, 'NOMBRE' => Contacto.
            
            # EMAIL
            email_val = clean_str(row.get(col_emails)) if col_emails else ''
            
            # TELEFONO (Fijo/Empresa)
            tel_val = clean_str(row.get(col_telefono)) if col_telefono else ''
            
            # CELULAR (Movil/Contacto)
            cel_val = clean_str(row.get(col_celular)) if col_celular else ''
            
            # Flags
            aplica_ret = parse_bool(row.get(col_ret)) if col_ret else False
            desglosar_ieps = parse_bool(row.get(col_ieps)) if col_ieps else False
            
            # Direccion
            calle = clean_str(row.get('Calle'))
            num_ext = clean_str(row.get('Número exterior'))
            interior = clean_str(row.get('Interior'))
            colonia = clean_str(row.get('COLONIA'))
            municipio = clean_str(row.get('MUNICIPIO'))
            localidad = clean_str(row.get('LOCALIDAD'))
            pais = clean_str(row.get('PAIS')) or 'MÉXICO'
            estado = clean_str(row.get('ESTADO'))

            # Smart Join Address
            addr_parts = [calle, num_ext]
            if interior: addr_parts.append(f"Int. {interior}")
            addr1 = " ".join([p for p in addr_parts if p])
            
            loc_parts = [colonia, municipio, localidad, estado, pais]
            addr2 = ", ".join([p for p in loc_parts if p])
            
            full_direccion = addr1
            if addr1 and addr2: full_direccion += ", " + addr2
            elif addr2: full_direccion = addr2
            
            # Update Cliente
            defaults = {
                'nombre': empresa,
                'rfc': clean_str(row.get('RFC')),
                'curp': clean_str(row.get('CURP')),
                'correo': email_val,        # Email en Cliente
                'telefono': tel_val,        # Telefono Fijo en Cliente
                'direccion': full_direccion,
                # Fields
                'calle': calle,
                'numero_exterior': num_ext,
                'interior': interior,
                'colonia': colonia,
                'municipio': municipio,
                'localidad': localidad,
                'estado': estado,
                'pais': pais,
                # Config
                'aplica_retenciones': aplica_ret,
                'desglosar_ieps': desglosar_ieps,
                'numero_precio': clean_str(row.get('NÚMERO DE PRECIO')) or '1',
                'limite_credito': clean_decimal(row.get('LIMITE DE CRÉDITO')),
                'dias_credito': clean_int(row.get('DIAS DE CRÉDITO')),
            }
            
            cliente, _ = Cliente.objects.update_or_create(
                idx=idx,
                defaults=defaults
            )
            
            # --- CONTACTO ---
            # Nombre Contacto
            nombre_cont = clean_str(row.get(col_nombre_contacto)) if col_nombre_contacto else ''
            
            # Si no hay nombre de contacto, pero hay celular, usamos 'Contacto Principal' como nombre
            if not nombre_cont and cel_val:
                nombre_cont = "Contacto Principal"
            
            if nombre_cont:
                # Buscar contacto principal existente o crear
                contact_defaults = {
                    'nombre_apellido': nombre_cont,
                    'celular': cel_val if cel_val else tel_val, # Usar celular pref, si no tel
                    'correo': email_val, # Asumimos mismo email
                    'is_principal': True
                }
                
                ClienteContacto.objects.update_or_create(
                    cliente=cliente,
                    is_principal=True,
                    defaults=contact_defaults
                )

            count += 1
            if count % 100 == 0:
                print(f"Procesados {count}...")
                
        except Exception as e:
            print(f"Error fila {index}: {e}")
            errors += 1
            
    print(f"Hecho. Procesados: {count}. Errores: {errors}")

if __name__ == '__main__':
    run()
