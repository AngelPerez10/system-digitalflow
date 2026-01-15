import pandas as pd
import sys

FILE_PATH = 'clientes'

def run():
    print(f"Inspecting file: {FILE_PATH} as TSV")
    try:
        # Try reading with tab separator
        df = pd.read_csv(FILE_PATH, sep='\t') # or encoding='latin1' if needed
        print("Success! File is TSV.")
        print("Columns found:")
        print(list(df.columns))
        print(f"Rows found: {len(df)}")
        print("First 3 rows:")
        print(df.head(3))
        
        # Check for encoding issues
        # If 'Empr' is cut off or strange chars
    except Exception as e:
        print(f"Not TSV: {e}")
        # Try latin1
        try:
             df = pd.read_csv(FILE_PATH, sep='\t', encoding='latin1')
             print("Success with latin1!")
             print(list(df.columns))
        except Exception as e2:
             print(f"Not TSV latin1: {e2}")

if __name__ == '__main__':
    run()
