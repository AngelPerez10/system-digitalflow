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

def find_col(df, candidates):
    cols_lower = [c.lower() for c in df.columns]
    for cand in candidates:
        if cand.lower() in cols_lower:
            return df.columns[cols_lower.index(cand.lower())]
    return None

def run():
    print("Iniciando DEBUG importación...")
    
    try:
        df = pd.read_csv(FILE_PATH, sep='\t', encoding='latin1')
    except:
        df = pd.read_csv(FILE_PATH, sep='\t')

    df.columns = [c.strip() for c in df.columns]
    
    col_emails = find_col(df, ['EMAILS', 'EMAIL'])
    print(f"Col Email Found: '{col_emails}'")
    
    if len(df) > 0:
        row = df.iloc[0]
        val = row.get(col_emails)
        print(f"Row 0 Raw Email: '{val}'")
        
        idx = row.get('IDX')
        print(f"Row 0 IDX: {idx}")
        
        print("ATTEMPTING SAVE...")
        defaults = {'correo': str(val).strip()}
        
        try:
            obj, created = Cliente.objects.update_or_create(idx=idx, defaults=defaults)
            print(f"Saved: {obj} | Correo: '{obj.correo}'")
        except Exception as e:
            print(f"Save Failed: {e}")

if __name__ == '__main__':
    run()
