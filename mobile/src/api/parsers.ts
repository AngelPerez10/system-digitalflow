import {
  ORDEN_STATUSES,
  type EquipoInventarioItem,
  type Orden,
  type OrdenCalificacion,
  type OrdenListItem,
  type OrdenStatus,
  type TipoOrden,
} from '@/types/orden';
import type { LoginResponse, ModulePermissions, PermissionFlags, SessionUser } from '@/types/api';

/** Normalizadores tolerantes: la API puede mandar `null` en casi todo. */

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asBool(value: unknown): boolean {
  return value === true || value === 'true' || value === 1;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

export function parseOrdenStatus(value: unknown): OrdenStatus {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return (ORDEN_STATUSES as readonly string[]).includes(raw) ? (raw as OrdenStatus) : 'pendiente';
}

function parseTipoOrden(value: unknown): TipoOrden {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (raw === 'levantamiento' || raw === 'instalaciones') return raw;
  return 'servicio_tecnico';
}

/** `null` cuando la fila no trae `id` usable: mejor omitirla que romper la lista. */
export function parseOrdenListItem(raw: unknown): OrdenListItem | null {
  const data = asRecord(raw);
  const id = asNumber(data.id);
  if (id === null) return null;
  return {
    id,
    idx: asNumber(data.idx),
    folio: asString(data.folio),
    tipo_orden: parseTipoOrden(data.tipo_orden),
    cliente: asString(data.cliente),
    cliente_nombre: asString(data.cliente_nombre),
    direccion: asString(data.direccion),
    telefono_cliente: asString(data.telefono_cliente),
    problematica: asString(data.problematica),
    status: parseOrdenStatus(data.status),
    motivo_pausa: asString(data.motivo_pausa),
    prioridad: asString(data.prioridad),
    prioridad_pool: asString(data.prioridad_pool),
    en_pool: asBool(data.en_pool),
    liberada_por: asNumber(data.liberada_por),
    liberada_at: asString(data.liberada_at),
    tomada_por: asNumber(data.tomada_por),
    tomada_at: asString(data.tomada_at),
    fecha_inicio: asString(data.fecha_inicio),
    hora_inicio: asString(data.hora_inicio),
    fecha_finalizacion: asString(data.fecha_finalizacion),
    hora_termino: asString(data.hora_termino),
    nombre_cliente: asString(data.nombre_cliente),
    nombre_encargado: asString(data.nombre_encargado),
    tecnico_asignado: asNumber(data.tecnico_asignado),
    tecnico_asignado_full_name: asString(data.tecnico_asignado_full_name),
    tecnico_asignado_avatar_url: asString(data.tecnico_asignado_avatar_url),
    creado_por: asNumber(data.creado_por),
    fecha_creacion: asString(data.fecha_creacion),
  };
}

export function parseOrdenList(raw: unknown): OrdenListItem[] {
  const rows = Array.isArray(raw) ? raw : Array.isArray(asRecord(raw).results) ? (asRecord(raw).results as unknown[]) : [];
  return rows.map(parseOrdenListItem).filter((item): item is OrdenListItem => item !== null);
}

function parseEquipoInventario(value: unknown): EquipoInventarioItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry): EquipoInventarioItem | null => {
      const data = asRecord(entry);
      const inventarioItemId = asNumber(data.inventarioItemId);
      if (inventarioItemId === null) return null;
      const estado = data.estadoInstalacion === 'instalado' ? 'instalado' : 'no_instalado';
      return {
        lineaId: asString(data.lineaId) ?? String(inventarioItemId),
        inventarioItemId,
        nombre: asString(data.nombre) ?? '',
        marca: asString(data.marca) ?? '',
        modelo: asString(data.modelo) ?? '',
        imagenUrl: asString(data.imagenUrl) ?? '',
        cantidad: asNumber(data.cantidad) ?? 1,
        equipoEntregado: asBool(data.equipoEntregado),
        estadoInstalacion: estado,
      };
    })
    .filter((item): item is EquipoInventarioItem => item !== null);
}

export function parseOrden(raw: unknown): Orden {
  const base = parseOrdenListItem(raw);
  if (!base) throw new Error('La orden recibida no es válida.');
  const data = asRecord(raw);
  return {
    ...base,
    comentario_tecnico: asString(data.comentario_tecnico),
    servicios_realizados: asStringArray(data.servicios_realizados),
    fotos_urls: asStringArray(data.fotos_urls),
    fotos_extra_max: asNumber(data.fotos_extra_max) ?? 0,
    firma_cliente_url: asString(data.firma_cliente_url),
    firma_encargado_url: asString(data.firma_encargado_url),
    equipos_inventario: parseEquipoInventario(data.equipos_inventario),
    calificacion: parseCalificacion(data.calificacion),
    puede_calificar: asBool(data.puede_calificar),
  };
}

/** Solo la manda el portal cliente; en el detalle del técnico llega ausente. */
export function parseCalificacion(raw: unknown): OrdenCalificacion | null {
  if (!raw) return null;
  const data = asRecord(raw);
  const estrellas = asNumber(data.estrellas);
  if (estrellas === null) return null;
  return {
    estrellas: Math.min(5, Math.max(1, Math.round(estrellas))),
    comentario: asString(data.comentario) ?? '',
    fecha: asString(data.fecha_creacion) ?? asString(data.fecha),
  };
}

function parsePermissionFlags(raw: unknown): PermissionFlags {
  const data = asRecord(raw);
  return {
    view: asBool(data.view),
    create: asBool(data.create),
    edit: asBool(data.edit),
    delete: asBool(data.delete),
    // `own_only` ausente significa «no declarado»: el backend decide el default.
    ...(('own_only' in data) ? { own_only: asBool(data.own_only) } : {}),
  };
}

export function parsePermissions(raw: unknown): ModulePermissions {
  const data = asRecord(raw);
  const result: ModulePermissions = {};
  for (const [module, flags] of Object.entries(data)) {
    result[module.toLowerCase()] = parsePermissionFlags(flags);
  }
  return result;
}

/** Contexto de portal cliente. Ausente = cuenta del ERP (`staff`). */
function parseContextoPortal(data: Record<string, unknown>) {
  return {
    account_type: data.account_type === 'cliente' ? ('cliente' as const) : ('staff' as const),
    must_change_password: asBool(data.must_change_password),
    cliente_id: asNumber(data.cliente_id),
    portal_status: asString(data.portal_status),
  };
}

export function parseLoginResponse(raw: unknown): LoginResponse {
  const data = asRecord(raw);
  const access = asString(data.access);
  const refresh = asString(data.refresh);
  const id = asNumber(data.id);
  if (!access || id === null) {
    throw new Error('Respuesta de login inválida.');
  }
  if (!refresh) {
    // Sin refresh la sesión moriría en minutos; señalar la causa real.
    throw new Error('El servidor no entregó el token de sesión para la app. Actualice el servidor.');
  }
  return {
    id,
    access,
    refresh,
    username: asString(data.username) ?? '',
    email: asString(data.email),
    first_name: typeof data.first_name === 'string' ? data.first_name : '',
    last_name: typeof data.last_name === 'string' ? data.last_name : '',
    is_staff: asBool(data.is_staff),
    is_superuser: asBool(data.is_superuser),
    avatar_url: asString(data.avatar_url),
    ...parseContextoPortal(data),
    permissions: parsePermissions(data.permissions),
  };
}

export function parseSessionUser(raw: unknown): SessionUser {
  const data = asRecord(raw);
  const id = asNumber(data.id);
  if (id === null) throw new Error('Respuesta de sesión inválida.');
  return {
    id,
    username: asString(data.username) ?? '',
    email: asString(data.email),
    first_name: typeof data.first_name === 'string' ? data.first_name : '',
    last_name: typeof data.last_name === 'string' ? data.last_name : '',
    is_staff: asBool(data.is_staff),
    is_superuser: asBool(data.is_superuser),
    avatar_url: asString(data.avatar_url),
    ...parseContextoPortal(data),
  };
}
