# Design: Módulo Inventario (escáner de código de barras)

**Fecha:** 2026-08-05  
**Estado:** Aprobado en conversación (Enfoque 1 — módulo propio + escaneo HID)  
**Alcance:** Nuevo módulo `inventario` para registrar entradas/salidas por código de barras (pistola 3nstar SC310BT u otro teclado-wedge), con cantidades por producto e historial de movimientos. Alta automática al primer escaneo; enriquecimiento best-effort desde SYSCOM/TVC.

**Relacionado:**
- Convenciones de módulos: `AGENTS.md` (permisos, lazy routes, `/api/v1/`)
- Catálogo proveedores: `backend/apps/productos/syscom_views.py`, `tvc_views.py`
- Plantilla de registro (sidebar + guard): patrón Documentos — [`2026-08-05-documentos-onedrive-design.md`](./2026-08-05-documentos-onedrive-design.md)

---

## 1. Contexto y problema

El equipo recibe mercancía (mayormente SYSCOM/TVC) y quiere apuntarla al sistema con una pistola **3nstar SC310BT**. Hoy DigitalFlow solo tiene `stock` en productos manuales; no hay inventario físico con movimientos ni clave por código de barras.

Objetivo: pantalla de inventario donde el escáner suma o resta 1 según el modo activo, creando el ítem si el código no existe, e intentando rellenar datos desde los catálogos de proveedores.

---

## 2. Decisiones cerradas

| Tema | Decisión |
|------|----------|
| Enfoque | **1 — Módulo Inventario propio** (ítems + movimientos); no reutilizar `ProductoManual.stock` |
| Identidad del ítem | Código de barras tipo EAN/SKU (mismo código = mismo producto; cantidad agregada) |
| Alta desconocida | Automática: solo código + movimiento ±1; editar ficha después |
| Enriquecimiento | Best-effort SYSCOM (`busqueda=`) y TVC (modelo/clave) en el **primer** alta |
| Escaneo existente | Modo activo en pantalla: **Entrada** (+1) o **Salida** (−1) |
| Escáner | HID / teclado-wedge (sin SDK nativo en el navegador) |
| Stock negativo | **No** permitido; salida con cantidad 0 → error |
| Fuera de MVP | Almacenes múltiples, transferencias, lotes, seriales, etiquetas, sync a cotizaciones |

**Alternativas descartadas (por ahora):**

- **2 — Extender ProductoManual.stock:** mezcla catálogo de ventas con stock físico y obliga a “manualizar” SYSCOM/TVC.
- **3 — Inventario completo (almacenes/lotes):** fuera de alcance del primer uso (recepción con pistola).

---

## 3. Producto y UI

### 3.1 Navegación

- Ruta: `/inventario`
- Lazy import en `App.tsx` + `RequireInventarioPermission` (`view`)
- Sidebar: bajo **Operación**, visible si `inventario.view === true` o admin
- Estética: design system existente de DigitalFlow (listados Operación), no landing marketing

### 3.2 Pantalla MVP

1. Toggle visible **Entrada | Salida** (modo activo)
2. Campo de escaneo (preferentemente enfocado): captura ráfaga de teclas + Enter → `POST …/scan/`
3. Feedback inmediato (`aria-live` / toast): código, nombre si hay, cantidad resultante
4. Lista de existencias: código, nombre/marca/modelo, cantidad, fuente (`syscom` / `tvc` / `desconocido`)
5. Historial de movimientos (filtros simples: por ítem / rango reciente)
6. Modal editar ficha (nombre, marca, modelo, notas) cuando el alta dejó solo el código

### 3.3 Estructura frontend

```text
frontend/src/pages/Inventario/
├── InventarioPage.tsx
├── shared/
│   ├── inventarioTypes.ts
│   └── inventarioApi.ts
└── components/   # modo Entrada/Salida, lista ítems, historial, modal editar
```

- Accesibilidad: modo anunciado, anuncios de resultado de escaneo, `aria-label` en botones de icono, targets ≥ 24px
- Debounce: ignorar el mismo código repetido en <300 ms

---

## 4. Permisos DigitalFlow

| Clave | MVP |
|-------|-----|
| `inventario.view` | Listar ítems e historial |
| `inventario.create` | Escanear (entrada/salida) y editar ficha del ítem |
| `inventario.edit` | Reservado (no usado en MVP) |
| `inventario.delete` | Reservado (no usado en MVP) |

- Backend: `InventarioPermission` (`module_key = 'inventario'`) en `apps/users/permissions.py`
- Frontend: `RequireInventarioPermission` (comprobación estricta `=== true`; admin bypass)
- Gestión de usuarios: añadir módulo `inventario` en la matriz CRUD
- Sin `create`: campo de escaneo deshabilitado y mensaje claro

---

## 5. Backend

### 5.1 App / rutas

- Nueva app `backend/apps/inventario/`
- Incluir en `INSTALLED_APPS` y en `config/urls.py` bajo `/api/` y `/api/v1/`
- Auth: cookie/CSRF + `fetchApi` como el resto del sistema

### 5.2 Modelos

**`InventarioItem`**

| Campo | Notas |
|-------|--------|
| `codigo_barras` | `CharField`, único, índice; clave de negocio |
| `nombre`, `marca`, `modelo` | Opcionales; editables |
| `notas` | Texto opcional |
| `fuente` | `desconocido` \| `syscom` \| `tvc` |
| `ref_externa` | Id/SKU proveedor si hubo match |
| `cantidad` | Entero ≥ 0 |
| `fecha_creacion`, `fecha_actualizacion` | Auto |

**`InventarioMovimiento`**

| Campo | Notas |
|-------|--------|
| `item` | FK → `InventarioItem` |
| `tipo` | `entrada` \| `salida` |
| `cantidad` | MVP: siempre `1` |
| `usuario` | FK usuario que escaneó |
| `nota` | Opcional |
| `creado_en` | Auto |

Actualización de `InventarioItem.cantidad` en la **misma transacción** que crea el movimiento.

### 5.3 Endpoints

Preferir `/api/v1/inventario/…`; espejo en `/api/inventario/…`.

| Método | Ruta | Permiso | Uso |
|--------|------|---------|-----|
| `POST` | `/scan/` | `create` | `{ codigo_barras, modo: "entrada"\|"salida" }` |
| `GET` | `/items/` | `view` | Listado / búsqueda |
| `GET` | `/items/{id}/` | `view` | Detalle |
| `PATCH` | `/items/{id}/` | `create` | Editar ficha (no cantidad directa) |
| `GET` | `/movimientos/` | `view` | Historial (`?item=`, `?desde=`) |

**Comportamiento de `POST /scan/`:**

1. Normalizar `codigo_barras` (trim; rechazar vacío)
2. Si no existe ítem y `modo=salida` → 400 (“Producto no registrado; no hay existencia”)
3. Si no existe ítem y `modo=entrada` → crear ítem (`cantidad=0`), intentar enriquecimiento SYSCOM/TVC, luego movimiento entrada → `cantidad=1`
4. Si existe e `entrada` → movimiento +1
5. Si existe y `salida` y `cantidad=0` → 400 (“Sin existencia”)
6. Si existe y `salida` → movimiento −1
7. Respuesta: ítem actualizado + movimiento creado + flag `creado` / `enriquecido`

### 5.4 Enriquecimiento SYSCOM/TVC

Solo en el **primer** alta del código:

1. Consultar SYSCOM con `busqueda=` = código (reutilizar cliente interno existente)
2. Consultar TVC por modelo/clave cuando aplique
3. Si hay un match claro → rellenar `nombre`/`marca`/`modelo`, `fuente`, `ref_externa`
4. Si no hay match o las APIs fallan → ítem solo con código; el movimiento **no se bloquea**

Criterio de “match claro” (MVP): un único resultado relevante, o coincidencia exacta de modelo/SKU con el código escaneado. Si hay ambigüedad → no enriquecer.

---

## 6. Escáner (SC310BT)

- Configurar la pistola en modo teclado (HID) con sufijo Enter (default típico)
- No hace falta driver ni WebUSB en el MVP
- La página debe mantener foco usable en el campo de captura (o listener global en esa ruta) para no “tipear” en otros inputs por error

---

## 7. Errores (copy ES-MX)

| Caso | Mensaje orientativo |
|------|---------------------|
| Salida sin stock | “Sin existencia para este código.” |
| Salida de código inexistente | “Producto no registrado; no hay existencia.” |
| Código vacío | Ignorar o “Código inválido.” |
| Fallo proveedor | Movimiento OK; sin toast de error bloqueante por enriquecimiento |
| Sin permiso create | “No tienes permiso para registrar movimientos.” |

---

## 8. Pruebas

**Backend**

- Primer scan entrada: crea ítem + cantidad 1 + movimiento
- Segundo scan entrada: cantidad 2
- Salida: cantidad −1
- Salida con 0: 400, cantidad intacta
- Unicidad de `codigo_barras`
- Permisos: sin `view`/`create` → 403

**Frontend**

- Toggle Entrada/Salida cambia el `modo` enviado
- Enter en campo de escaneo dispara `scan`
- Debounce <300 ms del mismo código
- Lista e historial refrescan tras scan OK

**Manual**

- Smoke con SC310BT en Chrome sobre `/inventario`

---

## 9. Criterio de éxito

En `/inventario`, modo Entrada: cada escaneo deja movimiento y sube cantidad; modo Salida resta sin ir bajo cero; si SYSCOM/TVC reconocen el código, la ficha se rellena en el alta; si no, el ítem queda editable solo con el código.

---

## 10. Actualizaciones de documentación de repo

Al implementar, actualizar `AGENTS.md`:

- Módulo `inventario` y permisos
- Endpoints listados arriba
- Nota de ruta frontend `pages/Inventario/`
