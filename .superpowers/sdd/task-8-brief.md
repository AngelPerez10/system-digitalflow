### Task 8: Gate final Ola 1

**Files:** none new

- [ ] **Step 1: Typecheck**

```powershell
cd frontend
pnpm exec tsc -b --noEmit
```

Expected: exit 0.

- [ ] **Step 2: Tests del mÃ³dulo**

```powershell
pnpm exec vitest run src/pages/Operacion/Proyectos
```

Expected: all pass.

- [ ] **Step 3: ESLint paths tocados (fuera de ruido histÃ³rico)**

```powershell
pnpm exec eslint src/pages/Operacion/Proyectos/form/useProyectoFormState.ts src/pages/Operacion/Proyectos/instalaciones/index.ts src/pages/Operacion/Proyectos/form/tabs
```

Expected: 0 errors en archivos **nuevos** (warnings preexistentes en pÃ¡ginas no bloquean si CI excluye pages â€” corregir errores introducidos en esta ola).

- [ ] **Step 4: Smoke manual checklist**

1. Abrir `/proyectos`, crear proyecto **sin** GPS â†’ guarda OK.
2. Crear proyecto **con** subtipo GPS en tab Instalaciones â†’ proyecto + instalaciÃ³n creados (o warning si falla solo instalaciÃ³n).
3. Editar proyecto existente â†’ tab Instalaciones lista/CRUD.
4. Tabs teclado (flechas) y Anterior/Siguiente siguen igual.
5. Cerrar proyecto con reglas de cotizaciÃ³n adicional intactas.

- [ ] **Step 5: Marcar Ola 1 cerrada** en el roadmap (estado â€œOla 1 implementadaâ€) cuando el smoke pase.

---

## Spec coverage (self-review)

| Requisito spec | Task |
|----------------|------|
| Carpetas list/form/shared/instalaciones | Task 1 |
| Regla dependencias + no formâ†’desde instalaciones | Task 1 (styles locales + quitar ProyectoFormSection) |
| Barrel pÃºblico GPS | Task 2 |
| useProyectoFormState | Task 3 |
| Tabs Cliente / Presupuesto / OperaciÃ³n | Tasks 4â€“6 |
| Flujo onSave + instalacionDraft | Tasks 2â€“3 (sin cambio contrato) |
| Cleanup + AGENTS | Task 7 |
| Criterios Ã©xito + verificaciÃ³n | Task 8 |
| useCotizacionPicker opcional | Task 3 / 6 si supera umbral |
| Sin rutas nuevas / sin Context / sin backend | Constraints globales |

## Placeholder scan

Sin TBD. ResoluciÃ³n explÃ­cita para `ProyectoFormSection` / estilos en instalaciones en Task 1.
