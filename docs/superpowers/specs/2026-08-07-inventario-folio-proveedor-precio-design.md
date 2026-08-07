# Design: Folio, proveedor y precio unitario en Inventario

**Fecha:** 2026-08-07  
**Estado:** Aprobado (enfoque 1 — campos en `InventarioItem`, sobrescribir última compra)  
**Alcance:** Al importar factura, guardar en cada producto el folio, el proveedor (FK a Contactos) y el `precio_unitario` de la línea. Mostrarlos en la tabla de inventario.

## Decisiones

| Tema | Decisión |
|------|----------|
| Persistencia | Campos en `InventarioItem`; se sobrescriben con cada import |
| Monto | `precio_unitario` de la línea SYSCOM (costo por pieza) |
| Proveedor | FK → `Cliente` con `tipo=PROVEEDOR`; upsert “SYSCOM”/“TVC” si no existe |
| Escaneo sin factura | Folio / proveedor / precio quedan vacíos |
| Historial | No se guarda compra anterior (aceptado) |

## Modelo

```text
InventarioItem
  + folio_factura     CharField(64), blank
  + proveedor         FK Cliente (SET_NULL, null), related_name inventario_items
  + precio_unitario   DecimalField(12,2), null
```

## Importación

1. Resolver `Cliente` proveedor por nombre case-insensitive (`SYSCOM` / `TVC`); crear si falta (`tipo=PROVEEDOR`, `clave` = nombre).
2. Mapear `precio_unitario` de cada línea (string → Decimal; inválido → null).
3. En cada ítem afectado: asignar `folio_factura`, `proveedor_id`, `precio_unitario` (siempre, no solo si vacío).

## API / UI

- Serializer de ítem: `folio_factura`, `precio_unitario`, `proveedor` (id), `proveedor_nombre`.
- Tabla: columnas Proveedor, Folio, Precio (además de las actuales).
- Modal: lectura de esos campos en esta entrega (relleno vía import).
