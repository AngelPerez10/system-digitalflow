# Proyecto: ¿Quién autorizó? + auto-autorizar cotización DigitalFlow

**Fecha:** 2026-08-03  
**Estado:** aprobado para implementación

## Decisiones

| Tema | Decisión |
|------|----------|
| Campo «¿Quién autorizó?» | Texto libre (`CharField`) en el proyecto |
| Ubicación UI | `ProyectoClienteTab`, debajo de Identificación |
| Cuándo autorizar cotización | Al guardar el proyecto (create/update) |
| Alcance | Solo cotizaciones DigitalFlow vinculadas |
| `PENDIENTE` | → `AUTORIZADA` |
| `CANCELADA` | Sin cambio |
| `AUTORIZADA` | Sin cambio |
| SICAR | Sin cambio |
| Implementación authorize | Backend en serializer create/update |
| Lock técnico | Sin lock extra; editable con `proyectos.edit` |

## Backend

1. Campo `quien_autorizo` en `Proyecto` (blank, default `""`).
2. Exponer en `ProyectoSerializer`.
3. Helper que extrae IDs numéricos de bloques `origen=digitalflow` (`df-{id}` o id crudo).
4. Tras create/update exitoso: `Cotizacion.objects.filter(id__in=…, status="PENDIENTE").update(status="AUTORIZADA")`.

## Frontend

1. Draft/`proyectoApi`: `quienAutorizo` ↔ `quien_autorizo`.
2. Input en Identificación (grid o fila debajo de Cliente / ID cliente).
3. Opcional: disparar `cotizaciones:updated` tras guardar proyecto para refrescar listado de cotizaciones.

## Tests

- Smoke: crear proyecto con DF `PENDIENTE` → cotización queda `AUTORIZADA`.
- Cotización `CANCELADA` vinculada permanece `CANCELADA`.
- Campo `quien_autorizo` se persiste en create/patch.
