### Task 6: Extraer `ProyectoOperacionTab`

**Files:**
- Create: `form/tabs/ProyectoOperacionTab.tsx`
- Modify: `form/ProyectoFormModal.tsx`
- Test: `tsc`

**Interfaces:**
- Consumes: status, fechas, personal, notas, evidencias, firmas, avance, closeBlockedMessage, etc.
- Produces: `ProyectoOperacionTab` (el tab mÃ¡s grande; OK si el archivo queda ~600â€“900 lÃ­neas)

- [ ] **Step 1: Mover bloque** `activeTab === "operacion"`.
- [ ] **Step 2: Wire en shell.**
- [ ] **Step 3: Confirmar instalaciones sigue vÃ­a barrel:**

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

- [ ] **Step 4: Contar lÃ­neas del shell**

```powershell
(Get-Content form/ProyectoFormModal.tsx | Measure-Object -Line).Lines
```

Expected: orientativo â‰¤ 400 (criterio soft del spec). Si > 500, mover JSX del picker de cotizaciones a `form/cotizaciones/ProyectoCotizacionPickerModal.tsx`.

- [ ] **Step 5: `tsc`** â€” exit 0.
- [ ] **Step 6: Commit (solo si el usuario lo pide)**

---

