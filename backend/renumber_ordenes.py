import os
import django
import sys

# Add the project directory to sys.path
sys.path.append(os.getcwd())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.ordenes.models import Orden

def run():
    print("Starting renumbering of Ordenes...")
    # Order by creation date to maintain chronological order
    ordenes = Orden.objects.all().order_by('fecha_creacion')
    
    count = ordenes.count()
    print(f"Found {count} orders.")
    
    if count == 0:
        print("No orders to renumber.")
        return

    # Step 1: Set unique constraint fields to None (since nullable)
    # This avoids unique violation if we try to swap 1 and 2 for example.
    print("Clearing existing IDs...")
    Orden.objects.all().update(idx=None)
    
    # Step 2: Assign new IDs
    print("Assigning sequential IDs...")
    for i, orden in enumerate(ordenes, start=1):
        orden.idx = i
        orden.save(update_fields=['idx'])
        if i % 100 == 0:
            print(f"Processed {i}...")

    print(f"Successfully renumbered {count} orders starting from 1.")

if __name__ == '__main__':
    run()
