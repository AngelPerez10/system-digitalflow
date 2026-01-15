import pandas as pd
import sys

# Set encoding based on previous success
try:
    df = pd.read_csv('clientes', sep='\t')
except:
    df = pd.read_csv('clientes', sep='\t', encoding='latin1')

print("ALL COLUMNS:")
for c in df.columns:
    print(f"'{c}'")
