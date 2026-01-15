import pandas as pd
import sys

# Set encoding based on previous success
try:
    df = pd.read_csv('clientes', sep='\t')
except:
    df = pd.read_csv('clientes', sep='\t', encoding='latin1')

print("--- START COLUMNS ---")
cols = list(df.columns)
cols.sort()
for c in cols:
    print(f"[{c}]")
print("--- END COLUMNS ---")

print("\n--- SAMPLE ROW ---")
# Print first row with non-null values to see data examples
if len(df) > 0:
    row = df.iloc[0]
    for c in df.columns:
        if pd.notna(row[c]):
            print(f"{c}: {row[c]}")
