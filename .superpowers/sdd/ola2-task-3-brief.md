### Task 3: `useOrdenFormDraft` (PR 2.3)

**Files:**
- Create: `useOrdenFormDraft.ts`
- Modify: both pagesâ€™ formData / handleSubmit / fotos / catalogs
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

- [ ] **Step 2: Switch tÃ©cnico page** to the same hook with `variant: "tecnico"`. Resolve divergences by reading both `handleSubmit` blocks side-by-side â€” do **not** silently drop tÃ©cnico-only behavior.

- [ ] **Step 3: Add Vitest for admin payload helper** (extract pure function `buildOrdenWritePayload(...)` inside the draft module or `ordenesPageUtils.ts`):

```ts
// test: admin+isAdmin includes status_administrativo; tecnico omits it
```

- [ ] **Step 4: `tsc` + smoke create/edit on both routes**

- [ ] **Step 5: Commit only if user asks**

---

