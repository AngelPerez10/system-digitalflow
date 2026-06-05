# system-digitalflow

ERP interno de Grupo Intrax: cotizaciones, órdenes de trabajo, clientes, productos, tareas y operación Wialon.

## Requisitos

- Node.js 20+ y [pnpm](https://pnpm.io/)
- Python 3.12+
- SQLite (desarrollo local) o PostgreSQL (producción vía `DATABASE_URL`)

## Desarrollo local

### Backend (Django)

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env   # ajusta DEBUG=true y SECRET_KEY si hace falta
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

Variables clave en `backend/.env`:

| Variable | Uso |
|----------|-----|
| `DEBUG` | `true` en local; **omitir o `false` en producción** |
| `SECRET_KEY` | Obligatoria cuando `DEBUG=false` |
| `DATABASE_URL` | Postgres en Render; vacío usa SQLite local |

### Frontend (Vite + React)

En otra terminal:

```bash
cd frontend
pnpm install
pnpm dev
```

La app suele abrir en `http://localhost:5173` y el API en `http://127.0.0.1:8000`.

### Scripts útiles

```bash
# Raíz del repo
pnpm frontend:dev
pnpm frontend:build

# Frontend
cd frontend && pnpm lint && pnpm test && pnpm build

# Backend
cd backend && ruff check . && python manage.py test
```

## Despliegue

Producción en [Render](https://render.com): `DEBUG` debe ser `false` (o no definirse), `SECRET_KEY` y `DATABASE_URL` configurados en el dashboard. Ver `backend/.env.example` para SYSCOM, Cloudinary, Wialon y PDF.

## CI

GitHub Actions (`.github/workflows/ci.yml`) ejecuta en cada PR:

- Frontend: `tsc`, ESLint, Vitest
- Backend: Ruff y tests smoke de permisos/CRUD
