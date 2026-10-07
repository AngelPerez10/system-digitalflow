from django.apps import AppConfig


class ContratosConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    # Etiqueta distinta de `documentos`: ese label ya figura como migrado en
    # producción (app huérfana, ver AGENTS.md) y sus tablas nunca se crearían.
    name = 'apps.contratos'
    label = 'contratos'
    verbose_name = 'Contratos'
