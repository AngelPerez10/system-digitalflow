# PDF de proyectos (híbrido operativo) — Design

**Fecha:** 2026-08-10  
**Estado:** Aprobado (usuario)

## Objetivo

Generar PDF de un proyecto con la misma cáscara visual que órdenes de trabajo, más bitácora día por día. Sin precios, sin tabla de equipos/partidas.

## Alcance v1

- Plantilla HTML `generate_proyecto_pdf_html(proyecto)`
- `GET /api/proyectos/{id}/pdf/` (PDF binario o HTML fallback)
- Página frontend `/proyectos/:id/pdf` + botón del listado
- Folio `PRJ` vía `FOLIO_SERIE_PRJ`

## Contenido

1. Encabezado Intrax + folio + estado  
2. Hero “Proyecto” + cliente  
3. Cards: cliente (dirección y teléfono del contacto en Clientes) / equipo de campo (Otros técnicos y Auxiliares solo si hay nombres)  
4. Tipos de trabajo, fecha de inicio, fecha de finalización (último día del rango), vehículo, herramientas  
5. Bitácora por jornada: Día N · fecha, nota y hasta 2 fotos  
6. Firmas técnico + cliente  
7. Página evidencias si hay URLs

## Tipografía

Arial / Helvetica (no `system-ui`). En Windows y en Playwright/Linux se ve la misma métrica; `system-ui` en Render se ve más alta y grande.

## Fuera de alcance

Enviar por correo, PDF del mes, precios, instalaciones GPS detalladas.
