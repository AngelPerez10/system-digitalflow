# Design: Equipos de inventario en Órdenes de trabajo

**Fecha:** 2026-08-13  
**Estado:** Aprobado en conversación (enfoque A — snapshot JSON + movimientos ligados)  
**Alcance:** Nueva pestaña **Equipos** en el modal de orden de servicio (`OrdenFormModal`), con productos tomados del módulo Inventario (buscar + escanear), seguimiento de entrega/instalación al estilo `ProyectoEquiposSection`, y movimientos de stock atómicos al marcar/desmarcar **Entregado**.

**Relacionado:**
- UI de referencia: `frontend/src/pages/Operacion/Proyectos/form/fields/ProyectoEquiposSection.tsx`
- Inventario: `frontend/src/pages/Inventario/`, `backend/apps/inventario/`
- Órdenes Ola 2: [`2026-07-30-ordenes-frontend-architecture-design.md`](./2026-07-30-ordenes-frontend-architecture-design.md)

---

## 1. Problema

En Proyectos, los equipos nacen de cotizaciones y el estado entrega/instalación vive en un JSON sin tocar inventario. En Órdenes de servicio el técnico/admin necesita registrar **qué piezas del almacén** salieron a campo, con cantidad y estado, sin inventar un flujo paralelo frágil (notas en movimientos sin FK).

Hoy `Orden` no tiene campo de equipos ni vínculo a `InventarioItem` / `InventarioMovimiento`.

---

## 2. Decisiones cerradas

| Tema | Decisión |
|------|----------|
| Enfoque | **A** — `Orden.equipos_inventario` (JSON snapshot) + `InventarioMovimiento` ligado a orden/línea |
| Agregar ítems | Buscar en inventario **y** escanear código de barras (HID) |
| Stock | Agregar **no** mueve stock. **Entregado** → salida de `cantidad` N. Desmarcar / quitar línea entregada → entrada N y desligar |
| Cantidad | Editable (N ≥ 1), acotada al stock disponible al entregar |
| Roles | **Admin** (`isAdmin`): buscar, escanear, cantidad, Entregado, quitar, instalación. **Técnico asignado** (o creador, mismo criterio que `ordenEditScope`): solo instalación. **Edición limitada / resto**: sin mutaciones de equipos |
| Entregado | Solo admin (el técnico **no** marca entrega) |
| Alta nueva | Primer `POST`/`PUT` puede traer líneas ya con `equipoEntregado: true`; el backend descuenta en la **misma transacción** tras crear/actualizar la orden |
| `movimientoSalidaId` | Lo escribe **solo el servidor**; el cliente no puede inventar ni forzar ids de movimiento |
| Permisos inventario en FE | Listar/buscar requiere poder leer ítems (`inventario.view` o admin). El movimiento de stock lo ejecuta el backend vía API de **órdenes** (admin), no se reutiliza `POST /api/inventario/scan/` para la salida de entrega |
| Levantamiento | Fuera de alcance v1 (no el modal monolito de Levantamiento) |
| PDF / listado stats de equipos | Fuera de alcance v1 |
| Cambiar modelo Syscom desde la orden | Fuera de alcance v1 |

---

## 3. UX / Frontend

### 3.1 Pestañas del modal

Orden de tabs en `OrdenFormModal`:

1. Datos del cliente  
2. Datos de la orden  
3. **Equipos** (nuevo)

Flujo de footer:

- En Cliente / Orden: **Siguiente** (como hoy hacia la siguiente pestaña).  
- En Equipos: **Guardar / Actualizar** (acción primaria de submit).  
- Técnico sin `ordenes.edit`/`create` (según variante actual): sin botón guardar; puede marcar instalación solo si tiene permiso de edición y es asignado/creador.

### 3.2 Contenido de la pestaña Equipos

Familia visual Intrax / ERP alineada a `ProyectoEquiposSection` (cards, chips de resumen, accent por estado, radiogroup de instalación). **No** copiar tipografía/colores de marketing Claude; reutilizar tokens/clases ERP ya usadas en Órdenes/Proyectos (`ordenTrabajoStyles` / patrones de `proyectoPageStyles` donde encaje sin acoplar módulos).

**Toolbar (solo admin):**

- Buscador de inventario (mín. 3 caracteres o paginado corto vía `GET /api/inventario/items/?search=`).  
- Campo de escaneo HID: al confirmar código, resuelve ítem existente (si no existe → error claro “No hay ítem en inventario con ese código”; **no** alta automática desde la orden).  
- Al agregar: si el `inventarioItemId` ya está en la lista, **incrementar cantidad en 1** (o enfocar la línea) en lugar de duplicar renglones — decisión explícita: **una línea por ítem de inventario**; escanear de nuevo suma 1 a `cantidad` (sin pasar del stock actual mostrado).

**Por línea:**

- Thumb + nombre / marca / modelo / código de barras.  
- Badge de stock disponible (lectura al abrir/refrescar; no confiar solo en `stockAtAdd`).  
- Input cantidad N (admin; disabled si `equipoEntregado`).  
- Checkbox/toggle **Entrega** (admin): Entregado / Pendiente.  
- Radiogroup **Instalación**: Instalado | No instalado (admin + técnico asignado).  
- Quitar línea (admin): si estaba entregada, el save/revert del backend revierte stock.

**Resumen:** chips `total / entregados / instalados` con `role="status"`.

### 3.3 Accesibilidad (WCAG 2.2 AA)

- `role="tablist"` / `tab` / `tabpanel` extendido al tercer tab (teclado flechas Home/End como los dos actuales).  
- Labels explícitos en cantidad y Entrega; `aria-label` en icon buttons.  
- Radiogroup de instalación con `aria-checked` (mismo patrón Proyectos).  
- Errores de stock/validación: `role="alert"` / `aria-live="polite"`; `aria-invalid` en cantidad.  
- Targets ≥ 24×24 CSS px; focus visible.  
- Respetar `prefers-reduced-motion` en barras de progreso si se animan.

### 3.4 Archivos FE (propuestos)

```text
OrdenServicio/
  form/
    OrdenFormModal.tsx          # + tab Equipos
    useOrdenFormModalState.ts   # + tab "equipos"
    tabs/OrdenEquiposTab.tsx    # NEW
    fields/OrdenEquiposSection.tsx  # NEW — UI tipo ProyectoEquiposSection
    fields/OrdenInventarioPicker.tsx # NEW — buscar / escanear
  shared/
    ordenesPageTypes.ts         # + OrdenEquipoInventarioLinea
  form/useOrdenFormDraft.ts     # estado equipos + merge en payload
```

Páginas admin y técnico inyectan el panel como `children` del modal (mismo patrón de tabs actuales).

---

## 4. Backend

### 4.1 Modelo `Orden`

Nuevo campo:

```python
equipos_inventario = models.JSONField(default=list, blank=True)
```

Forma de cada elemento (camelCase en API JSON, igual que proyectos/equipos):

| Campo | Tipo | Notas |
|-------|------|--------|
| `lineaId` | string UUID | Estable; generado en FE o BE al agregar |
| `inventarioItemId` | number | FK lógica a `InventarioItem.id` |
| `codigoBarras`, `nombre`, `marca`, `modelo`, `imagenUrl` | string | Snapshot informativo |
| `cantidad` | int ≥ 1 | Piezas de la línea |
| `equipoEntregado` | bool | |
| `estadoInstalacion` | `"no_instalado"` \| `"instalado"` | Sin estado `pendiente`/`entregado` mezclado: la entrega es el bool |
| `movimientoSalidaId` | number \| null | Solo servidor |

### 4.2 Modelo `InventarioMovimiento`

Campos nuevos opcionales:

- `orden` → FK `ordenes.Orden`, `null=True`, `on_delete=SET_NULL`, `related_name='movimientos_inventario'`  
- `orden_linea_id` → `CharField(max_length=64, blank=True, default='', db_index=True)`

Nota legible sugerida: `Orden ORD-{idx} · línea {lineaId}` (o folio equivalente).

### 4.3 Sincronización en create/update de orden

Dentro de `transaction.atomic()` al guardar la orden (serializer o servicio dedicado `sync_orden_equipos_inventario`):

1. Cargar orden previa (si update) y payload nuevo de `equipos_inventario`.  
2. **Autorización de mutaciones sensibles (server-side):**  
   - Si el usuario **no** es admin:  
     - No puede agregar/quitar líneas ni cambiar `cantidad` ni `equipoEntregado`.  
     - Si es técnico asignado/creador: solo se aceptan cambios de `estadoInstalacion` sobre líneas existentes.  
     - Cualquier otro intento → se ignoran campos sensibles o 403 (preferir **403** en Entregado/agregar no autorizados para no fallar en silencio).  
3. Para cada línea nueva o con transición a `equipoEntregado=true` sin `movimientoSalidaId`:  
   - `InventarioItem.objects.select_for_update().get(id=…)`  
   - Si `item.cantidad < linea.cantidad` → `ValidationError` 400 con mensaje en español (“Stock insuficiente para {modelo}: hay X, se piden Y”). Rollback total.  
   - Crear movimiento `salida` con `cantidad=N`, ligar `orden` + `orden_linea_id`, restar stock.  
   - Escribir `movimientoSalidaId` en el JSON.  
4. Transición a `equipoEntregado=false` o línea eliminada que tenía salida:  
   - Crear movimiento `entrada` N, limpiar liga en el movimiento de salida (o dejar historial con nota de reversión; la línea pierde `movimientoSalidaId`), sumar stock.  
5. Cambio de `cantidad` con `equipoEntregado=true`: **rechazar 400** (“Desmarca Entregado antes de cambiar la cantidad”).  
6. El cliente **no** puede enviar un `movimientoSalidaId` distinto al persistido; se sobrescribe con la verdad del servidor.

Escaneo en FE solo **resuelve** el ítem (`GET` por search/código); no llama a scan de entrada/salida para armar la lista.

### 4.4 API

- Extender serializers de `Orden` (list/detail/write) con `equipos_inventario`.  
- Opcional v1: contadores `equipos_inventario_total` / `_entregados` / `_instalados` (como proyectos) — **sí incluir** en detail para chips del listado futuro; en listado liviano pueden omitirse si pesan (detalle sí).  
- No nuevo endpoint obligatorio: todo via `POST/PUT /api/ordenes/` y `PUT /api/ordenes/{id}/`.  
- Búsqueda FE: endpoints inventario existentes con permisos actuales de inventario.

### 4.5 Permisos

| Acción | Quién |
|--------|--------|
| Ver pestaña / leer equipos en orden | Quien pueda ver la orden (`ordenes.view`) |
| Agregar / escanear / qty / Entregado / quitar | `isAdmin` |
| Cambiar instalación | Admin **o** (asignado/creador con `ordenes.edit`) |
| Ejecutar movimiento stock | Solo como efecto colateral del save de orden por admin; no abrir un bypass de `inventario.create` desde el cliente para esta feature |

Si un admin no tiene `inventario.view`, el picker puede fallar al buscar: en ese caso mostrar mensaje “Necesitas permiso de inventario para buscar productos” y bloquear agregar (coherente con seguridad).

---

## 5. Seguridad (requisitos no negociables)

1. **Nunca confiar en el cliente** para roles, stock ni ids de movimiento.  
2. **Transacción atómica** + `select_for_update` en el ítem al entregar/revertir.  
3. **403** en mutaciones de entrega/alta de líneas si no es admin.  
4. **Validar** que `inventarioItemId` existe; rechazar líneas huérfanas.  
5. **Una línea por ítem** en el payload (dedupe por `inventarioItemId`); si el cliente manda duplicados → 400.  
6. Tests backend:  
   - Admin entrega descuenta N.  
   - Desmarcar revierte.  
   - Técnico no puede marcar Entregado.  
   - Técnico asignado sí puede marcar instalado.  
   - Stock insuficiente no deja la orden a medias.  
   - Race: dos requests concurrentes no dejan stock negativo (lock).  
7. No loguear datos sensibles de más; mensajes de error sin filtrar otros clientes.

Tras el PR: pasar `/review-security` (y Bugbot si se pide) antes de merge.

---

## 6. Manejo de errores (UX)

| Caso | Mensaje (ES-MX) |
|------|------------------|
| Stock insuficiente al guardar | “Stock insuficiente para {nombre}: hay {x}, se piden {y}.” |
| Código no encontrado al escanear | “No hay producto en inventario con ese código de barras.” |
| Sin permiso inventario para buscar | “Necesitas permiso de inventario para buscar productos.” |
| Cambiar cantidad entregada | “Desmarca Entregado antes de cambiar la cantidad.” |
| Técnico intenta entrega | Controles ocultos; si fuerza API → 403 |

Foco al primer campo inválido / alert del modal existente.

---

## 7. Testing

**Backend:** `apps.ordenes` (+ helpers inventario) — casos de la §5.6.  
**Frontend:** unitarios de merge/payload de equipos; smoke de permisos de UI (qué controles renderiza admin vs técnico).  
**Manual:** alta con entregado en el primer Guardar; desmarcar; escanear dos veces el mismo código (suma qty); técnico solo instalación.

---

## 8. Fuera de alcance (v1)

- Página/modal de Levantamiento.  
- Incluir equipos en PDF de orden.  
- Virtualización del listado de equipos.  
- Alta automática de ítem inventario desde la orden.  
- Descontar stock al agregar (sin Entregado).  
- Tabla relacional `OrdenEquipo` (queda como posible ola futura si el JSON no escala).

---

## 9. Criterios de éxito

1. Tab Equipos visible en admin y técnico tras “Datos de la orden”.  
2. Admin busca y escanea; técnico no.  
3. Entregado solo admin y mueve stock N; desmarcar revierte.  
4. Técnico asignado marca instalación; no entrega.  
5. Primer POST con líneas entregadas descuenta en la misma transacción.  
6. Intentos no autorizados rechazados en backend (tests verdes).  
7. a11y básica del tercer tab y controles (labels, radiogroup, alertas).

---

## 10. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Stock stale en UI | Revalidar siempre en BE; mostrar stock al agregar y al guardar |
| JSON vs movimientos desfasados | Solo el servicio de sync escribe `movimientoSalidaId` |
| Admin sin inventario.view | Mensaje claro; no soft-fail con lista vacía silenciosa |
| Duplicar lógica Proyectos | Compartir solo patrones visuales/a11y; dominio inventario es distinto |
