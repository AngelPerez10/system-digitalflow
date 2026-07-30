# Task 4 Report: Extraer `ProyectoClienteTab`

## Status
**Complete**

## Changes

### Created
- `frontend/src/pages/Operacion/Proyectos/form/tabs/ProyectoClienteTab.tsx`
  - Exported `ProyectoClienteTab` with explicit `ProyectoClienteTabProps`
  - Contains Identificación section (cliente, ID cliente) and Cotizaciones del proyecto section
  - Preserves a11y ids: `panelId`, `labelledBy`, `proyecto-modal-cliente`, `proyecto-modal-cliente-id`, `proyecto-cliente-step-error`, `proyecto-sec-cliente`, `proyecto-sec-cotizacion`
  - Icons (`iconUser`, `iconDoc`) moved into tab file (only used by this tab)

### Modified
- `frontend/src/pages/Operacion/Proyectos/form/ProyectoFormModal.tsx`
  - Replaced inline `{activeTab === "cliente" && (...)}` block with `<ProyectoClienteTab ... />`
  - Removed `iconUser` (retained `iconDoc` for presupuesto tab)
  - Other tabs remain inline

## Props passed
`panelId`, `labelledBy`, `cliente`, `setCliente`, `clienteId`, `setClienteId`, `clienteStepError`, `setClienteStepError`, `presupuestoCargado`, `cotizaciones`, `setConfirmClearCotizaciones`, `openCotizacionPicker`, `handleQuitarCotizacion`

## Verification
```bash
cd frontend && pnpm exec tsc -b --noEmit
```
Exit code: **0**

## Commits
None (per task constraints)

## Concerns
- None. Behavior and a11y ids preserved; no Context introduced.
