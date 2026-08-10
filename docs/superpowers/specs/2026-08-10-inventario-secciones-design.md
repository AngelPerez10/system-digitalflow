# Design: Secciones de inventario

**Fecha:** 2026-08-10  
**Estado:** Aprobado  
**Alcance:** Clasificar ítems en 12 secciones fijas; filtrar con chips; auto-relleno desde catálogo + edición manual.

## Decisiones

| Tema | Decisión |
|------|----------|
| Asignación | Auto desde categoría SYSCOM/TVC si `seccion` está vacía; el operador puede corregir en el modal |
| UI | Chips: Todas · Sin sección · 12 secciones (filtro server-side) |
| Modelo | `InventarioItem.seccion` CharField con choices (slug) + blank |
| Sin sección | Valor `""`; query `?seccion=sin` |

## Secciones (slug → etiqueta)

1. `audio_video_profesional` → Audio y video profesional  
2. `automatizacion_intrusion` → Automatización e Intrusión  
3. `cableado_estructurado` → Cableado Estructurado  
4. `control_acceso` → Control de Acceso  
5. `deteccion_fuego` → Detección de Fuego  
6. `energia_climatizacion` → Energía y Climatización  
7. `gps_telematica` → GPS, Telemática y Equipamiento Vehicular  
8. `herramientas_ferreteria` → Herramientas, Ferretería y Material Eléctrico  
9. `industria_bms_robots` → Industria / BMS/ Robots  
10. `radiocomunicacion` → Radiocomunicación  
11. `redes_it` → Redes e IT  
12. `videovigilancia` → Videovigilancia  

## Auto-map

- SYSCOM expone `categorias: [{ id, nombre, nivel }]`.
- Prioridad: **id de categoría nivel 1** (`SYSCOM_CATEGORIA_ID_A_SECCION`) → nombre.
- IDs verificados: 22 videovigilancia, 25 radio, 26 redes, 27 gps, 30 energía, 32 automatización, 37 acceso, 38 fuego, 42 herramientas, 65811 cableado, 66523 audio, 66630 industria. Marketing (65747) no mapea.
- Solo rellena si `seccion` está vacío; el operador puede corregir en el modal.

## API

- `GET /api/inventario/items/?seccion=<slug|sin>`
- Serializer / PATCH incluyen `seccion`
- Enrichment / detalle de catálogo incluyen `seccion` sugerida

## UI

- Chips scrollables sobre la tabla (`role="tablist"`).
- Select “Sección” en el modal de edición.
- Columna o badge opcional en tabla (proveedor ya existe; badge de sección en producto o columna ligera).

## Backfill (ítems ya existentes)

Los ítems creados antes del campo `seccion` quedan en `""` hasta que algo persista un valor. Al abrir Inventario, el FE llama `POST /api/inventario/sincronizar-secciones/` (hasta 50). El listado también rellena hasta 5 de la página actual. Sin vínculo SYSCOM/TVC ni match por modelo, siguen en «Sin sección» hasta vincular o elegir en el modal.

## Fuera de alcance

- Lista agrupada por sección  
- Secciones editables por admin  
 
