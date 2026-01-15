import pandas as pd
try:
    df = pd.read_csv('clientes', sep='\t')
    for c in df.columns:
        print(c)
except Exception as e:
    try:
        df = pd.read_csv('clientes', sep='\t', encoding='latin1')
        for c in df.columns:
            print(c)
    except:
        print("Fail")
