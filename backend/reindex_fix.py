import os
import django
import sys

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.ordenes.models import Orden

from django.db.models import F

def run():
    print("Aplicando reindexado masivo con lógica de salto...")
    # Ordenar por fecha de inicio para asignar IDs alineados con la visualización
    qs = Orden.objects.all().order_by(
        F('fecha_inicio').asc(nulls_last=True),
        F('fecha_creacion').asc(nulls_last=True),
        'id'
    )
    
    # 1. Limpiar IDs
    print("Limpiando IDs actuales...")
    Orden.objects.all().update(idx=None)
    
    # 2. Reasignar
    print("Reasignando IDs...")
    count = 0
    updates = []
    
    # Nota: Actualizar uno por uno es lento si son muchos, pero seguro.
    for i, orden in enumerate(qs, start=1):
        if i <= 588:
            new_idx = i
        else:
            new_idx = 5000 + (i - 589)
        
        orden.idx = new_idx
        orden.save(update_fields=['idx'])
        count += 1
        
        if count % 100 == 0:
            print(f"Procesados {count}...")

    print(f"Terminado. Total procesados: {count}")
    print("Verificación de últimos IDs:")
    last_5 = Orden.objects.all().order_by('-idx')[:5]
    for o in last_5:
        print(f"ID: {o.id} | IDX: {o.idx} | Fecha: {o.fecha_creacion}")

if __name__ == '__main__':
    run()
