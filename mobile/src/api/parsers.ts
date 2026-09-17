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
import {
  PROYECTO_STATUSES,
  type CotizacionOrigen,
  type CotizacionResumen,
  type EquipoEstadoInstalacion,
  type Proyecto,
  type ProyectoCotizacionBloque,
  type ProyectoEquipoLinea,
  type ProyectoListItem,
  type ProyectoNotaDia,
  type ProyectoPersonaAsignada,
  type ProyectoStatus,
  type ProyectoStatusAdministrativo,
  type ProyectoTecnicoAsignado,
  type ProyectoTipoTrabajo,
} from '@/types/proyecto';

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

/** Normalizadores de Proyecto — mismo criterio tolerante que Orden. */

export function parseProyectoStatus(value: unknown): ProyectoStatus {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return (PROYECTO_STATUSES as readonly string[]).includes(raw) ? (raw as ProyectoStatus) : 'en_proceso';
}

function parseProyectoStatusAdministrativo(value: unknown): ProyectoStatusAdministrativo {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (raw === 'en_revision' || raw === 'enviado' || raw === 'cerrado') return raw;
  return 'pendiente';
}

function parseEquipoEstadoInstalacion(value: unknown): EquipoEstadoInstalacion {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (raw === 'entregado' || raw === 'no_instalado' || raw === 'instalado') return raw;
  return 'pendiente';
}

function parseTiposTrabajo(value: unknown): ProyectoTipoTrabajo[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry): ProyectoTipoTrabajo | null => {
      const data = asRecord(entry);
      const id = asNumber(data.id);
      if (id === null) return null;
      return { id, nombre: asString(data.nombre) ?? '' };
    })
    .filter((item): item is ProyectoTipoTrabajo => item !== null);
}

function parsePersonasAsignadas(value: unknown): ProyectoPersonaAsignada[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry): ProyectoPersonaAsignada | null => {
      const data = asRecord(entry);
      const id = asNumber(data.id);
      if (id === null) return null;
      return { id, nombre: asString(data.nombre) ?? '' };
    })
    .filter((item): item is ProyectoPersonaAsignada => item !== null);
}

function parseTecnicosAsignados(value: unknown): ProyectoTecnicoAsignado[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry): ProyectoTecnicoAsignado | null => {
      const data = asRecord(entry);
      const id = asNumber(data.id);
      if (id === null) return null;
      return { id, nombre: asString(data.nombre) ?? '', responsable: asBool(data.responsable) };
    })
    .filter((item): item is ProyectoTecnicoAsignado => item !== null);
}

function parseFechasInicio(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === 'string' ? v.trim().slice(0, 10) : ''))
    .filter((v) => v.length > 0);
}

function parseCotizacionOrigen(value: unknown): CotizacionOrigen {
  return value === 'sicar' ? 'sicar' : 'digitalflow';
}

function parseCotizacionResumen(value: unknown): CotizacionResumen | null {
  const data = asRecord(value);
  const id = asString(data.id);
  if (!id) return null;
  return {
    id,
    origen: parseCotizacionOrigen(data.origen),
    folio: asString(data.folio) ?? '',
    cliente: asString(data.cliente) ?? '',
    fecha: asString(data.fecha) ?? '',
    contacto: asString(data.contacto) ?? undefined,
  };
}

function parseCotizacionBloques(value: unknown): ProyectoCotizacionBloque[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry): ProyectoCotizacionBloque | null => {
      const data = asRecord(entry);
      const vinculoId = asString(data.vinculoId);
      const cotizacion = parseCotizacionResumen(data.cotizacion);
      if (!vinculoId || !cotizacion) return null;
      return { vinculoId, orden: asNumber(data.orden) ?? 1, cotizacion };
    })
    .filter((item): item is ProyectoCotizacionBloque => item !== null);
}

function parseEquipos(value: unknown): ProyectoEquipoLinea[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry): ProyectoEquipoLinea | null => {
      const data = asRecord(entry);
      const lineaId = asString(data.lineaId);
      if (!lineaId) return null;
      const fuente = data.fuenteProducto;
      return {
        lineaId,
        modelo: asString(data.modelo) ?? '',
        modeloOriginal: asString(data.modeloOriginal) ?? asString(data.modelo) ?? '',
        cantidad: asNumber(data.cantidad) ?? 1,
        productoId: asString(data.productoId) ?? undefined,
        marca: asString(data.marca) ?? undefined,
        imagenUrl: asString(data.imagenUrl) ?? undefined,
        fuenteProducto:
          fuente === 'tvc' || fuente === 'manual' || fuente === 'syscom' ? fuente : undefined,
        estadoInstalacion: parseEquipoEstadoInstalacion(data.estadoInstalacion),
        equipoEntregado: asBool(data.equipoEntregado),
        cotizacionVinculoId: asString(data.cotizacionVinculoId) ?? undefined,
        cotizacionOrden: asNumber(data.cotizacionOrden) ?? undefined,
        cotizacionFolio: asString(data.cotizacionFolio) ?? undefined,
      };
    })
    .filter((item): item is ProyectoEquipoLinea => item !== null);
}

function parseNotasPorDia(value: unknown): ProyectoNotaDia[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry, index) => {
    const data = asRecord(entry);
    return {
      id: asString(data.id) ?? `dia-${index + 1}`,
      nota: typeof data.nota === 'string' ? data.nota : '',
      imagenesUrls: asStringArray(data.imagenesUrls).slice(0, 2),
    };
  });
}

/** `null` si la fila no trae `id` usable: mejor omitirla que romper la lista. */
export function parseProyectoListItem(raw: unknown): ProyectoListItem | null {
  const data = asRecord(raw);
  const id = asNumber(data.id);
  if (id === null) return null;
  return {
    id,
    idx: asNumber(data.idx),
    folio: asString(data.folio),
    cliente_id: asNumber(data.cliente_id),
    cliente_nombre: asString(data.cliente_nombre),
    status: parseProyectoStatus(data.status),
    motivo_pausa: asString(data.motivo_pausa),
    tipo_trabajo_nombre: asString(data.tipo_trabajo_nombre),
    tipos_trabajo: parseTiposTrabajo(data.tipos_trabajo),
    fechas_inicio: parseFechasInicio(data.fechas_inicio),
    hora_llegada: asString(data.hora_llegada),
    hora_salida: asString(data.hora_salida),
    tecnicos: parseTecnicosAsignados(data.tecnicos),
    auxiliares: parsePersonasAsignadas(data.auxiliares),
    cotizaciones_count: asNumber(data.cotizaciones_count) ?? 0,
    cotizacion_folio: asString(data.cotizacion_folio),
    cotizacion_origen: data.cotizacion_origen ? parseCotizacionOrigen(data.cotizacion_origen) : null,
    equipos_total: asNumber(data.equipos_total) ?? 0,
    equipos_entregados: asNumber(data.equipos_entregados) ?? 0,
    equipos_instalados: asNumber(data.equipos_instalados) ?? 0,
    porcentaje_avance: asNumber(data.porcentaje_avance) ?? 0,
    notas_por_dia: parseNotasPorDia(data.notas_por_dia),
    status_changed_by_full_name: asString(data.status_changed_by_full_name),
    status_changed_at: asString(data.status_changed_at),
    created_at: asString(data.created_at),
  };
}

export function parseProyectoList(raw: unknown): ProyectoListItem[] {
  const rows = Array.isArray(raw) ? raw : Array.isArray(asRecord(raw).results) ? (asRecord(raw).results as unknown[]) : [];
  return rows.map(parseProyectoListItem).filter((item): item is ProyectoListItem => item !== null);
}

export function parseProyecto(raw: unknown): Proyecto {
  const base = parseProyectoListItem(raw);
  if (!base) throw new Error('El proyecto recibido no es válido.');
  const data = asRecord(raw);
  return {
    ...base,
    motivo_cancelacion: asString(data.motivo_cancelacion),
    fecha_autorizacion: asString(data.fecha_autorizacion),
    quien_autorizo: asString(data.quien_autorizo),
    vehiculo_asignado: asString(data.vehiculo_asignado),
    herramientas_generales: asString(data.herramientas_generales),
    cotizaciones: parseCotizacionBloques(data.cotizaciones),
    equipos: parseEquipos(data.equipos),
    incidencias: asString(data.incidencias),
    requerimientos_adicionales: asString(data.requerimientos_adicionales),
    requiere_presupuesto_adicional: asBool(data.requiere_presupuesto_adicional),
    cotizacion_adicional: data.cotizacion_adicional ? parseCotizacionResumen(data.cotizacion_adicional) : null,
    status_administrativo: parseProyectoStatusAdministrativo(data.status_administrativo),
    evidencias_urls: asStringArray(data.evidencias_urls),
    firma_cliente_url: asString(data.firma_cliente_url),
    firma_tecnico_url: asString(data.firma_tecnico_url),
  };
}
