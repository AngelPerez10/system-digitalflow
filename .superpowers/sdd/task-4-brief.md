### Task 4: Extraer `ProyectoClienteTab`

**Files:**
- Create: `form/tabs/ProyectoClienteTab.tsx`
- Modify: `form/ProyectoFormModal.tsx`
- Test: `tsc`

**Interfaces:**
- Consumes: props tipadas con campos/setters del tab cliente + ids a11y
- Produces: `export function ProyectoClienteTab(props: ProyectoClienteTabProps): JSX.Element`

- [ ] **Step 1: Cortar el bloque** `{activeTab === "cliente" && ( ... )}` a `ProyectoClienteTab`.

Props mÃ­nimas (ajustar a lo que el JSX use realmente):

```ts
type ProyectoClienteTabProps = {
  disabled: boolean;
  cliente: string;
  setCliente: (v: string) => void;
  clienteId: number | null;
  // cotizaciÃ³n principal UI, fecha autorizaciÃ³n, errores clienteStepError, etc.
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

- [ ] **Step 3: `tsc`** â€” exit 0.

- [ ] **Step 4: Commit (solo si el usuario lo pide)**

---

