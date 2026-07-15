# AGENTS.md — Guía para agentes de código

## Uso obligatorio

Antes de modificar arquitectura, rutas, autenticación, permisos, performance, seguridad, CI, estructura de carpetas o patrones globales, leer este archivo.

Si un cambio introduce una nueva convención, corrige un problema recurrente o cambia una decisión técnica, actualizar `AGENTS.md` en el mismo ticket.

## Context7 MCP

Usar siempre Context7 MCP antes de responder o modificar código cuando el trabajo involucre librerías, frameworks, SDKs, APIs, CLI tools o servicios cloud. Esto incluye React, Vite, Django, DRF, pnpm, GitHub Actions y dependencias del proyecto.

Flujo obligatorio: resolver primero el library ID con Context7 y luego consultar la documentación relevante. Si el MCP no está disponible, intentar habilitarlo con `npx ctx7 setup --codex --mcp --project --yes` y documentar el bloqueo antes de continuar.

## Arquitectura

- **Backend**: Django 5 + DRF en `backend/`. Apps por dominio (`cotizaciones`, `ordenes`, `clientes`, `users`, …).
- **Frontend**: React 19 + TypeScript + Vite en `frontend/`. Rutas en `src/App.tsx`, layout en `src/layout/`.
- **Auth**: cookies HttpOnly + CSRF. Usar siempre `fetchApi` de `src/config/api.ts` — no `localStorage.getItem("token")` ni `fetch` crudo para API autenticada.
- **API**: las rutas nuevas deben preferir `/api/v1/`. El prefijo legado `/api/` se mantiene por compatibilidad; no eliminarlo sin plan de migración frontend/clientes.

## Permisos

Los permisos viven en `UserPermissions.permissions` (JSON por módulo: `view`, `create`, `edit`, `delete`).

- Backend: subclases de `ModulePermission` en `apps/users/permissions.py` (`OrdenesPermission`, `TareasPermission`, …).
- Frontend: guards `Require*Permission` con comprobación estricta `=== true` para `view`. Admin (`isAdmin`) bypass en guards.
- **Catálogos en cotización**: GET a `/api/productos/syscom/*` y `/api/productos-manuales/` permiten usuarios con acceso a `cotizaciones` (aunque no tengan módulo `productos`). Altas/edición/baja de manuales siguen exigiendo `productos`.

## Convenciones

1. **Cambios mínimos** — no refactorizar fuera del alcance del ticket.
2. **Tipos** — preferir archivos `*Types.ts` por dominio (ver `wialonTypes.ts`, `cotizacionFormTypes.ts`).
3. **Modales** — componente `Modal` exige `ariaLabelledBy` o `ariaLabel`; incluye focus trap.
4. **Seguridad** — `DEBUG` se lee de env (default `false`). Imágenes remotas: `apps/common/ssrf.py`.
5. **Tests** — Vitest en frontend; `python manage.py test` en backend para smoke de permisos.
6. **Componentes compartidos** — evitar duplicados con APIs parecidas. `SearchableSelect` canónico vive en `frontend/src/components/form/SearchableSelect.tsx`; no crear variantes en `components/ui/select` sin migrar usos y documentar la nueva frontera.

## Calidad de código

Antes de cerrar un ticket, ejecutar los mismos checks que CI (ver `.github/workflows/ci.yml`).

### Frontend

```bash
cd frontend
pnpm exec tsc -b --noEmit    # 0 errores TypeScript
pnpm test                    # Vitest
pnpm exec eslint src         # ver alcance CI abajo
```

**ESLint en CI** lintea `src` **excepto** `src/pages/**`, `src/context/**` y `src/svg.d.ts`. Eso no significa que `pages/` esté exento de calidad: al tocar una página, corregir en el mismo diff los problemas que ESLint reporte ahí (`pnpm exec eslint src/pages/...`).

| Regla | Política |
|-------|----------|
| `@typescript-eslint/no-explicit-any` | Evitar `any` nuevo. Tipar respuestas API en `*Types.ts`. Reducir deuda gradualmente en archivos que se editen. |
| `no-empty` | Prohibido `catch {}` vacío. Comentar la intención o registrar el error (`console.error` / toast). |
| `react-hooks/exhaustive-deps` | Corregir al modificar el efecto; no silenciar sin revisar bugs de datos obsoletos. |
| `prefer-const` | Usar `const` si la variable no se reasigna. |

### Backend

```bash
cd backend
ruff check apps              # imports, estilo (auto-fix: ruff check apps --fix)
python manage.py test apps.users apps.cotizaciones apps.ordenes apps.common apps.clientes apps.escritorio
```

### Ortografía (UI)

- Textos visibles al usuario en **español de México** con tildes: Cotización, Teléfono, Descripción, Número, etc.
- Nombres de variables, rutas y claves API sin tilde (`telefono`, `/cotizacion`) — es correcto.
- Revisar mensajes de toast, `title`, `placeholder`, `label` y textos de PDF al añadir copy nuevo.

### Deuda conocida (auditoría 2026-06)

- ~355 usos de `any` en `frontend/src/pages/**` — priorizar tipado al editar cada módulo.
- Páginas monolíticas (`OrdenesPage`, `NuevaCotizacionPage`, …) — extraer hooks/componentes al ampliar funcionalidad, no en refactors masivos no solicitados.

## Web Performance

Las rutas de `src/App.tsx` usan **`React.lazy` + `Suspense`** (code splitting por página). Reglas:

1. **Páginas nuevas siempre lazy** — añadir con `const Pagina = lazy(() => import("@/pages/..."))`. Solo quedan eager: `SignIn`, `AppLayout`, guards (`Require*`) y `ScrollToTop`.
2. **Las páginas lazy deben tener `export default`** (requisito de `React.lazy`).
3. **Fallback de carga**: `src/components/common/RouteLoadingFallback.tsx` (accesible: `role="status"` + `aria-live="polite"`, compatible claro/oscuro). Reutilizarlo, no crear spinners por ruta.
4. **Librerías pesadas** (ApexCharts, FullCalendar, Leaflet, markdown, drag & drop) solo deben importarse desde páginas/componentes lazy — nunca desde `main.tsx`, `App.tsx`, layout o guards, porque eso las mete al bundle inicial.
5. **CSS de librerías** se importa en el componente que la usa (ej. flatpickr en `components/form/date-picker.tsx`), no en `main.tsx`.
6. Antes de cerrar cambios de performance ejecutar:
   - `cd frontend && pnpm exec tsc -b --noEmit`
   - `cd frontend && pnpm test`
   - `cd frontend && pnpm exec eslint src/App.tsx src/components/common`
   - `cd frontend && pnpm build` (verificar que la página siga partida en chunks y el entry no crezca)

Deuda pendiente (fase 2): APIs de órdenes/cotizaciones sin paginación (`pagination_class = None`) y listados sin virtualización; chunk de ApexCharts (~570 KB) compartido por dashboard y reportes.

### Dependencias (auditoría 2026-06)

Se eliminaron 15 paquetes sin uso o duplicados: `react-dnd`, `react-dnd-html5-backend`, `animejs`, `swiper`, `react-markdown`, `rehype-raw`, `remark-gfm`, `@tanstack/react-table`, `class-variance-authority`, `leaflet`, `react-simple-maps`, `world-atlas`, `@fullcalendar/list` y los types asociados. Convenciones vigentes:

- **Drag & drop**: solo `@atlaskit/pragmatic-drag-and-drop`. No reintroducir `react-dnd`.
- **Animaciones**: solo `motion` (`motion/react`). No reintroducir `animejs`.
- **Mapas**: Leaflet se carga vía CDN en runtime (`window.L`) — no instalar el paquete npm sin migrar también los componentes que usan el global.
- Antes de añadir una dependencia nueva, verificar que no exista ya una equivalente en `package.json`.

## Accesibilidad y semántica

- **Skip link**: `AppLayout` incluye "Saltar al contenido principal" hacia `#main-content`. No eliminarlo ni cambiar el `id` del `<main>`.
- **Modales**: `Modal` exige `ariaLabelledBy` (preferido, apuntando al `id` del título visible) o `ariaLabel` descriptivo en español. Sin ninguno, el lector de pantalla anuncia solo "Diálogo" — no dejar modales así.
- **Botones de icono**: todo `<button>` sin texto visible lleva `aria-label` en español ("Cerrar notificaciones", "Abrir menú lateral", …). Los toggles llevan además `aria-pressed`/`aria-expanded`.
- **Tablas**: `TableCell isHeader` renderiza `<th scope="col">` por defecto; usar `scope="row"` para encabezados de fila.
- **Imágenes**: `alt` significativo en imágenes informativas (producto → título del producto). `alt=""` solo para imágenes decorativas.

## Flujo local (resumen)

```text
Terminal 1: backend/.venv → migrate → runserver :8000
Terminal 2: frontend → pnpm dev :5173
```

## Archivos de referencia

| Tema | Archivo |
|------|---------|
| API cliente | `frontend/src/config/api.ts` |
| Permisos backend | `backend/apps/users/permissions.py` |
| Settings / DEBUG | `backend/config/settings.py` |
| SSRF imágenes | `backend/apps/common/ssrf.py` |
| CI | `.github/workflows/ci.yml` |
| ESLint (frontend) | `frontend/eslint.config.js` |
| Ventas (pages) | `frontend/src/pages/Ventas/` — ver tabla abajo |

### `pages/Ventas/` (lazy imports)

Las páginas de ventas viven en subcarpetas; el `import()` de `App.tsx` debe coincidir **exactamente** con la ruta del archivo (incluida la subcarpeta y el casing).

| Pantalla | Archivo | Lazy import en `App.tsx` |
|----------|---------|---------------------------|
| Cotizaciones | `Ventas/Cotizacion/CotizacionesPage.tsx` | `@/pages/Ventas/Cotizacion/CotizacionesPage` |
| Nueva / editar cotización | `Ventas/Cotizacion/NuevaCotizacionPage.tsx` | `@/pages/Ventas/Cotizacion/NuevaCotizacionPage` |
| PDF cotización | `Ventas/Cotizacion/CotizacionPdfPage.tsx` | `@/pages/Ventas/Cotizacion/CotizacionPdfPage` |
| Facturas CFDI (SICAR) | `Ventas/FacturasCFDI/FacturasCfdiPage.tsx` | `@/pages/Ventas/FacturasCFDI/FacturasCfdiPage` |

Si el import apunta a `@/pages/Ventas/FacturasCfdiPage` (sin `FacturasCFDI/`), Vite devuelve HTML (404 del SPA) y el navegador reporta `MIME type "text/html"`. Windows tolera mayúsculas en disco; CI/Linux no — usar siempre `FacturasCFDI`.

## Decisiones de seguridad (documentadas)

### CSRF + `Authorization: Bearer`

En `backend/config/middleware.py`, las peticiones a `/api/*` con cabecera `Authorization: Bearer …` **no exigen token CSRF**. Es compatibilidad con clientes que envían JWT en header (p. ej. access token en memoria/`sessionStorage`).

**Riesgo:** si un atacante inyecta JS (XSS) y lee el access token, puede hacer mutaciones sin CSRF. La mitigación principal es cookie HttpOnly para refresh + CSP; el bypass de Bearer es **intencional** hasta migrar por completo a cookie-only.

**Antes de endurecer:** acordar con producto/seguridad — opciones: eliminar bypass en producción, restringirlo a rutas concretas, o retirar el access token del body de login/refresh.

### Auth cookie-only y `sessionStorage`

`frontend/src/config/authSession.ts` mantiene el access token solo en memoria del tab y limpia claves legacy de tokens en `sessionStorage`. No volver a persistir access/refresh token en Web Storage.

`AuthContext` no debe cachear usuario/permisos en `sessionStorage`; en recargas o pestañas nuevas debe reconstruir sesión con cookies HttpOnly usando `/api/token/refresh/` y después `/api/me/`.

## PDF / plantillas

- HTML de cotizaciones: `backend/apps/cotizaciones/pdf_templates/cotizacion.py`
- HTML de órdenes: `backend/apps/ordenes/pdf_templates/orden.py`
- HTML de facturas CFDI (SICAR): `backend/apps/cotizaciones/sicar_cfdi_pdf.py`
- Helpers compartidos: `backend/apps/common/pdf_html.py`, `backend/apps/common/pdf_images.py`

## No hacer

- Commitear `backend/.env`, `db.sqlite3`, `frontend/dist/`, `node_modules/`.
- Inferir `DEBUG` por host de despliegue.
- Guards permisivos (`view !== false`) en rutas nuevas.
