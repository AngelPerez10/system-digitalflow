### Task 6: Docs + gate final (PR 2.6)

**Files:**
- Modify: `docs/superpowers/specs/2026-07-30-frontend-architecture-roadmap-design.md` â€” mark Ola 2 implemented (estructural)
- Modify: `AGENTS.md` â€” one line under plantilla pointing to Ola 2 spec
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

1. `/ordenes` â€” list, search, open, save, admin seguimiento
2. `/ordenes-tecnico` â€” list, open own orden, limited fields
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
| Pages stay at feature root / App.tsx | Tasks 4â€“6 constraints |
| No Context / no route merge | Global |
| Levantamiento import only | Task 5 |

## Placeholder scan

No TBD. Hook return shapes are normative; implementers may add fields already used by JSX but must not invent new product behavior.
