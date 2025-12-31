import os
import sys
from django.db import transaction

# Set up Django environment if running as a standalone script
# (Though we'll likely run this via manage.py shell)

def import_clientes():
    from apps.clientes.models import Cliente
    
    file_path = 'clientes'
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split by double or more newlines to get client blocks
    import re
    blocks = re.split(r'\n\s*\n\s*\n', content)
    
    count = 0
    with transaction.atomic():
        for block in blocks:
            lines = [line.strip() for line in block.strip().split('\n') if line.strip()]
            if len(lines) >= 3:
                nombre = lines[0]
                direccion = lines[1]
                telefono = lines[2]
                
                # Idempotent check
                if not Cliente.objects.filter(nombre=nombre).exists():
                    try:
                        Cliente.objects.create(
                            nombre=nombre,
                            direccion=direccion,
                            telefono=telefono
                        )
                        print(f"Imported: {nombre}")
                        count += 1
                    except Exception as e:
                        print(f"Error importing {nombre}: {e}")
                else:
                    print(f"Skipped (exists): {nombre}")

    print(f"Finished. Imported {count} new clients.")

if __name__ == "__main__":
    import_clientes()
