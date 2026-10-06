/**
 * Lógica pura de la agenda de visitas de pólizas (sin React, con pruebas).
 *
 * - `visitasPorDia`: visitas de los próximos N días agrupadas por fecha.
 * - `tiraDeDias`: los días de la tira superior (lunes de esta semana en
 *   adelante), con cuántas visitas tiene cada uno.
 * - `gruposAgenda`: los días con visitas en «Hoy», «Esta semana»,
 *   «Próxima semana» y «Más adelante».
 */
import { daysBetween } from "../shared/polizaVisitas";
import type { PolizaRow } from "./polizaListTypes";

export type AgendaVisita = { row: PolizaRow; numero: number; total: number };
export type AgendaDia = { fecha: string; visitas: AgendaVisita[] };
export type AgendaGrupoId = "hoy" | "semana" | "proxima" | "despues";
export type AgendaGrupo = { id: AgendaGrupoId; label: string; dias: AgendaDia[] };

function parse(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDiasIso(iso: string, n: number): string {
  const d = parse(iso);
  d.setDate(d.getDate() + n);
  return toIso(d);
}

/** Lunes de la semana de `iso`. */
export function lunesDe(iso: string): string {
  const d = parse(iso);
  const dow = (d.getDay() + 6) % 7; // 0 = lunes
  return addDiasIso(iso, -dow);
}

/** Visitas de hoy a hoy + `dias`, agrupadas por fecha y en orden. */
export function visitasPorDia(rows: PolizaRow[], today: string, dias: number): AgendaDia[] {
  const porFecha = new Map<string, AgendaVisita[]>();
  for (const row of rows) {
    const total = row.visitas.length;
    row.visitas.forEach((fecha, i) => {
      const delta = daysBetween(today, fecha);
      if (delta == null || delta < 0 || delta > dias) return;
      const lista = porFecha.get(fecha) ?? [];
      lista.push({ row, numero: i + 1, total });
      porFecha.set(fecha, lista);
    });
  }
  return [...porFecha.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, visitas]) => ({ fecha, visitas: visitas.sort((a, b) => a.row.cliente.localeCompare(b.row.cliente, "es")) }));
}

/** `semanas` semanas desde el lunes actual, con el número de visitas por día. */
export function tiraDeDias(dias: AgendaDia[], today: string, semanas = 2): { fecha: string; visitas: number; pasado: boolean }[] {
  const conteo = new Map(dias.map((d) => [d.fecha, d.visitas.length]));
  const inicio = lunesDe(today);
  return Array.from({ length: semanas * 7 }, (_, i) => {
    const fecha = addDiasIso(inicio, i);
    return { fecha, visitas: conteo.get(fecha) ?? 0, pasado: fecha < today };
  });
}

export function gruposAgenda(dias: AgendaDia[], today: string): AgendaGrupo[] {
  const finSemana = addDiasIso(lunesDe(today), 6);
  const finProxima = addDiasIso(finSemana, 7);
  const grupos: AgendaGrupo[] = [
    { id: "hoy", label: "Hoy", dias: [] },
    { id: "semana", label: "Esta semana", dias: [] },
    { id: "proxima", label: "Próxima semana", dias: [] },
    { id: "despues", label: "Más adelante", dias: [] },
  ];
  for (const dia of dias) {
    const g = dia.fecha === today ? 0 : dia.fecha <= finSemana ? 1 : dia.fecha <= finProxima ? 2 : 3;
    grupos[g].dias.push(dia);
  }
  return grupos.filter((g) => g.dias.length > 0);
}

/** Urgencia de una fecha para el color del indicador. */
export function urgencia(fecha: string, today: string): "hoy" | "pronto" | "normal" {
  const delta = daysBetween(today, fecha);
  if (delta === 0) return "hoy";
  if (delta != null && delta <= 3) return "pronto";
  return "normal";
}

/** Visitas entre `desde` y `hasta` (incluidos), agrupadas por fecha. */
export function visitasEntre(rows: PolizaRow[], desde: string, hasta: string): Map<string, AgendaVisita[]> {
  const porFecha = new Map<string, AgendaVisita[]>();
  for (const row of rows) {
    const total = row.visitas.length;
    row.visitas.forEach((fecha, i) => {
      if (!fecha || fecha < desde || fecha > hasta) return;
      const lista = porFecha.get(fecha) ?? [];
      lista.push({ row, numero: i + 1, total });
      porFecha.set(fecha, lista);
    });
  }
  for (const lista of porFecha.values()) lista.sort((a, b) => a.row.cliente.localeCompare(b.row.cliente, "es"));
  return porFecha;
}

/** `YYYY-MM` desplazado `n` meses. */
export function shiftMes(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Cuadrícula de 6 semanas (lunes primero) que cubre el mes `YYYY-MM`. */
export function cuadriculaMes(ym: string): string[] {
  const inicio = lunesDe(`${ym}-01`);
  return Array.from({ length: 42 }, (_, i) => addDiasIso(inicio, i));
}

/** Visitas en los próximos `dias` (para el contador del botón «Agenda»). */
export function contarVisitasProximas(rows: PolizaRow[], today: string, dias = 7): number {
  const hasta = addDiasIso(today, dias);
  let n = 0;
  for (const lista of visitasEntre(rows, today, hasta).values()) n += lista.length;
  return n;
}
