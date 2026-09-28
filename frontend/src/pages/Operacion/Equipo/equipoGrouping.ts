/**
 * Datos del tablero Equipo (solo administradores): órdenes de trabajo y
 * proyectos del mes repartidos en una columna por técnico, más la bandeja
 * «Sin asignar». También la lógica pura de reasignar al arrastrar.
 *
 * - Órdenes: un solo técnico asignado (`tecnico_asignado`).
 * - Proyectos: pueden tener varios técnicos + auxiliares; el proyecto
 *   aparece en la columna de cada uno (así nadie deja de ver lo suyo).
 */
import type { Orden, Usuario } from "../OrdenesTrabajo/OrdenServicio/shared/ordenesPageTypes";
import { isOrdenCancelada, isOrdenResuelta } from "../OrdenesTrabajo/OrdenServicio/shared/useOrdenesShared";
import { primerAuxiliar, responsableFromTecnicos } from "../Proyectos/shared/proyectoFormUtils";
import { proyectoTeam } from "../Proyectos/shared/proyectoListUtils";
import type { ProyectoRow } from "../Proyectos/shared/proyectoTypes";

/** Id de columna: el id real del usuario, o `null` para «Sin asignar». */
export type EquipoTecnicoId = number | null;

export type EquipoTecnico = {
  id: EquipoTecnicoId;
  nombre: string;
  avatarUrl: string;
};

export type EquipoSeccion = {
  tecnico: EquipoTecnico;
  ordenes: Orden[];
  proyectos: ProyectoRow[];
  /** Órdenes abiertas + proyectos activos (la «carga» de la columna). */
  pendientes: number;
};

export const SIN_ASIGNAR: EquipoTecnico = { id: null, nombre: "Sin asignar", avatarUrl: "" };

export function usuarioNombre(u: Pick<Usuario, "id" | "first_name" | "last_name" | "username" | "email">): string {
  const full = `${u.first_name || ""} ${u.last_name || ""}`.trim();
  return full || u.username || u.email || `Usuario #${u.id}`;
}

export function ordenTecnicoId(orden: Pick<Orden, "tecnico_asignado">): number | null {
  const raw = orden.tecnico_asignado;
  const id = raw != null ? Number(raw) : NaN;
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** Orden abierta: ni resuelta ni cancelada (se puede reasignar). */
export function ordenAbierta(orden: Pick<Orden, "status">): boolean {
  return !isOrdenResuelta(orden.status) && !isOrdenCancelada(orden.status);
}

/** Proyecto activo: ni cerrado ni cancelado (se puede reasignar). */
export function proyectoActivo(row: ProyectoRow): boolean {
  const estado = row.estado ?? row.draft?.status;
  return estado !== "cerrado" && estado !== "cancelado";
}

/** Papel del usuario en el proyecto (para la etiqueta de la tarjeta). */
export function proyectoRolDe(row: ProyectoRow, userId: EquipoTecnicoId): "responsable" | "tecnico" | "auxiliar" | null {
  if (userId == null) return null;
  const team = proyectoTeam(row);
  if (team.responsable?.id === userId) return "responsable";
  if (team.tecnicos.some((t) => t.id === userId)) return "tecnico";
  if (team.auxiliares.some((a) => a.id === userId)) return "auxiliar";
  return null;
}

/** Abiertos primero; luego lo más reciente primero. */
function byFechaDesc(a: string, b: string): number {
  return b.localeCompare(a);
}

function sortOrdenes(list: Orden[]): Orden[] {
  return [...list].sort((a, b) => {
    const open = Number(ordenAbierta(b)) - Number(ordenAbierta(a));
    if (open !== 0) return open;
    return byFechaDesc(String(a.fecha_inicio || a.fecha_creacion || ""), String(b.fecha_inicio || b.fecha_creacion || ""));
  });
}

function sortProyectos(list: ProyectoRow[]): ProyectoRow[] {
  return [...list].sort((a, b) => {
    const open = Number(proyectoActivo(b)) - Number(proyectoActivo(a));
    if (open !== 0) return open;
    return byFechaDesc(String(a.fecha || ""), String(b.fecha || ""));
  });
}

function seccion(tecnico: EquipoTecnico, ordenes: Orden[], proyectos: ProyectoRow[]): EquipoSeccion {
  return {
    tecnico,
    ordenes: sortOrdenes(ordenes),
    proyectos: sortProyectos(proyectos),
    pendientes: ordenes.filter(ordenAbierta).length + proyectos.filter(proyectoActivo).length,
  };
}

/**
 * Columnas del tablero. «Sin asignar» siempre va primero (es la bandeja de
 * entrada y el destino para quitar el técnico). Luego un técnico por
 * columna, por nombre: todos los de `roster` (aunque no tengan carga, para
 * poder soltarles trabajo) más cualquier otro asignado que aparezca en los
 * datos.
 */
export function buildEquipoSecciones(
  ordenes: Orden[],
  proyectos: ProyectoRow[],
  usuarios: Usuario[],
  roster: Usuario[] = [],
): EquipoSeccion[] {
  const usuarioPorId = new Map<number, Usuario>();
  for (const u of usuarios) usuarioPorId.set(u.id, u);
  for (const u of roster) if (!usuarioPorId.has(u.id)) usuarioPorId.set(u.id, u);
  // Foto: la primera fuente que la tenga (catálogos pueden venir sin ella).
  const avatarPorId = new Map<number, string>();
  for (const u of [...usuarios, ...roster]) {
    const url = String(u.avatar_url || "").trim();
    if (url && !avatarPorId.has(u.id)) avatarPorId.set(u.id, url);
  }

  const buckets = new Map<EquipoTecnicoId, { ordenes: Orden[]; proyectos: ProyectoRow[] }>();
  const ensure = (id: EquipoTecnicoId) => {
    let b = buckets.get(id);
    if (!b) {
      b = { ordenes: [], proyectos: [] };
      buckets.set(id, b);
    }
    return b;
  };

  ensure(null);
  for (const u of roster) if (u.id > 0) ensure(u.id);

  for (const orden of ordenes) ensure(ordenTecnicoId(orden)).ordenes.push(orden);

  for (const row of proyectos) {
    const miembros = Array.from(
      new Set(proyectoTeam(row).todos.map((p) => p.id).filter((id): id is number => id != null && id > 0))
    );
    if (miembros.length === 0) {
      ensure(null).proyectos.push(row);
      continue;
    }
    for (const id of miembros) ensure(id).proyectos.push(row);
  }

  const tecnicos: EquipoSeccion[] = [];
  for (const [id, bucket] of buckets) {
    if (id === null) continue;
    const usuario = usuarioPorId.get(id);
    const avatarUrl = avatarPorId.get(id) ?? avatarDesdeDatos(id, bucket);
    const tecnico: EquipoTecnico = usuario
      ? { id, nombre: usuarioNombre(usuario), avatarUrl }
      : { id, nombre: nombreDesdeDatos(id, bucket) ?? `Técnico #${id}`, avatarUrl };
    tecnicos.push(seccion(tecnico, bucket.ordenes, bucket.proyectos));
  }
  tecnicos.sort((a, b) => a.tecnico.nombre.localeCompare(b.tecnico.nombre, "es", { sensitivity: "base" }));

  const sinAsignar = buckets.get(null)!;
  return [seccion(SIN_ASIGNAR, sinAsignar.ordenes, sinAsignar.proyectos), ...tecnicos];
}

/** Foto del técnico desde sus propias órdenes / proyectos (respaldo del catálogo). */
function avatarDesdeDatos(id: number, bucket: { ordenes: Orden[]; proyectos: ProyectoRow[] }): string {
  for (const o of bucket.ordenes) {
    const url = String(o.tecnico_asignado_avatar_url || "").trim();
    if (url) return url;
  }
  for (const row of bucket.proyectos) {
    const url = String(proyectoTeam(row).todos.find((m) => m.id === id)?.avatar_url || "").trim();
    if (url) return url;
  }
  return "";
}

/** Nombre del asignado cuando no viene en el catálogo de usuarios. */
function nombreDesdeDatos(id: number, bucket: { ordenes: Orden[]; proyectos: ProyectoRow[] }): string | null {
  for (const o of bucket.ordenes) {
    const n = String(o.tecnico_asignado_full_name || o.tecnico_asignado_username || "").trim();
    if (n) return n;
  }
  for (const row of bucket.proyectos) {
    const p = proyectoTeam(row).todos.find((m) => m.id === id);
    if (p?.nombre && !p.nombre.startsWith("#")) return p.nombre;
  }
  return null;
}

/* --------------------------------------------------------------------------
   Reasignación
   -------------------------------------------------------------------------- */

export type EquipoProyectoAsignacion = {
  tecnicos: { id: number; nombre: string; responsable: boolean }[];
  auxiliares: { id: number; nombre: string }[];
};

/**
 * Equipo de un proyecto tras soltarlo de la columna `fromId` en la de `to`.
 *
 * - Técnico → otro técnico: `to` ocupa su lugar (y su marca de responsable).
 * - Auxiliar → otro: `to` entra como auxiliar en su lugar.
 * - Si `to` ya estaba en el equipo, solo sale `fromId` (sin duplicar); si
 *   estaba de auxiliar y hereda un lugar de técnico, deja de ser auxiliar.
 * - Desde «Sin asignar»: `to` entra como técnico responsable.
 * - Hacia «Sin asignar» (`to` null): sale `fromId`.
 *
 * Siempre queda exactamente un responsable si hay técnicos.
 */
export function moverEquipoProyecto(
  row: ProyectoRow,
  fromId: EquipoTecnicoId,
  to: { id: number; nombre: string } | null,
): EquipoProyectoAsignacion {
  const team = proyectoTeam(row);
  let tecnicos = team.tecnicos
    .filter((t): t is typeof t & { id: number } => t.id != null && t.id > 0)
    .map((t) => ({ id: t.id, nombre: t.nombre, responsable: Boolean(t.responsable) }));
  let auxiliares = team.auxiliares
    .filter((a): a is typeof a & { id: number } => a.id != null && a.id > 0)
    .map((a) => ({ id: a.id, nombre: a.nombre }));

  const fromEsTecnico = fromId != null && tecnicos.some((t) => t.id === fromId);
  const fromEsAuxiliar = fromId != null && !fromEsTecnico && auxiliares.some((a) => a.id === fromId);

  if (to == null) {
    tecnicos = tecnicos.filter((t) => t.id !== fromId);
    auxiliares = auxiliares.filter((a) => a.id !== fromId);
  } else if (fromEsTecnico) {
    const yaTecnico = tecnicos.some((t) => t.id === to.id);
    if (yaTecnico) {
      const eraResponsable = tecnicos.find((t) => t.id === fromId)?.responsable;
      tecnicos = tecnicos
        .filter((t) => t.id !== fromId)
        .map((t) => (eraResponsable && t.id === to.id ? { ...t, responsable: true } : t));
    } else {
      tecnicos = tecnicos.map((t) => (t.id === fromId ? { id: to.id, nombre: to.nombre, responsable: t.responsable } : t));
      auxiliares = auxiliares.filter((a) => a.id !== to.id);
    }
  } else if (fromEsAuxiliar) {
    const yaEnEquipo = tecnicos.some((t) => t.id === to.id) || auxiliares.some((a) => a.id === to.id);
    auxiliares = yaEnEquipo
      ? auxiliares.filter((a) => a.id !== fromId)
      : auxiliares.map((a) => (a.id === fromId ? { id: to.id, nombre: to.nombre } : a));
  } else if (!tecnicos.some((t) => t.id === to.id)) {
    // Desde «Sin asignar» (o sin rastro del origen): entra como responsable.
    auxiliares = auxiliares.filter((a) => a.id !== to.id);
    tecnicos = [{ id: to.id, nombre: to.nombre, responsable: true }, ...tecnicos.map((t) => ({ ...t, responsable: false }))];
  }

  if (tecnicos.length > 0) {
    const idx = Math.max(0, tecnicos.findIndex((t) => t.responsable));
    tecnicos = tecnicos.map((t, i) => ({ ...t, responsable: i === idx }));
  }
  return { tecnicos, auxiliares };
}

/** Equipo actual de un proyecto en el formato de `moverEquipoProyecto` (para deshacer). */
export function equipoActualProyecto(row: ProyectoRow): EquipoProyectoAsignacion {
  const team = proyectoTeam(row);
  const responsableId = team.responsable?.id ?? null;
  return {
    tecnicos: team.tecnicos
      .filter((t): t is typeof t & { id: number } => t.id != null && t.id > 0)
      .map((t) => ({ id: t.id, nombre: t.nombre, responsable: t.id === responsableId })),
    auxiliares: team.auxiliares
      .filter((a): a is typeof a & { id: number } => a.id != null && a.id > 0)
      .map((a) => ({ id: a.id, nombre: a.nombre })),
  };
}

/**
 * Copia del proyecto con otro equipo (cambio optimista en el tablero antes
 * de que responda el servidor). Mantiene sincronizados los campos legacy
 * `tecnico` / `auxiliar`, que `proyectoTeam` usa si la lista viene vacía.
 */
export function aplicarEquipoProyecto(
  row: ProyectoRow,
  equipo: EquipoProyectoAsignacion,
  avatarDe: (id: number) => string = () => "",
): ProyectoRow {
  const tecnicos = equipo.tecnicos.map((t) => ({ ...t, avatar_url: avatarDe(t.id) }));
  const auxiliares = equipo.auxiliares.map((a) => ({ ...a, avatar_url: avatarDe(a.id) }));
  return {
    ...row,
    draft: {
      ...row.draft,
      tecnicos,
      auxiliares,
      tecnico: responsableFromTecnicos(tecnicos),
      auxiliar: primerAuxiliar(auxiliares),
    },
  };
}
