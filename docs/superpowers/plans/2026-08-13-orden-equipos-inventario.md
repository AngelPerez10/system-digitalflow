# Orden equipos inventario — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Equipos tab to the orden form (after Datos de la orden) that pulls products from Inventario (search + barcode scan), tracks delivery/installation like Proyectos, and atomically adjusts stock when admin marks Entregado.

**Architecture:** Persist `Orden.equipos_inventario` as a JSON snapshot. On create/update, a dedicated sync service compares previous vs incoming lines, applies permission rules, and creates/reverses `InventarioMovimiento` rows linked via `orden` + `orden_linea_id` inside `transaction.atomic()` with `select_for_update`. Frontend adds tab + section UI; admin-only add/deliver; assigned technician installation-only.

**Tech Stack:** Django 5 + DRF, React 19 + TypeScript + Vite, Vitest, existing `fetchApi` / inventario list API, ERP modal styles.

**Spec:** [`docs/superpowers/specs/2026-08-13-orden-equipos-inventario-design.md`](../specs/2026-08-13-orden-equipos-inventario-design.md)

## Global Constraints

- Español de México in UI/API errors (tildes).
- No new npm dependencies.
- No `any` in touched FE files.
- Server never trusts client for `movimientoSalidaId`, roles, or stock.
- Admin = `user.is_staff or user.is_superuser` (same as ordenes views today).
- Commits: only when the user explicitly asks.
- Gates: `cd backend && .venv/Scripts/python manage.py test apps.ordenes.tests.test_equipos_inventario` (Windows) / `python manage.py test …`; `cd frontend && pnpm exec tsc -b --noEmit`; scoped eslint on touched paths.
- Do not refactor Levantamiento monolith or PDF in v1.
- Do not use `POST /api/inventario/scan/` for delivery stock-out; delivery movements are created only by orden sync.

---

## File map

| Path | Action |
|------|--------|
| `backend/apps/ordenes/models.py` | Add `equipos_inventario` JSONField |
| `backend/apps/inventario/models.py` | Add `orden` FK + `orden_linea_id` on `InventarioMovimiento` |
| `backend/apps/ordenes/migrations/00xx_*.py` | Orden field |
| `backend/apps/inventario/migrations/00xx_*.py` | Movimiento link fields |
| `backend/apps/ordenes/equipos_inventario.py` | **Create** — normalize + sync + stock |
| `backend/apps/ordenes/serializers.py` | Field + validate + counters; call sync in create/update path |
| `backend/apps/ordenes/views.py` | Wire sync after save in `perform_create` / `perform_update` (or serializer.create/update) |
| `backend/apps/ordenes/tests/test_equipos_inventario.py` | **Create** — permission + stock tests |
| `frontend/.../shared/ordenesPageTypes.ts` | `OrdenEquipoInventarioLinea` + field on `Orden` |
| `frontend/.../form/useOrdenFormModalState.ts` | Tab `"equipos"` |
| `frontend/.../form/OrdenFormModal.tsx` | Third tab + footer navigation |
| `frontend/.../form/useOrdenFormDraft.ts` | State + payload merge |
| `frontend/.../form/tabs/OrdenEquiposTab.tsx` | **Create** |
| `frontend/.../form/fields/OrdenEquiposSection.tsx` | **Create** |
| `frontend/.../form/fields/OrdenInventarioPicker.tsx` | **Create** |
| `frontend/.../OrdenesPage.tsx` + `OrdenesTecnicoPage.tsx` | Wire tab children + props |
| `AGENTS.md` | Short note on `equipos_inventario` + stock sync |

---

### Task 1: Models + migrations

**Files:**
- Modify: `backend/apps/ordenes/models.py`
- Modify: `backend/apps/inventario/models.py`
- Create: migrations via `makemigrations`

**Interfaces:**
- Produces: `Orden.equipos_inventario: list` (default `[]`); `InventarioMovimiento.orden` (FK nullable); `InventarioMovimiento.orden_linea_id: str`

- [ ] **Step 1: Add fields**

On `Orden` (near other JSON fields):

```python
equipos_inventario = models.JSONField(default=list, blank=True)
```

On `InventarioMovimiento`:

```python
orden = models.ForeignKey(
    'ordenes.Orden',
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name='movimientos_inventario',
)
orden_linea_id = models.CharField(max_length=64, blank=True, default='', db_index=True)
```

- [ ] **Step 2: Makemigrations + migrate locally**

```bash
cd backend
.venv/Scripts/python manage.py makemigrations ordenes inventario
.venv/Scripts/python manage.py migrate
```

Expected: two new migrations applied.

- [ ] **Step 3: Smoke import**

```bash
.venv/Scripts/python -c "from apps.ordenes.models import Orden; from apps.inventario.models import InventarioMovimiento; print('ok', Orden._meta.get_field('equipos_inventario'), InventarioMovimiento._meta.get_field('orden'))"
```

Expected: prints `ok` without error.

---

### Task 2: Sync service (TDD) — core stock + permissions

**Files:**
- Create: `backend/apps/ordenes/equipos_inventario.py`
- Create: `backend/apps/ordenes/tests/test_equipos_inventario.py`

**Interfaces:**
- Produces:
  - `normalize_equipos_payload(raw) -> list[dict]`
  - `sync_orden_equipos_inventario(*, orden, incoming, user, previous) -> list[dict]`
  - Raises `rest_framework.exceptions.ValidationError` / `PermissionDenied` with Spanish messages

- [ ] **Step 1: Write failing tests** (file `test_equipos_inventario.py`)

Cover at least:

1. Admin marks `equipoEntregado=True` with `cantidad=2` → item stock -= 2, movimiento salida linked, returned JSON has `movimientoSalidaId`.
2. Admin unmarks → stock restored, `movimientoSalidaId` null.
3. Non-admin sending `equipoEntregado=True` → `PermissionDenied` (403 path) or ValidationError that views map to 403 — prefer `PermissionDenied`.
4. Assigned technician may change only `estadoInstalacion` on existing line.
5. Stock insufficient → ValidationError, stock unchanged.
6. Duplicate `inventarioItemId` in payload → ValidationError.
7. Changing `cantidad` while delivered → ValidationError asking to unmark first.

Skeleton (adapt to project User/permissions helpers used in `test_smoke.py`):

```python
from django.test import TestCase
from rest_framework.exceptions import PermissionDenied, ValidationError
from apps.inventario.models import InventarioItem, InventarioMovimiento
from apps.ordenes.equipos_inventario import sync_orden_equipos_inventario
from apps.ordenes.models import Orden
# + User factory like smoke tests

class SyncEquiposInventarioTests(TestCase):
    def test_admin_entregar_descuenta_stock(self):
        # arrange item cantidad=5, orden, admin user
        # act sync with one line entregado cantidad=2
        # assert item.cantidad == 3 and InventarioMovimiento.objects.filter(tipo='salida').exists()
        ...
```

- [ ] **Step 2: Run tests — expect FAIL** (module missing)

```bash
cd backend
.venv/Scripts/python manage.py test apps.ordenes.tests.test_equipos_inventario -v2
```

Expected: FAIL import / not found.

- [ ] **Step 3: Implement `equipos_inventario.py`**

Key rules (implement fully):

```python
# Pseudo-structure — implement completely in the module:

ALLOWED_INSTALL = {"no_instalado", "instalado"}

def _is_admin(user) -> bool: ...

def _can_edit_instalacion(user, orden) -> bool:
    # admin OR (tecnico_asignado_id == user.id OR creado_por_id == user.id)

def normalize_equipos_payload(raw) -> list[dict]:
    # require list; dedupe inventarioItemId → error if duplicates
    # coerce cantidad int >= 1; strip movimientoSalidaId from client input
    # return cleaned dicts with lineaId, inventarioItemId, snapshot fields, flags

def sync_orden_equipos_inventario(*, orden, incoming, user, previous) -> list[dict]:
    # previous = list from orden.equipos_inventario before change
    # If not admin: only allow instalacion patches; reject add/remove/qty/entregado changes
    # with PermissionDenied("Solo un administrador puede agregar o marcar entrega de equipos.")
    # For each line needing salida: select_for_update item; check stock; create movimiento
    # For lines removed or un-delivered: create entrada; clear movimientoSalidaId
    # Return final list to assign to orden.equipos_inventario
```

Use `transaction.atomic()` inside sync (caller may already be atomic — nested OK).

- [ ] **Step 4: Run tests — expect PASS**

```bash
.venv/Scripts/python manage.py test apps.ordenes.tests.test_equipos_inventario -v2
```

Expected: OK.

---

### Task 3: Wire serializer + views

**Files:**
- Modify: `backend/apps/ordenes/serializers.py`
- Modify: `backend/apps/ordenes/views.py` (`perform_create`, `perform_update`)
- Modify: `backend/apps/ordenes/tests/test_equipos_inventario.py` (add APITestCase HTTP cases)

**Interfaces:**
- Consumes: `sync_orden_equipos_inventario`, `normalize_equipos_payload`
- Produces: API field `equipos_inventario` on detail; optional read-only counters `equipos_inventario_total|entregados|instalados`

- [ ] **Step 1: Serializer**

- Add `equipos_inventario` to `OrdenSerializer.Meta.fields`.
- Add `validate_equipos_inventario` calling `normalize_equipos_payload` (or defer normalize to sync).
- Add SerializerMethodField counters for detail (total / entregados / instalados).
- Keep list serializer **without** full equipos blob if heavy — include counters only OR omit until needed; detail must include full `equipos_inventario`. Prefer: list keeps counters only; detail full list. If list currently uses same fields as detail via inheritance, add field to both but accept empty default `[]` for old rows.

- [ ] **Step 2: perform_create / perform_update**

After `serializer.save(...)`:

```python
from django.db import transaction
from .equipos_inventario import sync_orden_equipos_inventario

# Inside atomic block wrapping save+sync:
previous = list(instance.equipos_inventario or []) if updating else []
incoming = data.get('equipos_inventario', previous)
# On create, read from validated_data before/after save
final = sync_orden_equipos_inventario(
    orden=instance, incoming=incoming, user=self.request.user, previous=previous
)
if final != (instance.equipos_inventario or []):
    instance.equipos_inventario = final
    instance.save(update_fields=['equipos_inventario'])
```

Ensure photo uploads and sync share one `transaction.atomic()` so stock rollback undoes orden write on ValidationError — raise before commit.

- [ ] **Step 3: API tests**

- `POST /api/ordenes/` as admin with equipos entregados → 201 and stock down.
- `PUT` as technician trying entregado → 403.
- `PUT` as assigned tech changing only instalacion → 200.

- [ ] **Step 4: Run full new test module PASS**

```bash
.venv/Scripts/python manage.py test apps.ordenes.tests.test_equipos_inventario -v2
```

---

### Task 4: Frontend types + modal tab shell

**Files:**
- Modify: `frontend/src/pages/Operacion/OrdenesTrabajo/OrdenServicio/shared/ordenesPageTypes.ts`
- Modify: `frontend/src/pages/Operacion/OrdenesTrabajo/OrdenServicio/form/useOrdenFormModalState.ts`
- Modify: `frontend/src/pages/Operacion/OrdenesTrabajo/OrdenServicio/form/OrdenFormModal.tsx`

**Interfaces:**
- Produces:

```ts
export type OrdenEquipoEstadoInstalacion = "no_instalado" | "instalado";

export type OrdenEquipoInventarioLinea = {
  lineaId: string;
  inventarioItemId: number;
  codigoBarras: string;
  nombre: string;
  marca: string;
  modelo: string;
  imagenUrl: string;
  cantidad: number;
  equipoEntregado: boolean;
  estadoInstalacion: OrdenEquipoEstadoInstalacion;
  movimientoSalidaId: number | null;
};

// Orden += equipos_inventario?: OrdenEquipoInventarioLinea[]
// OrdenFormTab += "equipos"
```

- [ ] **Step 1: Extend types + tab union**

Update `OrdenFormTab` to `"cliente" | "orden" | "equipos"`. Extend `TAB_ORDER`, `ORDEN_FORM_TAB_IDS`, `ORDEN_FORM_PANEL_IDS`.

- [ ] **Step 2: Modal UI**

- Third tab button “Equipos”.
- Footer: Cliente → Siguiente (orden); Orden → Siguiente (equipos); Equipos → Guardar.
- Enter-on-cliente still goes to orden; on orden Enter may go to equipos (optional; keep non-textarea Enter on cliente only if current behavior — extend carefully).
- Keyboard arrows cycle three tabs.

- [ ] **Step 3: tsc**

```bash
cd frontend
pnpm exec tsc -b --noEmit
```

Expected: may fail until pages pass children for new tab — fix call sites minimally (render empty panel) or complete Task 5 first in same branch.

---

### Task 5: Equipos UI (picker + section) + draft wiring

**Files:**
- Create: `form/fields/OrdenInventarioPicker.tsx`
- Create: `form/fields/OrdenEquiposSection.tsx`
- Create: `form/tabs/OrdenEquiposTab.tsx`
- Modify: `form/useOrdenFormDraft.ts`
- Modify: `OrdenesPage.tsx`, `OrdenesTecnicoPage.tsx`
- Optional small test: `form/ordenEquiposDraft.test.ts` for add/dedupe qty

**Interfaces:**
- Consumes: `listInventarioItems` from `@/pages/Inventario/shared/inventarioApi`
- Produces: draft helpers `addEquipoFromItem(item)`, `updateEquipo(lineaId, patch)`, `removeEquipo(lineaId)`; payload includes `equipos_inventario`

- [ ] **Step 1: Picker**

- Search input debounced ≥3 chars → `listInventarioItems({ search, page_size: 10 })`.
- Scan input: on submit, search by exact codigo (`search=codigo`); if zero results, toast/alert “No hay producto en inventario con ese código de barras.”
- On pick: if same `inventarioItemId` exists, `cantidad = min(cantidad+1, item.cantidad)` (or allow exceed in UI but BE will reject on deliver — prefer clamp to stock for undelivered lines).
- New line: `crypto.randomUUID()` for `lineaId`; `equipoEntregado: false`; `estadoInstalacion: "no_instalado"`; `movimientoSalidaId: null`.
- Visible only if `isAdmin`.
- If search returns 403, show “Necesitas permiso de inventario para buscar productos.”

- [ ] **Step 2: Section**

Mirror Proyectos card layout using orden ERP classes:

- Summary chips.
- Per line: thumb (`InventarioThumb` or img), qty input (admin, disabled if delivered), Entrega checkbox (admin), instalacion radiogroup (admin or `canMarkInstalacion`), remove (admin).
- Do not send `movimientoSalidaId` mutations from UI except echoing server value.

- [ ] **Step 3: Tab + pages**

- `OrdenEquiposTab` wraps picker + section; props: `equipos`, handlers, `isAdmin`, `canMarkInstalacion`, `stockByItemId` optional refresh map.
- Wire into admin/tecnico pages next to existing tab panels (`hidden` when inactive; `role="tabpanel"` ids).
- Load `equipos_inventario` when editing orden into draft; include in `buildOrdenWritePayload`.

- [ ] **Step 4: Verify**

```bash
cd frontend
pnpm exec tsc -b --noEmit
pnpm exec eslint src/pages/Operacion/OrdenesTrabajo/OrdenServicio/form
```

Expected: 0 tsc errors; eslint clean on touched form files.

---

### Task 6: Docs + AGENTS note + manual checklist

**Files:**
- Modify: `AGENTS.md` (ordenes / inventario bullet)
- Update canvas design status optional

- [ ] **Step 1: AGENTS.md**

Add under PDF/Órdenes or Inventario:

```markdown
- **Equipos en órdenes:** `Orden.equipos_inventario` (JSON). Admin agrega desde inventario (buscar/escanear) y marca Entregado (dispara salida de stock N en la misma transacción del POST/PUT). Técnico asignado solo marca instalación. Desmarcar Entregado revierte stock. Spec: `docs/superpowers/specs/2026-08-13-orden-equipos-inventario-design.md`.
```

- [ ] **Step 2: Manual QA checklist** (record in PR description when opening PR)

1. Admin: nueva orden → agregar 2 ítems → marcar uno entregado → Guardar → stock baja.  
2. Admin: desmarcar Entregado → Actualizar → stock sube.  
3. Técnico asignado: ve equipos; no puede agregar ni Entregar; sí Instalado.  
4. Escanear código inexistente → error claro.  
5. Entregar con N > stock → 400, orden no a medias.

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Tab after orden | 4–5 |
| Search + scan add | 5 |
| Entregado → salida N | 2–3 |
| Unmark → entrada | 2–3 |
| Qty editable + stock check | 2, 5 |
| Admin add/deliver; tech install only | 2, 5 |
| First POST with delivered lines | 2–3 |
| `movimientoSalidaId` server-only | 2 |
| a11y tablist/radiogroup | 4–5 |
| Tests permissions/stock | 2–3 |
| Out of scope Levantamiento/PDF | honored (no tasks) |

---

## Execution Handoff

Plan saved to `docs/superpowers/plans/2026-08-13-orden-equipos-inventario.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in this session with checkpoints  

Which approach?
