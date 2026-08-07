# Design: Precio unitario desde catálogo (scan + modal)

**Fecha:** 2026-08-07  
**Estado:** Aprobado (opción A)  
**Alcance:** Al enriquecer/vincular con SYSCOM/TVC, rellenar `precio_unitario` (MXN) si está vacío; editable en el modal.

## Reglas

| Momento | Comportamiento |
|---------|----------------|
| Alta por escaneo + match catálogo | Guarda precio si el ítem es nuevo |
| Vincular / traer datos del catálogo | Rellena solo si `precio_unitario` está vacío (no pisa factura) |
| Importar factura | Sigue sobrescribiendo (última compra) |
| Modal | Campo editable; `PATCH` acepta `precio_unitario` |

## Origen del monto

- **SYSCOM:** el **más bajo** entre `precio_lista`, `precio_especial` y `precio_descuento` (USD) × tipocambio SYSCOM × 1.16 → MXN. (Inventario usa costo sugerido; cotización sigue prefiriendo especial.)
- **TVC:** `precio_mxn` del mapeo; si hay `precio_descuento` (distribuidor) menor que lista, se escala al mínimo.
