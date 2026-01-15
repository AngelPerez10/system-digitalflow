import os
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.clientes.models import Cliente

print("--- VERIFICACIÓN DE DATOS ---")

# 1. Verificar Email y Teléfono
print("\n[CLIENTE CON EMAIL]")
c = Cliente.objects.exclude(correo='').first()
if c:
    print(f"ID: {c.idx} - {c.nombre}")
    print(f"Email: '{c.correo}'")
    print(f"Teléfono: '{c.telefono}'")
    # Ver contacto
    cont = c.contactos.first()
    if cont:
        print(f"Contacto Princ: {cont.nombre_apellido} | Cel: {cont.celular} | Email: {cont.correo}")
else:
    print("No se encontraron clientes con email.")

# 2. Verificar Retenciones
print("\n[CLIENTE CON RETENCIONES]")
c_ret = Cliente.objects.filter(aplica_retenciones=True).first()
if c_ret:
    print(f"ID: {c_ret.idx} - {c_ret.nombre}")
    print(f"Aplica Retenciones: {c_ret.aplica_retenciones}")
    print(f"Desglosar IEPS: {c_ret.desglosar_ieps}")
else:
    print("No se encontraron clientes con retenciones activas.")
