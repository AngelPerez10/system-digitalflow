# Proyecto Instalaciones GPS — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) or superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mover instalaciones GPS de Órdenes a una pestaña en `ProyectosPage`, con modelo `ProyectoInstalacion` (N por proyecto) y CRUD bajo permisos `proyectos`.

**Architecture:** Nuevo modelo/API en `apps/operacion`. UI con tabs Proyectos | Instalaciones. `InstalacionForm` se adapta a payload controlado (sin `ordenId`). Órdenes pierde tipo `instalaciones`. `OrdenInstalacion` permanece en DB sin UI.

**Tech Stack:** Django 5 + DRF, React 19 + TypeScript + Vite, `fetchApi`, permisos `ProyectosPermission`.

**Spec:** `docs/superpowers/specs/2026-07-30-proyecto-instalaciones-gps-design.md`

## Global Constraints

- Textos UI en español de México con tildes.
- Permisos módulo `proyectos` (`view`/`create`/`edit`/`delete`); respetar `own_only`.
- API preferir `/api/` existente del router operacion (mismo patrón que `/api/proyectos/`).
- No migrar datos históricos `OrdenInstalacion` en esta entrega.
- No commits automáticos salvo que el usuario lo pida.
- Accesibilidad: tabs con `role="tablist"`, modales con `ariaLabelledBy`, botones icono con `aria-label`.
- UI: conservar tokens ERP existentes (`#ff801f`, paneles cream/dark); no inventar tema purple/cream genérico.

## File map

| File | Role |
|------|------|
| `backend/apps/operacion/models.py` | Add `ProyectoInstalacion` |
| `backend/apps/operacion/serializers.py` | Add serializer |
| `backend/apps/operacion/views.py` | Add `ProyectoInstalacionViewSet` |
| `backend/apps/operacion/urls.py` | Register router |
| `backend/apps/operacion/migrations/00XX_*.py` | Migration |
| `backend/apps/ordenes/image_services.py` | Allow `proyectos/instalacion/dibujos/` |
| `backend/apps/operacion/tests/test_proyecto_instalaciones_smoke.py` | API smoke |
| `backend/apps/common/document_folio.py` | Add `FOLIO_SERIE_INS = "INS"` |
| `frontend/.../Proyectos/InstalacionForm.tsx` | Moved/adapted form |
| `frontend/.../Proyectos/proyectoInstalacionApi.ts` | API client |
| `frontend/.../Proyectos/proyectoInstalacionTypes.ts` | Types |
| `frontend/.../Proyectos/ProyectoInstalacionesTab.tsx` | List + modal |
| `frontend/.../Proyectos/ProyectosPage.tsx` | Page-level tabs |
| `frontend/.../OrdenServicio/OrdenesPage.tsx` | Remove instalaciones |
| `frontend/.../OrdenServicio/OrdenesTecnicoPage.tsx` | Remove instalaciones |
| `frontend/.../OrdenServicio/useOrdenFormModalState.ts` | TipoOrden without instalaciones |
| `AGENTS.md` | Document Cloudinary folder |

---

### Task 1: Backend model + migration + serializer + ViewSet + tests

**Files:**
- Modify: `backend/apps/common/document_folio.py`
- Modify: `backend/apps/operacion/models.py`
- Modify: `backend/apps/operacion/serializers.py`
- Modify: `backend/apps/operacion/views.py`
- Modify: `backend/apps/operacion/urls.py`
- Modify: `backend/apps/ordenes/image_services.py`
- Create: `backend/apps/operacion/tests/test_proyecto_instalaciones_smoke.py`
- Create: migration via `makemigrations`
- Modify: `AGENTS.md` (Cloudinary folder line)

**Interfaces:**
- Produces: model `ProyectoInstalacion`; routes `/api/proyecto-instalaciones/`; serializer fields below

**Serializer shape (response):**
```python
{
  "id", "idx", "proyecto", "proyecto_idx", "proyecto_folio",
  "cliente_nombre", "payload", "dibujo_url",
  "creado_por", "fecha_creacion", "fecha_actualizacion",
}
```
`proyecto` is writable PK on create/update; list supports `?proyecto=<id>`.

- [ ] **Step 1: Write failing smoke test**

Create `backend/apps/operacion/tests/test_proyecto_instalaciones_smoke.py` with user+proyectos perms; create a `Proyecto`; `POST /api/proyecto-instalaciones/` with `proyecto` + `payload`; assert 201, `idx` set, list filter works, patch/delete work, 403 without perms.

- [ ] **Step 2: Run test — expect fail (404/route missing)**

```bash
cd backend && py manage.py test apps.operacion.tests.test_proyecto_instalaciones_smoke -v2
```

- [ ] **Step 3: Implement model, serializer, viewset, urls, cloudinary prefix, FOLIO_SERIE_INS**

`ProyectoInstalacion.save`: assign `idx` as max(idx)+1 starting from 1 (or max existing).

ViewSet: `permission_classes = [IsAuthenticated, ProyectosPermission]`; queryset filter by `own_only` via proyecto relation; on create set `creado_por`; if `dibujo_url` is data URL upload to `proyectos/instalacion/dibujos`.

Add `proyectos/instalacion/dibujos` to `PROYECTO_UPLOAD_FOLDERS` and `ALLOWED_CLOUDINARY_PUBLIC_ID_PREFIXES`.

- [ ] **Step 4: makemigrations + migrate + tests pass**

```bash
cd backend && py manage.py makemigrations operacion
cd backend && py manage.py migrate
cd backend && py manage.py test apps.operacion.tests.test_proyecto_instalaciones_smoke apps.operacion.tests.test_proyectos_smoke -v2
```

- [ ] **Step 5: Commit only if user asks**

---

### Task 2: Frontend API client + move InstalacionForm

**Files:**
- Create: `frontend/src/pages/Operacion/Proyectos/proyectoInstalacionTypes.ts`
- Create: `frontend/src/pages/Operacion/Proyectos/proyectoInstalacionApi.ts`
- Create: `frontend/src/pages/Operacion/Proyectos/InstalacionForm.tsx` (from OrdenInstalacion copy, adapted)
- Keep old file temporarily until Ordenes cleaned, then delete `OrdenInstalacion/InstalacionForm.tsx` in Task 4

**Interfaces:**
- Consumes: `/api/proyecto-instalaciones/`
- Produces:
```ts
export type InstalacionFormValue = { /* same fields as today */ };
export type ProyectoInstalacionRow = {
  id: number;
  idx: number | null;
  proyecto: number;
  proyecto_idx: number | null;
  proyecto_folio: string;
  cliente_nombre: string;
  payload: Record<string, unknown>;
  dibujo_url: string;
  fecha_actualizacion: string | null;
};
listProyectoInstalaciones(proyectoId?: number): Promise<ProyectoInstalacionRow[]>
createProyectoInstalacion(body): Promise<ProyectoInstalacionRow>
updateProyectoInstalacion(id, body): Promise<ProyectoInstalacionRow>
deleteProyectoInstalacion(id): Promise<void>
displayInstalacionFolio(idx): string // INS-{n}
```

`InstalacionForm` props:
```ts
{
  value: InstalacionFormValue;
  subtipo: "" | "gps";
  onChange: (next: InstalacionFormValue) => void;
  onSubtipoChange: (v: "" | "gps") => void;
  disabled?: boolean;
}
```
No fetch inside the form.

- [ ] **Step 1: Add types + API client using `fetchApi`**
- [ ] **Step 2: Port form UI to controlled props (no ordenId)**
- [ ] **Step 3: `pnpm exec tsc -b --noEmit` passes for new files**

---

### Task 3: ProyectosPage tabs + Instalaciones list/modal

**Files:**
- Create: `frontend/src/pages/Operacion/Proyectos/ProyectoInstalacionesTab.tsx`
- Modify: `frontend/src/pages/Operacion/Proyectos/ProyectosPage.tsx`

**UI / a11y:**
- Page tabs: `role="tablist"` aria-label="Secciones de proyectos"; each tab `role="tab"` + `aria-selected` + `aria-controls`.
- Modal: `ariaLabelledBy` pointing to visible title.
- Icon buttons: Spanish `aria-label`.
- Preserve ERP coral styling; refined utilitarian tone (dense ops tool, not marketing landing).

**Behavior:**
- Tab Instalaciones: load list on mount/tab focus; search client/folio/placas/imei; Nueva → modal with SearchableSelect of proyectos + InstalacionForm; save POST/PATCH; delete confirm modal.

- [ ] **Step 1: Build `ProyectoInstalacionesTab`**
- [ ] **Step 2: Wire tabs into `ProyectosPage`**
- [ ] **Step 3: Manual smoke in browser + eslint on touched files**

```bash
cd frontend && pnpm exec eslint src/pages/Operacion/Proyectos
cd frontend && pnpm exec tsc -b --noEmit
```

---

### Task 4: Remove instalaciones from Órdenes

**Files:**
- Modify: `useOrdenFormModalState.ts` — remove `instalaciones` from `TipoOrden` and labels
- Modify: `OrdenesPage.tsx` — remove option, form, snapshot, save/load branches
- Modify: `OrdenesTecnicoPage.tsx` — same
- Delete: `frontend/src/pages/Operacion/OrdenesTrabajo/OrdenInstalacion/InstalacionForm.tsx` if unused
- If folder empty, remove `OrdenInstalacion/`

When loading an orden whose API still returns `tipo_orden: "instalaciones"`, map to `"servicio_tecnico"` in the UI setter (do not open InstalacionForm).

- [ ] **Step 1: Strip UI + save paths**
- [ ] **Step 2: Map legacy tipo on open**
- [ ] **Step 3: tsc + eslint on touched pages**

---

### Task 5: Verification + reviews

- [ ] Backend: `py manage.py test apps.operacion apps.ordenes.tests.test_smoke`
- [ ] Frontend: `pnpm exec tsc -b --noEmit` && `pnpm test` (smoke)
- [ ] `/code-review` mindset on diff
- [ ] `/review-security` subagent on uncommitted changes

---

## Spec coverage checklist

| Spec item | Task |
|-----------|------|
| ProyectoInstalacion FK many | 1 |
| API CRUD + filter | 1 |
| Cloudinary folder + AGENTS.md | 1 |
| Tabs Proyectos \| Instalaciones | 3 |
| List + create/edit choose proyecto | 3 |
| InstalacionForm adapted | 2 |
| Remove from Órdenes | 4 |
| Keep OrdenInstalacion | (no delete) |
| Historical idx documented | already in spec |
