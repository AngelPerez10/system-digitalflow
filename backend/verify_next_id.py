import os
import django
import sys

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.ordenes.models import Orden
from django.db import models

def calculate_next_id(mock_max=None):
    if mock_max is not None:
        current_max = mock_max
    else:
        current_max = Orden.objects.aggregate(models.Max('idx'))['idx__max'] or 0
    
    if current_max >= 564 and current_max < 5000:
        return 5000
    else:
        return current_max + 1

def run():
    print("--- Verificación de Lógica de IDs ---")
    
    # Real checking
    current_max = Orden.objects.aggregate(models.Max('idx'))['idx__max'] or 0
    next_real = calculate_next_id()
    print(f"Max ID actual en DB: {current_max}")
    print(f"Siguiente ID real: {next_real}")
    
    # Simulations
    print("\n--- Simulaciones ---")
    scenarios = [500, 563, 564, 565, 4999, 5000, 5001]
    for sim_max in scenarios:
        next_val = calculate_next_id(sim_max)
        arrow = "->"
        if sim_max == 564:
            arrow = "-> (SALTO)"
        print(f"Si el ID actual fuera {sim_max} {arrow} El siguiente sería: {next_val}")

if __name__ == '__main__':
    run()
