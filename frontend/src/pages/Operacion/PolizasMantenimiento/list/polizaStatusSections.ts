import type { PolizaEstado, PolizaRow } from "./polizaListTypes";

export type PolizaStatusSection = {
  key: PolizaEstado;
  label: string;
  rows: PolizaRow[];
};

// Vencidas primero: son las que requieren acción. Igual espíritu que el
// agrupado de Órdenes de Trabajo (Pendientes → Pausados → Resueltas).
const ORDER: { key: PolizaEstado; label: string }[] = [
  { key: "vencida", label: "Vencidas" },
  { key: "proxima_visita", label: "Próxima visita" },
  { key: "vigente", label: "Vigentes" },
];

/** Agrupa pólizas: Vencidas → Próxima visita → Vigentes. Omite secciones vacías. */
export function groupPolizasByEstado(rows: PolizaRow[]): PolizaStatusSection[] {
  const buckets: Record<PolizaEstado, PolizaRow[]> = {
    vencida: [],
    proxima_visita: [],
    vigente: [],
  };
  for (const row of rows) buckets[row.estado].push(row);
  return ORDER.map((s) => ({ key: s.key, label: s.label, rows: buckets[s.key] })).filter(
    (s) => s.rows.length > 0
  );
}

export type PolizaStatusSectionStyles = {
  shell: string;
  accent: string;
  icon: string;
  badge: string;
  label: string;
};

/** Mismos tonos semánticos que EstadoPolizaBadge/PolizasPageStats, en versión de barra de sección. */
export function getPolizaStatusSectionStyles(key: PolizaEstado): PolizaStatusSectionStyles {
  if (key === "vencida") {
    return {
      shell: "border-rose-200/70 bg-rose-50/80 dark:border-rose-500/25 dark:bg-rose-500/[0.08]",
      accent: "bg-rose-600 dark:bg-rose-400",
      icon: "text-rose-800 dark:text-rose-300",
      badge:
        "border-rose-300/80 bg-rose-100 text-rose-900 dark:border-rose-400/35 dark:bg-rose-500/20 dark:text-rose-100",
      label: "text-rose-950 dark:text-rose-100",
    };
  }
  if (key === "proxima_visita") {
    return {
      shell: "border-amber-200/70 bg-amber-50/80 dark:border-amber-500/25 dark:bg-amber-500/[0.08]",
      accent: "bg-amber-600 dark:bg-amber-400",
      icon: "text-amber-800 dark:text-amber-200",
      badge:
        "border-amber-300/90 bg-amber-100 text-amber-950 dark:border-amber-400/35 dark:bg-amber-500/20 dark:text-amber-100",
      label: "text-amber-950 dark:text-amber-100",
    };
  }
  return {
    shell: "border-emerald-200/70 bg-emerald-50/80 dark:border-emerald-500/25 dark:bg-emerald-500/[0.08]",
    accent: "bg-emerald-600 dark:bg-emerald-400",
    icon: "text-emerald-700 dark:text-emerald-300",
    badge:
      "border-emerald-300/80 bg-emerald-100 text-emerald-900 dark:border-emerald-400/35 dark:bg-emerald-500/20 dark:text-emerald-100",
    label: "text-emerald-950 dark:text-emerald-100",
  };
}
