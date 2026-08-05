# Inventario (código de barras) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Módulo `/inventario` con escaneo HID (SC310BT): entradas/salidas ±1 por código de barras, historial de movimientos, alta automática y enriquecimiento best-effort SYSCOM/TVC.

**Architecture:** App Django `apps.inventario` con `InventarioItem` + `InventarioMovimiento`; endpoint atómico `POST /scan/`; frontend en `frontend/src/pages/Inventario/` con modo Entrada/Salida y campo de captura teclado-wedge. Permisos JSON `inventario.view` / `inventario.create`.

**Tech Stack:** Django 5 + DRF, React 19 + TypeScript + Vite, `fetchApi`, Vitest (smoke FE si aplica), `python manage.py test`.

**Spec:** `docs/superpowers/specs/2026-08-05-inventario-barcode-design.md`

## Global Constraints

- Español de México en copy UI y mensajes de error
- Rutas API bajo `/api/` y `/api/v1/` (mismo `include`)
- Auth cookie/CSRF + `fetchApi` — no `localStorage` tokens
- Guards FE: `inventario.view === true` (estricto); admin bypass
- Sin stock negativo; MVP sin almacenes/seriales/sync a cotizaciones
- Frontend en `frontend/src/pages/Inventario/` (no bajo `Operacion/`)
- Cambios mínimos; actualizar `AGENTS.md` en el mismo ticket
- Context7 MCP antes de APIs Django/DRF/React si se consulta docs de librería

## File map

| Path | Responsibility |
|------|----------------|
| `backend/apps/inventario/models.py` | `InventarioItem`, `InventarioMovimiento` |
| `backend/apps/inventario/enrichment.py` | Lookup SYSCOM/TVC best-effort → campos de ficha |
| `backend/apps/inventario/serializers.py` | Serializers item/movimiento/scan |
| `backend/apps/inventario/views.py` | scan, items CRUD-lite, movimientos list |
| `backend/apps/inventario/urls.py` | Rutas `/inventario/...` |
| `backend/apps/inventario/tests/test_inventario.py` | API + reglas de stock |
| `backend/apps/users/permissions.py` | `InventarioPermission` (PATCH con `create` sin ownership) |
| `backend/config/settings.py` | `INSTALLED_APPS` |
| `backend/config/urls.py` | include app |
| `frontend/src/pages/Inventario/**` | Página + api + types + components |
| `frontend/src/components/auth/RequireInventarioPermission.tsx` | Guard |
| `frontend/src/App.tsx` | Lazy route |
| `frontend/src/layout/AppSidebar.tsx` | Link Operación |
| `frontend/src/pages/ContactosNegocio/Usuarios/GestionUsuario.tsx` | Matriz módulo |
| `AGENTS.md` | Documentar módulo + endpoints |

---

### Task 1: Modelos + InventarioPermission + wiring Django

**Files:**
- Create: `backend/apps/inventario/__init__.py`
- Create: `backend/apps/inventario/apps.py`
- Create: `backend/apps/inventario/models.py`
- Create: `backend/apps/inventario/admin.py` (vacío o registro mínimo)
- Create: `backend/apps/inventario/migrations/0001_initial.py` (vía `makemigrations`)
- Modify: `backend/apps/users/permissions.py` — añadir `InventarioPermission`
- Modify: `backend/config/settings.py` — `'apps.inventario'`
- Modify: `backend/config/urls.py` — `include('apps.inventario.urls')` (urls vacías OK hasta Task 2)

**Interfaces:**
- Produces: models `InventarioItem`, `InventarioMovimiento`; class `InventarioPermission(module_key='inventario')` con `has_object_permission` que permite PATCH si `create` o `edit` (sin exigir `creado_por`)

- [ ] **Step 1: Crear app scaffold y models**

`apps.py`:

```python
from django.apps import AppConfig

class InventarioConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.inventario'
    verbose_name = 'Inventario'
```

`models.py` (campos exactos):

```python
from django.conf import settings
from django.db import models

class InventarioItem(models.Model):
    class Fuente(models.TextChoices):
        DESCONOCIDO = 'desconocido', 'Desconocido'
        SYSCOM = 'syscom', 'SYSCOM'
        TVC = 'tvc', 'TVC'

    codigo_barras = models.CharField(max_length=64, unique=True, db_index=True)
    nombre = models.CharField(max_length=255, blank=True, default='')
    marca = models.CharField(max_length=120, blank=True, default='')
    modelo = models.CharField(max_length=120, blank=True, default='')
    notas = models.TextField(blank=True, default='')
    fuente = models.CharField(
        max_length=20, choices=Fuente.choices, default=Fuente.DESCONOCIDO
    )
    ref_externa = models.CharField(max_length=120, blank=True, default='')
    cantidad = models.PositiveIntegerField(default=0)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-fecha_actualizacion']
        verbose_name = 'Ítem de inventario'
        verbose_name_plural = 'Ítems de inventario'

    def __str__(self):
        return f'{self.codigo_barras} ({self.cantidad})'


class InventarioMovimiento(models.Model):
    class Tipo(models.TextChoices):
        ENTRADA = 'entrada', 'Entrada'
        SALIDA = 'salida', 'Salida'

    item = models.ForeignKey(
        InventarioItem, on_delete=models.CASCADE, related_name='movimientos'
    )
    tipo = models.CharField(max_length=10, choices=Tipo.choices)
    cantidad = models.PositiveIntegerField(default=1)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='inventario_movimientos',
    )
    nota = models.CharField(max_length=255, blank=True, default='')
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creado_en']
        verbose_name = 'Movimiento de inventario'
        verbose_name_plural = 'Movimientos de inventario'
```

- [ ] **Step 2: Añadir InventarioPermission**

Al final de `permissions.py` (junto a `DocumentosPermission`):

```python
class InventarioPermission(ModulePermission):
    """Permisos JSON para Inventario (Operación / escáner)."""

    module_key = 'inventario'

    def has_object_permission(self, request, view, obj):
        user = getattr(request, 'user', None)
        if not user or not getattr(user, 'is_authenticated', False):
            return False
        if getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False):
            return True
        method = (request.method or '').upper()
        if method not in ('PUT', 'PATCH', 'DELETE'):
            return True
        perms_obj = getattr(user, 'permissions_profile', None)
        permissions = getattr(perms_obj, 'permissions', None) or {}
        module_perms = _module_perms_for_key(permissions, self.module_key)
        if method == 'DELETE':
            return self._as_bool(module_perms.get('delete'), False)
        # Ficha compartida: create o edit permiten PATCH de cualquier ítem
        return (
            self._as_bool(module_perms.get('edit'), False)
            or self._as_bool(module_perms.get('create'), False)
        )
```

- [ ] **Step 3: Registrar app + urls placeholder**

- `settings.py` `INSTALLED_APPS`: añadir `'apps.inventario'`
- Crear `urls.py` con `urlpatterns = []` temporal
- `config/urls.py` `api_urlpatterns`: `path('', include('apps.inventario.urls')),`

- [ ] **Step 4: Migraciones**

Run:

```bash
cd backend
.venv\Scripts\python.exe manage.py makemigrations inventario
.venv\Scripts\python.exe manage.py migrate inventario
```

Expected: migración `0001_initial` aplicada sin error.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/inventario backend/apps/users/permissions.py backend/config/settings.py backend/config/urls.py
git commit -m "Add inventario models and InventarioPermission scaffold."
```

---

### Task 2: `POST /scan/` (TDD) — núcleo de negocio

**Files:**
- Create: `backend/apps/inventario/serializers.py`
- Create: `backend/apps/inventario/views.py`
- Create: `backend/apps/inventario/enrichment.py` (stub que retorna `None`)
- Modify: `backend/apps/inventario/urls.py`
- Create: `backend/apps/inventario/tests/__init__.py`
- Create: `backend/apps/inventario/tests/test_inventario.py`

**Interfaces:**
- Consumes: `InventarioItem`, `InventarioMovimiento`, `InventarioPermission`
- Produces: `POST /api/inventario/scan/` body `{ codigo_barras: str, modo: "entrada"|"salida" }` → JSON `{ item, movimiento, creado: bool, enriquecido: bool }`
- `enrich_from_catalogs(codigo: str) -> dict | None` con keys opcionales `nombre`, `marca`, `modelo`, `fuente`, `ref_externa`

- [ ] **Step 1: Escribir tests que fallen**

`test_inventario.py`:

```python
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch

from apps.inventario.models import InventarioItem
from apps.users.models import UserPermissions

User = get_user_model()


class InventarioScanTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='inv_user', password='test-pass-123')
        UserPermissions.objects.create(
            user=self.user,
            permissions={'inventario': {'view': True, 'create': True, 'edit': False, 'delete': False}},
        )
        self.client.force_authenticate(user=self.user)

    def test_scan_denied_without_create(self):
        denied = User.objects.create_user(username='sin_inv', password='test-pass-123')
        UserPermissions.objects.create(
            user=denied, permissions={'inventario': {'view': True, 'create': False}}
        )
        self.client.force_authenticate(user=denied)
        res = self.client.post(
            '/api/inventario/scan/',
            {'codigo_barras': '7501234567890', 'modo': 'entrada'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    @patch('apps.inventario.views.enrich_from_catalogs', return_value=None)
    def test_primera_entrada_crea_item(self, _enrich):
        res = self.client.post(
            '/api/inventario/scan/',
            {'codigo_barras': '7501234567890', 'modo': 'entrada'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['creado'])
        self.assertEqual(res.data['item']['cantidad'], 1)
        self.assertEqual(InventarioItem.objects.get(codigo_barras='7501234567890').cantidad, 1)

    @patch('apps.inventario.views.enrich_from_catalogs', return_value=None)
    def test_segunda_entrada_suma(self, _enrich):
        InventarioItem.objects.create(codigo_barras='ABC', cantidad=1)
        res = self.client.post(
            '/api/inventario/scan/',
            {'codigo_barras': 'ABC', 'modo': 'entrada'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.data['creado'])
        self.assertEqual(res.data['item']['cantidad'], 2)

    @patch('apps.inventario.views.enrich_from_catalogs', return_value=None)
    def test_salida_resta(self, _enrich):
        InventarioItem.objects.create(codigo_barras='ABC', cantidad=2)
        res = self.client.post(
            '/api/inventario/scan/',
            {'codigo_barras': 'ABC', 'modo': 'salida'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['item']['cantidad'], 1)

    def test_salida_sin_existencia(self):
        InventarioItem.objects.create(codigo_barras='ABC', cantidad=0)
        res = self.client.post(
            '/api/inventario/scan/',
            {'codigo_barras': 'ABC', 'modo': 'salida'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('existencia', str(res.data.get('detail', '')).lower())

    def test_salida_codigo_inexistente(self):
        res = self.client.post(
            '/api/inventario/scan/',
            {'codigo_barras': 'NOEXISTE', 'modo': 'salida'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    @patch(
        'apps.inventario.views.enrich_from_catalogs',
        return_value={
            'nombre': 'Cámara X',
            'marca': 'Hikvision',
            'modelo': 'DS-2',
            'fuente': 'syscom',
            'ref_externa': '123',
        },
    )
    def test_enriquecimiento_en_alta(self, _enrich):
        res = self.client.post(
            '/api/inventario/scan/',
            {'codigo_barras': 'SKU-1', 'modo': 'entrada'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['enriquecido'])
        self.assertEqual(res.data['item']['nombre'], 'Cámara X')
        self.assertEqual(res.data['item']['fuente'], 'syscom')
```

- [ ] **Step 2: Correr tests — deben fallar**

```bash
cd backend
.venv\Scripts\python.exe manage.py test apps.inventario.tests.test_inventario -v 2
```

Expected: FAIL (404 o ImportError / URL no existe).

- [ ] **Step 3: Implementar stub enrichment + serializers + scan view + urls**

`enrichment.py` (stub):

```python
def enrich_from_catalogs(codigo: str) -> dict | None:
    """Best-effort SYSCOM/TVC. Stub hasta Task 3."""
    return None
```

`serializers.py` — `InventarioItemSerializer` (todos los campos de lectura del ítem), `ScanSerializer` con `codigo_barras` required + `modo` ChoiceField.

`views.py` — `ScanView(APIView)`:

```python
# Pseudológica obligatoria (implementar completa):
# - permission_classes = [IsAuthenticated, InventarioPermission]
# - validate ScanSerializer
# - codigo = trim; if empty → 400 "Código inválido."
# - transaction.atomic + select_for_update del ítem si existe
# - salida + no item → 400 "Producto no registrado; no hay existencia."
# - salida + cantidad 0 → 400 "Sin existencia para este código."
# - entrada + no item → create cantidad=0, enrich_from_catalogs, apply fields, creado=True
# - create InventarioMovimiento(tipo=modo, cantidad=1, usuario=request.user)
# - item.cantidad += 1 o -= 1; save
# - return { item, movimiento, creado, enriquecido }
```

`urls.py`:

```python
from django.urls import path
from . import views

urlpatterns = [
    path('inventario/scan/', views.ScanView.as_view(), name='inventario-scan'),
]
```

- [ ] **Step 4: Correr tests — deben pasar**

```bash
cd backend
.venv\Scripts\python.exe manage.py test apps.inventario.tests.test_inventario -v 2
```

Expected: PASS (todos los de Task 2).

- [ ] **Step 5: Commit**

```bash
git add backend/apps/inventario
git commit -m "Add inventario scan endpoint with stock rules and tests."
```

---

### Task 3: List/detail/patch ítems + list movimientos + enrichment real

**Files:**
- Modify: `backend/apps/inventario/enrichment.py`
- Modify: `backend/apps/inventario/views.py`
- Modify: `backend/apps/inventario/serializers.py`
- Modify: `backend/apps/inventario/urls.py`
- Modify: `backend/apps/inventario/tests/test_inventario.py`

**Interfaces:**
- Produces:
  - `GET /api/inventario/items/?search=`
  - `GET|PATCH /api/inventario/items/{id}/`
  - `GET /api/inventario/movimientos/?item=&desde=`
- `enrich_from_catalogs`: intenta SYSCOM luego TVC; nunca lanza hacia el caller (catch + log + `None`)

- [ ] **Step 1: Tests adicionales**

Añadir a `test_inventario.py`:

```python
class InventarioItemsTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='inv2', password='test-pass-123')
        UserPermissions.objects.create(
            user=self.user,
            permissions={'inventario': {'view': True, 'create': True}},
        )
        self.client.force_authenticate(user=self.user)
        self.item = InventarioItem.objects.create(
            codigo_barras='X1', nombre='', cantidad=3
        )

    def test_list_items(self):
        res = self.client.get('/api/inventario/items/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # aceptar lista o paginada {results: [...]}
        data = res.data['results'] if isinstance(res.data, dict) and 'results' in res.data else res.data
        self.assertTrue(any(i['codigo_barras'] == 'X1' for i in data))

    def test_patch_ficha(self):
        res = self.client.patch(
            f'/api/inventario/items/{self.item.id}/',
            {'nombre': 'Sensor', 'marca': 'Ajax'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.item.refresh_from_db()
        self.assertEqual(self.item.nombre, 'Sensor')

    def test_list_movimientos(self):
        self.client.post(
            '/api/inventario/scan/',
            {'codigo_barras': 'X1', 'modo': 'entrada'},
            format='json',
        )
        res = self.client.get(f'/api/inventario/movimientos/?item={self.item.id}')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
```

- [ ] **Step 2: Implementar views + enrichment**

Enrichment (orientación):

```python
# enrichment.py
# 1. Importar helpers existentes de productos (token SYSCOM / búsqueda) SIN pasar por HTTP interno
# 2. SYSCOM: misma base URL + token que syscom_views; GET productos?busqueda=<codigo>
# 3. Si hay exactamente 1 producto, o match exacto de modelo/sku == codigo → mapear campos
# 4. Else TVC: reutilizar búsqueda por modelo si es práctico; mismo criterio de match único
# 5. Cualquier RequestException → logger.exception; return None
# 6. No bloquear: views siempre atrapan excepciones de enrich
```

Si reutilizar imports privados de `syscom_views` es frágil, extraer `_get_syscom_token` / get helper a un módulo compartido **solo si es mínimo**; preferir duplicar 10–20 líneas de request con try/except en `enrichment.py` antes que un refactor grande.

PATCH: fields permitidos `nombre`, `marca`, `modelo`, `notas` (no `cantidad`, no `codigo_barras`).

- [ ] **Step 3: Tests verdes**

```bash
cd backend
.venv\Scripts\python.exe manage.py test apps.inventario -v 2
```

- [ ] **Step 4: Commit**

```bash
git add backend/apps/inventario
git commit -m "Add inventario items/movimientos APIs and catalog enrichment."
```

---

### Task 4: Frontend API + guard + route + sidebar + Gestión usuarios

**Files:**
- Create: `frontend/src/pages/Inventario/shared/inventarioTypes.ts`
- Create: `frontend/src/pages/Inventario/shared/inventarioApi.ts`
- Create: `frontend/src/components/auth/RequireInventarioPermission.tsx`
- Create: `frontend/src/pages/Inventario/InventarioPage.tsx` (placeholder mínimo export default)
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/layout/AppSidebar.tsx`
- Modify: `frontend/src/pages/ContactosNegocio/Usuarios/GestionUsuario.tsx`

**Interfaces:**
- Types: `InventarioItem`, `InventarioMovimiento`, `ScanModo`, `ScanResponse`
- API: `scanInventario(codigo, modo)`, `listInventarioItems()`, `patchInventarioItem(id, body)`, `listInventarioMovimientos(params)`

- [ ] **Step 1: Types + API**

```typescript
// inventarioTypes.ts
export type InventarioFuente = "desconocido" | "syscom" | "tvc";
export type ScanModo = "entrada" | "salida";

export type InventarioItem = {
  id: number;
  codigo_barras: string;
  nombre: string;
  marca: string;
  modelo: string;
  notas: string;
  fuente: InventarioFuente;
  ref_externa: string;
  cantidad: number;
  fecha_creacion: string;
  fecha_actualizacion: string;
};

export type InventarioMovimiento = {
  id: number;
  item: number;
  tipo: ScanModo;
  cantidad: number;
  usuario: number | null;
  nota: string;
  creado_en: string;
};

export type ScanResponse = {
  item: InventarioItem;
  movimiento: InventarioMovimiento;
  creado: boolean;
  enriquecido: boolean;
};
```

`inventarioApi.ts`: usar `fetchApi` con `/api/inventario/...` (mismo patrón que `documentosApi.ts`).

- [ ] **Step 2: Guard + placeholder page + App route**

Copiar estructura de `RequireDocumentosPermission.tsx` cambiando `documentos` → `inventario`.

`InventarioPage.tsx` temporal:

```tsx
export default function InventarioPage() {
  return <div className="p-6">Inventario</div>;
}
```

`App.tsx`:

```tsx
import RequireInventarioPermission from "@/components/auth/RequireInventarioPermission";
const InventarioPage = lazy(() => import("@/pages/Inventario/InventarioPage"));
// Route:
<Route path="/inventario" element={<RequireInventarioPermission required="view"><InventarioPage /></RequireInventarioPermission>} />
```

- [ ] **Step 3: Sidebar + GestionUsuario**

- `AppSidebar.tsx`: junto a Documentos, si `inventario.view === true || isAdmin` → `{ name: "Inventario", path: "/inventario" }`
- `GestionUsuario.tsx`: añadir `inventario?: Partial<CrudPerms>` en tipos, defaults admin/on/off, `mergeCrud`, y entrada `{ key: 'inventario', label: 'Inventario' }` en las listas de módulos (mismo patrón que `documentos`)

- [ ] **Step 4: Verificar TypeScript del wiring**

```bash
cd frontend
pnpm exec tsc -b --noEmit
```

Expected: 0 errores en archivos tocados.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Inventario frontend/src/components/auth/RequireInventarioPermission.tsx frontend/src/App.tsx frontend/src/layout/AppSidebar.tsx frontend/src/pages/ContactosNegocio/Usuarios/GestionUsuario.tsx
git commit -m "Wire inventario route, guard, sidebar, and user permissions."
```

---

### Task 5: UI InventarioPage (escaneo + lista + historial + editar)

**Files:**
- Modify: `frontend/src/pages/Inventario/InventarioPage.tsx`
- Create: `frontend/src/pages/Inventario/components/InventarioScanBar.tsx`
- Create: `frontend/src/pages/Inventario/components/InventarioItemsTable.tsx`
- Create: `frontend/src/pages/Inventario/components/InventarioMovimientosList.tsx`
- Create: `frontend/src/pages/Inventario/components/InventarioEditModal.tsx`
- Optional test: `frontend/src/pages/Inventario/shared/inventarioScan.test.ts` (debounce helper)

**Interfaces:**
- `InventarioScanBar`: props `{ modo, onModoChange, onScan, disabled, statusMessage }`
- Al Enter / submit: `onScan(codigo.trim())`; limpia input; debounce mismo código <300ms en el padre o helper `shouldAcceptScan(code, now, last)`

- [ ] **Step 1: Helper debounce (TDD opcional pero recomendado)**

```typescript
// shared/scanDebounce.ts
export function shouldAcceptScan(
  code: string,
  nowMs: number,
  last: { code: string; at: number } | null,
  windowMs = 300,
): boolean {
  if (!code) return false;
  if (!last) return true;
  if (last.code === code && nowMs - last.at < windowMs) return false;
  return true;
}
```

Test Vitest: mismo código a 100ms → false; a 400ms → true.

- [ ] **Step 2: Implementar componentes**

Requisitos UI (spec §3.2):

1. Toggle Entrada | Salida (`aria-pressed` / radiogroup)
2. Input de escaneo autofocus; `disabled` si `!canCreate`
3. Tras scan OK: toast/`aria-live` con código, nombre, cantidad; refresh lista + historial reciente
4. Tabla de ítems; botón editar abre modal (nombre, marca, modelo, notas)
5. Panel historial (últimos N o filtro por ítem)
6. Errores API en español (usar `detail` del backend)
7. Estilos alineados a listados Operación existentes (cards/tablas del design system del ERP, no Anthropic marketing)

- [ ] **Step 3: Checks FE**

```bash
cd frontend
pnpm exec tsc -b --noEmit
pnpm exec eslint src/App.tsx src/components/auth/RequireInventarioPermission.tsx src/pages/Inventario
pnpm test -- inventarioScan
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Inventario
git commit -m "Build inventario scan UI with items list and movement history."
```

---

### Task 6: AGENTS.md + verificación final

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Documentar en AGENTS.md**

Añadir en permisos y en sección PDF/APIs:

- Módulo `inventario`: sidebar `/inventario`, `inventario.view` / `inventario.create`
- Endpoints: `POST /api/inventario/scan/`, `GET/PATCH /api/inventario/items/`, `GET /api/inventario/movimientos/`
- FE: `frontend/src/pages/Inventario/`

- [ ] **Step 2: Suite backend + FE**

```bash
cd backend
.venv\Scripts\python.exe manage.py test apps.inventario apps.users -v 1

cd ../frontend
pnpm exec tsc -b --noEmit
pnpm test
```

Expected: tests inventario en verde; tsc limpio.

- [ ] **Step 3: Smoke manual (checklist)**

- [ ] Login con `inventario.view` + `create`
- [ ] `/inventario` visible en sidebar
- [ ] Simular pistola: escribir código + Enter en modo Entrada → cantidad 1
- [ ] Segundo Enter → cantidad 2
- [ ] Modo Salida → cantidad 1
- [ ] Salida a 0 → mensaje “Sin existencia…”
- [ ] Editar ficha de ítem sin nombre

- [ ] **Step 4: Commit docs**

```bash
git add AGENTS.md
git commit -m "Document inventario module permissions and API in AGENTS.md."
```

---

## Spec coverage (self-review)

| Spec | Task |
|------|------|
| Módulo propio + modelos | 1 |
| Scan ±1, alta auto, no negativo | 2 |
| Enrich SYSCOM/TVC best-effort | 3 |
| Items/movimientos/PATCH ficha | 3 |
| Permisos + sidebar + ruta `pages/Inventario/` | 4–5 |
| UI modo + HID + historial + editar | 5 |
| AGENTS.md | 6 |
| Fuera de MVP (almacenes/seriales) | No implementado (correcto) |

## Placeholder scan

Sin TBD. Enrichment real en Task 3 con estrategia concreta (try SYSCOM → TVC → None).
