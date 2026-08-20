import { FOLIO_SERIE, formatDocumentFolio } from "@/utils/documentFolio";
import { POLIZA_INTERVALO_DEFAULT } from "../shared/polizaVisitas";
import type { PolizaAltaValues, PolizaEstado, PolizaRow, PolizaStats, PolizaTipo } from "./polizaListTypes";

export const TIPO_CCTV: PolizaTipo = "cctv";

export const TIPO_LABEL: Record<PolizaTipo, string> = {
  cctv: "Videovigilancia CCTV",
};

export const CLIENTES_DEMO = [
  { value: "1", label: "MCT LOGISTIC S.A. DE C.V." },
  { value: "2", label: "Comercial del Pacífico S.A. de C.V." },
  { value: "3", label: "Transportes Manzanillo SPR de RL" },
];

export const COTIZACIONES_DEMO: Record<string, { value: string; label: string }[]> = {
  "1": [
    { value: "10261", label: "COT-10261 · 13/08/2026" },
    { value: "10110", label: "COT-10110 · 02/06/2026" },
  ],
  "2": [{ value: "9880", label: "COT-9880 · 21/07/2026" }],
  "3": [{ value: "10042", label: "COT-10042 · 30/05/2026" }],
};

export const EMPTY_POLIZA_VALUES: PolizaAltaValues = {
  clienteId: "",
  tipo: TIPO_CCTV,
  servicioTipo: "",
  equiposAtendidos: "",
  cotizacionId: "",
  intervaloMeses: POLIZA_INTERVALO_DEFAULT,
  fecha1: "",
  fecha2: "",
  fecha3: "",
};

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysUntil(iso: string, today: string): number | null {
  if (!iso) return null;
  const a = Date.parse(`${iso}T00:00:00`);
  const b = Date.parse(`${today}T00:00:00`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((a - b) / 86_400_000);
}

export function nextVisitIso(row: Pick<PolizaRow, "fecha1" | "fecha2" | "fecha3">, today = todayIso()): string {
  const dates = [row.fecha1, row.fecha2, row.fecha3].filter(Boolean).sort();
  return dates.find((d) => d >= today) || "";
}

export function computePolizaEstado(
  values: Pick<PolizaAltaValues, "fecha1" | "fecha2" | "fecha3">,
  today = todayIso()
): PolizaEstado {
  const next = nextVisitIso(values, today);
  if (!next) {
    const anyDate = Boolean(values.fecha1 || values.fecha2 || values.fecha3);
    return anyDate ? "vencida" : "vigente";
  }
  const delta = daysUntil(next, today);
  if (delta != null && delta <= 30) return "proxima_visita";
  return "vigente";
}

export function estadoPolizaLabel(estado: PolizaEstado): string {
  switch (estado) {
    case "proxima_visita":
      return "Próxima visita";
    case "vencida":
      return "Vencida";
    default:
      return "Vigente";
  }
}

export function estadoPolizaBadgeClass(estado: PolizaEstado): string {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium";
  switch (estado) {
    case "proxima_visita":
      return `${base} bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300`;
    case "vencida":
      return `${base} bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300`;
    default:
      return `${base} bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300`;
  }
}

export function formatPolizaFecha(iso: string): string {
  const raw = String(iso || "").trim();
  if (!raw) return "—";
  const [y, m, d] = raw.slice(0, 10).split("-");
  if (!y || !m || !d) return raw;
  return `${d}/${m}/${y}`;
}

export function cotizacionFolioFromOption(label: string, id: string): string {
  const fromLabel = label.split("·")[0]?.trim() || "";
  if (fromLabel) return fromLabel;
  return id ? formatDocumentFolio(FOLIO_SERIE.cotizacion, id) : "—";
}

export function valuesFromRow(row: PolizaRow): PolizaAltaValues {
  return {
    clienteId: row.clienteId,
    tipo: row.tipo,
    servicioTipo: row.servicioTipo,
    equiposAtendidos: row.equiposAtendidos,
    cotizacionId: row.cotizacionId,
    intervaloMeses: row.intervaloMeses,
    fecha1: row.fecha1,
    fecha2: row.fecha2,
    fecha3: row.fecha3,
  };
}

export function buildPolizaRow(opts: {
  id: number;
  idx: number;
  values: PolizaAltaValues;
}): PolizaRow {
  const cliente = CLIENTES_DEMO.find((c) => c.value === opts.values.clienteId);
  const cot = (COTIZACIONES_DEMO[opts.values.clienteId] || []).find(
    (c) => c.value === opts.values.cotizacionId
  );
  const tipo = opts.values.tipo || TIPO_CCTV;
  return {
    id: opts.id,
    idx: opts.idx,
    folio: formatDocumentFolio(FOLIO_SERIE.poliza, opts.idx),
    clienteId: opts.values.clienteId,
    cliente: cliente?.label || "Cliente",
    tipo,
    tipoLabel: TIPO_LABEL[tipo],
    servicioTipo: opts.values.servicioTipo,
    equiposAtendidos: opts.values.equiposAtendidos,
    cotizacionId: opts.values.cotizacionId,
    cotizacionFolio: cot ? cotizacionFolioFromOption(cot.label, cot.value) : "—",
    intervaloMeses: opts.values.intervaloMeses,
    fecha1: opts.values.fecha1,
    fecha2: opts.values.fecha2,
    fecha3: opts.values.fecha3,
    estado: computePolizaEstado(opts.values),
  };
}

export function computePolizaStats(rows: PolizaRow[]): PolizaStats {
  return {
    total: rows.length,
    vigentes: rows.filter((r) => r.estado === "vigente").length,
    proximaVisita: rows.filter((r) => r.estado === "proxima_visita").length,
    vencidas: rows.filter((r) => r.estado === "vencida").length,
  };
}

export function nextPolizaIdx(rows: PolizaRow[]): number {
  const max = rows.reduce((acc, row) => Math.max(acc, row.idx), 10000);
  return max + 1;
}

export const POLIZAS_DEMO: PolizaRow[] = [
  buildPolizaRow({
    id: 1,
    idx: 10001,
    values: {
      clienteId: "1",
      tipo: TIPO_CCTV,
      servicioTipo: "Mantenimiento preventivo CCTV",
      equiposAtendidos: "6 DVR y 63 cámaras",
      cotizacionId: "10261",
      intervaloMeses: 4,
      fecha1: "2026-04-20",
      fecha2: "2026-08-20",
      fecha3: "2026-12-20",
    },
  }),
  buildPolizaRow({
    id: 2,
    idx: 10002,
    values: {
      clienteId: "2",
      tipo: TIPO_CCTV,
      servicioTipo: "Mantenimiento preventivo CCTV",
      equiposAtendidos: "4 DVR y 28 cámaras",
      cotizacionId: "9880",
      intervaloMeses: 4,
      fecha1: "2026-03-10",
      fecha2: "2026-07-10",
      fecha3: "2026-11-10",
    },
  }),
  buildPolizaRow({
    id: 3,
    idx: 10003,
    values: {
      clienteId: "3",
      tipo: TIPO_CCTV,
      servicioTipo: "Mantenimiento preventivo CCTV",
      equiposAtendidos: "2 DVR y 16 cámaras",
      cotizacionId: "10042",
      intervaloMeses: 4,
      fecha1: "2025-09-01",
      fecha2: "2026-01-01",
      fecha3: "2026-05-01",
    },
  }),
];
