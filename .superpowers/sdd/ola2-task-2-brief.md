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
  // PDF helpers state if both pages share the same pattern â€” extract only if identical
};
```

- [ ] **Step 1: Diff list sections** of admin vs tÃ©cnico (fetch, search, stats, alert, throttle init). Document divergences in a short comment at top of the hook (`// variant tecnico: â€¦`).

- [ ] **Step 2: Implement `useOrdenesList`** by moving the **shared** list logic first; keep page-specific bits (e.g. delete only on admin if tÃ©cnico lacks it) behind `if (variant === "admin")` or callbacks `opts.onDelete`.

- [ ] **Step 3: Wire both pages** to the hook; delete duplicated local state.

- [ ] **Step 4: Verify**

```powershell
cd frontend
pnpm exec tsc -b --noEmit
```

Smoke: open `/ordenes` and `/ordenes-tecnico`, search, refresh list.

- [ ] **Step 5: Commit only if user asks**

---

