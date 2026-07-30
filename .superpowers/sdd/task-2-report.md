# Task 2 Report — Barrel `instalaciones/index.ts` + consumidores

**Status:** Complete  
**Branch:** `refactor/proyectos-ola1-architecture`  
**Date:** 2026-07-30

## Changes

### Created
- `frontend/src/pages/Operacion/Proyectos/instalaciones/index.ts` — public barrel with exactly the exports specified in the brief:
  - `ProyectoFormInstalacionesPanel`
  - `ProyectoInstalacionDraft`, `emptyInstalacionDraft`, `buildInstalacionPayload`
  - `createProyectoInstalacion`, `isProyectoInstalacionApiError`
  - `InstalacionForm` intentionally **not** exported (internal to `instalaciones/`).

### Modified
- `ProyectosPage.tsx` — imports from `./instalaciones` (removed deep paths to `proyectoInstalacionApi` / `proyectoInstalacionTypes`).
- `form/ProyectoFormModal.tsx` — imports from `../instalaciones` (removed deep paths to panel and types).

## Verification

### Deep-import audit
```powershell
rg "Proyectos/instalaciones/" frontend/src --glob "*.{ts,tsx}"
```
**Result:** No matches outside `instalaciones/` internal files. External consumers use `./instalaciones` or `../instalaciones` only.

### TypeScript
```powershell
cd frontend
pnpm exec tsc -b --noEmit
```
**Result:** exit 0

## Commits
None (per task instructions).

## Concerns
None. Barrel surface matches brief; tsc clean; no remaining deep imports from outside `instalaciones/`.
