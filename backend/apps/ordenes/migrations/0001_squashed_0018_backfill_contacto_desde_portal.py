# Squash de las migraciones 0001–0018 de `ordenes`.
# Se conservan las migraciones originales (Django usa esta para instalaciones
# nuevas y las viejas para BD ya migradas). Cuando todos los entornos hayan
# aplicado hasta 0018, se pueden borrar las 0001–0018 y quitar `replaces`.

import django.core.validators
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


# --- Funciones portadas de las migraciones originales (RunPython) -------------

def _prefill_folio_from_idx(apps, schema_editor):
    """0002: rellena `folio` con el `idx` cuando está vacío."""
    Orden = apps.get_model('ordenes', 'Orden')
    for o in Orden.objects.filter(folio__isnull=True).exclude(idx__isnull=True):
        Orden.objects.filter(id=o.id).update(folio=str(o.idx))


def _forwards_copy_bool_to_int(apps, schema_editor):
    """0008: `permitir_fotos_extra=True` -> `fotos_extra_max=2`."""
    Orden = apps.get_model('ordenes', 'Orden')
    Orden.objects.filter(permitir_fotos_extra=True).update(fotos_extra_max=2)


def _backfill_contacto_desde_portal(apps, schema_editor):
    """0018: rellena `nombre_cliente` / `telefono_cliente` vacíos con los datos
    que el cliente dio al registrarse en el portal.
    """
    Orden = apps.get_model('ordenes', 'Orden')
    ClientePortalAccount = apps.get_model('clientes', 'ClientePortalAccount')

    contacto_por_cliente = {}
    accounts = (
        ClientePortalAccount.objects
        .select_related('user', 'cliente')
        .order_by('id')
    )
    for acc in accounts:
        if acc.cliente_id in contacto_por_cliente:
            continue
        user = acc.user
        nombre = f"{(user.first_name or '').strip()} {(user.last_name or '').strip()}".strip()
        cliente = acc.cliente
        telefono = ((cliente.celular or '').strip() or (cliente.telefono or '').strip())[:15]
        contacto_por_cliente[acc.cliente_id] = (nombre, telefono)

    if not contacto_por_cliente:
        return

    vacias = (
        Orden.objects
        .filter(cliente_id__in=contacto_por_cliente.keys())
        .filter(
            models.Q(nombre_cliente__isnull=True) | models.Q(nombre_cliente='')
            | models.Q(telefono_cliente__isnull=True) | models.Q(telefono_cliente='')
        )
        .only('id', 'cliente_id', 'nombre_cliente', 'telefono_cliente')
    )
    por_actualizar = []
    for orden in vacias.iterator():
        nombre, telefono = contacto_por_cliente.get(orden.cliente_id_id, (None, None))
        cambio = False
        if not (orden.nombre_cliente or '').strip() and nombre:
            orden.nombre_cliente = nombre
            cambio = True
        if not (orden.telefono_cliente or '').strip() and telefono:
            orden.telefono_cliente = telefono
            cambio = True
        if cambio:
            por_actualizar.append(orden)

    if por_actualizar:
        Orden.objects.bulk_update(
            por_actualizar, ['nombre_cliente', 'telefono_cliente'], batch_size=500
        )


class Migration(migrations.Migration):

    replaces = [
        ('ordenes', '0001_initial'),
        ('ordenes', '0002_add_folio_to_orden'),
        ('ordenes', '0003_ordenlevantamiento'),
        ('ordenes', '0004_orden_quien_instalo_quien_entrego'),
        ('ordenes', '0005_reportesemanal'),
        ('ordenes', '0006_rename_ordenes_rep_tecnic_2e75ce_idx_ordenes_rep_tecnico_d600b3_idx_and_more'),
        ('ordenes', '0007_orden_permitir_fotos_extra'),
        ('ordenes', '0008_fotos_extra_max'),
        ('ordenes', '0009_ordeninstalacion'),
        ('ordenes', '0010_orden_seguimiento_administrativo'),
        ('ordenes', '0011_orden_status_changed_at'),
        ('ordenes', '0012_orden_equipos_inventario'),
        ('ordenes', '0013_orden_list_fecha_indexes'),
        ('ordenes', '0014_orden_status_pausado_motivo_pausa'),
        ('ordenes', '0015_ordencalificacion'),
        ('ordenes', '0016_orden_actualizado_por'),
        ('ordenes', '0017_orden_pool_fields'),
        ('ordenes', '0018_backfill_contacto_desde_portal'),
    ]

    initial = True

    dependencies = [
        ('clientes', '0001_initial'),
        ('clientes', '0004_cliente_formulario_simplificado'),
        ('clientes', '0005_portal_cliente'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Orden',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('idx', models.IntegerField(blank=True, db_index=True, null=True, unique=True)),
                ('cliente', models.CharField(blank=True, max_length=100, null=True)),
                ('direccion', models.TextField(blank=True, null=True)),
                ('telefono_cliente', models.CharField(blank=True, max_length=15, null=True)),
                ('problematica', models.TextField(blank=True, null=True)),
                ('servicios_realizados', models.JSONField(blank=True, default=list)),
                ('status', models.CharField(choices=[('pendiente', 'Pendiente'), ('resuelto', 'Resuelto')], default='pendiente', max_length=20)),
                ('prioridad', models.CharField(choices=[('baja', 'Baja'), ('media', 'Media'), ('alta', 'Alta')], default='media', max_length=10)),
                ('comentario_tecnico', models.TextField(blank=True, null=True)),
                ('fecha_inicio', models.DateField(blank=True, default=django.utils.timezone.now, null=True)),
                ('hora_inicio', models.TimeField(blank=True, null=True)),
                ('fecha_finalizacion', models.DateField(blank=True, null=True)),
                ('hora_termino', models.TimeField(blank=True, null=True)),
                ('nombre_encargado', models.CharField(blank=True, max_length=100, null=True)),
                ('nombre_cliente', models.CharField(blank=True, max_length=100, null=True)),
                ('fotos_urls', models.JSONField(blank=True, default=list)),
                ('pdf_generado', models.FileField(blank=True, null=True, upload_to='pdfs/')),
                ('pdf_url', models.URLField(blank=True, max_length=500, null=True)),
                ('firma_encargado_url', models.TextField(blank=True, null=True)),
                ('firma_cliente_url', models.TextField(blank=True, null=True)),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
                ('fecha_actualizacion', models.DateTimeField(auto_now=True)),
                ('cliente_id', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ordenes', to='clientes.cliente')),
                ('creado_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ordenes_creadas', to=settings.AUTH_USER_MODEL)),
                ('tecnico_asignado', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ordenes_asignadas', to=settings.AUTH_USER_MODEL)),
                ('folio', models.CharField(blank=True, db_index=True, max_length=50, null=True, unique=True)),
            ],
            options={
                'verbose_name': 'Orden',
                'verbose_name_plural': 'Órdenes',
                'ordering': ['idx'],
                'indexes': [models.Index(fields=['idx'], name='ordenes_ord_idx_6e443d_idx'), models.Index(fields=['cliente'], name='ordenes_ord_cliente_2cfe54_idx'), models.Index(fields=['fecha_inicio'], name='ordenes_ord_fecha_i_ed9bd0_idx')],
            },
        ),
        migrations.RunPython(
            code=_prefill_folio_from_idx,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.CreateModel(
            name='OrdenLevantamiento',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('payload', models.JSONField(blank=True, default=dict)),
                ('dibujo_url', models.TextField(blank=True, default='')),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
                ('fecha_actualizacion', models.DateTimeField(auto_now=True)),
                ('creado_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='levantamientos_creados', to=settings.AUTH_USER_MODEL)),
                ('orden', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='levantamiento', to='ordenes.orden')),
            ],
            options={
                'verbose_name': 'Levantamiento',
                'verbose_name_plural': 'Levantamientos',
            },
        ),
        migrations.AddField(
            model_name='orden',
            name='quien_entrego',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ordenes_entregadas', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='orden',
            name='quien_instalo',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ordenes_instaladas', to=settings.AUTH_USER_MODEL),
        ),
        migrations.CreateModel(
            name='ReporteSemanal',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('semana_inicio', models.DateField()),
                ('semana_fin', models.DateField()),
                ('ordenes', models.JSONField(blank=True, default=list)),
                ('total_ordenes', models.PositiveIntegerField(default=0)),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
                ('fecha_actualizacion', models.DateTimeField(auto_now=True)),
                ('tecnico', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reportes_semanales', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Reporte semanal',
                'verbose_name_plural': 'Reportes semanales',
                'ordering': ['-fecha_creacion'],
                'indexes': [models.Index(fields=['tecnico', 'semana_inicio', 'semana_fin'], name='ordenes_rep_tecnico_d600b3_idx'), models.Index(fields=['fecha_creacion'], name='ordenes_rep_fecha_c_5daca3_idx')],
            },
        ),
        migrations.AddField(
            model_name='orden',
            name='permitir_fotos_extra',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='orden',
            name='fotos_extra_max',
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.RunPython(
            code=_forwards_copy_bool_to_int,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RemoveField(
            model_name='orden',
            name='permitir_fotos_extra',
        ),
        migrations.CreateModel(
            name='OrdenInstalacion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('payload', models.JSONField(blank=True, default=dict)),
                ('dibujo_url', models.TextField(blank=True, default='')),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
                ('fecha_actualizacion', models.DateTimeField(auto_now=True)),
                ('creado_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='instalaciones_creadas', to=settings.AUTH_USER_MODEL)),
                ('orden', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='instalacion', to='ordenes.orden')),
            ],
            options={
                'verbose_name': 'Instalación',
                'verbose_name_plural': 'Instalaciones',
            },
        ),
        migrations.AddField(
            model_name='orden',
            name='status_administrativo',
            field=models.CharField(choices=[('pendiente', 'Pendiente'), ('en_revision', 'En revisión'), ('enviado', 'Enviado'), ('cerrado', 'Cerrado')], default='pendiente', max_length=20),
        ),
        migrations.AddField(
            model_name='orden',
            name='fecha_envio',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='orden',
            name='cotizaciones_adjuntas',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='orden',
            name='status_changed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='orden',
            name='equipos_inventario',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddIndex(
            model_name='orden',
            index=models.Index(fields=['fecha_creacion'], name='ordenes_ord_fecha_c_4df55e_idx'),
        ),
        migrations.AddIndex(
            model_name='orden',
            index=models.Index(fields=['-fecha_inicio', '-fecha_creacion', '-id'], name='ordenes_ord_fecha_i_60b8ba_idx'),
        ),
        migrations.AddField(
            model_name='orden',
            name='motivo_pausa',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='orden',
            name='status',
            field=models.CharField(choices=[('pendiente', 'Pendiente'), ('pausado', 'Pausado'), ('resuelto', 'Resuelto')], default='pendiente', max_length=20),
        ),
        migrations.CreateModel(
            name='OrdenCalificacion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('estrellas', models.PositiveSmallIntegerField(validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ('comentario', models.TextField(blank=True, default='')),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
                ('creado_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='calificaciones_emitidas', to=settings.AUTH_USER_MODEL)),
                ('orden', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='calificacion', to='ordenes.orden')),
                ('tecnico', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='calificaciones_recibidas', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Calificación de orden',
                'verbose_name_plural': 'Calificaciones de órdenes',
                'ordering': ['-fecha_creacion'],
                'indexes': [models.Index(fields=['tecnico', 'fecha_creacion'], name='ordenes_ord_tecnico_9aa1c7_idx')],
                'constraints': [models.CheckConstraint(condition=models.Q(('estrellas__gte', 1), ('estrellas__lte', 5)), name='calificacion_estrellas_1_a_5')],
            },
        ),
        migrations.AddField(
            model_name='orden',
            name='actualizado_por',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ordenes_actualizadas', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='orden',
            name='en_pool',
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AddField(
            model_name='orden',
            name='liberada_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='orden',
            name='liberada_por',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ordenes_liberadas', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='orden',
            name='prioridad_pool',
            field=models.CharField(choices=[('baja', 'Baja'), ('media', 'Media'), ('alta', 'Alta')], default='media', max_length=10),
        ),
        migrations.AddField(
            model_name='orden',
            name='tomada_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='orden',
            name='tomada_por',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ordenes_tomadas', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddIndex(
            model_name='orden',
            index=models.Index(fields=['en_pool', 'prioridad_pool'], name='ordenes_ord_en_pool_e80336_idx'),
        ),
        migrations.RunPython(
            code=_backfill_contacto_desde_portal,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
