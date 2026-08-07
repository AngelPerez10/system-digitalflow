# Design: Paginación Inventario + stats

**Fecha:** 2026-08-07  
**Estado:** Aprobado (servidor como Clientes; stats endpoint)  
**Alcance:** Paginación en “Ítems en inventario” e “Historial de movimientos”; totales globales vía endpoint dedicado.

## API

| Endpoint | Query | Respuesta |
|----------|-------|-----------|
| `GET /api/inventario/items/` | `page`, `page_size` (default 20, máx 100), `search` | `{ count, next, previous, results }` |
| `GET /api/inventario/movimientos/` | `page`, `page_size`, `item`, `desde` | igual |
| `GET /api/inventario/stats/` | — | `{ total_items, total_unidades, sin_identificar, movimientos_hoy }` |

Permiso: `inventario.view`.

## Frontend

- Controles de paginación estilo Clientes bajo cada lista.
- Búsqueda / filtro por ítem → página 1.
- Stats leen `/stats/` (no el tamaño de la página).
- Tras scan/import/delete → refrescar página actual + stats.
