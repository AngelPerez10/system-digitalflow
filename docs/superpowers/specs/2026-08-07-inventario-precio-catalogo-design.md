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

- **SYSCOM:** `precios.precio_especial` o `precio_lista` (USD) × tipocambio SYSCOM × 1.16 → MXN.
- **TVC:** `precio_mxn` del mapeo existente (lista/distribuidor × TC TVC × 1.16).
