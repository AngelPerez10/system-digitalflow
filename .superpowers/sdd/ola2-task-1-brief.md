### Task 1: Unificar tipos/utils (PR 2.1) â€” sin cambiar UI

**Files:**
- Modify: `ordenesPageTypes.ts`, `useOrdenesShared.ts`
- Modify: imports in `OrdenesPage.tsx`, `OrdenesTecnicoPage.tsx`, and any other file importing duplicates
- Test: `frontend/src/pages/Operacion/OrdenesTrabajo/OrdenServicio/shared/ordenesPageTypes.merge.test.ts` (create after move path OR keep flat until Task 4 â€” **for this task keep files in current flat paths**, only dedupe)

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

