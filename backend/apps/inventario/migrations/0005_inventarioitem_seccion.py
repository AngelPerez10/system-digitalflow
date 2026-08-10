# Generated manually for inventario secciones

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventario', '0004_inventarioitem_folio_proveedor_precio'),
    ]

    operations = [
        migrations.AddField(
            model_name='inventarioitem',
            name='seccion',
            field=models.CharField(
                blank=True,
                choices=[
                    ('audio_video_profesional', 'Audio y video profesional'),
                    ('automatizacion_intrusion', 'Automatización e Intrusión'),
                    ('cableado_estructurado', 'Cableado Estructurado'),
                    ('control_acceso', 'Control de Acceso'),
                    ('deteccion_fuego', 'Detección de Fuego'),
                    ('energia_climatizacion', 'Energía y Climatización'),
                    ('gps_telematica', 'GPS, Telemática y Equipamiento Vehicular'),
                    ('herramientas_ferreteria', 'Herramientas, Ferretería y Material Eléctrico'),
                    ('industria_bms_robots', 'Industria / BMS/ Robots'),
                    ('radiocomunicacion', 'Radiocomunicación'),
                    ('redes_it', 'Redes e IT'),
                    ('videovigilancia', 'Videovigilancia'),
                ],
                db_index=True,
                default='',
                max_length=40,
            ),
        ),
    ]
