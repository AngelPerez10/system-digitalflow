# Ola 2 Task 3 Report — `useOrdenFormDraft` (PR 2.3)

**Date:** 2026-07-30  
**Status:** PARTIAL — técnico wired; admin page not hooked (see BLOCKED)  
**Commits:** None (per constraint)

## Summary

Created `useOrdenFormDraft.ts` with shared form state, catalogs, fotos, submit, and admin seguimiento. Extracted pure `buildOrdenWritePayload` + 4 Vitest cases. **OrdenesTecnicoPage** wired to `variant: "tecnico"`. **OrdenesPage** still uses inline form/submit (accidental `git checkout` during admin wiring lost uncommitted Task 2 list hook work).

## Deliverables

| File | Lines | Notes |
|------|------:|-------|
| `useOrdenFormDraft.ts` | 1108 | Hook + `buildOrdenWritePayload` + levantamiento helper |
| `buildOrdenWritePayload.test.ts` | 95 | admin/tecnico payload rules |
| `OrdenesTecnicoPage.tsx` | 2118 | Wired; ~865 lines removed vs pre-patch |
| `OrdenesPage.tsx` | 3090 | **Not wired**; dead `instalaciones`/InstalacionForm refs removed for tsc |

## Verification

```text
pnpm exec tsc -b --noEmit  → exit 0
pnpm test -- buildOrdenWritePayload ordenesPageTypes.merge → 6/6 pass
```

## Admin payload rule

Implemented in `buildOrdenWritePayload`: `variant === "admin" && isAdmin` adds `status_administrativo` / `fecha_envio` / `cotizaciones_adjuntas`; técnico omits them. Técnico-only: `firma_encargado_url` null-sanitize; post-save `canShow` list merge preserved.

## BLOCKED — OrdenesPage admin wiring

**Cause:** Admin page reverted to committed monolith (~3090 LOC) mid-patch; automated line-range removal corrupted file once.

**Proposed split (PR 2.3b):**
1. Re-apply Task 2 `useOrdenesList` on admin page (restore lost uncommitted work).
2. Wire `useOrdenFormDraft({ variant: "admin" })` using técnico patch as template + admin IDs/seguimiento fields.
3. Keep JSX in page; delete duplicate `handleSubmit` block only after hook smoke.

## Concerns

- OrdenesPage lacks both `useOrdenesList` and `useOrdenFormDraft` until 2.3b.
- Map Leaflet effects re-inlined in técnico page (unchanged behavior).
- Full Vitest suite not run; only payload + types merge tests.

---

## 2.3b completion — 2026-07-30 (admin wiring restored)

**Status:** COMPLETE — both pages wired  
**Commits:** None (per constraint)

### Changes

- **OrdenesPage.tsx** (~2121 LOC, down from 3090): restored Task 2 `useOrdenesList({ variant: "admin" })` and Task 3 `useOrdenFormDraft({ variant: "admin" })` mirroring técnico wiring.
- Removed inline duplicate: `fetchOrdenes`, `handleSubmit`, form/foto/catalog state, `shownList`/`ordenStats` memos, select helpers.
- Kept admin-only JSX: `OrdenAdminCotizacionesField`, status administrativo block, `OrdenLocationMapModal`, mes PDF download, `?abrir=` deep-link edit.
- Admin seguimiento UI state (`statusAdministrativo`, `fechaEnvioAdmin`, `cotizacionesAdmin`) now from draft hook.

### Hook confirmation

| Page | `useOrdenesList` | `useOrdenFormDraft` |
|------|------------------|---------------------|
| OrdenesPage | `variant: "admin"` | `variant: "admin"` |
| OrdenesTecnicoPage | `variant: "tecnico"` | `variant: "tecnico"` |

### Verification (re-run)

```text
pnpm exec tsc -b --noEmit  → exit 0
pnpm test -- buildOrdenWritePayload ordenesPageTypes.merge → 6/6 pass
```
