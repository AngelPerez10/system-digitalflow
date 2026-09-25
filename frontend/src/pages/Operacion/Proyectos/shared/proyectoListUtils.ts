/**
 * Lógica pura del listado de proyectos: búsqueda, filtros, equipo y periodo.
 * Sin React: se prueba en `proyectoListUtils.test.ts`.
 */
import { matchesDocumentFolio } from "@/utils/documentFolio";
import { estadoProyectoLabel, filledFechasInicio } from "./proyectoFormUtils";
import type { ProyectoRow } from "./proyectoTypes";

export type ProyectoSecondaryFilters = {
  tipos: string[];
  date: string;
  /** `0` = sin asignar; `null` = todos. */
  tecnicoId: number | null;
};

export type ProyectoTeamMember = {
  id: number | null;
  nombre: string;
  responsable?: boolean;
  avatar_url?: string;
};

export type ProyectoTeam = {
  tecnicos: ProyectoTeamMember[];
  auxiliares: ProyectoTeamMember[];
  responsable: ProyectoTeamMember | null;
  /** Técnicos + auxiliares, responsable primero. */
  todos: ProyectoTeamMember[];
};

export type ProyectoPeriodo = {
  desde: string;
  hasta: string;
  dias: number;
  /** 1-based si hoy cae dentro del periodo; `null` si no. */
  diaActual: number | null;
};

export function tecnicoNombreFromUser(u: {
  first_name?: string;
  last_name?: string;
  email?: string;
  username?: string;
  id: number;
}): string {
  const full = `${u.first_name || ""} ${u.last_name || ""}`.trim();
  if (full) return full;
  return String(u.username || u.email || "").trim() || `Técnico #${u.id}`;
}

export function unwrapListResults<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  const results = (data as { results?: T[] } | null)?.results;
  return Array.isArray(results) ? results : [];
}

/** Fecha de referencia del proyecto (`YYYY-MM-DD`). */
export function proyectoRowFecha(row: ProyectoRow): string {
  return String(row.fecha || row.draft?.fechaAutorizacion || "").slice(0, 10);
}

export function proyectoMatchesSearch(row: ProyectoRow, q: string): boolean {
  const term = q.trim().toLowerCase();
  if (!term) return true;
  return (
    matchesDocumentFolio(row.folio, term) ||
    matchesDocumentFolio(row.cotizacionFolio, term) ||
    row.cliente.toLowerCase().includes(term) ||
    estadoProyectoLabel(row.estado).toLowerCase().includes(term) ||
    proyectoTiposLabels(row).some((t) => t.toLowerCase().includes(term))
  );
}

export type ProyectoListFilterOpts = {
  search: string;
  selectedMonth: string;
  secondary: ProyectoSecondaryFilters;
};

/**
 * Filtros del listado. Con texto de búsqueda se ignora el mes (y la fecha del
 * panel) para encontrar clientes/folios de cualquier periodo.
 */
export function proyectoPassesListFilters(row: ProyectoRow, opts: ProyectoListFilterOpts): boolean {
  const q = opts.search.trim();
  if (!proyectoMatchesSearch(row, opts.search)) return false;

  if (q) {
    // Búsqueda libre: todos los meses. La fecha del panel acotaría a un día.
    return proyectoMatchesSecondaryFilters(row, { ...opts.secondary, date: "" });
  }

  if (opts.selectedMonth && !proyectoRowFecha(row).startsWith(opts.selectedMonth)) return false;
  return proyectoMatchesSecondaryFilters(row, opts.secondary);
}

export function proyectoTiposLabels(row: ProyectoRow): string[] {
  const tipos = row.draft?.tiposTrabajo;
  if (Array.isArray(tipos) && tipos.length > 0) {
    return tipos
      .map((t) => String(t.nombre || "").trim() || (t.id != null ? `#${t.id}` : ""))
      .filter(Boolean);
  }
  const legacy = String(row.draft?.tipoTrabajoNombre || "").trim();
  return legacy ? [legacy] : [];
}

/** Técnicos y auxiliares del proyecto con compatibilidad con los campos legacy. */
export function proyectoTeam(row: ProyectoRow): ProyectoTeam {
  const tecnicosRaw = row.draft?.tecnicos?.length
    ? row.draft.tecnicos
    : row.draft?.tecnico?.id != null
      ? [{ ...row.draft.tecnico, responsable: true }]
      : [];
  const auxiliaresRaw = row.draft?.auxiliares?.length
    ? row.draft.auxiliares
    : row.draft?.auxiliar?.id != null
      ? [row.draft.auxiliar]
      : [];

  const tecnicos: ProyectoTeamMember[] = tecnicosRaw.map((t) => ({
    id: t.id ?? null,
    nombre: String(t.nombre || "").trim() || `#${t.id}`,
    responsable: Boolean("responsable" in t && t.responsable),
    avatar_url: String(t.avatar_url || "").trim(),
  }));
  const auxiliares: ProyectoTeamMember[] = auxiliaresRaw.map((a) => ({
    id: a.id ?? null,
    nombre: String(a.nombre || "").trim() || `#${a.id}`,
    avatar_url: String(a.avatar_url || "").trim(),
  }));
  const responsable = tecnicos.find((t) => t.responsable) || tecnicos[0] || null;
  const resto = tecnicos.filter((t) => t !== responsable);
  return {
    tecnicos,
    auxiliares,
    responsable,
    todos: [...(responsable ? [responsable] : []), ...resto, ...auxiliares],
  };
}

/** ¿El usuario participa en el proyecto (técnico o auxiliar)? */
export function proyectoIncluyeUsuario(row: ProyectoRow, userId: number | null | undefined): boolean {
  if (userId == null) return false;
  const uid = Number(userId);
  return proyectoTeam(row).todos.some((p) => p.id != null && Number(p.id) === uid);
}

/** `YYYY-MM-DD` en hora local (no UTC). */
export function localDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Periodo de trabajo a partir de las jornadas registradas. */
export function proyectoPeriodo(row: ProyectoRow, today: Date = new Date()): ProyectoPeriodo | null {
  const fechas = filledFechasInicio(row.draft?.fechasInicio ?? []);
  if (!fechas.length) return null;
  const desde = fechas[0];
  const hasta = fechas[fechas.length - 1];
  const hoy = localDateKey(today);
  const idx = fechas.indexOf(hoy);
  return { desde, hasta, dias: fechas.length, diaActual: idx >= 0 ? idx + 1 : null };
}

/** Filtros del panel (sin estado: el estado vive en la barra segmentada). */
export function proyectoMatchesSecondaryFilters(row: ProyectoRow, opts: ProyectoSecondaryFilters): boolean {
  if (opts.date) {
    if (proyectoRowFecha(row) !== opts.date.slice(0, 10)) return false;
  }

  if (opts.tecnicoId != null) {
    const team = proyectoTeam(row);
    if (opts.tecnicoId === 0) {
      if (team.tecnicos.some((t) => t.id != null)) return false;
    } else if (!team.tecnicos.some((t) => t.id != null && Number(t.id) === opts.tecnicoId)) {
      return false;
    }
  }

  if (opts.tipos.length > 0) {
    const labels = proyectoTiposLabels(row);
    if (!opts.tipos.some((t) => labels.includes(t))) return false;
  }

  return true;
}

export function countSecondaryProyectoFilters(opts: ProyectoSecondaryFilters): number {
  let n = 0;
  if (opts.tipos.length > 0) n += 1;
  if (opts.date.trim()) n += 1;
  if (opts.tecnicoId != null) n += 1;
  return n;
}

/** `YYYY-MM` desplazado `delta` meses. */
export function shiftYearMonth(ym: string, delta: number): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym.trim());
  if (!m) return ym;
  const d = new Date(Number(m[1]), Number(m[2]) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatYearMonthLabel(ym: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym.trim());
  if (!m) return ym || "Todos los meses";
  return new Date(Number(m[1]), Number(m[2]) - 1, 1).toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });
}

/** `12 sep` (o `12 sep 2025` si no es del año en curso). */
export function formatFechaCorta(iso: string, today: Date = new Date()): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
  // Formatos ajenos (p. ej. SICAR) se muestran tal cual.
  if (!m) return String(iso || "").trim() || "—";
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const sameYear = d.getFullYear() === today.getFullYear();
  return d
    .toLocaleDateString("es-MX", { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) })
    .replace(/\./g, "");
}

export function formatPeriodoLabel(periodo: ProyectoPeriodo | null, today: Date = new Date()): string {
  if (!periodo) return "Sin fechas";
  if (periodo.desde === periodo.hasta) return formatFechaCorta(periodo.desde, today);
  return `${formatFechaCorta(periodo.desde, today)} – ${formatFechaCorta(periodo.hasta, today)}`;
}
