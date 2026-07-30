# Design: Arquitectura frontend — Órdenes de servicio (Ola 2)

**Fecha:** 2026-07-30  
**Estado:** Aprobado en conversación (enfoque 1 — shared-first; alcance Admin + Técnico juntos)  
**Alcance:** Reorganizar `frontend/src/pages/Operacion/OrdenesTrabajo/OrdenServicio/` con plantilla `list/` + `form/` + `shared/`, extrayendo hooks compartidos que consumen **OrdenesPage (admin)** y **OrdenesTecnicoPage (técnico)**. Sin cambiar rutas ni unificar UX en una sola página.

**Relacionado:**
- Mapa del programa: [`2026-07-30-frontend-architecture-roadmap-design.md`](./2026-07-30-frontend-architecture-roadmap-design.md) (este spec = **Ola 2**)
- Ola 1 (plantilla de referencia): [`2026-07-30-proyectos-frontend-architecture-design.md`](./2026-07-30-proyectos-frontend-architecture-design.md)

---

## 1. Contexto y problema

`OrdenesPage.tsx` y `OrdenesTecnicoPage.tsx` son monolitos ~3k líneas con lógica duplicada (listado, formData, save, fotos, catálogos, PDF). Ya existen piezas parciales (`useOrdenFormModalState`, `ordenesPageTypes`, `useOrdenesShared`, stats, mobile cards), pero:

1. Tipos/helpers están duplicados entre `ordenesPageTypes` y `useOrdenesShared`.
2. El save/validate/fotos vive inline en ambas páginas.
3. Admin tiene seguimiento administrativo + cotizaciones; técnico usa `ordenEditScope` / limited edit — la divergencia es real y debe modelarse con `variant`, no borrarse.

Objetivo: arquitectura **escalable y legible a nivel senior**, con una sola fuente de verdad para list/form, manteniendo comportamientos actuales de cada variante.

---

## 2. Decisiones cerradas

| Tema | Decisión |
|------|----------|
| Enfoque | Shared-first → move carpetas → paneles (enfoque 1) |
| Alcance páginas | Admin **y** técnico juntos (opción B) |
| Unificar rutas | No — siguen `/ordenes` y la ruta técnico actuales |
| Context / store | No React Context de formulario; hooks + props |
| Comportamiento | Congelar flujos; cleanup menor OK |
| Levantamiento | Se importa `LevantamientoForm`; no refactor de esa app |
| GPS / Instalación legacy | Fuera de alcance |
| Backend | Fuera de alcance |
| a11y | WCAG 2.2 AA en superficies tocadas (tabs, icon buttons, labels, modal focus existente) |

---

## 3. Estructura de carpetas

```text
frontend/src/pages/Operacion/OrdenesTrabajo/OrdenServicio/
├── OrdenesPage.tsx                 # admin: orquestación listado + modal
├── OrdenesTecnicoPage.tsx          # técnico: orquestación listado + modal
├── OrdenPdfPage.tsx                # ruta PDF (sin reestructurar a fondo)
├── useOrdenesPagePermissions.ts
│
├── shared/
│   ├── ordenesPageTypes.ts         # Orden, Usuario, stats, fotos, admin types (única fuente)
│   ├── ordenesPageUtils.ts
│   ├── ordenEditScope.ts
│   ├── useOrdenesShared.ts         # helpers puros (folios, search match, …); sin redefinir Orden
│   ├── useOrdenesList.ts           # NEW
│   └── useOrdenFormDraft.ts        # NEW
│
├── form/
│   ├── useOrdenFormModalState.ts
│   ├── OrdenFormModal.tsx          # NEW — shell compartido
│   ├── tabs/
│   │   ├── OrdenClienteTab.tsx
│   │   └── OrdenDetalleTab.tsx     # tipo + campos orden + LevantamientoForm
│   └── fields/
│       ├── OrdenAdminCotizacionesField.tsx
│       ├── OrdenLocationMapModal.tsx
│       └── … (otros fields del modal)
│
└── list/
    ├── OrdenesPageStats.tsx
    ├── MobileOrderCard.tsx
    ├── OrdenEnviarPdfModal.tsx
    └── OrdenPdfLoadingModal.tsx
```

`App.tsx` sigue importando `@/pages/Operacion/OrdenesTrabajo/OrdenServicio/OrdenesPage` y `OrdenesTecnicoPage` (raíz del feature).

### Reglas de dependencia

| Desde | Puede importar |
|-------|----------------|
| `list/` | `shared/`, layout/ERP, UI kit |
| `form/` | `shared/`, `../OrdenLevantamiento/*` (solo el form), layout/ERP, UI kit |
| `shared/` | `@/config`, `@/utils`, tipos globales; **no** UI de list/form |
| Páginas raíz | `list/`, `form/`, `shared/` |

---

## 4. Contratos de hooks

### `useOrdenesList`

```ts
type UseOrdenesListOpts = {
  variant: "admin" | "tecnico";
};

// Devuelve (nombres orientativos; alinear a lo que ambas páginas ya usan):
// ordenes, setOrdenes, loading, searchTerm, setSearchTerm, shownList, stats,
// alert/showAlert/clearAlert, fetchOrdenes,
// delete handlers solo si permisos lo permiten,
// estado de envío PDF (target modal open/close) compartido.
```

Diferencias `variant` solo donde el código actual ya diverge (p. ej. filtros o columnas); no inventar divergencia nueva.

### `useOrdenFormDraft`

```ts
type UseOrdenFormDraftOpts = {
  variant: "admin" | "tecnico";
  editingOrden: Orden | null;
  tipoOrden: string;
  isReadOnly: boolean;
  isLimitedEdit: boolean;
  isFieldReadOnly: (field: string) => boolean;
  onSaved: (orden: Orden) => void | Promise<void>;
  // + deps de auth/user necesarios para firma / técnico default
};

// Devuelve: formData/setFormData/reset, validate steps, handleSubmit (POST/PUT),
// fotos (límites dropzone add/remove), búsquedas de catálogo,
// y estado admin (statusAdministrativo, fechaEnvio, cotizaciones) — solo usado si variant==="admin".
```

Payload admin (`status_administrativo`, `fecha_envio`, `cotizaciones_adjuntas`) solo se envía cuando `variant === "admin"` e `isAdmin` (comportamiento actual de OrdenesPage).

### `useOrdenFormModalState`

Sin cambio de responsabilidad: open/close, `activeTab`, `tipoOrden`, flags de scope. Vive en `form/`.

### `OrdenFormModal`

Shell único con `variant`:

- Tabs Cliente / Orden (Detalle) con a11y de tablist (flechas, `aria-selected`, ids).
- Admin: bloque seguimiento administrativo + `OrdenAdminCotizacionesField`.
- Técnico: sin ese bloque; respeta `isFieldReadOnly` / limited edit.
- Footer Anterior/Siguiente/Guardar como hoy.

---

## 5. Accesibilidad (obligatorio en superficies tocadas)

Al extraer modal/tabs (PR 2.5), verificar:

1. Tablist operable por teclado (ArrowLeft/Right, Home/End si ya existen; no romper lo actual).
2. Todo `<button>` solo-icono con `aria-label` en español.
3. Inputs con `<label>` / `htmlFor` o `aria-labelledby`.
4. Errores de validación anunciables (`role="alert"` o `aria-describedby` donde ya haya patrón).
5. No eliminar skip-link ni `id` de main del layout.

No es una auditoría Lighthouse completa del ERP; es no regresar a11y al partir JSX.

---

## 6. Orden de implementación (PRs)

| PR | Contenido | Gate |
|----|-----------|------|
| **2.1** | Unificar tipos/utils en `shared/`; eliminar duplicados; reexports temporales si hace falta | `tsc`; tests existentes |
| **2.2** | `useOrdenesList` + cablear admin y técnico | smoke listado ambas rutas |
| **2.3** | `useOrdenFormDraft` + cablear save/fotos/validate ambas | smoke crear/editar ambas |
| **2.4** | Move `list/`/`form/` + `OrdenFormModal` shell | `tsc`; lazy imports OK |
| **2.5** | Tabs Cliente/Detalle + a11y pass | checklist §5 |
| **2.6** | Actualizar roadmap (estado Ola 2) + AGENTS si aplica | docs |

Preferir commits solo cuando el usuario lo pida. Cada PR debe dejar el app usable (no half-migrate save sin list).

---

## 7. Fuera de alcance

- Fusionar admin y técnico en una sola ruta/página.
- Refactor profundo de `OrdenPdfPage`, Levantamiento app, o `OrdenTrabajoModals` globales salvo imports rotos.
- Rediseño visual / nueva paleta.
- Backend, migraciones, endpoints nuevos.
- Introducir Redux/Zustand/React Query como requisito de esta ola.
- Migración de datos GPS históricos.

---

## 8. Criterios de éxito

- `OrdenesPage` / `OrdenesTecnicoPage` quedan como orquestadores (~400–600 líneas orientativo).
- Save + list + fotos viven en hooks compartidos; divergencia solo vía `variant`.
- Sin regresión de `ordenEditScope` / permisos.
- `App.tsx` paths de lazy sin cambio de string de módulo (o actualizados si se mueve el default export path — **no mover** los Page files de la raíz del feature).
- `tsc -b --noEmit` verde; smoke manual admin + técnico.
- Checklist a11y §5 en modal compartido.

---

## 9. Riesgos y mitigación

| Riesgo | Mitigación |
|--------|------------|
| Divergencia sutil admin/técnico al unificar hooks | Extraer con diff lado a lado; tests de payload admin vs técnico |
| PR demasiado grande | Respetar tabla §6; no mezclar 2.2+2.3+2.4 |
| Working tree sucio (Ola 1 + GPS WIP) | Ola 2 en rama dedicada o commits separados; no mezclar concerns en un solo commit sin pedirlo |
