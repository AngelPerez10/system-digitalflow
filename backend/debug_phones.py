import pandas as pd
import sys

try:
    df = pd.read_csv('clientes', sep='\t', encoding='latin1')
except:
    df = pd.read_csv('clientes', sep='\t')

# Strip cols
df.columns = [c.strip() for c in df.columns]

candidates = ['TEL', 'CEL', 'MOV', 'PHONE']
matches = []
for c in df.columns:
    if any(cand in c.upper() for cand in candidates):
        matches.append(c)

print("PHONE COLS FOUND:", matches)

if matches:
    print(df[matches].head(5))
else:
    print("No phone columns found!")
