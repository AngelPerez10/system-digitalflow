import pandas as pd
import json

try:
    df = pd.read_csv('clientes', sep='\t')
except:
    df = pd.read_csv('clientes', sep='\t', encoding='latin1')

row = df.iloc[0].to_dict()
# Handle NaN
row = {k: (v if pd.notna(v) else None) for k, v in row.items()}
print(json.dumps(row, indent=2, default=str))
