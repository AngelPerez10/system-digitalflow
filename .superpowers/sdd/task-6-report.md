# Task 6 Report — Extraer `ProyectoOperacionTab`

## Done

- Created `form/tabs/ProyectoOperacionTab.tsx` with explicit props (status, fechas, personal, notas, evidencias, firmas, avance, closeBlockedMessage, etc.).
- Wired `ProyectoOperacionTab` in `ProyectoFormModal.tsx` replacing `{activeTab === "operacion" && (...)}`.
- Instalaciones tab unchanged via barrel: `ProyectoFormInstalacionesPanel` from `../instalaciones`.
- Shell line count after operacion extraction: **468** (≤500 threshold).
- Also extracted cotizacion picker JSX to `form/cotizaciones/ProyectoCotizacionPickerModal.tsx` (shell was projected >500 before picker move; final shell 468).
- `pnpm exec tsc -b --noEmit` — exit 0.
- No Context introduced; behavior freeze preserved.

## Files

| Action | Path |
|--------|------|
| Create | `form/tabs/ProyectoOperacionTab.tsx` |
| Create | `form/cotizaciones/ProyectoCotizacionPickerModal.tsx` |
| Modify | `form/ProyectoFormModal.tsx` |

## Line counts

| File | Lines |
|------|------:|
| `ProyectoFormModal.tsx` | 468 |
| `ProyectoOperacionTab.tsx` | ~870 |
| `ProyectoCotizacionPickerModal.tsx` | ~175 |

## Not committed

Per instructions — no git commit.
