# Ola 2 Task 4 Report — Move folders + OrdenFormModal shell (PR 2.4)

**Status:** Done  
**Commit:** None (per brief)

## Moves (`shared/`, `list/`, `form/`, `form/fields/`)

| Destination | Files |
|-------------|-------|
| `shared/` | `ordenesPageTypes.ts`, `ordenesPageUtils.ts`, `ordenEditScope.ts`, `useOrdenesShared.ts`, `useOrdenesList.ts`, `ordenesPageTypes.merge.test.ts` |
| `form/` | `useOrdenFormDraft.ts`, `useOrdenFormModalState.ts`, `buildOrdenWritePayload.test.ts`, **`OrdenFormModal.tsx` (new)** |
| `form/fields/` | `OrdenAdminCotizacionesField.tsx`, `OrdenLocationMapModal.tsx` |
| `list/` | `OrdenesPageStats.tsx`, `MobileOrderCard.tsx`, `OrdenEnviarPdfModal.tsx`, `OrdenPdfLoadingModal.tsx` |
| **Root (unchanged)** | `OrdenesPage.tsx`, `OrdenesTecnicoPage.tsx`, `OrdenPdfPage.tsx`, `useOrdenesPagePermissions.ts` |

Untracked hooks/tests moved with `Move-Item`; tracked files via `git mv`. Duplicate root copies removed.

## OrdenFormModal

- New `form/OrdenFormModal.tsx`: shared `<Modal>` shell, header, limited-edit banner, tablist (a11y `role="tab"`), form wrapper, footer (Siguiente/Guardar).
- `variant`: `"admin"` \| `"tecnico"` — técnico hides save when lacking create/edit permission.
- Tab **body** JSX remains in pages as `children` (Task 5 will split tabs).

## Import fixes

- Pages → `./shared/*`, `./list/*`, `./form/*`
- `list/` → `../../ordenTrabajoStyles`, `../shared/*`
- `form/*` → `../shared/*`
- External: `LevantamientoPage`, `FacturasCfdiPage`, `ProyectoEvidenciasField`, `ProyectoNotaDiaFotosField`

## Verification

```text
pnpm exec tsc -b --noEmit  → exit 0
pnpm exec vitest run src/pages/Operacion/OrdenesTrabajo/OrdenServicio  → 6/6 pass
```

`App.tsx` lazy paths unchanged.
