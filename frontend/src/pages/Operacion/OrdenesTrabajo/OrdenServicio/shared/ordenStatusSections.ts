import { isOrdenCancelada, isOrdenResuelta, normalizeStatus } from "./useOrdenesShared";

export type OrdenStatusSectionKey =
  | "PENDIENTE"
  | "PAUSADO"
  | "RESUELTA"
  | "CANCELADA"
  | "OTROS";

export type OrdenStatusSection<T extends { status?: string | null } = { status?: string | null }> = {
  key: OrdenStatusSectionKey;
  label: string;
  ordenes: T[];
};

export type OrdenStatusSectionStyles = {
  shell: string;
  accent: string;
  icon: string;
  badge: string;
  label: string;
};

const STATUS_SECTION_ORDER: {
  key: OrdenStatusSectionKey;
  label: string;
  match: (status: string) => boolean;
}[] = [
  {
    key: "PENDIENTE",
    label: "Pendientes",
    match: (s) => s === "pendiente" || !s,
  },
  {
    key: "PAUSADO",
    label: "Pausados",
    match: (s) => s === "pausado",
  },
  {
    key: "CANCELADA",
    label: "Canceladas",
    match: (s) => isOrdenCancelada(s),
  },
  {
    key: "RESUELTA",
    label: "Resueltas",
    match: (s) => isOrdenResuelta(s),
  },
  {
    key: "OTROS",
    label: "Otros",
    match: () => true,
  },
];

/** Agrupa órdenes: Pendientes → Pausados → Canceladas → Resueltas (y otros al final). Omite secciones vacías. */
export function groupOrdenesByStatus<T extends { status?: string | null }>(
  ordenes: T[],
): OrdenStatusSection<T>[] {
  const buckets: Record<OrdenStatusSectionKey, T[]> = {
    PENDIENTE: [],
    PAUSADO: [],
    RESUELTA: [],
    CANCELADA: [],
    OTROS: [],
  };

  for (const orden of ordenes) {
    const status = normalizeStatus(orden.status);
    const section =
      STATUS_SECTION_ORDER.find((s) => s.key !== "OTROS" && s.match(status)) ??
      STATUS_SECTION_ORDER[STATUS_SECTION_ORDER.length - 1];
    buckets[section.key].push(orden);
  }

  return STATUS_SECTION_ORDER.map((s) => ({
    key: s.key,
    label: s.label,
    ordenes: buckets[s.key],
  })).filter((s) => s.ordenes.length > 0);
}

/**
 * Tokens de sección con contraste AA en claro/oscuro (mismo espíritu que cotizaciones).
 * Pendientes → amarillo (mismo tono que el badge); Pausados → índigo; Resueltas → esmeralda.
 */
export function getOrdenStatusSectionStyles(key: OrdenStatusSectionKey): OrdenStatusSectionStyles {
  if (key === "RESUELTA") {
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
  if (key === "PAUSADO") {
    return {
      shell:
        "border-[#d4d8f0] bg-[#f4f5fb] dark:border-indigo-500/30 dark:bg-[#14182a]",
      accent: "bg-indigo-600 dark:bg-indigo-400",
      icon: "text-indigo-800 dark:text-indigo-300",
      badge:
        "border-indigo-300/90 bg-indigo-100 text-indigo-950 dark:border-indigo-400/35 dark:bg-indigo-500/20 dark:text-indigo-100",
      label: "text-[#312e81] dark:text-indigo-100",
    };
  }
  if (key === "CANCELADA") {
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
  if (key === "PENDIENTE") {
    return {
      shell:
        "border-yellow-200/90 bg-yellow-50 dark:border-yellow-500/30 dark:bg-yellow-950/30",
      accent: "bg-yellow-600 dark:bg-yellow-400",
      icon: "text-yellow-800 dark:text-yellow-300",
      badge:
        "border-yellow-300/90 bg-yellow-100 text-yellow-800 dark:border-yellow-400/35 dark:bg-yellow-500/20 dark:text-yellow-100",
      label: "text-yellow-900 dark:text-yellow-100",
    };
  }
  return {
    shell: "border-[#E7E7EA] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#0f172a]",
    accent: "bg-[#A1A1AA] dark:bg-[#64748b]",
    icon: "text-[#52525B] dark:text-[#8EA0B8]",
    badge:
      "border-[#E7E7EA] bg-white text-[#09090B] dark:border-[#475569] dark:bg-[#1e293b] dark:text-[#e2e8f0]",
    label: "text-[#09090B] dark:text-[#e2e8f0]",
  };
}
