# Ola 1 — Arquitectura Proyectos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganizar `frontend/src/pages/Operacion/Proyectos/` en `list/` + `form/` + `shared/` + `instalaciones/`, dejar `ProyectoFormModal` como shell fino, y exponer GPS solo vía barrel — sin cambiar rutas ni comportamiento.

**Architecture:** Move-only primero (imports verdes), luego barrel `instalaciones/`, luego `useProyectoFormState`, luego tabs Cliente → Presupuesto → Operación. Sin React Context. Comportamiento congelado; cleanup menor OK.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, `fetchApi`, Modal/DatePicker existentes.

**Specs:**
- [`docs/superpowers/specs/2026-07-30-proyectos-frontend-architecture-design.md`](../specs/2026-07-30-proyectos-frontend-architecture-design.md)
- Mapa: [`docs/superpowers/specs/2026-07-30-frontend-architecture-roadmap-design.md`](../specs/2026-07-30-frontend-architecture-roadmap-design.md)

## Global Constraints

- Congelar flujos UX y ruta `/proyectos` (`App.tsx` sigue importando `@/pages/Operacion/Proyectos/ProyectosPage`).
- `instalaciones/` **no** importa `form/`, `list/` ni `shared/`.
- Consumidores GPS externos solo importan `…/instalaciones` (barrel).
- No `any` nuevo; no dependencias npm nuevas; no backend.
- Commits: solo si el usuario lo pide explícitamente en la sesión (no `--no-verify`).
- Gate por tarea: `pnpm exec tsc -b --noEmit` desde `frontend/` debe quedar en 0 errores.

---

## File map (destino)

| Destino | Origen actual |
|---------|----------------|
| `ProyectosPage.tsx` | (queda en raíz del feature) |
| `useProyectosPagePermissions.ts` | (queda) |
| `list/ProyectosMobileList.tsx` | `ProyectosMobileList.tsx` |
| `list/ProyectosPageStats.tsx` | `ProyectosPageStats.tsx` |
| `form/ProyectoFormModal.tsx` | `ProyectoFormModal.tsx` |
| `form/ProyectoFormSection.tsx` | `ProyectoFormSection.tsx` |
| `form/fields/ProyectoEquiposSection.tsx` | `ProyectoEquiposSection.tsx` |
| `form/fields/ProyectoEvidenciasField.tsx` | `ProyectoEvidenciasField.tsx` |
| `form/fields/ProyectoNotaDiaFotosField.tsx` | `ProyectoNotaDiaFotosField.tsx` |
| `form/fields/ProyectoProductoThumb.tsx` | `ProyectoProductoThumb.tsx` |
| `form/fields/ProyectoSyscomModeloPicker.tsx` | `ProyectoSyscomModeloPicker.tsx` |
| `form/cotizaciones/proyectoCotizacionSearch.ts` | `proyectoCotizacionSearch.ts` |
| `form/cotizaciones/proyectoCotizacionMappers.ts` | `proyectoCotizacionMappers.ts` |
| `form/cotizaciones/proyectoCotizacionMappers.test.ts` | `proyectoCotizacionMappers.test.ts` |
| `instalaciones/InstalacionForm.tsx` | `InstalacionForm.tsx` |
| `instalaciones/ProyectoFormInstalacionesPanel.tsx` | `ProyectoFormInstalacionesPanel.tsx` |
| `instalaciones/proyectoInstalacionApi.ts` | `proyectoInstalacionApi.ts` |
| `instalaciones/proyectoInstalacionTypes.ts` | `proyectoInstalacionTypes.ts` |
| `shared/proyectoTypes.ts` | `proyectoTypes.ts` |
| `shared/proyectoApi.ts` | `proyectoApi.ts` |
| `shared/proyectoFormUtils.ts` | `proyectoFormUtils.ts` |
| `shared/proyectoFormUtils.fechas.test.ts` | `proyectoFormUtils.fechas.test.ts` |
| `shared/proyectoCloseValidation.ts` | `proyectoCloseValidation.ts` |
| `shared/proyectoCloseValidation.test.ts` | `proyectoCloseValidation.test.ts` |
| `shared/proyectoPageStyles.ts` | `proyectoPageStyles.ts` |
| `shared/proyectoImageApi.ts` | `proyectoImageApi.ts` |
| `shared/proyectoProductoImage.ts` | `proyectoProductoImage.ts` |

**Create (nuevos):**
- `instalaciones/index.ts`
- `form/useProyectoFormState.ts`
- `form/tabs/ProyectoClienteTab.tsx`
- `form/tabs/ProyectoPresupuestoTab.tsx`
- `form/tabs/ProyectoOperacionTab.tsx`

**External callers to update after move:**
- `frontend/src/pages/Operacion/OrdenesTrabajo/OrdenServicio/OrdenAdminCotizacionesField.tsx`
- `frontend/src/pages/Operacion/OrdenesTrabajo/OrdenServicio/OrdenesPage.tsx` (tipo `CotizacionResumen`)

---

### Task 1: Move-only a carpetas + imports verdes

**Files:**
- Move: todos los del file map (excepto Create)
- Modify: todos los imports relativos dentro de Proyectos + 2 callers externos
- Test: `tsc` + vitest de tests movidos

**Interfaces:**
- Consumes: estructura plana actual
- Produces: mismos exports en nuevas rutas; `ProyectosPage` en la misma ruta pública

- [ ] **Step 1: Crear carpetas**

Desde repo root (PowerShell):

```powershell
cd frontend/src/pages/Operacion/Proyectos
New-Item -ItemType Directory -Force -Path list, form/fields, form/cotizaciones, form/tabs, instalaciones, shared | Out-Null
```

- [ ] **Step 2: Mover archivos con `git mv`**

```powershell
git mv ProyectosMobileList.tsx list/
git mv ProyectosPageStats.tsx list/
git mv ProyectoFormModal.tsx form/
git mv ProyectoFormSection.tsx form/
git mv ProyectoEquiposSection.tsx form/fields/
git mv ProyectoEvidenciasField.tsx form/fields/
git mv ProyectoNotaDiaFotosField.tsx form/fields/
git mv ProyectoProductoThumb.tsx form/fields/
git mv ProyectoSyscomModeloPicker.tsx form/fields/
git mv proyectoCotizacionSearch.ts form/cotizaciones/
git mv proyectoCotizacionMappers.ts form/cotizaciones/
git mv proyectoCotizacionMappers.test.ts form/cotizaciones/
git mv InstalacionForm.tsx instalaciones/
git mv ProyectoFormInstalacionesPanel.tsx instalaciones/
git mv proyectoInstalacionApi.ts instalaciones/
git mv proyectoInstalacionTypes.ts instalaciones/
git mv proyectoTypes.ts shared/
git mv proyectoApi.ts shared/
git mv proyectoFormUtils.ts shared/
git mv proyectoFormUtils.fechas.test.ts shared/
git mv proyectoCloseValidation.ts shared/
git mv proyectoCloseValidation.test.ts shared/
git mv proyectoPageStyles.ts shared/
git mv proyectoImageApi.ts shared/
git mv proyectoProductoImage.ts shared/
```

- [ ] **Step 3: Actualizar imports internos**

Regla de paths relativos tras el move:

| Archivo | Antes (ejemplo) | Después |
|---------|-----------------|---------|
| `ProyectosPage.tsx` | `./proyectoApi` | `./shared/proyectoApi` |
| `ProyectosPage.tsx` | `./ProyectoFormModal` | `./form/ProyectoFormModal` |
| `ProyectosPage.tsx` | `./ProyectosMobileList` | `./list/ProyectosMobileList` |
| `ProyectosPage.tsx` | `./proyectoInstalacionApi` | `./instalaciones/proyectoInstalacionApi` (temporal; Task 2 → barrel) |
| `form/ProyectoFormModal.tsx` | `./proyectoTypes` | `../shared/proyectoTypes` |
| `form/ProyectoFormModal.tsx` | `./ProyectoEquiposSection` | `./fields/ProyectoEquiposSection` |
| `form/ProyectoFormModal.tsx` | `../OrdenesTrabajo/...` | `../../OrdenesTrabajo/...` (subió un nivel) |
| `list/*` | `./proyectoFormUtils` | `../shared/proyectoFormUtils` |
| `instalaciones/ProyectoFormInstalacionesPanel.tsx` | `./ProyectoFormSection` | **NO** — el panel hoy importa `ProyectoFormSection` de form. Sustituir: o (A) pasar `section` wrapper como children desde el modal, o (B) duplicar el wrapper mínimo de sección **dentro** de instalaciones, o (C) mover el eyebrow/title al panel sin `ProyectoFormSection`. **Elegir C:** el panel ya tiene título; dejar de importar `ProyectoFormSection` y usar markup local equivalente (mismas clases via copy de props visuales del panel actual) **sin** importar `form/`. Revisar: hoy el panel SÍ importa `ProyectoFormSection` — al mover, romper esa dependencia: inline el `ProyectoFormSection` usage abriendo el archivo y reemplazando el import por markup que use solo `proyectoEmptyPanelClass`… pero `proyectoEmptyPanelClass` está en `shared/proyectoPageStyles` y **instalaciones no puede importar shared**. |

**Resolución de estilos en `instalaciones/` (importante):**

Hoy el panel importa:
- `../OrdenesTrabajo/ordenTrabajoStyles` (permitido)
- `./proyectoPageStyles` (`proyectoEmptyPanelClass`) → **prohibido tras regla shared**

En este task:
1. Copiar las constantes CSS string que `instalaciones/*` necesite a `instalaciones/instalacionStyles.ts` (solo las usadas: p.ej. `proyectoEmptyPanelClass` y las que use el panel).
2. Actualizar imports del panel a `./instalacionStyles`.
3. Dejar `shared/proyectoPageStyles.ts` intacto para form/list.

Para `ProyectoFormSection`: el panel lo usa. **Extraer no:** inline un wrapper local en el panel:

```tsx
// dentro de ProyectoFormInstalacionesPanel — reemplazar <ProyectoFormSection ...>
<section aria-labelledby={titleId} className="space-y-3">
  {/* mismo header visual que daba ProyectoFormSection: eyebrow, title, hint, icon */}
  {children}
</section>
```

Copiar el JSX de header desde `ProyectoFormSection` **solo lo necesario** para no cambiar UX (mismo `titleId`, mismos textos). No importar `form/ProyectoFormSection`.

- [ ] **Step 4: Actualizar callers externos**

`OrdenAdminCotizacionesField.tsx`:

```ts
import { searchProyectoCotizaciones } from "@/pages/Operacion/Proyectos/form/cotizaciones/proyectoCotizacionSearch";
import { displayCotizacionFolio } from "@/pages/Operacion/Proyectos/shared/proyectoFormUtils";
import {
  // mismas named exports que antes
} from "@/pages/Operacion/Proyectos/shared/proyectoPageStyles";
import type { CotizacionOrigen, CotizacionResumen } from "@/pages/Operacion/Proyectos/shared/proyectoTypes";
```

`OrdenesPage.tsx`:

```ts
import type { CotizacionResumen } from "@/pages/Operacion/Proyectos/shared/proyectoTypes";
```

- [ ] **Step 5: Ajustar imports relativos a `ordenTrabajoStyles` / `OrdenTrabajoModals` desde `form/`**

Desde `form/ProyectoFormModal.tsx` la ruta a Ordenes sube un nivel más:

```ts
import { ... } from "../../OrdenesTrabajo/OrdenTrabajoModals";
import { ... } from "../../OrdenesTrabajo/ordenTrabajoStyles";
```

Desde `instalaciones/ProyectoFormInstalacionesPanel.tsx`:

```ts
import { ... } from "../../OrdenesTrabajo/ordenTrabajoStyles";
```

- [ ] **Step 6: Verificar**

```powershell
cd frontend
pnpm exec tsc -b --noEmit
pnpm exec vitest run src/pages/Operacion/Proyectos/shared/proyectoFormUtils.fechas.test.ts src/pages/Operacion/Proyectos/shared/proyectoCloseValidation.test.ts src/pages/Operacion/Proyectos/form/cotizaciones/proyectoCotizacionMappers.test.ts
```

Expected: `tsc` exit 0; vitest all pass.

- [ ] **Step 7: Commit (solo si el usuario lo pide)**

```bash
git add frontend/src/pages/Operacion/Proyectos frontend/src/pages/Operacion/OrdenesTrabajo/OrdenServicio/OrdenAdminCotizacionesField.tsx frontend/src/pages/Operacion/OrdenesTrabajo/OrdenServicio/OrdenesPage.tsx
git commit -m "$(cat <<'EOF'
refactor(proyectos): reorganize feature into list/form/shared/instalaciones folders

EOF
)"
```

---

### Task 2: Barrel `instalaciones/index.ts` + consumidores

**Files:**
- Create: `frontend/src/pages/Operacion/Proyectos/instalaciones/index.ts`
- Modify: `ProyectosPage.tsx`, `form/ProyectoFormModal.tsx`
- Test: `tsc`

**Interfaces:**
- Consumes: exports existentes en `proyectoInstalacionTypes` / `proyectoInstalacionApi` / panel
- Produces: API pública del barrel:

```ts
// instalaciones/index.ts
export { ProyectoFormInstalacionesPanel } from "./ProyectoFormInstalacionesPanel";
export {
  type ProyectoInstalacionDraft,
  emptyInstalacionDraft,
  buildInstalacionPayload,
} from "./proyectoInstalacionTypes";
export {
  createProyectoInstalacion,
  isProyectoInstalacionApiError,
} from "./proyectoInstalacionApi";
```

- [ ] **Step 1: Crear el barrel** con exactamente los exports de arriba.

- [ ] **Step 2: Apuntar `ProyectosPage` al barrel**

```ts
import {
  createProyectoInstalacion,
  isProyectoInstalacionApiError,
  buildInstalacionPayload,
  type ProyectoInstalacionDraft,
} from "./instalaciones";
```

Eliminar imports directos a `proyectoInstalacionApi` / `proyectoInstalacionTypes`.

- [ ] **Step 3: Apuntar `ProyectoFormModal` al barrel**

```ts
import {
  ProyectoFormInstalacionesPanel,
  emptyInstalacionDraft,
  type ProyectoInstalacionDraft,
} from "../instalaciones";
```

- [ ] **Step 4: Verificar que no queden imports profundos a instalaciones desde fuera**

```powershell
cd frontend
rg "Proyectos/instalaciones/" src --glob "*.{ts,tsx}"
```

Expected: solo paths `…/instalaciones` o `…/instalaciones/index` (o relativos `./instalaciones` / `../instalaciones`), **sin** `instalaciones/proyectoInstalacionApi` fuera de la carpeta `instalaciones/`.

- [ ] **Step 5: `tsc`**

```powershell
pnpm exec tsc -b --noEmit
```

Expected: exit 0.

- [ ] **Step 6: Commit (solo si el usuario lo pide)**

```bash
git commit -m "refactor(proyectos): add instalaciones public barrel"
```

---

### Task 3: Extraer `useProyectoFormState`

**Files:**
- Create: `frontend/src/pages/Operacion/Proyectos/form/useProyectoFormState.ts`
- Modify: `frontend/src/pages/Operacion/Proyectos/form/ProyectoFormModal.tsx`
- Test: `tsc` + smoke mental (buildCurrentDraft + submit)

**Interfaces:**
- Consumes: `ProyectoDraft`, utils de `../shared/*`, `emptyInstalacionDraft` del barrel, props del modal (`open`, `initialDraft`, `proyectoId`, `isAdmin` vía auth dentro del hook o pasado)
- Produces:

```ts
export type ProyectoFormTab = "cliente" | "operacion" | "presupuesto" | "instalaciones";

export function useProyectoFormState(args: {
  open: boolean;
  editing: boolean;
  proyectoId: number | null;
  initialDraft: ProyectoDraft;
}): {
  // tab navigation
  activeTab: ProyectoFormTab;
  setActiveTab: (t: ProyectoFormTab) => void;
  goToNextTab: (validateCliente?: boolean) => void;
  goToPrevTab: () => void;
  // draft fields + setters (los que el shell/tabs necesitan)
  // instalacionDraft + setInstalacionDraft
  buildCurrentDraft: () => ProyectoDraft;
  handleSubmit: (e: React.FormEvent, onSave: ...) => Promise<void>;
  // picker state, catalogs, errors, ids de a11y si viven aquí
  // ...
};
```

Firma exacta de `onSave` (igual que hoy):

```ts
onSave: (
  draft: ProyectoDraft,
  extras?: { instalacionDraft?: ProyectoInstalacionDraft | null }
) => void | Promise<void>;
```

- [ ] **Step 1: Crear el archivo del hook** moviendo desde `ProyectoFormModal.tsx`:
  - Todos los `useState` del draft + `instalacionDraft`
  - Effects de sync `initialDraft` / `open`
  - `buildCurrentDraft`
  - `handleStatusChange`, validaciones de cliente/cierre
  - Lógica de tabs `goToNextTab` / `goToPrevTab` / `handleTabKeyDown` (o dejar keydown en shell si es solo UI)
  - Estado del picker de cotizaciones

No mover JSX.

- [ ] **Step 2: Dejar el modal como consumidor**

```tsx
const form = useProyectoFormState({ open, editing, proyectoId, initialDraft });
// usar form.* en JSX existente sin extraer tabs aún
```

- [ ] **Step 3: Verificar tamaño**

Si `useProyectoFormState.ts` > ~500 líneas **y** el picker es > ~150, extraer en el mismo task:

`form/cotizaciones/useCotizacionPicker.ts` — solo estado/handlers del picker; el modal sigue renderizando el JSX del picker.

- [ ] **Step 4: `tsc`**

```powershell
cd frontend
pnpm exec tsc -b --noEmit
```

Expected: exit 0.

- [ ] **Step 5: Commit (solo si el usuario lo pide)**

```bash
git commit -m "refactor(proyectos): extract useProyectoFormState from form modal"
```

---

### Task 4: Extraer `ProyectoClienteTab`

**Files:**
- Create: `form/tabs/ProyectoClienteTab.tsx`
- Modify: `form/ProyectoFormModal.tsx`
- Test: `tsc`

**Interfaces:**
- Consumes: props tipadas con campos/setters del tab cliente + ids a11y
- Produces: `export function ProyectoClienteTab(props: ProyectoClienteTabProps): JSX.Element`

- [ ] **Step 1: Cortar el bloque** `{activeTab === "cliente" && ( ... )}` a `ProyectoClienteTab`.

Props mínimas (ajustar a lo que el JSX use realmente):

```ts
type ProyectoClienteTabProps = {
  disabled: boolean;
  cliente: string;
  setCliente: (v: string) => void;
  clienteId: number | null;
  // cotización principal UI, fecha autorización, errores clienteStepError, etc.
  panelId: string;
  labelledBy: string;
};
```

- [ ] **Step 2: Render en el modal**

```tsx
{form.activeTab === "cliente" && (
  <ProyectoClienteTab ...props from form... />
)}
```

- [ ] **Step 3: `tsc`** — exit 0.

- [ ] **Step 4: Commit (solo si el usuario lo pide)**

---

### Task 5: Extraer `ProyectoPresupuestoTab`

**Files:**
- Create: `form/tabs/ProyectoPresupuestoTab.tsx`
- Modify: `form/ProyectoFormModal.tsx`
- Test: `tsc`

**Interfaces:**
- Consumes: `equipos`, handlers de equipos, `ProyectoEquiposSection`, modelo picker open state
- Produces: `ProyectoPresupuestoTab`

- [ ] **Step 1: Mover bloque** `activeTab === "presupuesto"`.
- [ ] **Step 2: Wire en shell.**
- [ ] **Step 3: `tsc`** — exit 0.
- [ ] **Step 4: Commit (solo si el usuario lo pide)**

---

### Task 6: Extraer `ProyectoOperacionTab`

**Files:**
- Create: `form/tabs/ProyectoOperacionTab.tsx`
- Modify: `form/ProyectoFormModal.tsx`
- Test: `tsc`

**Interfaces:**
- Consumes: status, fechas, personal, notas, evidencias, firmas, avance, closeBlockedMessage, etc.
- Produces: `ProyectoOperacionTab` (el tab más grande; OK si el archivo queda ~600–900 líneas)

- [ ] **Step 1: Mover bloque** `activeTab === "operacion"`.
- [ ] **Step 2: Wire en shell.**
- [ ] **Step 3: Confirmar instalaciones sigue vía barrel:**

```tsx
{form.activeTab === "instalaciones" && (
  <ProyectoFormInstalacionesPanel
    proyectoId={proyectoId}
    active={form.activeTab === "instalaciones"}
    disabled={...}
    draft={form.instalacionDraft}
    onDraftChange={form.setInstalacionDraft}
  />
)}
```

- [ ] **Step 4: Contar líneas del shell**

```powershell
(Get-Content form/ProyectoFormModal.tsx | Measure-Object -Line).Lines
```

Expected: orientativo ≤ 400 (criterio soft del spec). Si > 500, mover JSX del picker de cotizaciones a `form/cotizaciones/ProyectoCotizacionPickerModal.tsx`.

- [ ] **Step 5: `tsc`** — exit 0.
- [ ] **Step 6: Commit (solo si el usuario lo pide)**

---

### Task 7: Docs AGENTS + cleanup menor

**Files:**
- Modify: `AGENTS.md`
- Modify: hints/comentarios obsoletos en panel/modal si quedan
- Test: none (docs) + `tsc` si se tocó TS

**Interfaces:**
- Produces: párrafo en AGENTS bajo arquitectura frontend / archivos de referencia

- [ ] **Step 1: Añadir a `AGENTS.md`** (sección breve):

```markdown
### Plantilla de feature pages (programa arquitectura)

Ver `docs/superpowers/specs/2026-07-30-frontend-architecture-roadmap-design.md`.
Ola 1 (Proyectos): carpetas `list/`, `form/`, `shared/`, `instalaciones/` — detalle en
`docs/superpowers/specs/2026-07-30-proyectos-frontend-architecture-design.md`.
```

- [ ] **Step 2: Cleanup** — quitar comentarios “solo diseño” / imports muertos en archivos tocados.
- [ ] **Step 3: Commit (solo si el usuario lo pide)**

---

### Task 8: Gate final Ola 1

**Files:** none new

- [ ] **Step 1: Typecheck**

```powershell
cd frontend
pnpm exec tsc -b --noEmit
```

Expected: exit 0.

- [ ] **Step 2: Tests del módulo**

```powershell
pnpm exec vitest run src/pages/Operacion/Proyectos
```

Expected: all pass.

- [ ] **Step 3: ESLint paths tocados (fuera de ruido histórico)**

```powershell
pnpm exec eslint src/pages/Operacion/Proyectos/form/useProyectoFormState.ts src/pages/Operacion/Proyectos/instalaciones/index.ts src/pages/Operacion/Proyectos/form/tabs
```

Expected: 0 errors en archivos **nuevos** (warnings preexistentes en páginas no bloquean si CI excluye pages — corregir errores introducidos en esta ola).

- [ ] **Step 4: Smoke manual checklist**

1. Abrir `/proyectos`, crear proyecto **sin** GPS → guarda OK.
2. Crear proyecto **con** subtipo GPS en tab Instalaciones → proyecto + instalación creados (o warning si falla solo instalación).
3. Editar proyecto existente → tab Instalaciones lista/CRUD.
4. Tabs teclado (flechas) y Anterior/Siguiente siguen igual.
5. Cerrar proyecto con reglas de cotización adicional intactas.

- [ ] **Step 5: Marcar Ola 1 cerrada** en el roadmap (estado “Ola 1 implementada”) cuando el smoke pase.

---

## Spec coverage (self-review)

| Requisito spec | Task |
|----------------|------|
| Carpetas list/form/shared/instalaciones | Task 1 |
| Regla dependencias + no form→desde instalaciones | Task 1 (styles locales + quitar ProyectoFormSection) |
| Barrel público GPS | Task 2 |
| useProyectoFormState | Task 3 |
| Tabs Cliente / Presupuesto / Operación | Tasks 4–6 |
| Flujo onSave + instalacionDraft | Tasks 2–3 (sin cambio contrato) |
| Cleanup + AGENTS | Task 7 |
| Criterios éxito + verificación | Task 8 |
| useCotizacionPicker opcional | Task 3 / 6 si supera umbral |
| Sin rutas nuevas / sin Context / sin backend | Constraints globales |

## Placeholder scan

Sin TBD. Resolución explícita para `ProyectoFormSection` / estilos en instalaciones en Task 1.
