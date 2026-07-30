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
- [ ] **Step 3: Run a11y checklist** â€” fix gaps found in extracted surfaces only
- [ ] **Step 4: `tsc`**
- [ ] **Step 5: Count lines**

```powershell
(Get-Content form/OrdenFormModal.tsx | Measure-Object -Line).Lines
(Get-Content ../../OrdenesPage.tsx | Measure-Object -Line).Lines
(Get-Content ../../OrdenesTecnicoPage.tsx | Measure-Object -Line).Lines
```

Target: pages ~400â€“600; shell â‰¤ ~500 soft.

- [ ] **Step 6: Commit only if user asks**

---

