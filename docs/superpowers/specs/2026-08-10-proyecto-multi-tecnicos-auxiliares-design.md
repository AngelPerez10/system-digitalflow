# Multi técnicos / auxiliares en Proyectos

Fecha: 2026-08-10  
Estado: aprobado por producto (2026-08-10)

## Problema

Hoy un proyecto solo guarda **1 técnico** y **1 auxiliar** (`ForeignKey`). Quien no está en ese FK no ve el proyecto cuando tiene permiso `own_only`. Se necesita asignar varios y que todos vean/editen la orden (proyecto).

## Decisiones de producto

| Tema | Decisión |
|------|----------|
| Técnicos | Varios; **uno marcado como responsable** |
| Auxiliares | Varios; **todos iguales** (sin responsable) |
| Técnicos no responsables | Ven el proyecto y editan igual (bitácora, evidencias, etc.) |
| Firma técnico | La del **responsable** |
| Bloqueos de técnico (cliente / cotizaciones / tipos) | Aplican a **cualquier técnico** de la lista asignada (mismo comportamiento que hoy el FK `tecnico`) |

## Enfoque técnico (aprobado)

**Listas JSON + FKs legacy** (no ManyToMany en esta iteración).

### Modelo / API

Nuevos campos JSON en `Proyecto`:

```json
"tecnicos": [
  { "id": 12, "nombre": "Ana Pérez", "responsable": true },
  { "id": 15, "nombre": "Luis Gómez", "responsable": false }
],
"auxiliares": [
  { "id": 20, "nombre": "María Ruiz" },
  { "id": 21, "nombre": "Pedro Soto" }
]
```

Reglas:

- Exactamente **un** técnico con `responsable: true` si hay ≥1 técnico; si la lista queda vacía, no hay responsable.
- Al guardar: sincronizar FK legacy  
  - `tecnico` / `tecnico_nombre` ← técnico responsable (o `null` si no hay)  
  - `auxiliar` / `auxiliar_nombre` ← primer auxiliar (o `null`)
- Lectura: si `tecnicos`/`auxiliares` vienen vacíos pero hay FK legacy, hidratar la lista desde el FK (migración suave de datos viejos).
- Un usuario no puede estar a la vez como técnico y auxiliar en el mismo proyecto (validación).
- IDs deben existir en usuarios (validar contra `User` en serializer).

API (DRF):

- Exponer `tecnicos` y `auxiliares` en el serializer.
- Seguir aceptando `tecnico_id` / `auxiliar_id` en escritura por compatibilidad: si llegan sin las listas nuevas, convertir a listas de un elemento (responsable = ese técnico).
- Preferir las listas cuando vengan en el payload.

### Visibilidad (`own_only`)

Un usuario ve el proyecto si:

- es `creado_por`, **o**
- su `id` está en `tecnicos`, **o**
- su `id` está en `auxiliares`, **o**
- (fallback) coincide con FK `tecnico` / `auxiliar`.

Misma lógica en listado, `get_object` y en instalaciones anidadas que filtran por proyecto.

### Bloqueos de técnico (`assert_tecnico_locked_fields`)

`is_assigned_technician_actor` pasa a: usuario ∈ lista `tecnicos` (o FK legacy) y no es staff/admin.

### Frontend

- Sustituir los dos `SearchableSelect` por multi-select (reutilizar `MultiSelect` o patrón chips + búsqueda similar a tipos de trabajo).
- Técnicos: chips/lista; acción **“Marcar responsable”** (radio implícito: solo uno).
- Auxiliares: multi-select sin responsable.
- Draft: `tecnicos: ProyectoPersonaAsignada & { responsable?: boolean }[]`, `auxiliares: ProyectoPersonaAsignada[]`.
- Mantener `draft.tecnico` / `draft.auxiliar` derivados del responsable / primer auxiliar para filtros de lista y firma existentes (mínimo churn).
- Lista de proyectos: mostrar responsable + conteo (“+2”) o nombres truncados; filtro por técnico debe incluir proyectos donde el id esté en la lista (no solo FK).
- Firma técnico: sigue cargando la firma del **responsable**.

### Migración de datos

- Migración de esquema: añadir `tecnicos` / `auxiliares` JSON default `[]`.
- Data migration opcional (o lazy en serializer): copiar FK → lista de un elemento.

### Fuera de alcance

- ManyToMany nativo.
- Responsable de auxiliar.
- Notificaciones push/email al asignar.
- Cambiar permisos de módulo (sigue `proyectos.view/edit`).

## Criterios de aceptación

1. Se pueden asignar N técnicos y N auxiliares desde Operación.
2. Obligatorio elegir un responsable si hay ≥1 técnico.
3. Cada usuario en esas listas ve el proyecto con `own_only`.
4. Cualquier técnico de la lista puede editar bitácora/evidencias; no puede cambiar campos bloqueados (igual que hoy).
5. Proyectos antiguos con solo FK siguen abriendo y mostrando 1 técnico / 1 auxiliar.
6. Tests backend: visibilidad multi, sync legacy, validación de un solo responsable.

## Archivos principales

| Área | Archivos |
|------|----------|
| Backend modelo | `apps/operacion/models.py`, migración nueva |
| Backend API | `serializers.py`, `views.py`, `tipos_trabajo.py` |
| Frontend tipos/API | `proyectoTypes.ts`, `proyectoApi.ts`, `proyectoFormUtils.ts` |
| Frontend form | `ProyectoOperacionTab.tsx`, `useProyectoFormState.ts`, campo multi nuevo |
| Lista | `ProyectosPage.tsx` (filtro + columna) |
| Tests | `test_proyectos_smoke.py` (+ unit de actor si aplica) |
