from django.core.management.base import BaseCommand
from django.db import transaction
from apps.ordenes.models import Orden


class Command(BaseCommand):
    help = "Renumera las órdenes existentes para que comiencen desde 5000"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="No escribe en la BD, solo muestra qué haría.",
        )

    def handle(self, *args, **options):
        dry_run = bool(options["dry_run"])

        # Obtener todas las órdenes ordenadas por idx
        ordenes = list(Orden.objects.all().order_by('idx'))
        
        if not ordenes:
            self.stdout.write("No hay órdenes para renumerar.")
            return

        self.stdout.write(f"Total de órdenes encontradas: {len(ordenes)}")
        
        # Crear mapeo de idx antiguo a nuevo
        renumeraciones = []
        nuevo_idx = 5000
        
        for orden in ordenes:
            idx_antiguo = orden.idx
            renumeraciones.append({
                'orden': orden,
                'idx_antiguo': idx_antiguo,
                'idx_nuevo': nuevo_idx
            })
            nuevo_idx += 1

        # Mostrar algunos ejemplos
        self.stdout.write("\nEjemplos de renumeración:")
        for item in renumeraciones[:10]:
            self.stdout.write(f"  Orden ID {item['orden'].id}: idx {item['idx_antiguo']} → {item['idx_nuevo']}")
        
        if len(renumeraciones) > 10:
            self.stdout.write(f"  ... y {len(renumeraciones) - 10} más")

        if dry_run:
            self.stdout.write("\nDRY RUN: No se aplicaron cambios.")
            return

        # Aplicar cambios
        with transaction.atomic():
            # Primero, mover todos a valores temporales negativos para evitar conflictos
            self.stdout.write("\nPaso 1: Moviendo a valores temporales...")
            for item in renumeraciones:
                orden = item['orden']
                orden.idx = -item['idx_nuevo']  # Temporal negativo
                orden.save(update_fields=['idx'])
            
            # Luego, asignar los valores finales
            self.stdout.write("Paso 2: Asignando valores finales...")
            for item in renumeraciones:
                orden = item['orden']
                orden.idx = item['idx_nuevo']
                orden.save(update_fields=['idx'])

        self.stdout.write(self.style.SUCCESS(f"\n✓ Renumeración completada: {len(renumeraciones)} órdenes actualizadas."))
        self.stdout.write(f"  Nuevo rango de idx: {renumeraciones[0]['idx_nuevo']} - {renumeraciones[-1]['idx_nuevo']}")
