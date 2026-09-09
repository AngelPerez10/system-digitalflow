"""Genera las notificaciones in-app que no tienen un momento exacto que las dispare.

Pensado para un cron horario (igual que `check_syscom` y compañía):

    python manage.py escanear_notificaciones

Cubre:
  * prioridad de orden escalada por antigüedad (+72 h / +96 h sin resolver)
  * órdenes sin resolver abiertas hace más de N días
  * pólizas de mantenimiento con una visita programada dentro de N días

Todo es idempotente: `clave_dedupe` impide duplicar el mismo aviso entre corridas.
"""

from django.core.management.base import BaseCommand

from apps.notificaciones import eventos


class Command(BaseCommand):
    help = 'Crea notificaciones in-app periódicas (prioridad escalada, órdenes vencidas, pólizas próximas).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dias-orden', type=int, default=7,
            help='Antigüedad (días) desde la que una orden sin resolver genera aviso.',
        )
        parser.add_argument(
            '--dias-poliza', type=int, default=7,
            help='Antelación (días) con la que avisar un mantenimiento de póliza.',
        )

    def handle(self, *args, **options):
        escaladas = eventos.escanear_prioridad_escalada()
        pendientes = eventos.escanear_ordenes_pendientes(options['dias_orden'])
        polizas = eventos.escanear_polizas_proximas(options['dias_poliza'])
        total = escaladas + pendientes + polizas
        self.stdout.write(self.style.SUCCESS(
            f'Notificaciones creadas: {total} '
            f'(prioridad_escalada={escaladas}, ordenes_pendientes={pendientes}, polizas_proximas={polizas})'
        ))
