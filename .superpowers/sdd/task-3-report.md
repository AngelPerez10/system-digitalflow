# Task 3 Report: Extraer `useProyectoFormState`

**Date:** 2026-07-30  
**Status:** COMPLETE  
**Commits:** None (per instructions)

## Summary

Extracted all proyecto form draft state, effects, validation, tab navigation, catalog loading, cotización picker logic, and submit handling from `ProyectoFormModal.tsx` into a new hook `useProyectoFormState.ts`. The modal is now a thin shell: hook call + destructuring + JSX (tabs not extracted — Tasks 4–6).

## Files Changed

| File | Action | Lines |
|------|--------|------:|
| `frontend/src/pages/Operacion/Proyectos/form/useProyectoFormState.ts` | CREATE | 910 |
| `frontend/src/pages/Operacion/Proyectos/form/ProyectoFormModal.tsx` | MODIFY | 1608 (was ~2238) |

**Optional picker hook:** Not created. Hook is 910 lines (>500 threshold) and picker block is ~180 lines (>150), but a separate `useCotizacionPicker.ts` was deferred to avoid risky mid-refactor coupling; recommended follow-up in Task 4+ if file size becomes a maintenance issue.

## Hook API

```ts
export type ProyectoFormTab = "cliente" | "operacion" | "presupuesto" | "instalaciones";

export function useProyectoFormState(args: {
  open: boolean;
  editing: boolean;
  proyectoId: number | null;
  initialDraft: ProyectoDraft;
  onSave: (
    draft: ProyectoDraft,
    extras?: { instalacionDraft?: ProyectoInstalacionDraft | null }
  ) => void | Promise<void>;
}): { /* draft fields, setters, tab nav, picker, handlers, refs, a11y tab/panel ids */ };
```

`onSave` is passed into hook args (resolved decision #4). Modal destructures the return value for JSX ergonomics (equivalent to `form.*` usage).

## What Moved to Hook

- All `useState` for draft fields + `instalacionDraft`
- Refs: `formRef`, `formScrollRef`, `activeTabRef`, `focusNotaIdRef`, `tecnicoSignatureCacheRef`
- Effects: reset on `open`, catalog load, técnico signature fetch, cotización picker debounced search, nota focus
- `buildCurrentDraft`, `handleSubmit`, `handleStatusChange`
- Tab helpers: `goToNextTab`, `goToPrevTab`, `handleTabKeyDown`, `tabIds`, `panelIds`
- Cotización picker state/handlers + equipo/syscom picker handlers
- Derived memos: `presupuesto`, `presupuestoCargado`, `equiposPorCotizacion`, `servicioOptions`, `tecnicoOptions`, `cotizacionesFiltradas`
- Bitácora, fecha rango, porcentaje avance, hora stamp helpers

## What Stayed in Modal

- All JSX (main modal, cotización picker modal, clear-cotizaciones confirm, Syscom picker)
- `useAuth` / `isAdmin` (only used in equipos section JSX)
- Modal-local `useId`: picker title, presupuesto hint, motivo, notas live, clear-cotizaciones title
- Section icon SVGs, `FORM_TABS`, `STATUS_OPTIONS` constants
- Styles imports

## Behavior Preserved (smoke review)

| Behavior | Location |
|----------|----------|
| Enter on non-`presupuesto` tab advances via `goToNextTab(true)` | `handleSubmit` in hook |
| Save only validates/submits on `presupuesto` tab | `activeTabRef.current !== "presupuesto"` guard |
| `instalacionDraft` passed only when `proyectoId == null && instalacionDraft.subtipo` | `handleSubmit` extras |
| Cliente required before tab advance / save | `goToNextTab`, `handleSubmit` |
| Pausado requires motivo on save | `handleSubmit` |
| Cerrado blocked without cotización adicional | `handleStatusChange`, `handleSubmit` + `canCerrarProyecto` |
| Reset all state when modal opens | `resetFromInitial` effect |

## Verification

```powershell
cd frontend
pnpm exec tsc -b --noEmit
# exit 0
```

No new linter errors on touched files.

## Self-Review Notes

1. **Destructuring vs `form.*`:** Modal destructures hook return (~100 bindings) instead of `form.activeTab` etc. Same thin-consumer outcome; slightly easier migration with zero JSX renames beyond `panelIds`/`tabIds`.
2. **`editing` in hook args:** Accepted per brief interface but unused inside hook today (DatePicker keys still use modal `editing` prop).
3. **Hook size:** 910 lines — picker extraction to `useCotizacionPicker.ts` is the natural next split when touching cotizaciones again.
4. **No tab component extraction** — intentionally left for Tasks 4–6.

## Concerns / Follow-ups

- Consider extracting `useCotizacionPicker` (~180 lines) in a future task to bring main hook under 500 lines.
- `buildCurrentDraft` dependency array is long; stable but could use a ref pattern later if perf issues arise (not observed).
- No runtime/browser smoke test run in this task — manual QA on modal open/reset/tab flow recommended.

---

## Task 3 Fix: Extract `useCotizacionPicker` (2026-07-30)

**Status:** COMPLETE  
**Commits:** None (per instructions)

### Summary

Moved cotización picker state, debounced search effect, and picker handlers from `useProyectoFormState.ts` into new `useCotizacionPicker.ts`. Main hook delegates via `useCotizacionPicker` and re-exports the same picker fields the modal destructures — zero JSX changes in `ProyectoFormModal.tsx`. Removed unused `editing` from `UseProyectoFormStateArgs` (modal keeps `editing` prop for UI only).

### Files Changed

| File | Action | Lines |
|------|--------|------:|
| `frontend/src/pages/Operacion/Proyectos/form/cotizaciones/useCotizacionPicker.ts` | CREATE | 191 |
| `frontend/src/pages/Operacion/Proyectos/form/useProyectoFormState.ts` | MODIFY | 798 (was 910) |
| `frontend/src/pages/Operacion/Proyectos/form/ProyectoFormModal.tsx` | MODIFY | 1607 (removed `editing` from hook args only) |

### What Moved to `useCotizacionPicker`

- Picker state: `pickerOpen`, `confirmClearCotizaciones`, `pickerTarget`, `pickerTab`, `pickerSearch`, `pickerResults`, `pickerLoading`, `pickerError`, `pickerLoadingId`
- Debounced search effect (`searchProyectoCotizaciones`, 300ms)
- `cotizacionesFiltradas` memo + `cotizacionIdsVinculados`
- Handlers: `handleCargarCotizacion`, `openCotizacionPicker`, `handleQuitarCotizacion`, `handleLimpiarPresupuesto`
- `resetPicker()` called from main hook's `resetFromInitial`

### Verification

```powershell
cd frontend
pnpm exec tsc -b --noEmit
# exit 0
```

No new linter errors on touched files.
