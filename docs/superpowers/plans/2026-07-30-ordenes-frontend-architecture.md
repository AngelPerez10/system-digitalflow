# Ola 2 — Arquitectura Ordenes (Admin + Técnico) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shared-first refactor of `OrdenServicio/` so `OrdenesPage` and `OrdenesTecnicoPage` share list/form hooks and a common modal shell, then reorganize into `list/` + `form/` + `shared/` without changing routes or UX flows.

**Architecture:** (1) Unify types into `ordenesPageTypes` as single source; slim `useOrdenesShared` to pure helpers. (2) Extract `useOrdenesList` + `useOrdenFormDraft` with `variant: "admin" | "tecnico"`. (3) Move folders + `OrdenFormModal` shell. (4) Tab panels + a11y AA pass. No React Context.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, `fetchApi`, existing Modal/DatePicker/SignaturePad.

**Specs:**
- [`docs/superpowers/specs/2026-07-30-ordenes-frontend-architecture-design.md`](../specs/2026-07-30-ordenes-frontend-architecture-design.md)
- Mapa: [`docs/superpowers/specs/2026-07-30-frontend-architecture-roadmap-design.md`](../specs/2026-07-30-frontend-architecture-roadmap-design.md)

## Global Constraints

- Congelar flujos UX; rutas `App.tsx`: `@/pages/Operacion/OrdenesTrabajo/OrdenServicio/OrdenesPage` y `OrdenesTecnicoPage` permanecen en la **raíz** del feature.
- `variant: "admin" | "tecnico"` — admin-only: seguimiento administrativo + cotizaciones en payload; técnico: `ordenEditScope` / limited edit.
- No unificar rutas admin/técnico; no Context de form; no backend; no npm nuevas.
- No `any` nuevo en archivos tocados.
- a11y AA en modal/tabs al extraer (labels, icon `aria-label`, tablist teclado).
- Commits: solo si el usuario lo pide explícitamente.
- Gate por tarea: `cd frontend && pnpm exec tsc -b --noEmit` exit 0.
- Working tree may already contain Ola 1 / GPS WIP — no revertir ese trabajo; no mezclar concerns no relacionados en el mismo cambio de Ola 2 sin necesidad.

---

## File map (destino final)

| Destino | Acción |
|---------|--------|
| `OrdenesPage.tsx` / `OrdenesTecnicoPage.tsx` | Quedan en raíz; adelgazan a orquestadores |
| `OrdenPdfPage.tsx` | Queda (sin refactor profundo) |
| `shared/ordenesPageTypes.ts` | Move + única fuente `Orden` (incl. admin fields) |
| `shared/ordenesPageUtils.ts` | Move |
| `shared/ordenEditScope.ts` | Move |
| `shared/useOrdenesShared.ts` | Move; **delete** duplicate `Orden`/`Usuario`/`ORDEN_BASE_*` — import from types |
| `shared/useOrdenesList.ts` | Create |
| `shared/useOrdenFormDraft.ts` | Create |
| `form/useOrdenFormModalState.ts` | Move |
| `form/OrdenFormModal.tsx` | Create |
| `form/tabs/OrdenClienteTab.tsx` | Create |
| `form/tabs/OrdenDetalleTab.tsx` | Create |
| `form/fields/*` | Move AdminCotizaciones, LocationMap, … |
| `list/*` | Move Stats, MobileOrderCard, PDF modals |

`App.tsx` strings: **unchanged**.

---

### Task 1: Unificar tipos/utils (PR 2.1) — sin cambiar UI

**Files:**
- Modify: `ordenesPageTypes.ts`, `useOrdenesShared.ts`
- Modify: imports in `OrdenesPage.tsx`, `OrdenesTecnicoPage.tsx`, and any other file importing duplicates
- Test: `frontend/src/pages/Operacion/OrdenesTrabajo/OrdenServicio/shared/ordenesPageTypes.merge.test.ts` (create after move path OR keep flat until Task 4 — **for this task keep files in current flat paths**, only dedupe)

**Interfaces:**
- Consumes: current dual definitions
- Produces: `Orden` in `ordenesPageTypes.ts` includes admin fields + any fields only present today in `useOrdenesShared` (`tecnico_asignado_username`, `tecnico_asignado_full_name`, `creado_por_id`, etc.). `useOrdenesShared` re-exports types from `ordenesPageTypes` **or** stops exporting them and callers import types from `ordenesPageTypes`.

- [ ] **Step 1: Merge `Orden` / `Usuario` / foto constants into `ordenesPageTypes.ts`**

Ensure `Orden` has the **union** of both definitions (admin fields from types + tecnico display fields from shared). Keep `normalizeStatusAdministrativo`, `normalizeCotizacionesAdjuntas`, `computeOrdenStats`.

- [ ] **Step 2: Slim `useOrdenesShared.ts`**

Remove duplicate `export interface Orden`, `Usuario`, `ServicioCatalogo`, `ORDEN_BASE_MAX_FOTOS`, `FOTOS_EXTRA_OPTIONS`, `FotosExtraMax`, `normalizeFotosExtraFromOrden`, `getCurrentYearMonth` if identical.

Add:

```ts
export type {
  Orden,
  Usuario,
  ServicioCatalogo,
  FotosExtraMax,
} from "./ordenesPageTypes";
export {
  ORDEN_BASE_MAX_FOTOS,
  FOTOS_EXTRA_OPTIONS,
  normalizeFotosExtraFromOrden,
  getCurrentYearMonth,
} from "./ordenesPageTypes";
```

Keep unique helpers: `displayOrdenFolio`, `ordenMatchesSearch`, `compressImage`, `fetchOrdenesApi`, alerts, PDF helpers, etc.

- [ ] **Step 3: Fix callers** so they don't double-import conflicting types. Prefer:

```ts
import type { Orden, Usuario } from "./ordenesPageTypes";
import { displayOrdenFolio, ordenMatchesSearch, ... } from "./useOrdenesShared";
```

- [ ] **Step 4: Add a small Vitest** for merge invariants

Create `ordenesPageTypes.merge.test.ts` next to types:

```ts
import { describe, expect, it } from "vitest";
import {
  normalizeStatusAdministrativo,
  normalizeFotosExtraFromOrden,
  ORDEN_BASE_MAX_FOTOS,
} from "./ordenesPageTypes";

describe("ordenesPageTypes single source", () => {
  it("normalizes admin status", () => {
    expect(normalizeStatusAdministrativo("ENVIADO")).toBe("enviado");
    expect(normalizeStatusAdministrativo("nope")).toBe("pendiente");
  });
  it("keeps foto base constant", () => {
    expect(ORDEN_BASE_MAX_FOTOS).toBe(5);
    expect(normalizeFotosExtraFromOrden({ fotos_extra_max: 2 })).toBe(2);
  });
});
```

- [ ] **Step 5: Verify**

```powershell
cd frontend
pnpm exec tsc -b --noEmit
pnpm exec vitest run src/pages/Operacion/OrdenesTrabajo/OrdenServicio/ordenesPageTypes.merge.test.ts
```

Expected: exit 0; tests pass.

- [ ] **Step 6: Commit only if user asks**

---

### Task 2: `useOrdenesList` (PR 2.2)

**Files:**
- Create: `frontend/src/pages/Operacion/OrdenesTrabajo/OrdenServicio/useOrdenesList.ts` (flat path until Task 4 move)
- Modify: `OrdenesPage.tsx`, `OrdenesTecnicoPage.tsx` (replace local list state with hook)
- Test: smoke manual + `tsc`

**Interfaces:**
- Consumes: `fetchOrdenesApi`, `ordenMatchesSearch`, `computeOrdenStats`, permissions, `variant`
- Produces:

```ts
export type OrdenesListVariant = "admin" | "tecnico";

export function useOrdenesList(opts: {
  variant: OrdenesListVariant;
  canView: boolean;
  // pass usuarios when search needs names
}): {
  ordenes: Orden[];
  setOrdenes: React.Dispatch<React.SetStateAction<Orden[]>>;
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  shownList: Orden[];
  stats: OrdenStats;
  alert: AlertState;
  showAlert: (variant: AlertVariant, title: string, message: string, ms?: number) => void;
  clearAlert: () => void;
  fetchOrdenes: () => Promise<void>;
  // PDF helpers state if both pages share the same pattern — extract only if identical
};
```

- [ ] **Step 1: Diff list sections** of admin vs técnico (fetch, search, stats, alert, throttle init). Document divergences in a short comment at top of the hook (`// variant tecnico: …`).

- [ ] **Step 2: Implement `useOrdenesList`** by moving the **shared** list logic first; keep page-specific bits (e.g. delete only on admin if técnico lacks it) behind `if (variant === "admin")` or callbacks `opts.onDelete`.

- [ ] **Step 3: Wire both pages** to the hook; delete duplicated local state.

- [ ] **Step 4: Verify**

```powershell
cd frontend
pnpm exec tsc -b --noEmit
```

Smoke: open `/ordenes` and `/ordenes-tecnico`, search, refresh list.

- [ ] **Step 5: Commit only if user asks**

---

### Task 3: `useOrdenFormDraft` (PR 2.3)

**Files:**
- Create: `useOrdenFormDraft.ts`
- Modify: both pages’ formData / handleSubmit / fotos / catalogs
- Keep: `useOrdenFormModalState` as shell flags only

**Interfaces:**
- Consumes: `variant`, editing orden, scope flags, `onSaved`, auth user
- Produces:

```ts
export function useOrdenFormDraft(opts: {
  variant: "admin" | "tecnico";
  open: boolean;
  editingOrden: Orden | null;
  tipoOrden: string;
  isReadOnly: boolean;
  isLimitedEdit: boolean;
  isFieldReadOnly: (field: string) => boolean;
  userId: number | null;
  isAdmin: boolean;
  onSaved: (orden: Orden) => void | Promise<void>;
}): {
  formData: /* same shape as today */;
  setFormData: ...;
  resetForm: () => void;
  loadFromOrden: (orden: Orden) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  // fotos
  maxPhotosAllowed: number;
  onDrop / removeFoto / ...
  // catalogs + search strings used by JSX
  // admin-only:
  statusAdministrativo: OrdenStatusAdministrativo;
  setStatusAdministrativo: ...;
  fechaEnvioAdmin: string;
  setFechaEnvioAdmin: ...;
  cotizacionesAdmin: ...;
  setCotizacionesAdmin: ...;
  loadAdminSeguimientoFromOrden: (orden: Orden) => void;
  resetAdminSeguimientoUi: () => void;
};
```

**Admin payload rule (verbatim from current OrdenesPage):**

```ts
if (variant === "admin" && isAdmin) {
  payload.status_administrativo = statusAdministrativo;
  payload.fecha_envio = fechaEnvioAdmin.trim() ? fechaEnvioAdmin.slice(0, 10) : null;
  payload.cotizaciones_adjuntas = /* mapped rows */;
} else {
  delete payload.status_administrativo;
  delete payload.fecha_envio;
  delete payload.cotizaciones_adjuntas;
}
```

- [ ] **Step 1: Extract draft state + submit from admin page first** into the hook with `variant: "admin"`. Keep JSX in page temporarily.

- [ ] **Step 2: Switch técnico page** to the same hook with `variant: "tecnico"`. Resolve divergences by reading both `handleSubmit` blocks side-by-side — do **not** silently drop técnico-only behavior.

- [ ] **Step 3: Add Vitest for admin payload helper** (extract pure function `buildOrdenWritePayload(...)` inside the draft module or `ordenesPageUtils.ts`):

```ts
// test: admin+isAdmin includes status_administrativo; tecnico omits it
```

- [ ] **Step 4: `tsc` + smoke create/edit on both routes**

- [ ] **Step 5: Commit only if user asks**

---

### Task 4: Move folders + `OrdenFormModal` shell (PR 2.4)

**Files:**
- `git mv` into `shared/`, `list/`, `form/`, `form/fields/` per file map
- Create: `form/OrdenFormModal.tsx` — shell that receives `variant` + draft + modal state + renders **existing JSX moved as children or still-inline panels**
- Update relative imports (`../OrdenLevantamiento`, `../../` to ordenTrabajoStyles, Proyectos shared paths)
- **Do not** change `App.tsx` lazy paths

**Interfaces:**
- Consumes: hooks from Task 2–3 (now under `shared/` / `form/`)
- Produces: pages import `./form/OrdenFormModal`

- [ ] **Step 1: Create dirs and `git mv`**

```powershell
cd frontend/src/pages/Operacion/OrdenesTrabajo/OrdenServicio
New-Item -ItemType Directory -Force -Path shared, list, form/tabs, form/fields | Out-Null
# git mv each file per file map — keep OrdenesPage.tsx / OrdenesTecnicoPage.tsx / OrdenPdfPage.tsx / useOrdenesPagePermissions.ts at root
```

- [ ] **Step 2: Fix all imports** (including `OrdenAdminCotizacionesField` → Proyectos paths if any; Levantamiento `../OrdenLevantamiento/...`).

- [ ] **Step 3: Create `OrdenFormModal`** moving the `<Modal>` wrapper + tab chrome + footer from both pages into one component. Pages pass props; JSX of tab bodies may still live inside the shell file temporarily (split in Task 5).

- [ ] **Step 4: Verify**

```powershell
cd frontend
pnpm exec tsc -b --noEmit
pnpm exec vitest run src/pages/Operacion/OrdenesTrabajo/OrdenServicio
```

- [ ] **Step 5: Commit only if user asks**

---

### Task 5: Tabs + a11y pass (PR 2.5)

**Files:**
- Create: `form/tabs/OrdenClienteTab.tsx`, `form/tabs/OrdenDetalleTab.tsx`
- Modify: `form/OrdenFormModal.tsx`
- Optionally move Levantamiento wrapper into Detalle tab

**Interfaces:**
- Explicit props only (no Context)
- `OrdenDetalleTab` receives `tipoOrden`, `variant`, levantamiento snapshot callbacks, etc.

**a11y checklist (must verify in report):**

1. Tab buttons: `role="tab"`, `aria-selected`, `aria-controls`, keyboard arrows preserved.
2. Icon-only buttons: `aria-label` in Spanish.
3. Fields: visible label / `htmlFor`.
4. Validation errors: `role="alert"` or `aria-describedby` where pattern exists.
5. Map / PDF / delete icon buttons labeled.

- [ ] **Step 1: Extract Cliente tab**
- [ ] **Step 2: Extract Detalle/Orden tab** (incl. LevantamientoForm mount)
- [ ] **Step 3: Run a11y checklist** — fix gaps found in extracted surfaces only
- [ ] **Step 4: `tsc`**
- [ ] **Step 5: Count lines**

```powershell
(Get-Content form/OrdenFormModal.tsx | Measure-Object -Line).Lines
(Get-Content ../../OrdenesPage.tsx | Measure-Object -Line).Lines
(Get-Content ../../OrdenesTecnicoPage.tsx | Measure-Object -Line).Lines
```

Target: pages ~400–600; shell ≤ ~500 soft.

- [ ] **Step 6: Commit only if user asks**

---

### Task 6: Docs + gate final (PR 2.6)

**Files:**
- Modify: `docs/superpowers/specs/2026-07-30-frontend-architecture-roadmap-design.md` — mark Ola 2 implemented (estructural)
- Modify: `AGENTS.md` — one line under plantilla pointing to Ola 2 spec
- Report automated gates

- [ ] **Step 1: Update docs**

- [ ] **Step 2: Full gate**

```powershell
cd frontend
pnpm exec tsc -b --noEmit
pnpm exec vitest run src/pages/Operacion/OrdenesTrabajo/OrdenServicio
pnpm exec eslint src/pages/Operacion/OrdenesTrabajo/OrdenServicio/shared src/pages/Operacion/OrdenesTrabajo/OrdenServicio/form/OrdenFormModal.tsx src/pages/Operacion/OrdenesTrabajo/OrdenServicio/form/tabs
```

- [ ] **Step 3: Manual smoke checklist (document PENDING USER if no browser)**

1. `/ordenes` — list, search, open, save, admin seguimiento
2. `/ordenes-tecnico` — list, open own orden, limited fields
3. Crear orden + fotos
4. Levantamiento tipo still works on admin
5. PDF send/download paths still work
6. Tabs keyboard on shared modal

- [ ] **Step 4: Commit only if user asks**

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Shared-first types | Task 1 |
| `useOrdenesList` | Task 2 |
| `useOrdenFormDraft` + admin payload rule | Task 3 |
| Folder move + shell | Task 4 |
| Tabs + a11y | Task 5 |
| Docs + gate | Task 6 |
| Pages stay at feature root / App.tsx | Tasks 4–6 constraints |
| No Context / no route merge | Global |
| Levantamiento import only | Task 5 |

## Placeholder scan

No TBD. Hook return shapes are normative; implementers may add fields already used by JSX but must not invent new product behavior.
