# Design: Instalaciones GPS bajo Proyectos

**Fecha:** 2026-07-30  
**Estado:** Aprobado en conversación (enfoque A)  
**Alcance:** Mover el formulario/listado de instalación GPS desde Órdenes de trabajo hacia una pestaña de `ProyectosPage`, ligando cada instalación a un `Proyecto` (N instalaciones por proyecto).

---

## 1. Contexto y problema

Hoy, en Órdenes, el tipo **“Proyecto”** (`tipo_orden === "instalaciones"`) muestra `InstalacionForm` y persiste en `OrdenInstalacion` vía `PUT/GET /api/ordenes/{id}/instalacion/` (relación **OneToOne** con `Orden`).

Eso mezcla dos dominios: órdenes de servicio y proyectos de operación. El usuario quiere:

1. Quitar la opción “Proyecto” del selector de tipo de orden.
2. Tener en `/proyectos` pestañas **Proyectos | Instalaciones**.
3. En Instalaciones: listado global de instalaciones GPS + crear/editar eligiendo un proyecto.
4. Varias instalaciones por proyecto (p. ej. varios vehículos).
5. No migrar datos históricos ahora; reasignar después de forma manual.

### Datos históricos (referencia local)

Órdenes con `OrdenInstalacion` (idx de **orden**):

| orden_idx | cliente | instalacion_id |
|-----------|---------|----------------|
| 5379 | LOGÍSTICA PREMIUM | 1 |
| 5381 | RAUL MENDOZA | 2 |
| 5383 | POLLO FIESTA COLOMOS | 3 |
| 5384 | EDGAR MENDOZA | 4 |
| 5418 | YOVAN MARTINEZ HERRERA | 5 |
| 5426 | TRECORP | 6 |
| 5444 | SULMA SANDY VALENTINA OVANDO SANTO | 7 |

Estas filas **no** se migran en esta entrega. La UI de Órdenes dejará de mostrar/editar instalación; el endpoint y la tabla pueden permanecer para consulta/migración futura.

---

## 2. Decisiones cerradas

| Tema | Decisión |
|------|----------|
| Ubicación UI | Tabs a nivel de `ProyectosPage`: Proyectos \| Instalaciones |
| Relación datos | `ProyectoInstalacion` → `ForeignKey(Proyecto)` (muchos a uno) |
| Histórico | Solo modelo/API nuevos; migración manual después |
| Permisos | Módulo `proyectos` (`ProyectosPermission`), misma regla `own_only` que proyectos |
| Órdenes | Quitar opción y todo el cableado de instalación en admin y técnico |

---

## 3. Arquitectura

```text
┌─────────────────────┐     ┌──────────────────────────┐
│  ProyectosPage      │     │  apps/operacion          │
│  Tab: Proyectos     │────▶│  Proyecto (existente)    │
│  Tab: Instalaciones │────▶│  ProyectoInstalacion NEW │
│    list + modal     │     │  ViewSet / serializers   │
└─────────────────────┘     └──────────────────────────┘
         │
         ▼
  InstalacionForm (movido/adaptado)
  props: proyectoId opcional al editar;
  carga/guarda vía /api/proyecto-instalaciones/

┌─────────────────────┐
│  OrdenesPage /      │  SIN tipo "instalaciones"
│  OrdenesTecnicoPage │  SIN InstalacionForm
└─────────────────────┘

OrdenInstalacion + /api/ordenes/{id}/instalacion/
  → se mantienen en backend; sin UI en esta entrega
```

---

## 4. Modelo de datos (backend)

Nuevo modelo en `apps/operacion/models.py`:

```python
class ProyectoInstalacion(models.Model):
    idx = models.IntegerField(unique=True, db_index=True, null=True, blank=True)
    proyecto = models.ForeignKey(
        Proyecto,
        on_delete=models.CASCADE,
        related_name="instalaciones",
    )
    payload = models.JSONField(default=dict, blank=True)
    dibujo_url = models.TextField(blank=True, default="")
    creado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, ...)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
```

**Asignación de `idx`:** al crear, siguiente entero disponible (mismo patrón simple que proyectos: max+1 o secuencia en `save`). Folio de UI: `INS-{idx}` (solo display; no hace falta CharField `folio` salvo que se unifique con `format_document_folio` — preferir helper de display sin columna extra en v1).

**Payload:** reutilizar la forma actual de `InstalacionFormValue` + `tipo_instalacion` (`"" | "gps"`). Campos GPS existentes (vehículo, placas, IMEI, chip, etc.) sin renombrar.

**Cloudinary:** uploads de dibujo (si se usan) en carpeta `proyectos/instalacion/dibujos`; añadir el prefijo a allowlists existentes de upload de proyectos y documentar la carpeta en `AGENTS.md` (sección PDF/proyectos).

---

## 5. API

Registrar en `apps/operacion` (router junto a `proyectos`):

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/proyecto-instalaciones/` | Listado; query opcional `?proyecto=<id>` |
| POST | `/api/proyecto-instalaciones/` | Crear (`proyecto`, `payload`, `dibujo_url`) |
| GET | `/api/proyecto-instalaciones/{id}/` | Detalle |
| PATCH | `/api/proyecto-instalaciones/{id}/` | Actualizar parcial |
| DELETE | `/api/proyecto-instalaciones/{id}/` | Eliminar |

**Respuesta listado (campos mínimos):** `id`, `idx`, `proyecto` (id), `proyecto_folio` / `proyecto_idx`, `cliente_nombre` (denormalizado del proyecto), `payload` (o subset: `placas`, `imei`, `tipo_gps`, `tipo_instalacion`), `fecha_actualizacion`.

**Permisos:** `IsAuthenticated` + `ProyectosPermission`. Si `user_module_own_only(..., "proyectos")`, filtrar instalaciones cuyo proyecto esté en el queryset permitido del usuario (técnico / auxiliar / creado_por).

**Validación:** `proyecto` obligatorio en create; payload dict; si `dibujo_url` es data URL, subir a Cloudinary antes de guardar (mismo patrón que órdenes).

**No hacer en v1:** nested routes obligatorias bajo `/api/proyectos/{id}/instalaciones/` (opcional después); el filtro `?proyecto=` cubre el caso.

---

## 6. Frontend

### 6.1 `ProyectosPage`

- Estado `activeTab: "proyectos" | "instalaciones"`.
- UI de tabs accesible (`role="tablist"`, `aria-selected`, focus visible), estilo alineado al ERP existente (coral `#ff801f`, paneles cream/dark).
- Tab **Proyectos:** contenido actual (stats, búsqueda, tabla, modal `ProyectoFormModal`).
- Tab **Instalaciones:**
  - Stats ligeras opcionales: total instalaciones (v1: un contador basta).
  - Búsqueda por cliente, folio proyecto, placas, IMEI.
  - Tabla desktop + lista móvil (patrón de `ProyectosMobileList` / órdenes).
  - CTA “Nueva instalación” (requiere `proyectos.create`).
  - Acciones editar / eliminar (`edit` / `delete`).

### 6.2 Modal crear/editar instalación

- Selector searchable de proyecto (listado `listProyectos()` o cache del tab Proyectos).
- `InstalacionForm` embebido (sin depender de `ordenId`).
- Guardar: `POST` o `PATCH` a `/api/proyecto-instalaciones/`.
- El formulario **persiste al Guardar del modal**, no con snapshot diferido ligado al save de la orden (se elimina ese patrón).

### 6.3 `InstalacionForm`

- Mover a `frontend/src/pages/Operacion/Proyectos/InstalacionForm.tsx` (o `Instalaciones/`).
- Props nuevas: `initialPayload?`, `disabled?`, `onChange` / controlled o uncontrolled con `value`+`onChange` del payload completo.
- Dejar de llamar a `/api/ordenes/.../instalacion/` desde el form; la página/modal es dueña del fetch.
- Mantener UI GPS existente (subtipo GPS, campos, estilos ERP).

### 6.4 Limpieza Órdenes

En `OrdenesPage.tsx`, `OrdenesTecnicoPage.tsx`, `useOrdenFormModalState.ts`:

- Quitar opción `<option value="instalaciones">Proyecto</option>`.
- Quitar import de `InstalacionForm`, refs de snapshot, ramas de save/load instalación.
- Ajustar `TipoOrden` a `"servicio_tecnico" | "levantamiento" | "mantenimiento"` (si `mantenimiento` sigue en UI; si no se usa, no ampliar scope).
- Serializer `get_tipo_orden` puede seguir devolviendo `instalaciones` para órdenes viejas; la UI no debe ofrecer ni abrir ese flujo. Al abrir una orden vieja con instalación, tratarla como servicio técnico (o el tipo real sin forzar `instalaciones`).

---

## 7. Errores y UX

- Fallo al listar: Alert error (mismo patrón que proyectos).
- Crear sin proyecto seleccionado: validación client-side + 400 del API.
- Sin permiso create/edit/delete: toast/alert de aviso, botones deshabilitados o ocultos según patrón actual de `ProyectosPage`.
- Delete: modal de confirmación con `ariaLabelledBy`.

---

## 8. Tests

**Backend**

- Smoke en `apps/operacion/tests/`: create/list/filter/patch/delete instalación con usuario con permiso `proyectos`.
- Usuario sin permiso → 403.
- `own_only`: no ve instalaciones de proyectos ajenos.

**Frontend**

- No obligatorio e2e en v1; `tsc` + eslint de archivos tocados.
- Si hay tests unitarios de `TipoOrden`, actualizar unions.

**CI:** mismos checks que `AGENTS.md` / `.github/workflows/ci.yml` para los paths afectados.

---

## 9. Fuera de alcance

- Script de migración `OrdenInstalacion` → `ProyectoInstalacion`.
- PDF de instalación.
- Pestaña de instalación dentro de `ProyectoFormModal`.
- Eliminar modelo/endpoint `OrdenInstalacion` (queda para migración manual).
- Contadores “ganadas/perdidas” u otros stats de órdenes.

---

## 10. Plan de implementación (alto nivel)

1. Modelo + migración + serializer + ViewSet + URLs + tests smoke.
2. API client frontend (`proyectoInstalacionApi.ts`) + tipos.
3. Adaptar/mover `InstalacionForm` + modal listado en tab Instalaciones.
4. Tabs en `ProyectosPage`.
5. Limpiar Órdenes (admin + técnico + tipos).
6. Verificación tsc / eslint / tests backend.

El plan detallado por tareas se escribirá en `docs/superpowers/plans/` tras aprobación de esta spec.

---

## 11. Criterios de aceptación

- [ ] En Órdenes no existe la opción “Proyecto” ni el formulario GPS.
- [ ] En Proyectos hay tabs Proyectos | Instalaciones.
- [ ] Se puede crear varias instalaciones asociadas al mismo proyecto.
- [ ] Listado muestra instalaciones con datos útiles (proyecto, cliente, placas/IMEI).
- [ ] CRUD respeta permisos del módulo `proyectos`.
- [ ] Datos históricos en `OrdenInstalacion` no se borran; quedan para reasignación manual (idx documentados arriba).
