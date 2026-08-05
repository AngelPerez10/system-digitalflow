# Proyecto: tipos de trabajo múltiples + restricciones técnico asignado

## Summary

1. El proyecto admite **varios** tipos de trabajo (`tipos_trabajo: [{id, nombre}]`).
2. Al vincular una cotización DigitalFlow, se **unen** (sin duplicar) sus `tipo_trabajo` al proyecto.
3. Si el usuario logueado es el **técnico asignado** (y no admin), no puede: quitar/agregar cotizaciones, cambiar tipos de trabajo ni cambiar fecha de autorización. **Sí puede** marcar entrega e instalación de equipos. Backend refuerza esas reglas.
4. Visibilidad de listado sigue `own_only` en Gestión de usuarios (técnico / creador / auxiliar).

## Data

- Nuevo JSONField `tipos_trabajo` en `Proyecto`.
- Legacy `tipo_trabajo_id` / `tipo_trabajo_nombre` se sincronizan al primer elemento (compat).
- Migración: copiar legacy → array de un elemento.

## Frontend

- Multi-select de servicios en pestaña Operación.
- Auto-merge al cargar cotización en `useCotizacionPicker`.
- Flag `isAssignedTechnicianLocked` desde Auth + `tecnico.id`.
