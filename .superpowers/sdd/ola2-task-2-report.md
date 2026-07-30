# Ola 2 Task 2 Report — `useOrdenesList` (PR 2.2)

**Date:** 2026-07-30  
**Status:** ✅ Complete  
**Commits:** None (per constraint)

## Summary

Extracted shared list state/logic into `useOrdenesList.ts` and wired `OrdenesPage` + `OrdenesTecnicoPage`. Form draft logic untouched; no folder moves.

## Hook (`useOrdenesList.ts`)

**Variant divergences (documented in file):**
- `admin`: stats with estrella; sort by `fecha_inicio` → `fecha_creacion`; logout clears list+loading
- `tecnico`: stats `includeEstrella: false`; sort by `fecha_creacion||fecha_inicio`; init deps include `canView`

**Extracted:** `ordenes`, `loading`, `fetchOrdenes`, search/filters, `shownList`, `stats`, page `alert` + `showAlert`/`clearAlert`, shared throttle via `markOrdenesListInitialLoad()`.

**Left in pages:** init batch (servicios/usuarios/clientes), signature load, form/modal/PDF-mes (admin), `filterOpen` UI.

## Files

| File | Action |
|------|--------|
| `useOrdenesList.ts` | Created |
| `OrdenesPage.tsx` | Wired `variant: "admin"` |
| `OrdenesTecnicoPage.tsx` | Wired `variant: "tecnico"` |

## Verification

```powershell
cd frontend
pnpm exec tsc -b --noEmit  # exit 0
```

Smoke: `/ordenes`, `/ordenes-tecnico` — search, month filter, refresh (manual).

## Out of scope

Form draft hook (Task 3), folder move (Task 4), commit.
