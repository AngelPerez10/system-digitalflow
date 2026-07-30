# Task 1 Report: Move-only a carpetas + imports verdes

**Status:** DONE  
**Branch:** `refactor/proyectos-ola1-architecture`  
**Commits:** none (per user instruction)

## Summary

Reorganized the Proyectos feature module from a flat folder into `list/`, `form/` (with `fields/`, `cotizaciones/`, empty `tabs/`), `shared/`, and `instalaciones/`. Updated all internal and external import paths. `ProyectosPage.tsx` and `useProyectosPagePermissions.ts` remain at feature root so `App.tsx` lazy import is unchanged.

## Folder structure produced

```
Proyectos/
├── ProyectosPage.tsx
├── useProyectosPagePermissions.ts
├── list/
│   ├── ProyectosMobileList.tsx
│   └── ProyectosPageStats.tsx
├── form/
│   ├── ProyectoFormModal.tsx
│   ├── ProyectoFormSection.tsx
│   ├── fields/
│   │   ├── ProyectoEquiposSection.tsx
│   │   ├── ProyectoEvidenciasField.tsx
│   │   ├── ProyectoNotaDiaFotosField.tsx
│   │   ├── ProyectoProductoThumb.tsx
│   │   └── ProyectoSyscomModeloPicker.tsx
│   ├── cotizaciones/
│   │   ├── proyectoCotizacionSearch.ts
│   │   ├── proyectoCotizacionMappers.ts
│   │   └── proyectoCotizacionMappers.test.ts
│   └── tabs/          (empty — reserved for Task 2+)
├── shared/
│   ├── proyectoTypes.ts
│   ├── proyectoApi.ts
│   ├── proyectoFormUtils.ts
│   ├── proyectoFormUtils.fechas.test.ts
│   ├── proyectoCloseValidation.ts
│   ├── proyectoCloseValidation.test.ts
│   ├── proyectoPageStyles.ts
│   ├── proyectoImageApi.ts
│   └── proyectoProductoImage.ts
└── instalaciones/
    ├── InstalacionForm.tsx
    ├── ProyectoFormInstalacionesPanel.tsx
    ├── instalacionStyles.ts          (new)
    ├── proyectoInstalacionApi.ts
    └── proyectoInstalacionTypes.ts
```

## Moves performed

- **Tracked files:** `git mv` per brief file map (22 renames).
- **Untracked GPS/instalaciones files** (were at flat root): moved with `Move-Item`, then `git add instalaciones/`.
- **New file:** `instalaciones/instalacionStyles.ts` — copied CSS string constants needed by instalaciones without importing `shared/`.

## Import updates

### Feature root (`ProyectosPage.tsx`)

- `./form/ProyectoFormModal`, `./list/*`, `./shared/*`, `./instalaciones/*`

### `form/ProyectoFormModal.tsx`

- Ordenes paths: `../../OrdenesTrabajo/...`
- Shared: `../shared/*`
- Fields: `./fields/*`
- Cotizaciones: `./cotizaciones/*`
- Instalaciones: `../instalaciones/*`

### `list/*`, `form/fields/*`, `form/cotizaciones/*`, `shared/*`

- Relative paths adjusted one level deeper where needed.

### External callers

| File | Change |
|------|--------|
| `OrdenAdminCotizacionesField.tsx` | `@/pages/Operacion/Proyectos/form/cotizaciones/proyectoCotizacionSearch`, `shared/proyectoFormUtils`, `shared/proyectoPageStyles`, `shared/proyectoTypes` |
| `OrdenesPage.tsx` | `@/pages/Operacion/Proyectos/shared/proyectoTypes` |

### Instalaciones isolation

- **No imports** from `form/`, `list/`, or `shared/`.
- `ProyectoFormInstalacionesPanel` no longer uses `ProyectoFormSection`; section header markup inlined with classes from `instalacionStyles.ts`.
- Only external deps: `@/` aliases, `../../OrdenesTrabajo/ordenTrabajoStyles`, and intra-`instalaciones/` imports.

## Verification

```powershell
cd frontend
pnpm exec tsc -b --noEmit          # exit 0
pnpm exec vitest run \
  src/pages/Operacion/Proyectos/shared/proyectoFormUtils.fechas.test.ts \
  src/pages/Operacion/Proyectos/shared/proyectoCloseValidation.test.ts \
  src/pages/Operacion/Proyectos/form/cotizaciones/proyectoCotizacionMappers.test.ts
# 3 files, 15 tests passed
```

## Self-review

| Check | Result |
|-------|--------|
| `ProyectosPage` lazy path unchanged | ✓ `@/pages/Operacion/Proyectos/ProyectosPage` |
| No hook/tab extraction | ✓ move-only |
| `instalaciones/` isolated from form/list/shared | ✓ verified via grep |
| All brief file map items moved | ✓ |
| External callers updated | ✓ 2 files |
| tsc green | ✓ |
| vitest green | ✓ 15/15 |

## Issues fixed during implementation

- **`ProyectoEquiposSection` types path:** initial `../../../shared/proyectoTypes` corrected to `../../shared/proyectoTypes` (tsc TS2307).

## Concerns

- **Style duplication:** `instalacionStyles.ts` duplicates section/empty-panel tokens from `shared/proyectoPageStyles.ts`. Intentional per architecture rule; Task 2+ may consolidate via barrel or shared token file if product agrees to relax boundary.
- **Uncommitted working tree:** includes backend GPS work and other Ola 0 changes unrelated to this task; only Proyectos frontend paths and 2 Ordenes imports were touched for Task 1.

## Files modified (Task 1 scope)

**Moved/renamed:** 22 tracked + 4 untracked → subfolders  
**Created:** `instalaciones/instalacionStyles.ts`  
**Import edits:** all files under `Proyectos/` subfolders + `ProyectosPage.tsx` + 2 Ordenes callers  
**Not committed:** per user instruction
