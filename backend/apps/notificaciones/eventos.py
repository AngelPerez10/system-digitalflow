"""Creación de notificaciones in-app a partir de eventos del sistema.

Dos vías:

* **En caliente** — el ViewSet de órdenes llama a `notificar_*` cuando algo pasa
  (se libera / asigna / toma una orden). Todo va envuelto para que un fallo aquí
  nunca tumbe la petición que lo originó.
* **Por escaneo** — `escanear_*` los ejecuta el management command
  `escanear_notificaciones` en un cron. Cubren lo que no tiene un momento exacto:
  prioridad escalada por antigüedad, órdenes vencidas y pólizas próximas.

`clave_dedupe` (única por destinatario) impide que un escaneo horario multiplique
el mismo aviso.
"""

from __future__ import annotations

import logging
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import IntegrityError, models
from django.utils import timezone

from .models import Notificacion

logger = logging.getLogger(__name__)

User = get_user_model()

_ORDEN_RESUELTA = ['resuelto', 'completado', 'completada']


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

def crear_notificacion(
    *,
    destinatario_id: int,
    tipo: str,
    titulo: str,
    cuerpo: str = '',
    url: str = '',
    ref_tipo: str = '',
    ref_id: int | None = None,
    clave_dedupe: str = '',
) -> Notificacion | None:
    """Crea el aviso. Devuelve la fila **solo si es nueva**; `None` si `clave_dedupe`
    ya existía para ese usuario (así los contadores reflejan lo realmente creado)."""
    if not destinatario_id:
        return None
    defaults = dict(
        tipo=tipo, titulo=titulo[:160], cuerpo=cuerpo[:400], url=url[:300],
        ref_tipo=ref_tipo[:20], ref_id=ref_id,
    )
    try:
        if clave_dedupe:
            obj, creada = Notificacion.objects.get_or_create(
                destinatario_id=destinatario_id,
                clave_dedupe=clave_dedupe[:160],
                defaults=defaults,
            )
            return obj if creada else None
        return Notificacion.objects.create(destinatario_id=destinatario_id, **defaults)
    except IntegrityError:
        return None
    except Exception:  # pragma: no cover - defensivo
        logger.exception('No se pudo crear notificación tipo=%s dest=%s', tipo, destinatario_id)
        return None


def _folio_cliente(orden) -> str:
    folio = (getattr(orden, 'folio', '') or '').strip() or f"#{getattr(orden, 'idx', None) or orden.pk}"
    cliente = (getattr(orden, 'cliente', '') or '').strip()
    return ' · '.join(p for p in (folio, cliente) if p)


def _ids_staff() -> list[int]:
    return list(
        User.objects.filter(is_active=True)
        .filter(models.Q(is_staff=True) | models.Q(is_superuser=True))
        .values_list('id', flat=True)
    )


def _usuarios_pueden_ver_pool(excluir_id: int | None = None) -> list:
    """Usuarios activos que podrían tomar una orden de la bolsa (mismo criterio
    que `OrdenesAnyAccessPermission`), opcionalmente excluyendo a uno."""
    from apps.notificaciones.services import _puede_ver_disponibles

    qs = User.objects.filter(is_active=True).select_related('permissions_profile')
    if excluir_id:
        qs = qs.exclude(pk=excluir_id)
    return [u for u in qs if _puede_ver_disponibles(u)]


def _url_orden(orden) -> str:
    return f'/ordenes?abrir={orden.pk}'


# --------------------------------------------------------------------------- #
# Eventos en caliente (los llama el ViewSet de órdenes)
# --------------------------------------------------------------------------- #

def notificar_orden_liberada(orden) -> int:
    """Aviso in-app a quienes pueden tomar la orden recién liberada."""
    marca = orden.liberada_at.isoformat() if getattr(orden, 'liberada_at', None) else ''
    cuerpo = _folio_cliente(orden)
    creadas = 0
    for u in _usuarios_pueden_ver_pool(excluir_id=getattr(orden, 'liberada_por_id', None)):
        if crear_notificacion(
            destinatario_id=u.pk,
            tipo=Notificacion.Tipo.ORDEN_LIBERADA,
            titulo='Nueva orden disponible',
            cuerpo=cuerpo,
            url=_url_orden(orden),
            ref_tipo='orden',
            ref_id=orden.pk,
            clave_dedupe=f'orden_liberada:{orden.pk}:{marca}',
        ):
            creadas += 1
    return creadas


def notificar_orden_asignada(orden, *, tecnico_id: int | None, actor_id: int | None = None) -> None:
    """Aviso al técnico al que se le asignó la orden (si cambió y no es él mismo)."""
    if not tecnico_id or tecnico_id == actor_id:
        return
    crear_notificacion(
        destinatario_id=tecnico_id,
        tipo=Notificacion.Tipo.ORDEN_ASIGNADA,
        titulo='Te asignaron una orden',
        cuerpo=_folio_cliente(orden),
        url=_url_orden(orden),
        ref_tipo='orden',
        ref_id=orden.pk,
        clave_dedupe=f'orden_asignada:{orden.pk}:{tecnico_id}',
    )


def notificar_orden_tomada(orden, *, tomador) -> None:
    """Aviso a oficina (staff) de que un técnico tomó una orden de la bolsa."""
    nombre = (
        (getattr(tomador, 'get_full_name', lambda: '')() or getattr(tomador, 'username', '') or 'Un técnico').strip()
    )
    tomador_id = getattr(tomador, 'id', None)
    for did in _ids_staff():
        if did == tomador_id:
            continue
        crear_notificacion(
            destinatario_id=did,
            tipo=Notificacion.Tipo.ORDEN_TOMADA,
            titulo='Orden tomada de la bolsa',
            cuerpo=f'{nombre} tomó {_folio_cliente(orden)}',
            url=_url_orden(orden),
            ref_tipo='orden',
            ref_id=orden.pk,
            clave_dedupe=f'orden_tomada:{orden.pk}:{orden.tomada_at.isoformat() if getattr(orden, "tomada_at", None) else ""}',
        )


# --------------------------------------------------------------------------- #
# Escaneos periódicos (management command)
# --------------------------------------------------------------------------- #

def _destinatarios_orden(orden) -> set[int]:
    dest = set(_ids_staff())
    if orden.tecnico_asignado_id:
        dest.add(orden.tecnico_asignado_id)
    return dest


def escanear_prioridad_escalada() -> int:
    """Órdenes sin resolver cuya prioridad efectiva ya subió sobre la base."""
    from apps.ordenes.models import Orden
    from apps.ordenes.prioridad import prioridad_pool_efectiva

    ahora = timezone.now()
    creadas = 0
    qs = (
        Orden.objects.exclude(status__in=_ORDEN_RESUELTA)
        .filter(prioridad_pool__in=['baja', 'media'])
        .select_related('tecnico_asignado')
    )
    for o in qs:
        efectiva = prioridad_pool_efectiva(o.prioridad_pool, o.fecha_creacion, o.status, ahora)
        if efectiva == (o.prioridad_pool or '').strip().lower():
            continue
        horas = int((ahora - o.fecha_creacion).total_seconds() // 3600) if o.fecha_creacion else 0
        cuerpo = f'{_folio_cliente(o)} · {horas} h sin resolver'
        for did in _destinatarios_orden(o):
            if crear_notificacion(
                destinatario_id=did,
                tipo=Notificacion.Tipo.ORDEN_PRIORIDAD_ESCALADA,
                titulo=f'Prioridad subió a {efectiva.capitalize()}',
                cuerpo=cuerpo,
                url=_url_orden(o),
                ref_tipo='orden',
                ref_id=o.pk,
                clave_dedupe=f'orden_prioridad_escalada:{o.pk}:{efectiva}',
            ):
                creadas += 1
    return creadas


def escanear_ordenes_pendientes(dias: int = 7) -> int:
    """Órdenes sin resolver abiertas hace más de `dias` (una vez al día)."""
    from apps.ordenes.models import Orden

    ahora = timezone.now()
    corte = ahora - timedelta(days=dias)
    hoy = ahora.date().isoformat()
    creadas = 0
    qs = (
        Orden.objects.exclude(status__in=_ORDEN_RESUELTA)
        .filter(fecha_creacion__lt=corte)
        .select_related('tecnico_asignado')
    )
    for o in qs:
        dias_abierta = (ahora - o.fecha_creacion).days if o.fecha_creacion else dias
        cuerpo = f'{_folio_cliente(o)} · {dias_abierta} días abierta'
        for did in _destinatarios_orden(o):
            if crear_notificacion(
                destinatario_id=did,
                tipo=Notificacion.Tipo.ORDEN_PENDIENTE,
                titulo='Orden sin resolver',
                cuerpo=cuerpo,
                url=_url_orden(o),
                ref_tipo='orden',
                ref_id=o.pk,
                clave_dedupe=f'orden_pendiente:{o.pk}:{hoy}',
            ):
                creadas += 1
    return creadas


def escanear_polizas_proximas(dias_aviso: int = 7) -> int:
    """Pólizas con un mantenimiento programado dentro de los próximos `dias_aviso`."""
    from apps.operacion.models import PolizaMantenimiento

    hoy = timezone.now().date()
    limite = hoy + timedelta(days=dias_aviso)
    staff = _ids_staff()
    if not staff:
        return 0
    creadas = 0
    for p in PolizaMantenimiento.objects.all():
        folio = (p.folio or '').strip() or f"#{p.idx or p.pk}"
        cliente = (p.cliente_nombre or '').strip()
        for num, fecha in enumerate((p.fecha1, p.fecha2, p.fecha3), start=1):
            if not fecha or not (hoy <= fecha <= limite):
                continue
            faltan = (fecha - hoy).days
            cuando = 'hoy' if faltan == 0 else f'en {faltan} día(s)'
            cuerpo = ' · '.join(
                x for x in (folio, cliente, f'mantenimiento {num} {cuando} ({fecha:%d/%m/%Y})') if x
            )
            for did in staff:
                if crear_notificacion(
                    destinatario_id=did,
                    tipo=Notificacion.Tipo.POLIZA_MANTENIMIENTO_PROXIMO,
                    titulo='Mantenimiento de póliza próximo',
                    cuerpo=cuerpo,
                    url='/polizas-mantenimiento',
                    ref_tipo='poliza',
                    ref_id=p.pk,
                    clave_dedupe=f'poliza_mantenimiento_proximo:{p.pk}:{fecha.isoformat()}',
                ):
                    creadas += 1
    return creadas
