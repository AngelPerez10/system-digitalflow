import pandas as pd
import os
import shutil
import sys

FILE_PATH = 'clientes'
LOG_FILE = 'inspection_result.txt'

def log(msg):
    print(msg)
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(msg + '\n')

def run():
    if os.path.exists(LOG_FILE):
        os.remove(LOG_FILE)
        
    log(f"Inspecting file: {FILE_PATH}")
    
    if not os.path.exists(FILE_PATH):
        log("File not found.")
        return

    # Check magic bytes
    try:
        with open(FILE_PATH, 'rb') as f:
            header = f.read(8)
            log(f"Header bytes: {header}")
            if header.startswith(b'PK'):
                log("Magic bytes indicate ZIP/XLSX.")
            elif header.startswith(b'\xd0\xcf\x11\xe0'):
                log("Magic bytes indicate OLE2/XLS.")
            else:
                log("Magic bytes indicate Text/Other.")
    except Exception as e:
        log(f"Error reading bytes: {e}")

    # Try as Excel (XLSX)
    try:
        temp_xlsx = 'temp_clientes.xlsx'
        shutil.copy(FILE_PATH, temp_xlsx)
        
        log("Attempting to read as Excel (XLSX)...")
        # engine='openpyxl'
        df = pd.read_excel(temp_xlsx, engine='openpyxl')
        log("Success! File is XLSX.")
        log("Columns found:")
        log(str(list(df.columns)))
        log(f"Rows found: {len(df)}")
        log("First 3 rows:")
        log(str(df.head(3)))
        
        os.remove(temp_xlsx)
        return
    except Exception as e:
        log(f"Not XLSX: {e}")
        if os.path.exists(temp_xlsx):
            os.remove(temp_xlsx)

    # Try as CSV
    try:
        log("Attempting to read as CSV...")
        df = pd.read_csv(FILE_PATH, encoding='utf-8')
        log("Success! File is CSV.")
        log("Columns found:")
        log(str(list(df.columns)))
        return
    except Exception as e:
        log(f"Not CSV: {e}")

if __name__ == '__main__':
    run()
