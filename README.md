# system-digitalflow

ERP interno de Grupo Intrax / DigitalFlow: ventas, operación, inventario, documentos y la app móvil de técnicos, sobre una sola API Django.

## Estructura del monorepo

| Carpeta | Contenido |
|---------|-----------|
| `backend/` | API Django (REST), generación de PDF y tareas de integración |
| `frontend/` | ERP web (Vite + React 19 + Tailwind) |
| `mobile/` | App de técnicos «SertelPro» (Expo / React Native), consume la misma API. Ver `mobile/README.md` |

### Módulos del backend (`backend/apps/`)

| App | Qué cubre |
|-----|-----------|
| `users` | Usuarios, permisos y firma registrada |
| `clientes` | Clientes y contactos de negocio |
| `productos` | Productos y servicios (catálogos SYSCOM / TVC) |
| `cotizaciones` | Cotizaciones y su PDF |
| `ordenes` | Órdenes de trabajo / servicio |
| `operacion` | Proyectos y operación Wialon |
| `inventario` | Inventario, secciones y proveedores (SICAR) |
| `contratos` | Contratos, firma pública (`/firmar/contrato`) y PDF formal |
| `documentos` | Documentos generales |
| `escritorio` | Panel de control (cotizaciones, proyectos y actividad) |
| `notificaciones` | Notificaciones web y push (Expo) |
| `ai` | Funciones de IA |
| `common` | Utilidades compartidas (PDF, correo, etc.) |

## Requisitos

- Node.js 20+ y [pnpm](https://pnpm.io/). **Solo pnpm**; no uses `npm` ni `npx`.
- Python 3.12+
- SQLite (desarrollo local) o PostgreSQL (producción vía `DATABASE_URL`)
- Chromium de Playwright para generar PDF en local (`python -m playwright install chromium`)

## Desarrollo local

### Backend (Django)

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env   # ajusta DEBUG=true y SECRET_KEY si hace falta
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

Variables de `backend/.env` (la lista completa está en `backend/.env.example`):

| Grupo | Variables | Uso |
|-------|-----------|-----|
| Núcleo | `DEBUG`, `SECRET_KEY`, `ALLOWED_HOSTS`, `DATABASE_URL` | `DEBUG=true` en local; en producción omitir o `false` y definir `SECRET_KEY`. Sin `DATABASE_URL` se usa SQLite |
| PDF | `HTMLDOCS_API_KEY`, `DISABLE_LOCAL_PDF` | Render de PDF local (Playwright) o remoto |
| Catálogos | `SYSCOM_CLIENT_ID`, `SYSCOM_CLIENT_SECRET`, `TVC_API_TOKEN` | Productos de proveedores |
| Correo | `EMAIL_*`, `DEFAULT_FROM_EMAIL`, `SMTP_CREDENTIALS_KEY` | Envío de documentos por correo |
| Archivos | `CLOUDINARY_*` | Fotos, firmas y adjuntos |
| Push | `EXPO_ACCESS_TOKEN` | Notificaciones a la app móvil |
| Wialon | `WIALON_ACCESS_TOKEN` | Operación / rastreo |
| SICAR | `SICAR_DB_*`, `INVENTARIO_SECCION_BACKFILL_BUDGET_S` | Sincronización de inventario |

### Frontend (Vite + React)

En otra terminal:

```bash
pnpm install          # desde la raíz (workspace)
pnpm frontend:dev
```

La app abre en `http://localhost:5173` y el API en `http://127.0.0.1:8000` (en producción, `VITE_API_BASE`).

Las vistas nuevas siguen el sistema de diseño descrito en `CLAUDE.md` (banda marina, acento dorado, azul de acción `#1B5CFF`, Geist y animaciones `cot-*`).

### App móvil (Expo)

```bash
pnpm mobile:install
pnpm mobile:start     # o pnpm mobile:android
```

Detalles de SDK, Expo Go y builds con EAS en `mobile/README.md`.

### Scripts útiles

```bash
# Raíz del repo
pnpm frontend:dev
pnpm frontend:build
pnpm mobile:typecheck && pnpm mobile:lint && pnpm mobile:test

# Frontend
cd frontend && pnpm lint && pnpm test && pnpm build

# Backend
cd backend && ruff check apps && python manage.py test \
  apps.users apps.productos apps.cotizaciones apps.ordenes apps.operacion \
  apps.common apps.clientes apps.escritorio apps.inventario
```

## Despliegue

Producción en [Render](https://render.com):

- **Backend** (`system-digitalflow.onrender.com`): usa `backend/build.sh`, que instala dependencias, Chromium de Playwright, `collectstatic` y `migrate`. `DEBUG` debe ser `false` (o no definirse); `SECRET_KEY`, `DATABASE_URL` y las integraciones se configuran en el dashboard.
- **Frontend**: sitio estático definido en `render.yaml`. Instala solo `--filter frontend...` con `SKIP_INSTALL_DEPS=true` y publica `frontend/dist`.
- **Móvil**: builds de Android con EAS (`pnpm --dir mobile build:apk`).

## CI

GitHub Actions (`.github/workflows/ci.yml`) corre en cada push a `main` y en cada PR:

- Frontend: `tsc`, ESLint y Vitest
- Backend: Ruff y pruebas de Django (permisos y CRUD)
