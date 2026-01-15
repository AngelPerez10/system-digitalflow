import pandas as pd
import os
import shutil

FILE_PATH = 'clientes'

def run():
    print(f"Inspecting file: {FILE_PATH}")
    
    if not os.path.exists(FILE_PATH):
        print("File not found.")
        return

    # Try as Excel
    try:
        # Create a temp copy with extension to satisfy engines
        temp_xlsx = 'temp_clientes.xlsx'
        shutil.copy(FILE_PATH, temp_xlsx)
        
        print("Attempting to read as Excel...")
        df = pd.read_excel(temp_xlsx)
        print("Success! File is Excel.")
        print("Columns found:")
        print(list(df.columns))
        print(f"Rows found: {len(df)}")
        print("First 3 rows:")
        print(df.head(3))
        
        # Cleanup
        os.remove(temp_xlsx)
        return
    except Exception as e:
        print(f"Not XLSX: {e}")
        if os.path.exists('temp_clientes.xlsx'):
            os.remove('temp_clientes.xlsx')

    # Try as XLS
    try:
        temp_xls = 'temp_clientes.xls'
        shutil.copy(FILE_PATH, temp_xls)
        print("Attempting to read as XLS...")
        df = pd.read_excel(temp_xls)
        print("Success! File is XLS.")
        print("Columns found:")
        print(list(df.columns))
        print(f"Rows found: {len(df)}")
        print("First 3 rows:")
        print(df.head(3))
        os.remove(temp_xls)
        return
    except Exception as e:
        print(f"Not XLS: {e}")
        if os.path.exists('temp_xls'):
            os.remove('temp_xls')

    # Try as CSV
    try:
        print("Attempting to read as CSV...")
        df = pd.read_csv(FILE_PATH)
        print("Success! File is CSV.")
        print("Columns found:")
        print(list(df.columns))
        return
    except Exception as e:
        print(f"Not CSV: {e}")

if __name__ == '__main__':
    run()
