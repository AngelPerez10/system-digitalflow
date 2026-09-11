import type { ProyectoEstado, ProyectoRow } from "./proyectoTypes";

export type ProyectoStatusSectionKey =
  | "EN_PROCESO"
  | "PAUSADO"
  | "CERRADO"
  | "CANCELADO"
  | "OTROS";

export type ProyectoStatusSection = {
  key: ProyectoStatusSectionKey;
  label: string;
  rows: ProyectoRow[];
};

export type ProyectoStatusSectionStyles = {
  shell: string;
  accent: string;
  icon: string;
  badge: string;
  label: string;
};

const STATUS_SECTION_ORDER: {
  key: ProyectoStatusSectionKey;
  label: string;
  match: (estado: string) => boolean;
}[] = [
  {
    key: "EN_PROCESO",
    label: "En proceso",
    match: (s) => s === "en_proceso" || !s,
  },
  {
    key: "PAUSADO",
    label: "Pausados",
    match: (s) => s === "pausado",
  },
  {
    key: "CANCELADO",
    label: "Cancelados",
    match: (s) => s === "cancelado",
  },
  {
    key: "CERRADO",
    label: "Cerrados",
    match: (s) => s === "cerrado",
  },
  {
    key: "OTROS",
    label: "Otros",
    match: () => true,
  },
];

export function normalizeProyectoEstado(raw: string | null | undefined): string {
  return String(raw || "").trim().toLowerCase();
}

/** Agrupa proyectos: En proceso → Pausados → Cancelados → Cerrados (y otros al final). Omite secciones vacías. */
export function groupProyectosByStatus(rows: ProyectoRow[]): ProyectoStatusSection[] {
  const buckets: Record<ProyectoStatusSectionKey, ProyectoRow[]> = {
    EN_PROCESO: [],
    PAUSADO: [],
    CERRADO: [],
    CANCELADO: [],
    OTROS: [],
  };

  for (const row of rows) {
    const estado = normalizeProyectoEstado(row.estado ?? row.draft?.status);
    const section =
      STATUS_SECTION_ORDER.find((s) => s.key !== "OTROS" && s.match(estado)) ??
      STATUS_SECTION_ORDER[STATUS_SECTION_ORDER.length - 1];
    buckets[section.key].push(row);
  }

  return STATUS_SECTION_ORDER.map((s) => ({
    key: s.key,
    label: s.label,
    rows: buckets[s.key],
  })).filter((s) => s.rows.length > 0);
}

/**
 * Tokens de sección con contraste AA en claro/oscuro (mismo espíritu que órdenes y cotizaciones).
 * En proceso → cielo; Pausados → ámbar (mismo tono que el badge de estado); Cerrados → esmeralda.
 */
export function getProyectoStatusSectionStyles(key: ProyectoStatusSectionKey): ProyectoStatusSectionStyles {
  if (key === "CERRADO") {
    return {
      shell:
        "border-[#d8e8dc] bg-[#f4faf6] dark:border-emerald-500/30 dark:bg-[#0f1f18]",
      accent: "bg-emerald-600 dark:bg-emerald-400",
      icon: "text-emerald-700 dark:text-emerald-300",
      badge:
        "border-emerald-300/80 bg-emerald-100 text-emerald-900 dark:border-emerald-400/35 dark:bg-emerald-500/20 dark:text-emerald-100",
      label: "text-[#14532d] dark:text-emerald-100",
    };
  }
  if (key === "CANCELADO") {
    return {
      shell:
        "border-rose-200/90 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-950/30",
      accent: "bg-rose-600 dark:bg-rose-400",
      icon: "text-rose-800 dark:text-rose-300",
      badge:
        "border-rose-300/90 bg-rose-100 text-rose-900 dark:border-rose-400/35 dark:bg-rose-500/20 dark:text-rose-100",
      label: "text-rose-900 dark:text-rose-100",
    };
  }
  if (key === "PAUSADO") {
    return {
      shell:
        "border-amber-200/90 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-950/30",
      accent: "bg-amber-600 dark:bg-amber-400",
      icon: "text-amber-800 dark:text-amber-300",
      badge:
        "border-amber-300/90 bg-amber-100 text-amber-900 dark:border-amber-400/35 dark:bg-amber-500/20 dark:text-amber-100",
      label: "text-amber-950 dark:text-amber-100",
    };
  }
  if (key === "EN_PROCESO") {
    return {
      shell:
        "border-[#cfe0f5] bg-[#f3f8fd] dark:border-sky-500/30 dark:bg-[#0f1a24]",
      accent: "bg-sky-600 dark:bg-sky-400",
      icon: "text-sky-800 dark:text-sky-300",
      badge:
        "border-sky-300/90 bg-sky-100 text-sky-950 dark:border-sky-400/35 dark:bg-sky-500/20 dark:text-sky-100",
      label: "text-[#0c4a6e] dark:text-sky-100",
    };
  }
  return {
    shell: "border-[#E7E7EA] bg-[#FAFAFA] dark:border-[#334155] dark:bg-[#0f172a]",
    accent: "bg-[#A1A1AA] dark:bg-[#64748b]",
    icon: "text-[#52525B] dark:text-[#94a3b8]",
    badge:
      "border-[#E7E7EA] bg-white text-[#09090B] dark:border-[#475569] dark:bg-[#1e293b] dark:text-[#e2e8f0]",
    label: "text-[#27272A] dark:text-[#e2e8f0]",
  };
}

/** Clave de sección para un estado de proyecto conocido (útil en tests y badges). */
export function proyectoEstadoToSectionKey(estado: ProyectoEstado | string): ProyectoStatusSectionKey {
  const normalized = normalizeProyectoEstado(estado);
  const section =
    STATUS_SECTION_ORDER.find((s) => s.key !== "OTROS" && s.match(normalized)) ??
    STATUS_SECTION_ORDER[STATUS_SECTION_ORDER.length - 1];
  return section.key;
}

/**
 * Estado de listado para la barra segmentada / filtro.
 * `null` = no encaja en un segmento (p. ej. valor legacy → sección Otros).
 */
export function proyectoListStatusCountKey(
  estado: ProyectoEstado | string | null | undefined,
): ProyectoEstado | null {
  switch (proyectoEstadoToSectionKey(estado ?? "")) {
    case "EN_PROCESO":
      return "en_proceso";
    case "PAUSADO":
      return "pausado";
    case "CERRADO":
      return "cerrado";
    case "CANCELADO":
      return "cancelado";
    default:
      return null;
  }
}
