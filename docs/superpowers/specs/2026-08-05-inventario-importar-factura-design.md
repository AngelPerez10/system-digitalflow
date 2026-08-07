# Design: Importar factura de proveedor a Inventario

**Fecha:** 2026-08-05  
**Estado:** Aprobado (proveedor genérico + import directo; match C; bloqueo reimport; movimiento +N)  
**Alcance:** Pegar folio (ej. `FA26/1405777`) en Inventario y cargar todos los productos como entradas. SYSCOM en v1; contrato listo para TVC.

## Decisiones

| Tema | Decisión |
|------|----------|
| UI | Campo “Importar factura” + selector de proveedor (TVC deshabilitado) |
| API | `POST /api/inventario/importar-factura/` `{ proveedor, folio }` |
| Match | 1) `fuente+ref_externa` 2) `codigo_barras == modelo` 3) alta con modelo como código |
| Reimport | `409` si `(proveedor, folio)` ya existe en `InventarioImportacion` |
| Cantidad | Un movimiento de entrada con `cantidad` de la línea |
| TVC | Stub → `501` hasta que exista endpoint de facturas |

## Backend

- Modelo `InventarioImportacion(proveedor, folio, usuario, creado_en)` unique `(proveedor, folio)`.
- Providers: `syscom` (`GET /facturas/{prefijo}/{id}`), `tvc` no soportado.
- Línea SYSCOM: `producto_id`, `cod_art`→modelo, `titulo`, `marca`, `imagen`, `cantidad`.
- Líneas de servicio descartadas (`es_linea_de_servicio`): el envío se factura como producto de catálogo (`cod_art: "ENVIO"`, `producto_id: 136321`), así que el filtro va por código: prefijos `ENVIO`/`FLETE`/`PAQUETERIA`, códigos `SEGURO`/`MANIOBRA(S)`.
- Nombre corto: el título se limpia con `_plain_text` (viene con entidades HTML) y se parte en el primer ` / `; el resto a `notas` si van vacías.
- Permiso: `inventario.create`.

## Frontend

- Bloque bajo la consola de escaneo (solo si `canCreate`).
- Toast/alerta con creados/actualizados; refresca ítems e historial.
