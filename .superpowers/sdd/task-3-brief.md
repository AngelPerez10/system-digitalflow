### Task 3: Extraer `useProyectoFormState`

**Files:**
- Create: `frontend/src/pages/Operacion/Proyectos/form/useProyectoFormState.ts`
- Modify: `frontend/src/pages/Operacion/Proyectos/form/ProyectoFormModal.tsx`
- Test: `tsc` + smoke mental (buildCurrentDraft + submit)

**Interfaces:**
- Consumes: `ProyectoDraft`, utils de `../shared/*`, `emptyInstalacionDraft` del barrel, props del modal (`open`, `initialDraft`, `proyectoId`, `isAdmin` vÃ­a auth dentro del hook o pasado)
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
  // picker state, catalogs, errors, ids de a11y si viven aquÃ­
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
  - LÃ³gica de tabs `goToNextTab` / `goToPrevTab` / `handleTabKeyDown` (o dejar keydown en shell si es solo UI)
  - Estado del picker de cotizaciones

No mover JSX.

- [ ] **Step 2: Dejar el modal como consumidor**

```tsx
const form = useProyectoFormState({ open, editing, proyectoId, initialDraft });
// usar form.* en JSX existente sin extraer tabs aÃºn
```

- [ ] **Step 3: Verificar tamaÃ±o**

Si `useProyectoFormState.ts` > ~500 lÃ­neas **y** el picker es > ~150, extraer en el mismo task:

`form/cotizaciones/useCotizacionPicker.ts` â€” solo estado/handlers del picker; el modal sigue renderizando el JSX del picker.

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

