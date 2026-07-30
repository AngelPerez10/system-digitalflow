# Design: Mapa de arquitectura frontend (programa por olas)

**Fecha:** 2026-07-30  
**Estado:** Aprobado  
**Alcance:** Convención objetivo y plan por olas para organizar `frontend/src` sin big-bang.  
**No incluye:** rediseño visual, backend, nuevas features de producto.

**Specs de ola detallados:**
- Ola 1 → [`2026-07-30-proyectos-frontend-architecture-design.md`](./2026-07-30-proyectos-frontend-architecture-design.md)
- Ola 2 → [`2026-07-30-ordenes-frontend-architecture-design.md`](./2026-07-30-ordenes-frontend-architecture-design.md)

---

## 1. Problema

El frontend Intrax (~270 archivos bajo `src`) ya tiene buenas bases (`fetchApi`, lazy routes, guards, `*Types` por dominio), pero:

1. **Páginas monolíticas** concentran estado + API + UI (`OrdenesPage` ~3k líneas, `OrdenesTecnicoPage`, `NuevaCotizacionPage`, `ProyectoFormModal` ~2.2k).
2. **Carpetas inconsistentes** — algunos módulos ya parten (`Ventas/Cotizacion`, `OrdenesTrabajo/...`); otros están planos (`Proyectos/`).
3. **Deuda tipada** (~355 `any` en `pages/`) se acumula si se refactoriza sin gate de verificación.
4. Un refactor “de todo el frontend” en un solo PR **no es seguro**.

Objetivo del programa: **misma plantilla de módulo** aplicada ola por ola, con comportamiento congelado y verde en `tsc`/tests antes de la siguiente.

---

## 2. Decisiones globales

| Tema | Decisión |
|------|----------|
| Estrategia | Olas independientes; nunca mover todo `src/` de una vez |
| Comportamiento | Congelar flujos UX/rutas por ola; cleanup menor OK |
| Rutas (`App.tsx`) | Solo tocar imports si un path de página se mueve; lazy + `export default` se mantienen |
| Auth / API | Seguir `fetchApi`; no reintroducir tokens en Web Storage |
| Context global | No añadir Context de formularios; props/hooks por feature |
| UI kit (`components/ui`) | No reorganizar salvo duplicados claros o imports rotos |
| Template pages / Charts / UiElements | Baja prioridad; no incluir en olas 1–3 |
| Documentación | Cada ola grande tiene spec propio; este doc es el mapa |

---

## 3. Convención objetivo por feature module

Plantilla para un dominio bajo `pages/<Area>/<Feature>/`:

```text
Feature/
├── <Feature>Page.tsx           # orquestación listado / ruta
├── use<Feature>Permissions.ts  # opcional
├── list/                       # tablas, cards, stats del listado
├── form/                       # modal/página de edición
│   ├── <Feature>FormModal.tsx  # shell
│   ├── use<Feature>FormState.ts
│   ├── tabs/ | panels/
│   └── fields/
├── shared/                     # *Types, *Api, *Utils, styles, validation
└── <subfeature>/               # solo si es dominio autónomo (ej. instalaciones GPS)
    └── index.ts                # barrel público
```

### Reglas de dependencia

1. `list/` no importa `form/`.
2. Subfeatures autónomos no importan `form/` ni `list/` del padre.
3. Consumidores externos importan el subfeature solo vía `index.ts`.
4. API HTTP del dominio vive en `*Api.ts` (o `shared/`); la página no hace `fetch` crudo.
5. Tipos de respuesta en `*Types.ts`; no `any` nuevo en archivos tocados.
6. Librerías pesadas solo desde chunks lazy (AGENTS.md).

### Gate de calidad por ola (obligatorio antes de cerrar)

```bash
cd frontend
pnpm exec tsc -b --noEmit
pnpm test   # o subset del módulo si el suite completo es lento, documentar cuáles
pnpm exec eslint <paths tocados fuera de la exclusión habitual; y pages tocadas>
```

Smoke manual mínimo del módulo (crear / editar / listar / permiso denegado si aplica).

---

## 4. Estado actual (mapa rápido)

| Área | Ruta pages | Madurez estructural | Dolor principal |
|------|------------|---------------------|-----------------|
| Proyectos | `Operacion/Proyectos/` | Baja (plano + modal 2.2k) | Modal monolítico + GPS mezclado |
| Órdenes servicio | `Operacion/OrdenesTrabajo/OrdenServicio/` | Alta (Ola 2: `list/`/`form/`/`shared/`, hooks, tabs) | Reducir `any` residual en páginas raíz |
| Cotizaciones | `Ventas/Cotizacion/` | Media (api/types/hooks parciales) | `NuevaCotizacionPage` monolítica |
| Facturas CFDI | `Ventas/FacturasCFDI/` | Media | Crecimiento; aplicar plantilla al tocar |
| Clientes | `ContactosNegocio/Clientes/` | Media–baja | Varias páginas; sin subcarpetas form/list |
| Productos/Servicios | `ProductosYServicios/` | Media | Catálogos externos |
| Tareas | `MiEscritorio/Tareas/` | Media | Admin vs técnico |
| Cuentas Antarix | `Operacion/CuentasAntarix/` | Media | Tipos Wialon ya separados |
| Layout / auth / config | `layout/`, `components/auth/`, `config/` | Alta | No reestructurar en olas tempranas |
| Dashboard ecommerce charts | `components/ecommerce/`, Charts | Baja prioridad | No es dominio de negocio ERP |

---

## 5. Olas del programa

### Ola 0 — Gobernanza (este documento)

- Publicar este mapa.
- Actualizar `AGENTS.md` con un párrafo que apunte a la plantilla + enlace al spec de ola activa (en la misma ola que se implemente, no antes de Ola 1).
- **Sin** moves de código en Ola 0.

### Ola 1 — Proyectos *(Ola 1 implementada — estructural)*

Ver: [`2026-07-30-proyectos-frontend-architecture-design.md`](./2026-07-30-proyectos-frontend-architecture-design.md).

Resumen: `list/` + `form/` + `shared/` + `instalaciones/` barrel; shell modal + `useProyectoFormState` + tabs; comportamiento congelado.

**Estado (2026-07-30):** Ola 1 implementada (estructural). Gate automatizado verde (`tsc`, vitest Proyectos, eslint paths nuevos). Smoke manual pendiente de usuario (ver Task 8 report).

**Criterio de cierre:** criterios de éxito del spec de Proyectos + gate de calidad (§3).

### Ola 2 — Órdenes de servicio (`OrdenServicio/`) *(Ola 2 implementada — estructural)*

Ver: [`2026-07-30-ordenes-frontend-architecture-design.md`](./2026-07-30-ordenes-frontend-architecture-design.md).

| Qué | Detalle |
|-----|---------|
| Entrada | Reusar lo ya extraído (`useOrdenFormModalState`, `ordenesPageTypes`, stats, mobile cards) |
| Hacer | Shared-first: `useOrdenesList` + `useOrdenFormDraft` (admin+técnico) → `list/`/`form/`/`shared/` → `OrdenFormModal` + tabs; a11y AA en modal |
| No hacer | Mezclar con Levantamiento/Instalación legacy; no unificar rutas; no migrar GPS histórico |
| Riesgo | Alto (uso diario) → PRs 2.1–2.6 |

**Estado (2026-07-30):** Ola 2 implementada (estructural). Gate automatizado verde (`tsc`, vitest OrdenServicio, eslint paths nuevos). Smoke manual pendiente de usuario (ver Task 6 report).

**Criterio de cierre:** criterios de éxito del spec de Órdenes + gate de calidad (§3).

### Ola 3 — Cotizaciones (`Ventas/Cotizacion/`)

| Qué | Detalle |
|-----|---------|
| Entrada | Ya hay `cotizacionApi`, types, `useCotizacionCatalogos`, etc. |
| Hacer | Partir `NuevaCotizacionPage` en shell + secciones/hooks; `list/` para listado si aún mezclado |
| No hacer | Cambiar motor PDF/SICAR salvo imports rotos por moves |
| Riesgo | Alto (ventas) |

### Ola 4 — Dominios medianos (plantilla al tocar)

Orden sugerido al abordar:

1. `FacturasCFDI/`
2. `ContactosNegocio/Clientes/`
3. `MiEscritorio/Tareas/`
4. `ProductosYServicios/`
5. `Operacion/CuentasAntarix/` / `Reportes/`

Cada uno: spec corto (1–2 páginas) solo si el move supera ~15 archivos; si no, checklist de plantilla en el PR.

### Ola 5 — Shared / higiene transversal

Solo después de olas 1–3 estabilizadas:

- Duplicados obvios de selects/modales de dominio (no reinventar `SearchableSelect`).
- Reducir `any` **solo** en archivos tocados por la ola.
- Revisar imports de pages demo (`UiElements`, `Charts`) si aún están en `App.tsx` y no se usan en producción — candidato a quitar rutas, no a “reorganizar por estética”.

### Fuera del programa (explícito)

- Renombrar `components/ui` completo o migrar a otro design system.
- Introducir Redux/Zustand/React Query como requisito del mapa (evaluación futura aparte).
- Unificar admin/técnico en una sola página si cambia UX (eso es feature, no arquitectura).
- Backend o contratos API.

---

## 6. Orden de trabajo inmediato (post-aprobación de este mapa)

1. Usuario aprueba este mapa.
2. **writing-plans** para Ola 1 (Proyectos) a partir del spec ya escrito.
3. Implementar Ola 1 con gates.
4. Solo entonces abrir spec/plan de Ola 2.

No implementar Olas 2+ en el mismo PR que Ola 1.

---

## 7. Criterios de éxito del programa (macro)

- Cada feature de negocio tocado converge a la plantilla §3.
- Cero regresiones conocidas en smoke de la ola cerrada.
- `App.tsx` paths de lazy siguen resolviendo (casing Linux-safe).
- `AGENTS.md` documenta la plantilla y apunta al mapa + ola activa.
- Ninguna ola deja `tsc -b --noEmit` en rojo.

---

## 8. Relación con el pedido “organizar todo el frontend”

Este documento **es** esa organización: un programa ejecutable. “Todo” se logra como suma de olas cerradas, no como un único refactor. La primera entrega de valor es Ola 1 (Proyectos), ya diseñada en detalle.
