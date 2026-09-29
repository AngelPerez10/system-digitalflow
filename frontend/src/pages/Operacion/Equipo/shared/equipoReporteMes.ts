/**
 * Datos del reporte mensual de Equipo (lógica pura, sin PDF ni red): qué se
 * hizo en el mes por técnico, el detalle de órdenes y proyectos y el
 * historial de reasignaciones del mes.
 */
import type { Orden, Usuario } from "../../OrdenesTrabajo/OrdenServicio/shared/ordenesPageTypes";
import { displayOrdenFolio, isOrdenCancelada, isOrdenResuelta } from "../../OrdenesTrabajo/OrdenServicio/shared/useOrdenesShared";
import { displayProyectoFolio } from "../../Proyectos/shared/proyectoFormUtils";
import { proyectoTeam, proyectoTiposLabels } from "../../Proyectos/shared/proyectoListUtils";
import { toneForEstado } from "../../Proyectos/shared/proyectoTokens";
import type { ProyectoRow } from "../../Proyectos/shared/proyectoTypes";
import { buildEquipoSecciones, ordenAbierta, proyectoActivo } from "./equipoGrouping";
import type { EquipoHistorialEntry } from "./equipoHistorialApi";
import { DIAS_CORTOS, addDays, lunesDe, ordenFecha, parseYmd, proyectoFechas, rangoSemana, toYmd } from "./equipoSemana";
import { ordenTone } from "./equipoTokens";

export const MESES_LARGOS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** `2026-09` → «Septiembre 2026». */
export function etiquetaMes(mes: string): string {
  const [y, m] = mes.split("-").map(Number);
  return `${MESES_LARGOS[(m || 1) - 1] ?? ""} ${y}`;
}

/** `YYYY-MM` del mes que contiene `ymd`, o el actual. */
export function mesDe(ymd?: string): string {
  const d = (ymd && parseYmd(ymd)) || new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function moverMes(mes: string, delta: number): string {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export type ReporteFila = { tipo: "orden" | "proyecto"; fecha: string; fechaFin?: string; /** Días (`YYYY-MM-DD`) en que hay trabajo. */ dias: string[]; folio: string; cliente: string; tecnicos: string; estado: string; cerrado: boolean; cancelado: boolean; extra: string;
  /** Solo proyectos: tipo(s) de trabajo (los de la cotización), responsable, resto del equipo y avance 0–1. */
  tipoTrabajo?: string;
  responsable?: string;
  equipo?: string[];
  avance?: number;
};

export type ReporteTecnico = {
  nombre: string;
  ordenes: number;
  proyectos: number;
  total: number;
  completados: number;
  abiertos: number;
  /** 0–1: completados / total (0 si no tiene trabajos). */
  avance: number;
};

export type ReporteSemana = {
  /** Número de semana dentro del mes (1, 2, …), de lunes a domingo. */
  n: number;
  lunes: string;
  domingo: string;
  rango: string;
  /** Órdenes y proyectos de la semana (solo días del mes), por día. */
  filas: ReporteFila[];
  historial: EquipoHistorialEntry[];
  ordenes: number;
  proyectos: number;
  completados: number;
};

/** «Lun 03» (día corto + número): no se parte en dos líneas. */
export function diaCorto(ymd: string): string {
  const d = parseYmd(ymd);
  return d ? `${DIAS_CORTOS[(d.getDay() + 6) % 7]} ${String(d.getDate()).padStart(2, "0")}` : "";
}

export type ReporteMes = {
  mes: string;
  etiqueta: string;
  resumen: {
    ordenes: number;
    proyectos: number;
    completados: number;
    abiertos: number;
    cancelados: number;
    reasignaciones: number;
    /** 0–1 sobre los trabajos no cancelados. */
    avance: number;
  };
  tecnicos: ReporteTecnico[];
  semanas: ReporteSemana[];
  ordenes: ReporteFila[];
  proyectos: ReporteFila[];
  historial: EquipoHistorialEntry[];
};

const enMes = (ymd: string, mes: string) => ymd.slice(0, 7) === mes;

const fmtDia = (ymd: string | null | undefined) => {
  const d = ymd ? parseYmd(ymd) : null;
  return d ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}` : "";
};

/** «Beto Ruiz a Ana Pérez · día 28/09 a 30/09» (sin flechas: la fuente del PDF no las trae). */
export function describirMovimiento(e: EquipoHistorialEntry): string {
  const partes: string[] = [];
  if (e.desde_id !== e.hacia_id) partes.push(`${e.desde_nombre || "Sin asignar"} a ${e.hacia_nombre || "Sin asignar"}`);
  if (e.desde_fecha || e.hacia_fecha) partes.push(`día ${fmtDia(e.desde_fecha)} a ${fmtDia(e.hacia_fecha)}`);
  return partes.join(" · ");
}

export function buildReporteMes(input: {
  mes: string;
  ordenes: Orden[];
  proyectos: ProyectoRow[];
  usuarios: Usuario[];
  roster: Usuario[];
  historial: EquipoHistorialEntry[];
}): ReporteMes {
  const { mes } = input;
  const ordenes = input.ordenes.filter((o) => enMes(ordenFecha(o), mes));
  const proyectos = input.proyectos.filter((r) => proyectoFechas(r).some((f) => enMes(f, mes)));
  const historial = input.historial
    .filter((h) => {
      const d = new Date(h.creado_at);
      return !Number.isNaN(d.getTime()) && mesDe(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`) === mes;
    })
    .sort((a, b) => a.creado_at.localeCompare(b.creado_at));

  const cerradoP = (r: ProyectoRow) => (r.estado ?? r.draft?.status) === "cerrado";
  const canceladoP = (r: ProyectoRow) => (r.estado ?? r.draft?.status) === "cancelado";

  const tecnicos: ReporteTecnico[] = buildEquipoSecciones(ordenes, proyectos, input.usuarios, input.roster)
    .filter((s) => s.ordenes.length + s.proyectos.length > 0)
    .map((s) => {
      const total = s.ordenes.length + s.proyectos.length;
      const completados = s.ordenes.filter((o) => isOrdenResuelta(o.status)).length + s.proyectos.filter(cerradoP).length;
      const abiertos = s.ordenes.filter(ordenAbierta).length + s.proyectos.filter(proyectoActivo).length;
      const validos = total - s.ordenes.filter((o) => isOrdenCancelada(o.status)).length - s.proyectos.filter(canceladoP).length;
      return {
        nombre: s.tecnico.nombre,
        ordenes: s.ordenes.length,
        proyectos: s.proyectos.length,
        total,
        completados,
        abiertos,
        avance: validos > 0 ? completados / validos : 0,
      };
    })
    .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }));

  const nombreUsuario = new Map<number, string>();
  for (const s of buildEquipoSecciones([], [], input.usuarios, input.roster)) if (s.tecnico.id != null) nombreUsuario.set(s.tecnico.id, s.tecnico.nombre);

  const filasOrdenes: ReporteFila[] = ordenes
    .map((o) => {
      const tid = o.tecnico_asignado != null ? Number(o.tecnico_asignado) : NaN;
      return {
        tipo: "orden" as const,
        fecha: ordenFecha(o),
        dias: [ordenFecha(o)],
        folio: displayOrdenFolio(o),
        cliente: String(o.cliente || "Sin cliente"),
        tecnicos: nombreUsuario.get(tid) ?? "Sin asignar",
        estado: ordenTone(o.status).label,
        cerrado: isOrdenResuelta(o.status),
        cancelado: isOrdenCancelada(o.status),
        extra: Array.isArray(o.servicios_realizados) ? String(o.servicios_realizados[0] ?? "") : "",
      };
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.folio.localeCompare(b.folio));

  const filaProyecto = (r: ProyectoRow, dias: string[]): ReporteFila => ({
    tipo: "proyecto",
    fecha: dias[0] ?? "",
    fechaFin: dias[dias.length - 1],
    dias,
    folio: displayProyectoFolio(r.folio),
    cliente: r.cliente || "Sin cliente",
    tecnicos: proyectoTeam(r).todos.map((m) => m.nombre).filter(Boolean).join(", ") || "Sin asignar",
    estado: toneForEstado(r.estado).label,
    cerrado: cerradoP(r),
    cancelado: canceladoP(r),
    extra: `${dias.length} ${dias.length === 1 ? "jornada" : "jornadas"}`,
    tipoTrabajo: proyectoTiposLabels(r).join(" · "),
    responsable: proyectoTeam(r).responsable?.nombre ?? "",
    equipo: proyectoTeam(r)
      .todos.filter((m) => !(m.id === proyectoTeam(r).responsable?.id && m.nombre === proyectoTeam(r).responsable?.nombre))
      .map((m) => m.nombre)
      .filter(Boolean),
    avance: Math.max(0, Math.min(100, Math.round(Number(r.draft?.porcentajeAvance) || 0))) / 100,
  });
  const diasMes = (r: ProyectoRow) => proyectoFechas(r).filter((f) => enMes(f, mes)).sort();
  const filasProyectos: ReporteFila[] = proyectos
    .map((r) => filaProyecto(r, diasMes(r)))
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.folio.localeCompare(b.folio));

  // Semanas de lunes a domingo que cubren el mes (la primera y la última pueden asomarse a otro mes).
  const [anio, mesNum] = mes.split("-").map(Number);
  const ultimoDia = toYmd(new Date(anio, mesNum, 0));
  const semanas: ReporteSemana[] = [];
  for (let lunes = lunesDe(`${mes}-01`), n = 1; lunes <= ultimoDia; lunes = addDays(lunes, 7), n++) {
    const domingo = addDays(lunes, 6);
    const dentro = (f: string) => f >= lunes && f <= domingo && enMes(f, mes);
    const filas = [
      ...filasOrdenes.filter((f) => dentro(f.fecha)),
      ...proyectos.flatMap((r) => {
        const dias = diasMes(r).filter(dentro);
        return dias.length ? [filaProyecto(r, dias)] : [];
      }),
    ].sort((a, b) => a.fecha.localeCompare(b.fecha) || Number(a.tipo === "proyecto") - Number(b.tipo === "proyecto") || a.folio.localeCompare(b.folio));
    const hist = historial.filter((h) => {
      const d = new Date(h.creado_at);
      return dentro(toYmd(d));
    });
    semanas.push({
      n, lunes, domingo, rango: rangoSemana(lunes), filas, historial: hist,
      ordenes: filas.filter((f) => f.tipo === "orden").length,
      proyectos: filas.filter((f) => f.tipo === "proyecto").length,
      completados: filas.filter((f) => f.cerrado).length,
    });
  }

  const canceladosO = filasOrdenes.filter((f) => f.cancelado).length;
  const canceladosP = filasProyectos.filter((f) => f.cancelado).length;
  const completados = filasOrdenes.filter((f) => f.cerrado).length + filasProyectos.filter((f) => f.cerrado).length;
  const totalValidos = filasOrdenes.length + filasProyectos.length - canceladosO - canceladosP;

  return {
    mes,
    etiqueta: etiquetaMes(mes),
    resumen: {
      ordenes: filasOrdenes.length,
      proyectos: filasProyectos.length,
      completados,
      abiertos: filasOrdenes.filter((f) => !f.cerrado && !f.cancelado).length + filasProyectos.filter((f) => !f.cerrado && !f.cancelado).length,
      cancelados: canceladosO + canceladosP,
      reasignaciones: historial.length,
      avance: totalValidos > 0 ? completados / totalValidos : 0,
    },
    tecnicos,
    semanas,
    ordenes: filasOrdenes,
    proyectos: filasProyectos,
    historial,
  };
}
