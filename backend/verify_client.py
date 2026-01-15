import os
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.clientes.models import Cliente

c = Cliente.objects.filter(idx=1).first()
if c:
    print(f"ID: {c.idx}")
    print(f"Direccion: '{c.direccion}'")
    print(f"Contactos: {c.contactos.count()}")
    for k in c.contactos.all():
        print(f" - {k.nombre_apellido} (Princ: {k.is_principal})")
else:
    print("Cliente 1 not found")
