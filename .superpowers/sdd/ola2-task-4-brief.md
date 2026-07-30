### Task 4: Move folders + `OrdenFormModal` shell (PR 2.4)

**Files:**
- `git mv` into `shared/`, `list/`, `form/`, `form/fields/` per file map
- Create: `form/OrdenFormModal.tsx` â€” shell that receives `variant` + draft + modal state + renders **existing JSX moved as children or still-inline panels**
- Update relative imports (`../OrdenLevantamiento`, `../../` to ordenTrabajoStyles, Proyectos shared paths)
- **Do not** change `App.tsx` lazy paths

**Interfaces:**
- Consumes: hooks from Task 2â€“3 (now under `shared/` / `form/`)
- Produces: pages import `./form/OrdenFormModal`

- [ ] **Step 1: Create dirs and `git mv`**

```powershell
cd frontend/src/pages/Operacion/OrdenesTrabajo/OrdenServicio
New-Item -ItemType Directory -Force -Path shared, list, form/tabs, form/fields | Out-Null
# git mv each file per file map â€” keep OrdenesPage.tsx / OrdenesTecnicoPage.tsx / OrdenPdfPage.tsx / useOrdenesPagePermissions.ts at root
```

- [ ] **Step 2: Fix all imports** (including `OrdenAdminCotizacionesField` â†’ Proyectos paths if any; Levantamiento `../OrdenLevantamiento/...`).

- [ ] **Step 3: Create `OrdenFormModal`** moving the `<Modal>` wrapper + tab chrome + footer from both pages into one component. Pages pass props; JSX of tab bodies may still live inside the shell file temporarily (split in Task 5).

- [ ] **Step 4: Verify**

```powershell
cd frontend
pnpm exec tsc -b --noEmit
pnpm exec vitest run src/pages/Operacion/OrdenesTrabajo/OrdenServicio
```

- [ ] **Step 5: Commit only if user asks**

---

