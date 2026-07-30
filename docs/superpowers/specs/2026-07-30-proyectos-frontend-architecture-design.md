# Design: Arquitectura frontend del módulo Proyectos

**Fecha:** 2026-07-30  
**Estado:** Aprobado en conversación (enfoque 1 + alcance B + comportamiento B)  
**Alcance:** Reorganizar `frontend/src/pages/Operacion/Proyectos/` en carpetas por dominio, extraer el monolito `ProyectoFormModal`, y aislar Instalaciones GPS como submódulo autónomo. Sin cambios de rutas ni backend.

**Relacionado:**
- Mapa del programa: [`2026-07-30-frontend-architecture-roadmap-design.md`](./2026-07-30-frontend-architecture-roadmap-design.md) (este spec = **Ola 1**)
- Feature GPS: [`2026-07-30-proyecto-instalaciones-gps-design.md`](./2026-07-30-proyecto-instalaciones-gps-design.md)

---

## 1. Contexto y problema

El directorio `Proyectos/` es plano (~29 archivos). El cuello de botella es `ProyectoFormModal.tsx` (~2.2k líneas): tabs Cliente / Instalaciones / Operación / Presupuesto, cotizaciones, bitácora, equipos, firmas y cableado GPS en un solo archivo.

Instalaciones GPS ya tiene piezas separadas (`InstalacionForm`, `ProyectoFormInstalacionesPanel`, `proyectoInstalacionApi`, `proyectoInstalacionTypes`), pero viven al mismo nivel que el resto y se importan de forma ad hoc desde el modal y `ProyectosPage`.

Objetivo: arquitectura **escalable y organizada**, con límites claros de dependencia, sin cambiar la UX/rutas actuales.

---

## 2. Decisiones cerradas

| Tema | Decisión |
|------|----------|
| Enfoque | Carpetas por dominio + paneles por tab + hook de estado (sin React Context) |
| Instalaciones GPS | Submódulo autónomo `instalaciones/` con barrel `index.ts` |
| Comportamiento | Congelar flujos; cleanup menor OK (imports muertos, hints, renombres de props) |
| Rutas / UX de página | Sin rutas nuevas; modal y tabs actuales se mantienen |
| Backend | Fuera de alcance |
| Context para el draft | Rechazado (prop drilling explícito es suficiente) |

---

## 3. Estructura de carpetas

```text
frontend/src/pages/Operacion/Proyectos/
├── ProyectosPage.tsx
├── useProyectosPagePermissions.ts
│
├── list/
│   ├── ProyectosMobileList.tsx
│   └── ProyectosPageStats.tsx
│
├── form/
│   ├── ProyectoFormModal.tsx          # shell: tabs, footer, wiring
│   ├── useProyectoFormState.ts        # estado draft + build + validaciones de paso
│   ├── ProyectoFormSection.tsx
│   ├── tabs/
│   │   ├── ProyectoClienteTab.tsx
│   │   ├── ProyectoOperacionTab.tsx
│   │   └── ProyectoPresupuestoTab.tsx
│   ├── fields/
│   │   ├── ProyectoEquiposSection.tsx
│   │   ├── ProyectoEvidenciasField.tsx
│   │   ├── ProyectoNotaDiaFotosField.tsx
│   │   ├── ProyectoProductoThumb.tsx
│   │   └── ProyectoSyscomModeloPicker.tsx
│   └── cotizaciones/
│       ├── proyectoCotizacionSearch.ts
│       ├── proyectoCotizacionMappers.ts
│       └── useCotizacionPicker.ts     # solo si el form state / shell siguen > ~500 líneas
│
├── instalaciones/
│   ├── index.ts                       # API pública del submódulo
│   ├── InstalacionForm.tsx
│   ├── ProyectoFormInstalacionesPanel.tsx
│   ├── proyectoInstalacionApi.ts
│   └── proyectoInstalacionTypes.ts
│
└── shared/
    ├── proyectoTypes.ts
    ├── proyectoApi.ts
    ├── proyectoFormUtils.ts
    ├── proyectoCloseValidation.ts
    ├── proyectoPageStyles.ts
    ├── proyectoImageApi.ts
    └── proyectoProductoImage.ts
```

Tests (`*.test.ts`) se mueven junto al módulo que prueban (`shared/` o `form/cotizaciones/`).

### Reglas de dependencia

| Desde | Puede importar |
|-------|----------------|
| `list/` | `shared/`, layout/ERP compartido |
| `form/` | `shared/`, `instalaciones/` (solo vía `instalaciones/index.ts`), layout/ERP |
| `instalaciones/` | layout/ERP compartido (`ordenTrabajoStyles`, etc.); **prohibido** importar `form/`, `list/` o `shared/` |
| `ProyectosPage` | `list/`, `form/`, `instalaciones/`, `shared/` |
| `shared/` | utilidades globales (`@/utils`, `@/config`); no UI de form/list/instalaciones |

`instalaciones/` no depende de `proyectoTypes` ni del draft de proyecto. El único acoplamiento hacia el padre es el contrato de props del panel y el `instalacionDraft` que el form pasa en `onSave`.

---

## 4. Partición del modal

### `ProyectoFormModal` (shell)

Responsabilidades:
- Abrir/cerrar `Modal`
- Tabs y a11y (`aria-selected`, flechas, ids de tab/panel)
- Footer: Cancelar / Anterior / Siguiente / Guardar
- Render del tab activo
- Delegar estado a `useProyectoFormState`
- Llamar `onSave(draft, extras)` con el mismo contrato actual

### `useProyectoFormState`

Concentra:
- Estado del draft (cliente, cotizaciones, equipos, fechas, status, bitácora, firmas, avance, …)
- `instalacionDraft` / `setInstalacionDraft` (controlado; el panel GPS lo edita)
- `buildCurrentDraft()`
- Validaciones de paso (cliente vacío, motivo pausa, `canCerrarProyecto`)
- Carga de catálogos (servicios / técnicos) y reset al cambiar `initialDraft` / `open`
- Navegación de tabs (`activeTab`, `goToNextTab`, `goToPrevTab`) si simplifica el shell

Si el hook supera ~400–500 líneas, extraer `useCotizacionPicker` en `form/cotizaciones/` sin Context.

### Paneles por tab

| Tab | Componente | Notas |
|-----|------------|--------|
| Cliente | `form/tabs/ProyectoClienteTab.tsx` | Props de campos + errores de paso |
| Instalaciones | `instalaciones/ProyectoFormInstalacionesPanel` | Import desde barrel |
| Operación | `form/tabs/ProyectoOperacionTab.tsx` | Status, personal, bitácora, evidencias, firmas |
| Presupuesto | `form/tabs/ProyectoPresupuestoTab.tsx` | Equipos + picker modelo |

Props explícitas (sin Context). Cleanup menor de nombres de props permitido si mejora claridad.

---

## 5. Contrato público de `instalaciones/`

`instalaciones/index.ts` exporta únicamente:

**UI**
- `ProyectoFormInstalacionesPanel`

`InstalacionForm` permanece **interno** al submódulo (solo lo usa el panel).

**Draft / tipos**
- `ProyectoInstalacionDraft`
- `emptyInstalacionDraft`
- `buildInstalacionPayload`

**API** (usada por `ProyectosPage` al crear proyecto + instalación pendiente)
- `createProyectoInstalacion`
- `isProyectoInstalacionApiError`

`list` / `update` / `delete` / mappers de payload quedan **internos** al panel; no se reexportan en el barrel salvo que aparezca un segundo consumidor fuera del submódulo.

### Flujo de datos (sin cambios funcionales)

1. **Proyecto nuevo:** el panel edita `draft` controlado por el form state.
2. **Guardar:** `onSave(draft, { instalacionDraft })` solo si `proyectoId == null` y hay `subtipo`.
3. **`ProyectosPage`:** `createProyecto` → si hay pending, `createProyectoInstalacion`; toast de warning si el proyecto se crea pero falla la instalación.
4. **Proyecto existente:** el panel lista/CRUD vía API; el draft del modal no se reenvía en `onSave`.

---

## 6. Orden de implementación

1. **Move-only:** crear carpetas, mover archivos, actualizar imports; green `tsc` + tests existentes.
2. **Barrel `instalaciones/index.ts`** y apuntar imports del modal/página al barrel.
3. **Extraer `useProyectoFormState`** sin cambiar JSX de tabs aún (o con tabs inline).
4. **Extraer tabs** en orden: Cliente → Instalaciones (ya panel) → Presupuesto → Operación (el más grande).
5. **Cleanup menor:** hints, imports muertos, comentarios obsoletos (“solo diseño”, etc.).
6. **Verificación:** `pnpm exec tsc -b --noEmit`, vitest de `proyectoFormUtils` / `proyectoCloseValidation` / cotizaciones, smoke manual del modal (crear con GPS, editar, listar instalaciones en proyecto existente).

Preferir commits/PRs por fase (move → hook → tabs) si el diff se vuelve difícil de revisar; un solo PR también es válido si se mantiene el orden anterior.

---

## 7. Fuera de alcance

- Rutas nuevas o tabs a nivel `ProyectosPage` para GPS global
- React Context / stores globales para el draft
- Rediseño visual o cambios de copy grandes
- Backend, migraciones, endpoints nuevos
- Refactor de `OrdenesPage` u otros módulos
- Introducir dependencias npm nuevas

---

## 8. Criterios de éxito

- `ProyectoFormModal.tsx` shell ≤ ~300–400 líneas (orientativo)
- Ningún import de `form/` desde `instalaciones/`
- Consumidores externos de GPS solo importan `…/instalaciones` (barrel)
- Flujos actuales pasan smoke manual
- `tsc -b --noEmit` sin errores; tests Vitest del módulo en verde
