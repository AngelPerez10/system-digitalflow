# AGENTS.md — Guía para agentes de código

## Arquitectura

- **Backend**: Django 5 + DRF en `backend/`. Apps por dominio (`cotizaciones`, `ordenes`, `clientes`, `users`, …).
- **Frontend**: React 19 + TypeScript + Vite en `frontend/`. Rutas en `src/App.tsx`, layout en `src/layout/`.
- **Auth**: cookies HttpOnly + CSRF. Usar siempre `fetchApi` de `src/config/api.ts` — no `localStorage.getItem("token")` ni `fetch` crudo para API autenticada.

## Permisos

Los permisos viven en `UserPermissions.permissions` (JSON por módulo: `view`, `create`, `edit`, `delete`).

- Backend: subclases de `ModulePermission` en `apps/users/permissions.py` (`OrdenesPermission`, `TareasPermission`, …).
- Frontend: guards `Require*Permission` con comprobación estricta `=== true` para `view`. Admin (`isAdmin`) bypass en guards.

## Convenciones

1. **Cambios mínimos** — no refactorizar fuera del alcance del ticket.
2. **Tipos** — preferir archivos `*Types.ts` por dominio (ver `wialonTypes.ts`, `cotizacionFormTypes.ts`).
3. **Modales** — componente `Modal` exige `ariaLabelledBy` o `ariaLabel`; incluye focus trap.
4. **Seguridad** — `DEBUG` se lee de env (default `false`). Imágenes remotas: `apps/common/ssrf.py`.
5. **Tests** — Vitest en frontend; `python manage.py test` en backend para smoke de permisos.

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

## Decisiones de seguridad (documentadas)

### CSRF + `Authorization: Bearer`

En `backend/config/middleware.py`, las peticiones a `/api/*` con cabecera `Authorization: Bearer …` **no exigen token CSRF**. Es compatibilidad con clientes que envían JWT en header (p. ej. access token en memoria/`sessionStorage`).

**Riesgo:** si un atacante inyecta JS (XSS) y lee el access token, puede hacer mutaciones sin CSRF. La mitigación principal es cookie HttpOnly para refresh + CSP; el bypass de Bearer es **intencional** hasta migrar por completo a cookie-only.

**Antes de endurecer:** acordar con producto/seguridad — opciones: eliminar bypass en producción, restringirlo a rutas concretas, o retirar el access token del body de login/refresh.

### PII en `sessionStorage`

`frontend/src/config/authSession.ts` y varias páginas legacy guardan permisos y, como fallback, el access token en `sessionStorage`. Eso expone datos a cualquier script en el mismo origen.

**Estado actual:** `AuthContext` es la fuente preferida; `sessionStorage` es caché/fallback. **No eliminar sin plan de migración** — afecta recargas y pestañas múltiples.

## PDF / plantillas

- HTML de cotizaciones: `backend/apps/cotizaciones/pdf_templates/cotizacion.py`
- HTML de órdenes: `backend/apps/ordenes/pdf_templates/orden.py`
- Helpers compartidos: `backend/apps/common/pdf_html.py`, `backend/apps/common/pdf_images.py`

## No hacer

- Commitear `backend/.env`, `db.sqlite3`, `frontend/dist/`, `node_modules/`.
- Inferir `DEBUG` por host de despliegue.
- Guards permisivos (`view !== false`) en rutas nuevas.
