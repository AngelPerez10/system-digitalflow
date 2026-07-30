# Task 5 Report: ProyectoPresupuestoTab

## Done
- Created `form/tabs/ProyectoPresupuestoTab.tsx` with explicit props (panel ids, cotizaciones, equipos, handlers).
- Moved presupuesto tabpanel JSX + `ProyectoEquiposSection`; icons and `presupuestoHintId` live in tab.
- Wired tab in `ProyectoFormModal.tsx`; removed dead imports/`iconDoc`.
- `ProyectoSyscomModeloPicker` stays in modal shell (sibling Modal).

## Verification
- `pnpm exec tsc -b --noEmit` — exit 0

## Not done
- No commit (per instructions)
