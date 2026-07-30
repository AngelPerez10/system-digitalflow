# Ola 2 Task 5 Report — Tabs + a11y pass (PR 2.5)

## Done

- Created `form/tabs/OrdenClienteTab.tsx` — cliente tab (generales, contacto, tiempos, firmas/fotos); `variant` admin|tecnico preserves técnico field wiring.
- Created `form/tabs/OrdenDetalleTab.tsx` — orden tab (tipo, levantamiento mount, descripción, admin seguimiento); LevantamientoForm stays mounted when hidden.
- Created `form/tabs/ordenTabHelpers.tsx` — shared clear/map helpers.
- Updated `form/OrdenFormModal.tsx` — exported tab/panel IDs; tab keyboard (arrows/Home/End); `aria-controls`, `tabIndex`, `role="alert"` on modal alert.
- Wired both `OrdenesPage.tsx` and `OrdenesTecnicoPage.tsx` to shared tabs.

## a11y checklist

| # | Item | Result |
|---|------|--------|
| 1 | Tab buttons: `role=tab`, `aria-selected`, `aria-controls`, keyboard arrows | **Pass** — OrdenFormModal |
| 2 | Icon-only buttons: `aria-label` español | **Pass** — limpiar, llamar, mapa, Maps, quitar servicio, eliminar foto, subir fotos |
| 3 | Fields: label / `htmlFor` | **Pass** — folio, nombre, teléfono, dirección, tipo orden, problemática, comentario, status, fotos extra |
| 4 | Validation errors `role=alert` / `aria-describedby` | **Pass** — modal alert `role=alert`; fotos extra `aria-describedby` hint |
| 5 | Map / PDF / delete icon buttons labeled | **Pass** — mapa + Maps + delete foto in tabs (PDF actions unchanged in list) |

Tab panels: `role="tabpanel"` + `aria-labelledby` on OrdenClienteTab / OrdenDetalleTab.

## Line counts

| File | Lines |
|------|------:|
| `form/OrdenFormModal.tsx` | 211 |
| `OrdenesPage.tsx` | 1199 |
| `OrdenesTecnicoPage.tsx` | 1268 |
| `form/tabs/OrdenClienteTab.tsx` | 592 |
| `form/tabs/OrdenDetalleTab.tsx` | 310 |

## Verification

- `pnpm exec tsc -b --noEmit` → exit **0**
- No commit (per instructions)

## Notes

- Pages still above 600-line target; tab extraction removed ~850 lines of duplicated JSX from pages combined.
- Técnico page retains inline Leaflet map modal (admin uses `OrdenLocationMapModal`).
