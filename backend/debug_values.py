import pandas as pd
import sys

try:
    df = pd.read_csv('clientes', sep='\t', encoding='latin1')
except:
    df = pd.read_csv('clientes', sep='\t')

# Strip cols
df.columns = [c.strip() for c in df.columns]

print("Columns:", list(df.columns))

if 'EMAILS' in df.columns:
    print("\n[EMAILS SAMPLE]")
    print(df['EMAILS'].dropna().head(10))
else:
    print("EMAILS column not found")

target_ret = 'APLICA RETENCIONES (S/N)'
if target_ret in df.columns:
    print(f"\n[{target_ret} SAMPLE]")
    print(df[target_ret].dropna().head(10))
else:
    print(f"{target_ret} not found")
